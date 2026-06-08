'use client';
// ============================================================
// useMeshWebRTC — Peer-to-peer camera mesh (up to 6 players)
//
// Every player connects DIRECTLY to every other player (a full mesh):
// for N players that's one RTCPeerConnection per pair. Signaling (SDP +
// ICE) flows over a single Supabase Realtime Broadcast channel; every
// message is ROUTED with `from`/`to` player ids so each peer only reads
// what's addressed to it.
//
// WHO'S HERE: we use Supabase Realtime PRESENCE (keyed by player id) so
// the mesh tracks who is actually online right now — when someone joins
// we open a connection, when they leave we tear it down.
//
// ROBUSTNESS: each pair runs the standard "Perfect Negotiation" pattern.
// Politeness is decided deterministically by comparing the two player
// ids (lower id = polite). On an offer collision the polite side rolls
// back and the impolite side wins, so there are no dead connections from
// a signaling race. The impolite side also does an ICE restart if the
// media path fails.
//
// NOTE: a mesh is bandwidth-heavy (each browser uploads its camera to
// every other player). It's fine for ~6 people on decent connections;
// beyond that you'd want an SFU/media server. Restrictive networks still
// need a TURN server (configure via app/api/ice-servers/route.ts).
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { WebRTCSignal } from '@/lib/types';

// Flip to true to print verbose WebRTC/signaling logs while debugging.
const WEBRTC_DEBUG = false;
function logWebRTC(...args: unknown[]) {
  if (WEBRTC_DEBUG) console.log('[WebRTC]', ...args);
}
function logSignaling(...args: unknown[]) {
  if (WEBRTC_DEBUG) console.log('[Signaling]', ...args);
}

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'turn:freeturn.net:3478',  username: 'free', credential: 'free' },
  { urls: 'turns:freeturn.net:5349', username: 'free', credential: 'free' },
];

async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const res = await fetch('/api/ice-servers', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.iceServers) && data.iceServers.length > 0) {
        logWebRTC('ICE servers fetched from /api/ice-servers', { count: data.iceServers.length });
        return data.iceServers as RTCIceServer[];
      }
    }
    logWebRTC('ICE servers API returned no servers, using fallback');
  } catch (err) {
    console.warn('[WebRTC] Could not fetch /api/ice-servers, using fallback:', err);
  }
  logWebRTC('Using fallback ICE servers', { count: FALLBACK_ICE_SERVERS.length });
  return FALLBACK_ICE_SERVERS;
}

export interface UseMeshWebRTCReturn {
  localStream:   MediaStream | null;
  /** Remote camera streams, keyed by the other player's id. */
  remoteStreams: Record<string, MediaStream>;
  /** Per-peer connection status, keyed by the other player's id. */
  connected:     Record<string, boolean>;
  cameraError:   string | null;
  startCamera:   () => Promise<void>;
  /** Is my mic currently being transmitted to the other players? */
  micEnabled:    boolean;
  /** Enable/disable sending my mic to peers (push-to-talk / answer phase). */
  setMicEnabled: (on: boolean) => void;
}

interface PeerConn {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  polite: boolean;
  /** ICE candidates that arrived before remoteDescription was set. They are
   *  buffered here and flushed once the description is applied — dropping
   *  them (the old behavior) breaks connectivity in one direction. */
  pendingCandidates: RTCIceCandidateInit[];
}

export function useMeshWebRTC(
  gameId: string,
  myId: string,
  // Host setting: request video? When false we capture mic-only (voice
  // answers + peer audio still work), so the mesh stays light.
  camerasEnabled = false
): UseMeshWebRTCReturn {
  const [localStream,   setLocalStream]   = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [connected,     setConnected]     = useState<Record<string, boolean>>({});
  const [cameraError,   setCameraError]   = useState<string | null>(null);
  // Mic starts MUTED: others only hear you during the answer phase or while
  // you hold the push-to-talk button (see setMicEnabled below).
  const [micEnabled,    setMicEnabledState] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef       = useRef<Map<string, PeerConn>>(new Map());
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // -------------------------------------------------------
  // startCamera — request the webcam + mic once
  // -------------------------------------------------------
  const startCamera = useCallback(async () => {
    if (localStreamRef.current) {
      logWebRTC('startCamera skipped — local stream already exists', {
        camerasEnabled,
        trackCount: localStreamRef.current.getTracks().length,
      });
      return;
    }
    logWebRTC('startCamera called', { camerasEnabled, videoRequested: camerasEnabled });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Mic is always requested; video only when the host enabled cameras.
        video: camerasEnabled
          ? {
              width:      { ideal: 1280 },
              height:     { ideal: 720 },
              facingMode: 'user',
              frameRate:  { ideal: 30 },
            }
          : false,
        audio: true,
      });
      // Start muted — we only broadcast the mic when answering or when the
      // player holds push-to-talk. (Speech recognition uses its own capture,
      // so voice answers still transcribe even while the peer mic is muted.)
      stream.getAudioTracks().forEach((track) => { track.enabled = false; });
      localStreamRef.current = stream;
      setLocalStream(stream);
      console.log('[Camera] getUserMedia success', {
        camerasEnabled,
        streamId: stream.id,
        tracks: stream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
          label: t.label,
        })),
      });
    } catch (err) {
      const msg = err instanceof DOMException
        ? `Camera/mic error: ${err.message}. Please allow access and reload.`
        : 'Could not access your camera/mic.';
      setCameraError(msg);
      console.error('[Camera] getUserMedia failed', { camerasEnabled, error: err });
    }
  }, [camerasEnabled]);

  // -------------------------------------------------------
  // setMicEnabled — toggle whether our mic reaches the other players.
  // Flips the local audio track's `enabled` flag (instant, no renegotiation).
  // -------------------------------------------------------
  const setMicEnabled = useCallback((on: boolean) => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    tracks.forEach((track) => { track.enabled = on; });
    setMicEnabledState(on);
  }, []);

  // -------------------------------------------------------
  // Main effect: presence + per-peer perfect negotiation
  // -------------------------------------------------------
  // TEMP DEBUG — log when remoteStreams React state changes
  useEffect(() => {
    if (!WEBRTC_DEBUG) return;
    const keys = Object.keys(remoteStreams);
    logWebRTC('remoteStreams state updated', {
      peerCount: keys.length,
      peerIds: keys,
      streams: keys.map((id) => ({
        peerId: id,
        streamId: remoteStreams[id]?.id,
        tracks: remoteStreams[id]?.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
        })),
      })),
    });
  }, [remoteStreams]);

  useEffect(() => {
    if (!localStream || !gameId || !myId) {
      logWebRTC('mesh effect waiting for prerequisites', {
        hasLocalStream: !!localStream,
        gameId: gameId || '(empty)',
        myId: myId || '(empty)',
        camerasEnabled,
      });
      return;
    }

    logWebRTC('mesh effect starting', {
      gameId,
      myId,
      camerasEnabled,
      localTracks: localStream.getTracks().map((t) => t.kind),
    });

    let cancelled = false;
    const peers = peersRef.current;

    const removeRemoteStream = (peerId: string) => {
      logWebRTC('removing remote stream from state', { peerId });
      setRemoteStreams((prev) => {
        if (!(peerId in prev)) return prev;
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
      setConnected((prev) => {
        if (!(peerId in prev)) return prev;
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    };

    async function setup() {
      const iceServers = await fetchIceServers();
      if (cancelled) return;

      const channel = supabase.channel(`webrtc:${gameId}`, {
        config: { broadcast: { self: false }, presence: { key: myId } },
      });
      channelRef.current = channel;

      const sendSignal = (signal: WebRTCSignal) => {
        logSignaling('SEND', {
          type: signal.type,
          from: signal.from,
          to: signal.to,
          ...(signal.type === 'ice-candidate'
            ? { candidate: (signal.payload as RTCIceCandidateInit).candidate?.slice(0, 60) }
            : { sdpType: (signal.payload as RTCSessionDescriptionInit).type }),
        });
        channel.send({ type: 'broadcast', event: 'signal', payload: signal });
      };

      // ---- create (or reuse) the connection to one peer ----
      const ensurePeer = (peerId: string): PeerConn => {
        const existing = peers.get(peerId);
        if (existing) {
          logWebRTC('ensurePeer reusing existing connection', {
            peerId,
            connectionState: existing.pc.connectionState,
            iceConnectionState: existing.pc.iceConnectionState,
            signalingState: existing.pc.signalingState,
          });
          return existing;
        }

        const pc = new RTCPeerConnection({ iceServers });
        const entry: PeerConn = {
          pc,
          makingOffer: false,
          ignoreOffer: false,
          // Deterministic politeness: lower id yields on a collision.
          polite: myId < peerId,
          pendingCandidates: [],
        };
        peers.set(peerId, entry);

        logWebRTC('peer connection CREATED', {
          peerId,
          myId,
          polite: entry.polite,
          iceServerCount: iceServers.length,
        });

        // Send our camera + mic to this peer.
        localStream!.getTracks().forEach((t) => {
          const sender = pc.addTrack(t, localStream!);
          logWebRTC('addTrack to peer', {
            peerId,
            trackKind: t.kind,
            trackId: t.id,
            senderTrack: sender.track?.id,
          });
        });

        pc.ontrack = (event) => {
          const [stream] = event.streams;
          logWebRTC('ontrack fired', {
            peerId,
            streamId: stream?.id ?? '(no stream)',
            trackCount: event.streams.length,
            tracks: event.track
              ? [{ kind: event.track.kind, id: event.track.id, readyState: event.track.readyState }]
              : [],
          });
          if (stream) {
            logWebRTC('storing remote stream in React state', {
              peerId,
              streamId: stream.id,
              videoTracks: stream.getVideoTracks().length,
              audioTracks: stream.getAudioTracks().length,
            });
            setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
          } else {
            console.warn('[WebRTC] ontrack received but no stream in event.streams', { peerId });
          }
        };

        pc.onicecandidate = ({ candidate }) => {
          if (candidate) {
            sendSignal({
              type: 'ice-candidate',
              from: myId,
              to: peerId,
              payload: candidate.toJSON(),
            });
          } else {
            logSignaling('ICE gathering complete (null candidate)', { peerId });
          }
        };

        pc.onnegotiationneeded = async () => {
          logWebRTC('onnegotiationneeded', {
            peerId,
            signalingState: pc.signalingState,
            makingOffer: entry.makingOffer,
          });
          try {
            entry.makingOffer = true;
            await pc.setLocalDescription();
            if (pc.localDescription) {
              sendSignal({
                type: pc.localDescription.type as 'offer',
                from: myId,
                to: peerId,
                payload: pc.localDescription.toJSON(),
              });
            }
          } catch (err) {
            console.error('[WebRTC] negotiate failed', { peerId, error: err });
          } finally {
            entry.makingOffer = false;
          }
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          logWebRTC('connectionStateChange', { peerId, state, polite: entry.polite });
          setConnected((prev) => ({ ...prev, [peerId]: state === 'connected' }));
          if (state === 'connected') setCameraError(null);
          if (state === 'failed' && !entry.polite) {
            logWebRTC('connection failed — impolite peer restarting ICE', { peerId });
            try { pc.restartIce(); } catch (err) { console.error('[WebRTC] restartIce failed', { peerId, err }); }
          }
        };

        pc.oniceconnectionstatechange = () => {
          logWebRTC('iceConnectionStateChange', {
            peerId,
            iceConnectionState: pc.iceConnectionState,
            connectionState: pc.connectionState,
            polite: entry.polite,
          });
          if (pc.iceConnectionState === 'disconnected' && !entry.polite) {
            logWebRTC('ICE disconnected — scheduling restartIce in 2s', { peerId });
            setTimeout(() => {
              if (!cancelled && pc.iceConnectionState === 'disconnected') {
                try { pc.restartIce(); } catch (err) { console.error('[WebRTC] restartIce failed', { peerId, err }); }
              }
            }, 2000);
          }
        };

        pc.onicegatheringstatechange = () => {
          logWebRTC('iceGatheringStateChange', { peerId, iceGatheringState: pc.iceGatheringState });
        };

        pc.onsignalingstatechange = () => {
          logWebRTC('signalingStateChange', { peerId, signalingState: pc.signalingState });
        };

        return entry;
      };

      const teardownPeer = (peerId: string) => {
        const entry = peers.get(peerId);
        if (!entry) return;
        logWebRTC('peer connection TORN DOWN', {
          peerId,
          finalConnectionState: entry.pc.connectionState,
          finalIceState: entry.pc.iceConnectionState,
        });
        try { entry.pc.close(); } catch { /* noop */ }
        peers.delete(peerId);
        removeRemoteStream(peerId);
      };

      // ---- incoming routed signals (Perfect Negotiation core) ----
      channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        const signal = payload as WebRTCSignal;
        logSignaling('RECV (broadcast)', {
          type: signal.type,
          from: signal.from,
          to: signal.to,
          myId,
          forMe: signal.to === myId,
          fromSelf: signal.from === myId,
        });

        if (signal.to !== myId || signal.from === myId) {
          if (signal.to !== myId) {
            logSignaling('IGNORE — not addressed to this peer', { expected: myId, got: signal.to });
          }
          return;
        }

        const entry = ensurePeer(signal.from);
        const { pc } = entry;

        try {
          if (signal.type === 'offer' || signal.type === 'answer') {
            const description = signal.payload as RTCSessionDescriptionInit;
            const offerCollision =
              description.type === 'offer' &&
              (entry.makingOffer || pc.signalingState !== 'stable');

            entry.ignoreOffer = !entry.polite && offerCollision;
            logSignaling('handling SDP', {
              from: signal.from,
              sdpType: description.type,
              signalingState: pc.signalingState,
              makingOffer: entry.makingOffer,
              polite: entry.polite,
              offerCollision,
              ignoreOffer: entry.ignoreOffer,
            });
            if (entry.ignoreOffer) {
              logSignaling('IGNORE offer — impolite side yielding to collision', { from: signal.from });
              return;
            }

            await pc.setRemoteDescription(description);
            logSignaling('setRemoteDescription OK', {
              from: signal.from,
              sdpType: description.type,
              newSignalingState: pc.signalingState,
            });

            // Flush any ICE candidates that arrived before this description.
            if (entry.pendingCandidates.length > 0) {
              const queued = entry.pendingCandidates;
              entry.pendingCandidates = [];
              logSignaling('flushing buffered ICE candidates', {
                from: signal.from,
                count: queued.length,
              });
              for (const c of queued) {
                try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
                catch (err) { console.warn('[Signaling] flushed candidate failed', { from: signal.from, err }); }
              }
            }

            if (description.type === 'offer') {
              await pc.setLocalDescription();
              if (pc.localDescription) {
                sendSignal({
                  type: pc.localDescription.type as 'answer',
                  from: myId,
                  to: signal.from,
                  payload: pc.localDescription.toJSON(),
                });
              }
            }
          } else if (signal.type === 'ice-candidate') {
            const candidate = signal.payload as RTCIceCandidateInit;
            // If the remote description isn't set yet, the candidate can't be
            // added — buffer it and flush after setRemoteDescription. Dropping
            // it (old behavior) is what caused one-way / missing video.
            if (!pc.remoteDescription) {
              entry.pendingCandidates.push(candidate);
              logSignaling('buffering ICE candidate (no remoteDescription yet)', {
                from: signal.from,
                queued: entry.pendingCandidates.length,
              });
            } else {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                logSignaling('addIceCandidate OK', {
                  from: signal.from,
                  candidate: candidate.candidate?.slice(0, 60),
                });
              } catch (err) {
                if (!entry.ignoreOffer) {
                  console.error('[Signaling] addIceCandidate failed', { from: signal.from, error: err });
                }
              }
            }
          }
        } catch (err) {
          console.error('[Signaling] signal handling error', { from: signal.from, type: signal.type, error: err });
        }
      });

      // ---- presence: connect to everyone online, drop those who leave ----
      const reconcile = () => {
        if (cancelled) return;
        const state = channel.presenceState() as Record<string, unknown[]>;
        const online = new Set(Object.keys(state));

        logSignaling('presence reconcile', {
          myId,
          onlinePeerIds: [...online],
          activePeerConnections: [...peers.keys()],
        });

        // Open a connection to any newly-present peer.
        online.forEach((peerId) => {
          if (peerId !== myId && !peers.has(peerId)) {
            logSignaling('presence: new peer online — opening connection', { peerId });
            ensurePeer(peerId);
          }
        });
        // Tear down peers that have gone offline.
        peers.forEach((_entry, peerId) => {
          if (!online.has(peerId)) {
            logSignaling('presence: peer offline — tearing down', { peerId });
            teardownPeer(peerId);
          }
        });
      };

      channel.on('presence', { event: 'sync' }, () => {
        logSignaling('presence event: sync');
        reconcile();
      });
      channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
        logSignaling('presence event: join', { key, newPresences });
        reconcile();
      });
      channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        logSignaling('presence event: leave', { key, leftPresences });
        reconcile();
      });

      channel.subscribe(async (status) => {
        logSignaling('broadcast channel status', { status, channel: `webrtc:${gameId}`, myId });
        if (status === 'SUBSCRIBED') {
          await channel.track({ id: myId, at: Date.now() });
          logSignaling('presence tracked', { myId });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[Signaling] channel subscription failed', { status, gameId, myId });
        }
      });
    }

    setup();

    return () => {
      logWebRTC('mesh effect cleanup', { myId, peerCount: peers.size });
      cancelled = true;
      peers.forEach((entry) => { try { entry.pc.close(); } catch { /* noop */ } });
      peers.clear();
      setRemoteStreams({});
      setConnected({});
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- camerasEnabled logged only; omit to avoid re-running mesh
  }, [localStream, gameId, myId]);

  // -------------------------------------------------------
  // Stop camera/mic tracks when the hook unmounts
  // -------------------------------------------------------
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, []);

  return { localStream, remoteStreams, connected, cameraError, startCamera, micEnabled, setMicEnabled };
}
