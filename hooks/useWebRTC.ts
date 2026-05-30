'use client';
// ============================================================
// useWebRTC — Peer-to-peer camera streaming (robust edition)
//
// Signaling (SDP + ICE exchange) happens over a Supabase Realtime
// Broadcast channel — no third-party signaling service needed.
//
// WHY THIS VERSION IS ROBUST (fixes "worked a few times, then black"):
//   It implements the standard WebRTC "Perfect Negotiation" pattern:
//     • One peer is "polite" (player), one is "impolite" (host).
//     • Either side can (re)start negotiation at any time; if their
//       offers collide (glare), the polite peer rolls back and the
//       impolite peer's offer wins. No more dead connections from a
//       signaling race.
//   Plus two recovery mechanisms that the old version lacked:
//     • ICE RESTART: if the media link drops ('failed'/'disconnected'),
//       the impolite peer automatically renegotiates a new path
//       instead of staying black forever.
//     • WATCHDOG: if we aren't connected a few seconds after both
//       sides are present, we re-announce and re-offer.
//
// Without a working TURN server, restrictive networks (VPN/proxy/
// strict NAT, common in Russia) still can't relay video — configure
// one via env vars (see app/api/ice-servers/route.ts).
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PlayerRole, WebRTCSignal } from '@/lib/types';

// Last-resort fallback if /api/ice-servers can't be reached.
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'turn:freeturn.net:3478',  username: 'free', credential: 'free' },
  { urls: 'turns:freeturn.net:5349', username: 'free', credential: 'free' },
];

// How often the watchdog checks whether we still need to (re)connect.
const WATCHDOG_INTERVAL_MS = 4000;

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
    console.warn('[WebRTC] Could not fetch /api/ice-servers, using fallback:', err);
  }
  return FALLBACK_ICE_SERVERS;
}

export interface UseWebRTCReturn {
  localStream:  MediaStream | null;
  remoteStream: MediaStream | null;
  cameraError:  string | null;
  isConnected:  boolean;
  startCamera:  () => Promise<void>;
}

interface HelloMessage { from: PlayerRole }

export function useWebRTC(
  gameId: string,
  role: PlayerRole,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _otherPlayerJoined: boolean
): UseWebRTCReturn {

  const [localStream,  setLocalStream]  = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [cameraError,  setCameraError]  = useState<string | null>(null);
  const [isConnected,  setIsConnected]  = useState(false);

  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // -------------------------------------------------------
  // startCamera — request the webcam + mic once
  // -------------------------------------------------------
  const startCamera = useCallback(async () => {
    if (localStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:      { ideal: 1280 },
          height:     { ideal: 720 },
          facingMode: 'user',
          frameRate:  { ideal: 30 },
        },
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
    } catch (err) {
      const msg = err instanceof DOMException
        ? `Camera/mic error: ${err.message}. Please allow access and reload.`
        : 'Could not access your camera/mic.';
      setCameraError(msg);
      console.error('[WebRTC] getUserMedia failed:', err);
    }
  }, []);

  // -------------------------------------------------------
  // Main effect: peer connection + signaling (Perfect Negotiation)
  // -------------------------------------------------------
  useEffect(() => {
    if (!localStream || !gameId) return;

    let cancelled = false;

    // ---- Perfect Negotiation roles ----
    // The PLAYER is "polite" — it yields when offers collide.
    const polite = role === 'player';

    // Negotiation state machine flags (closure-scoped per setup)
    let makingOffer   = false; // we're in the middle of creating an offer
    let ignoreOffer   = false; // we chose to ignore a colliding remote offer
    let channelReady  = false; // Supabase channel is subscribed & sendable
    let peerPresent   = false; // we've heard the other side's "hello"
    let watchdog: ReturnType<typeof setInterval> | null = null;

    async function setup() {
      const iceServers = await fetchIceServers();
      if (cancelled) return;
      console.log('[WebRTC] using', iceServers.length, 'ICE servers');

      const channel = supabase.channel(`webrtc:${gameId}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      // Attach our local tracks (both audio + video, sendrecv).
      localStream!.getTracks().forEach((t) => pc.addTrack(t, localStream!));

      // ---- small signal sender ----
      const sendSignal = (signal: WebRTCSignal) =>
        channel.send({ type: 'broadcast', event: 'signal', payload: signal });

      const sendHello = () =>
        channel.send({ type: 'broadcast', event: 'hello', payload: { from: role } satisfies HelloMessage });

      // ---- remote media ----
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) setRemoteStream(stream);
      };

      // ---- Perfect Negotiation: create an offer when needed ----
      const negotiate = async () => {
        // Only proceed once the channel can deliver the offer AND we
        // know the peer is present (avoids firing into the void).
        if (cancelled || !channelReady || !peerPresent) return;
        if (pc.signalingState !== 'stable') return; // already negotiating
        try {
          makingOffer = true;
          await pc.setLocalDescription(); // implicit createOffer()
          if (pc.localDescription) {
            sendSignal({ type: pc.localDescription.type as 'offer', from: role, payload: pc.localDescription.toJSON() });
          }
        } catch (err) {
          console.error('[WebRTC] negotiate failed:', err);
        } finally {
          makingOffer = false;
        }
      };
      pc.onnegotiationneeded = () => { negotiate(); };

      // ---- trickle ICE ----
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          sendSignal({ type: 'ice-candidate', from: role, payload: candidate.toJSON() });
        }
      };

      // ---- connection state + auto-recovery ----
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('[WebRTC] connectionState:', state);
        setIsConnected(state === 'connected');
        if (state === 'connected') setCameraError(null);

        if (state === 'failed') {
          // The media path broke. The impolite peer renegotiates a
          // fresh one (ICE restart) instead of giving up.
          console.warn('[WebRTC] connection failed — attempting ICE restart');
          if (!polite) {
            try { pc.restartIce(); } catch (err) { console.error(err); }
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] iceConnectionState:', pc.iceConnectionState);
        // 'disconnected' is often transient; give it a moment, then
        // recover via ICE restart if it hasn't healed itself.
        if (pc.iceConnectionState === 'disconnected' && !polite) {
          setTimeout(() => {
            if (!cancelled && pc.iceConnectionState === 'disconnected') {
              try { pc.restartIce(); } catch (err) { console.error(err); }
            }
          }, 2000);
        }
      };

      // ---- incoming signals (Perfect Negotiation core) ----
      channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        const signal = payload as WebRTCSignal;
        if (signal.from === role) return; // ignore our own

        try {
          if (signal.type === 'offer' || signal.type === 'answer') {
            const description = signal.payload as RTCSessionDescriptionInit;

            // Glare detection: an incoming OFFER conflicts if we're
            // also offering or aren't in a stable state.
            const offerCollision =
              description.type === 'offer' &&
              (makingOffer || pc.signalingState !== 'stable');

            ignoreOffer = !polite && offerCollision;
            if (ignoreOffer) {
              // Impolite peer ignores the colliding offer; its own wins.
              return;
            }

            // Polite peer rolls back automatically here if colliding.
            await pc.setRemoteDescription(description);

            if (description.type === 'offer') {
              await pc.setLocalDescription(); // implicit createAnswer()
              if (pc.localDescription) {
                sendSignal({ type: pc.localDescription.type as 'answer', from: role, payload: pc.localDescription.toJSON() });
              }
            }
          } else if (signal.type === 'ice-candidate') {
            const candidate = signal.payload as RTCIceCandidateInit;
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              // Safe to swallow if we deliberately ignored an offer
              if (!ignoreOffer) console.error('[WebRTC] addIceCandidate failed:', err);
            }
          }
        } catch (err) {
          console.error('[WebRTC] signal handling error:', err);
        }
      });

      // ---- "hello" handshake: learn the other side is present ----
      channel.on('broadcast', { event: 'hello' }, ({ payload }) => {
        const { from } = payload as HelloMessage;
        if (from === role) return;

        const wasPresent = peerPresent;
        peerPresent = true;

        // Reply so the other side definitely hears us regardless of
        // who subscribed first.
        sendHello();

        // First time we learn the peer is here: the impolite peer
        // kicks off negotiation. (negotiationneeded already fired
        // earlier but bailed because peerPresent was false.)
        if (!wasPresent && !polite) negotiate();
      });

      // ---- subscribe, then announce ourselves ----
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelReady = true;
          sendHello();
        }
      });

      // ---- WATCHDOG: re-announce / re-offer if still not connected ----
      watchdog = setInterval(() => {
        if (cancelled) return;
        if (pc.connectionState === 'connected') return;
        // Keep nudging: re-hello (cheap) so a peer that joined late
        // is discovered, and let the impolite peer re-offer.
        if (channelReady) sendHello();
        if (peerPresent && !polite && pc.connectionState !== 'connecting') {
          negotiate();
        }
      }, WATCHDOG_INTERVAL_MS);
    }

    setup();

    return () => {
      cancelled = true;
      if (watchdog) clearInterval(watchdog);
      pcRef.current?.close();
      pcRef.current = null;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [localStream, gameId, role]);

  // -------------------------------------------------------
  // Stop camera/mic tracks when the hook unmounts
  // -------------------------------------------------------
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, []);

  return { localStream, remoteStream, cameraError, isConnected, startCamera };
}
