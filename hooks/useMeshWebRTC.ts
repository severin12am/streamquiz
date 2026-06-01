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
        return data.iceServers as RTCIceServer[];
      }
    }
  } catch (err) {
    console.warn('[Mesh] Could not fetch /api/ice-servers, using fallback:', err);
  }
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
}

interface PeerConn {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  polite: boolean;
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

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef       = useRef<Map<string, PeerConn>>(new Map());
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // -------------------------------------------------------
  // startCamera — request the webcam + mic once
  // -------------------------------------------------------
  const startCamera = useCallback(async () => {
    if (localStreamRef.current) return;
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
      localStreamRef.current = stream;
      setLocalStream(stream);
    } catch (err) {
      const msg = err instanceof DOMException
        ? `Camera/mic error: ${err.message}. Please allow access and reload.`
        : 'Could not access your camera/mic.';
      setCameraError(msg);
      console.error('[Mesh] getUserMedia failed:', err);
    }
  }, [camerasEnabled]);

  // -------------------------------------------------------
  // Main effect: presence + per-peer perfect negotiation
  // -------------------------------------------------------
  useEffect(() => {
    if (!localStream || !gameId || !myId) return;

    let cancelled = false;
    const peers = peersRef.current;

    const removeRemoteStream = (peerId: string) => {
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

      const sendSignal = (signal: WebRTCSignal) =>
        channel.send({ type: 'broadcast', event: 'signal', payload: signal });

      // ---- create (or reuse) the connection to one peer ----
      const ensurePeer = (peerId: string): PeerConn => {
        const existing = peers.get(peerId);
        if (existing) return existing;

        const pc = new RTCPeerConnection({ iceServers });
        const entry: PeerConn = {
          pc,
          makingOffer: false,
          ignoreOffer: false,
          // Deterministic politeness: lower id yields on a collision.
          polite: myId < peerId,
        };
        peers.set(peerId, entry);

        // Send our camera + mic to this peer.
        localStream!.getTracks().forEach((t) => pc.addTrack(t, localStream!));

        pc.ontrack = (event) => {
          const [stream] = event.streams;
          if (stream) {
            setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
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
          }
        };

        pc.onnegotiationneeded = async () => {
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
            console.error('[Mesh] negotiate failed:', err);
          } finally {
            entry.makingOffer = false;
          }
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          setConnected((prev) => ({ ...prev, [peerId]: state === 'connected' }));
          if (state === 'connected') setCameraError(null);
          if (state === 'failed' && !entry.polite) {
            try { pc.restartIce(); } catch (err) { console.error(err); }
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'disconnected' && !entry.polite) {
            setTimeout(() => {
              if (!cancelled && pc.iceConnectionState === 'disconnected') {
                try { pc.restartIce(); } catch (err) { console.error(err); }
              }
            }, 2000);
          }
        };

        return entry;
      };

      const teardownPeer = (peerId: string) => {
        const entry = peers.get(peerId);
        if (!entry) return;
        try { entry.pc.close(); } catch { /* noop */ }
        peers.delete(peerId);
        removeRemoteStream(peerId);
      };

      // ---- incoming routed signals (Perfect Negotiation core) ----
      channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        const signal = payload as WebRTCSignal;
        if (signal.to !== myId || signal.from === myId) return;

        const entry = ensurePeer(signal.from);
        const { pc } = entry;

        try {
          if (signal.type === 'offer' || signal.type === 'answer') {
            const description = signal.payload as RTCSessionDescriptionInit;
            const offerCollision =
              description.type === 'offer' &&
              (entry.makingOffer || pc.signalingState !== 'stable');

            entry.ignoreOffer = !entry.polite && offerCollision;
            if (entry.ignoreOffer) return;

            await pc.setRemoteDescription(description);
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
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              if (!entry.ignoreOffer) console.error('[Mesh] addIceCandidate failed:', err);
            }
          }
        } catch (err) {
          console.error('[Mesh] signal handling error:', err);
        }
      });

      // ---- presence: connect to everyone online, drop those who leave ----
      const reconcile = () => {
        if (cancelled) return;
        const state = channel.presenceState() as Record<string, unknown[]>;
        const online = new Set(Object.keys(state));

        // Open a connection to any newly-present peer.
        online.forEach((peerId) => {
          if (peerId !== myId && !peers.has(peerId)) ensurePeer(peerId);
        });
        // Tear down peers that have gone offline.
        peers.forEach((_entry, peerId) => {
          if (!online.has(peerId)) teardownPeer(peerId);
        });
      };

      channel.on('presence', { event: 'sync' }, reconcile);
      channel.on('presence', { event: 'join' }, reconcile);
      channel.on('presence', { event: 'leave' }, reconcile);

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ id: myId, at: Date.now() });
        }
      });
    }

    setup();

    return () => {
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

  return { localStream, remoteStreams, connected, cameraError, startCamera };
}
