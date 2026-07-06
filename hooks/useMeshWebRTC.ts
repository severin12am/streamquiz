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

// Extract the ICE candidate type (host / srflx / prflx / relay) from a raw
// candidate string. "relay" means the media is going through a TURN server —
// the key thing to confirm when connectivity fails on VPN / strict NAT.
function candidateType(candidate?: string): string {
  if (!candidate) return 'unknown';
  const m = /(?:^|\s)typ\s+(\w+)/.exec(candidate);
  return m ? m[1] : 'unknown';
}

// Mask credentials but show URLs so we can confirm a TURN server is present.
function describeIceServers(servers: RTCIceServer[]): string[] {
  return servers.flatMap((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return urls.map((u) => (s.credential ? `${u} (auth)` : `${u}`));
  });
}

// -------------------------------------------------------
// Adaptive video quality — scale resolution and bitrate down as more
// peers join the mesh. Each browser uploads its stream to every other
// player, so bandwidth grows O(N²); lowering quality for larger games
// keeps the mesh stable on typical home connections.
// -------------------------------------------------------
interface VideoTier {
  width: number;
  height: number;
  frameRate: number;
  maxBitrateKbps: number;
}

function videoTierForPeerCount(peerCount: number): VideoTier {
  if (peerCount <= 2) return { width: 1280, height: 720, frameRate: 30, maxBitrateKbps: 1200 };
  if (peerCount <= 3) return { width: 960,  height: 540, frameRate: 24, maxBitrateKbps: 900 };
  return                       { width: 640,  height: 480, frameRate: 20, maxBitrateKbps: 600 };
}

async function applyBitrateLimit(pc: RTCPeerConnection, maxKbps: number) {
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== 'video') continue;
    const params = sender.getParameters();
    if (!params.encodings?.length) continue;
    params.encodings[0].maxBitrate = maxKbps * 1000;
    try { await sender.setParameters(params); } catch { /* not all browsers support this */ }
  }
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
        const servers = data.iceServers as RTCIceServer[];
        const described = describeIceServers(servers);
        const hasTurn = described.some((u) => u.startsWith('turn:') || u.startsWith('turns:'));
        logWebRTC('ICE servers fetched from /api/ice-servers', {
          count: servers.length,
          servers: described,
          hasTurn,
        });
        if (!hasTurn) {
          console.warn('[WebRTC] No TURN server in ICE config — connections will FAIL on strict NAT / VPN. Configure METERED_* or TURN_* env vars.');
        }
        return servers;
      }
    }
    logWebRTC('ICE servers API returned no servers, using fallback');
  } catch (err) {
    console.warn('[WebRTC] Could not fetch /api/ice-servers, using fallback:', err);
  }
  logWebRTC('Using FALLBACK ICE servers (public freeturn.net — unreliable)', {
    count: FALLBACK_ICE_SERVERS.length,
    servers: describeIceServers(FALLBACK_ICE_SERVERS),
  });
  return FALLBACK_ICE_SERVERS;
}

export interface UseMeshWebRTCReturn {
  localStream:   MediaStream | null;
  /** Remote camera streams, keyed by the other player's id. */
  remoteStreams: Record<string, MediaStream>;
  /** Per-peer connection status, keyed by the other player's id. */
  connected:     Record<string, boolean>;
  cameraError:   string | null;
  startCamera:   (opts?: { force?: boolean }) => Promise<void>;
  /** Tear down all peer connections + stop local tracks (cut every feed).
   *  Used at the end of a game's discussion window. `startCamera()` will
   *  re-acquire everything if the players rematch. */
  stopCamera:    () => void;
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
  /** Have our local camera/mic tracks been added to this connection yet?
   *  Presence/discovery is DECOUPLED from capture: we may open a connection
   *  before our own camera is ready, then add tracks later (which triggers a
   *  renegotiation). This flag prevents adding the same tracks twice. */
  localTracksAdded: boolean;
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

  // Camera-acquisition guards. `startCamera` is called from many places (the
  // seat effect on every `me` change, the visibility/online recovery handler,
  // etc.). Without these, a failing getUserMedia (e.g. NotReadableError: the
  // device is held by another tab/app) gets retried on every render — flooding
  // the console and spinning the CPU. We therefore:
  //   • skip while an attempt is already in flight, and
  //   • back off for a cooldown after a failure (unless an explicit recovery
  //     forces an immediate retry).
  const cameraStartingRef = useRef(false);
  const cameraFailedAtRef = useRef(0);
  const CAMERA_RETRY_COOLDOWN_MS = 5000;

  // -------------------------------------------------------
  // startCamera — request the webcam + mic once
  // -------------------------------------------------------
  const startCamera = useCallback(async (opts?: { force?: boolean }) => {
    if (localStreamRef.current) {
      // Idempotent: already capturing. (Intentionally not logged — this is
      // called on nearly every render and would drown the useful logs.)
      return;
    }
    if (cameraStartingRef.current) return; // an attempt is already running
    // After a failure, don't hammer getUserMedia on every re-render. Genuine
    // recovery events (tab refocus / network back) pass force:true to retry now.
    if (!opts?.force && cameraFailedAtRef.current &&
        Date.now() - cameraFailedAtRef.current < CAMERA_RETRY_COOLDOWN_MS) {
      return;
    }
    cameraStartingRef.current = true;
    logWebRTC('startCamera called', { camerasEnabled, videoRequested: camerasEnabled });
    try {
      const tier = videoTierForPeerCount(0);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: camerasEnabled
          ? {
              width:      { ideal: tier.width },
              height:     { ideal: tier.height },
              facingMode: 'user',
              frameRate:  { ideal: tier.frameRate },
            }
          : false,
        audio: true,
      });
      // Start muted — we only broadcast the mic when answering or when the
      // player holds push-to-talk. (Speech recognition uses its own capture,
      // so voice answers still transcribe even while the peer mic is muted.)
      stream.getAudioTracks().forEach((track) => { track.enabled = false; });
      localStreamRef.current = stream;
      cameraFailedAtRef.current = 0;
      setCameraError(null);
      setLocalStream(stream);
      logWebRTC('[Camera] getUserMedia success', {
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
      // Log only on the first failure of a cooldown window — not on every
      // retry — so a persistently-busy device doesn't spam the console.
      if (!cameraFailedAtRef.current) {
        console.error('[Camera] getUserMedia failed', { camerasEnabled, error: err });
      }
      cameraFailedAtRef.current = Date.now();
    } finally {
      cameraStartingRef.current = false;
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
  // stopCamera — cut every feed: close all peer connections and stop our
  // local tracks. Remote streams clear as each peer closes. The presence
  // channel is left running so a rematch can re-establish the mesh; only
  // the media is torn down. `startCamera()` will re-acquire on demand.
  // -------------------------------------------------------
  const stopCamera = useCallback(() => {
    logWebRTC('stopCamera called — tearing down media', { myId });
    peersRef.current.forEach((entry) => {
      entry.localTracksAdded = false;
      try { entry.pc.close(); } catch { /* noop */ }
    });
    peersRef.current.clear();
    setRemoteStreams({});
    setConnected({});
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, [myId]);


  // -------------------------------------------------------
  // attachLocalTracks — add our camera/mic tracks to ONE peer connection.
  // Idempotent (guarded by entry.localTracksAdded). Adding tracks fires the
  // connection's onnegotiationneeded, so calling this AFTER a connection is
  // already open transparently renegotiates and starts sending our media.
  // This is what makes discovery-before-capture work.
  // -------------------------------------------------------
  const attachLocalTracks = useCallback((entry: PeerConn) => {
    const ls = localStreamRef.current;
    if (!ls || entry.localTracksAdded) return;
    ls.getTracks().forEach((t) => { entry.pc.addTrack(t, ls); });
    entry.localTracksAdded = true;
    applyBitrateLimit(entry.pc, videoTierForPeerCount(peersRef.current.size).maxBitrateKbps);
    logWebRTC('attached local tracks to peer', { trackKinds: ls.getTracks().map((t) => t.kind) });
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
    // DECOUPLED DISCOVERY: we join the signaling channel + presence as soon as
    // we have an identity (gameId + myId) — we do NOT wait for the camera.
    // This means peers discover each other immediately; our media tracks are
    // attached later, when getUserMedia resolves (see the localStream effect
    // below), which triggers a renegotiation per peer. This is more robust
    // than gating discovery on camera permission/startup (the original cause
    // of "the other player isn't in the channel yet").
    if (!gameId || !myId) {
      logWebRTC('mesh effect waiting for identity', {
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
      hasLocalStreamNow: !!localStreamRef.current,
    });

    let cancelled = false;
    const peers = peersRef.current;
    let statsTimer: ReturnType<typeof setInterval> | null = null;
    let recoveryHandler: (() => void) | null = null;

    let lastTierPeerCount = -1;

    const adjustQualityForPeerCount = async (peerCount: number) => {
      if (peerCount === lastTierPeerCount) return;
      lastTierPeerCount = peerCount;
      const tier = videoTierForPeerCount(peerCount);
      logWebRTC('adjusting video quality', { peerCount, tier });

      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        try {
          await videoTrack.applyConstraints({
            width:     { ideal: tier.width },
            height:    { ideal: tier.height },
            frameRate: { ideal: tier.frameRate },
          });
        } catch (err) {
          console.warn('[WebRTC] applyConstraints failed (non-fatal):', err);
        }
      }

      for (const [, entry] of peers) {
        applyBitrateLimit(entry.pc, tier.maxBitrateKbps);
      }
    };

    // -------------------------------------------------------
    // Periodic media-path diagnostics. Every few seconds, for each peer,
    // report the SELECTED ICE candidate pair (so we can see host/srflx/relay
    // and whether TURN is in use) and inbound/outbound video byte+frame
    // counters. This is the single best signal for "ontrack fired but I see
    // no remote video": if inboundVideo.bytes is NOT growing, the media path
    // is broken (ICE/TURN); if it IS growing but the tile is black, it's a
    // decode/render issue instead.
    // -------------------------------------------------------
    const logStats = async () => {
      for (const [peerId, entry] of peers) {
        const pc = entry.pc;
        try {
          const stats = await pc.getStats();
          const pairs   = new Map<string, RTCStats>();
          const locals  = new Map<string, RTCStats>();
          const remotes = new Map<string, RTCStats>();
          let inboundVideo:  Record<string, unknown> | null = null;
          let outboundVideo: Record<string, unknown> | null = null;
          let selectedPairId: string | undefined;

          // NOTE: use for...of (not forEach) so assignments to the outer
          // inbound/outbound vars are tracked by TS control-flow analysis —
          // a callback closure would leave them narrowed to `null`.
          for (const r of stats.values()) {
            const s = r as unknown as Record<string, unknown>;
            switch (r.type) {
              case 'candidate-pair':  pairs.set(r.id, r); break;
              case 'local-candidate': locals.set(r.id, r); break;
              case 'remote-candidate': remotes.set(r.id, r); break;
              case 'transport':
                if (typeof s.selectedCandidatePairId === 'string') {
                  selectedPairId = s.selectedCandidatePairId;
                }
                break;
              case 'inbound-rtp':
                if (s.kind === 'video') inboundVideo = s;
                break;
              case 'outbound-rtp':
                if (s.kind === 'video') outboundVideo = s;
                break;
            }
          }

          // Resolve the selected/nominated candidate pair.
          let pair = selectedPairId ? pairs.get(selectedPairId) : undefined;
          if (!pair) {
            for (const p of pairs.values()) {
              const ps = p as unknown as Record<string, unknown>;
              if (ps.state === 'succeeded' && (ps.nominated || ps.selected)) { pair = p; break; }
            }
          }
          const pairObj = pair as unknown as Record<string, unknown> | undefined;
          const local  = pairObj ? (locals.get(pairObj.localCandidateId as string) as unknown as Record<string, unknown> | undefined) : undefined;
          const remote = pairObj ? (remotes.get(pairObj.remoteCandidateId as string) as unknown as Record<string, unknown> | undefined) : undefined;
          const localType  = (local?.candidateType as string) ?? '?';
          const remoteType = (remote?.candidateType as string) ?? '?';

          logWebRTC('STATS', {
            peerId,
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState,
            path: pairObj ? `${localType} <-> ${remoteType} via ${local?.protocol ?? '?'}` : '(no selected candidate pair yet)',
            usingTurnRelay: localType === 'relay' || remoteType === 'relay',
            inboundVideo: inboundVideo
              ? {
                  bytesReceived: inboundVideo.bytesReceived,
                  framesDecoded: inboundVideo.framesDecoded,
                  framesPerSecond: inboundVideo.framesPerSecond,
                  frameWidth: inboundVideo.frameWidth,
                  frameHeight: inboundVideo.frameHeight,
                }
              : '(no inbound video — peer not sending or not received)',
            outboundVideo: outboundVideo
              ? { bytesSent: outboundVideo.bytesSent, framesEncoded: outboundVideo.framesEncoded }
              : '(no outbound video)',
          });
        } catch (err) {
          logWebRTC('STATS error', { peerId, err });
        }
      }
    };

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
          localTracksAdded: false,
        };
        peers.set(peerId, entry);

        logWebRTC('peer connection CREATED', {
          peerId,
          myId,
          polite: entry.polite,
          iceServerCount: iceServers.length,
          hasLocalStream: !!localStreamRef.current,
        });

        // Send our camera + mic to this peer — IF the camera is ready. If it
        // isn't yet, we still open the connection now (so the peer can send us
        // THEIR video immediately); our tracks are added later by the
        // localStream effect, which renegotiates this connection.
        attachLocalTracks(entry);

        // Apply current bitrate limit based on mesh size.
        const currentTier = videoTierForPeerCount(peers.size);
        applyBitrateLimit(pc, currentTier.maxBitrateKbps);

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
            const type = candidateType(candidate.candidate);
            logSignaling('local ICE candidate gathered', {
              peerId,
              type,
              protocol: candidate.protocol,
              address: candidate.address,
              port: candidate.port,
              relatedAddress: candidate.relatedAddress,
            });
            if (type === 'relay') {
              logWebRTC('✓ RELAY (TURN) candidate gathered — TURN server reachable', { peerId });
            }
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

        // Prefer VP9 for better compression at lower bitrates.
        try {
          const transceivers = pc.getTransceivers();
          for (const t of transceivers) {
            if (t.sender.track?.kind !== 'video') continue;
            if (typeof RTCRtpTransceiver !== 'undefined' && 'setCodecPreferences' in t) {
              const codecs = RTCRtpReceiver.getCapabilities?.('video')?.codecs ?? [];
              const vp9  = codecs.filter((c) => c.mimeType === 'video/VP9');
              const h264 = codecs.filter((c) => c.mimeType === 'video/H264');
              const rest = codecs.filter((c) => c.mimeType !== 'video/VP9' && c.mimeType !== 'video/H264');
              if (vp9.length > 0) {
                t.setCodecPreferences([...vp9, ...h264, ...rest]);
              }
            }
          }
        } catch {
          // setCodecPreferences not supported in all browsers — non-fatal
        }

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
              logSignaling('buffering remote ICE candidate (no remoteDescription yet)', {
                from: signal.from,
                type: candidateType(candidate.candidate),
                queued: entry.pendingCandidates.length,
              });
            } else {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                logSignaling('addIceCandidate OK', {
                  from: signal.from,
                  type: candidateType(candidate.candidate),
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
        const others = [...online].filter((id) => id !== myId);

        // Strings (not arrays) so the values print INLINE in copy-pasted logs.
        logSignaling(
          `presence reconcile — me=${myId} | online=[${[...online].join(', ')}] | others=${others.length} | openConns=[${[...peers.keys()].join(', ')}]`,
        );
        if (WEBRTC_DEBUG && others.length === 0) {
          console.warn('[Signaling] ⚠ ALONE in channel — no other peer is present on webrtc:' + gameId + ' right now.');
        }

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

        // Scale video quality to the current mesh size.
        const activePeers = [...online].filter((id) => id !== myId).length;
        adjustQualityForPeerCount(activePeers);
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

          // Begin periodic diagnostics + SELF-HEALING discovery once we're on
          // the channel. Every tick we re-run reconcile(): if the other peer
          // is present in the channel but we somehow never opened a connection
          // (a dropped presence 'join' event, a reload race, etc.), this picks
          // them up within a few seconds instead of needing a manual rematch.
          if (!statsTimer) {
            statsTimer = setInterval(() => {
              reconcile(); // self-healing discovery (always runs)
              // Diagnostics only — skipped entirely (no getStats cost) unless debugging.
              if (!WEBRTC_DEBUG) return;
              if (peers.size > 0) {
                logStats();
              } else {
                const keys = Object.keys(channel.presenceState() as Record<string, unknown[]>);
                logWebRTC(`heartbeat — me=${myId} | channel=webrtc:${gameId} | members=[${keys.join(', ')}] (waiting for another peer)`);
              }
            }, 3000);
          }

          // RECOVERY: when the page returns to the foreground (mobile users
          // reopening a backgrounded tab — exactly the case where one side was
          // missing from presence) or the network comes back, make sure the
          // camera is running, RE-ANNOUNCE our presence so other clients get a
          // fresh 'join', and reconcile so we reconnect to anyone already here.
          if (!recoveryHandler) {
            recoveryHandler = () => {
              if (cancelled) return;
              if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
              logSignaling('recovery: page visible / online — re-announcing presence + reconciling', { myId });
              startCamera({ force: true });
              channel.track({ id: myId, at: Date.now() }).catch(() => { /* noop */ });
              reconcile();
            };
            document.addEventListener('visibilitychange', recoveryHandler);
            window.addEventListener('online', recoveryHandler);
            window.addEventListener('focus', recoveryHandler);
          }
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
      if (statsTimer) { clearInterval(statsTimer); statsTimer = null; }
      if (recoveryHandler) {
        document.removeEventListener('visibilitychange', recoveryHandler);
        window.removeEventListener('online', recoveryHandler);
        window.removeEventListener('focus', recoveryHandler);
        recoveryHandler = null;
      }
      peers.forEach((entry) => { try { entry.pc.close(); } catch { /* noop */ } });
      peers.clear();
      setRemoteStreams({});
      setConnected({});
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // NOTE: deps are ONLY [gameId, myId] — the mesh/presence channel is tied to
  // our identity, NOT to the camera. The camera arriving later is handled by
  // the separate effect below (no channel teardown/rebuild on camera start).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- camerasEnabled + attachLocalTracks are stable; omit to avoid re-running the mesh
  }, [gameId, myId]);

  // -------------------------------------------------------
  // Camera-ready effect: once getUserMedia resolves, push our tracks into any
  // peer connections that were opened before the camera was ready. addTrack()
  // triggers each connection's onnegotiationneeded, so this renegotiates and
  // starts sending our media without tearing anything down.
  // -------------------------------------------------------
  useEffect(() => {
    if (!localStream) return;
    peersRef.current.forEach((entry) => { attachLocalTracks(entry); });
  }, [localStream, attachLocalTracks]);

  // -------------------------------------------------------
  // Stop camera/mic tracks when the hook unmounts
  // -------------------------------------------------------
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, []);

  return { localStream, remoteStreams, connected, cameraError, startCamera, stopCamera, micEnabled, setMicEnabled };
}
