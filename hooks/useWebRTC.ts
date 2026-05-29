'use client';
// ============================================================
// useWebRTC — Peer-to-peer camera streaming
//
// Uses the browser's built-in WebRTC API.
// Signaling (offer/answer/ICE exchange) happens over Supabase
// Realtime Broadcast channels — no third-party service needed.
//
// ---- HOW THE CONNECTION IS ESTABLISHED (robust handshake) ----
//   Problem we solve: a plain "host sends offer when player joins"
//   approach has a RACE — the offer can be broadcast before the
//   other side has finished subscribing, so it's lost forever and
//   the cameras never connect.
//
//   Fix: a "hello" handshake.
//     1. Each side broadcasts "hello" the moment its channel is
//        SUBSCRIBED (guaranteed ready to send/receive).
//     2. HOST: whenever it hears the player's "hello", it creates
//        and sends the WebRTC offer (guarded so it only fires once).
//     3. PLAYER: whenever it hears the host's "hello", it replies
//        with its own "hello" so the host is guaranteed to hear it
//        regardless of who subscribed first.
//   This makes connection setup deterministic in both join orders.
//
//   We also QUEUE incoming ICE candidates that arrive before the
//   remote description is set, then flush them — another common
//   cause of one-directional / black remote video.
//
// TROUBLESHOOTING:
//   - Works best on Chrome / Edge.
//   - Both players must grant camera + mic permission.
//   - STUN alone works on most home networks. If players are on
//     restrictive/corporate networks (symmetric NAT), you may need
//     a TURN server — see the ICE_SERVERS comment below.
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PlayerRole, WebRTCSignal } from '@/lib/types';

// -------------------------------------------------------
// ICE servers.
//   STUN  = helps peers discover their public address (free).
//   TURN  = RELAYS the video through a server when a direct
//           peer-to-peer link is impossible. REQUIRED when players
//           are behind VPNs / proxies / strict NAT or an ISP that
//           blocks peer-to-peer (common in Russia). Without a
//           WORKING TURN server you get "remote camera LIVE but
//           black" — the connection negotiates but no video flows.
//
// The actual server list is fetched at runtime from /api/ice-servers
// so TURN credentials live in server env vars (not the JS bundle).
// See app/api/ice-servers/route.ts for how to plug in a free TURN
// provider (Metered / ExpressTURN). Until you do, the route returns
// a public fallback that works on SOME networks but not all.
// -------------------------------------------------------

// Hardcoded last-resort fallback if the /api/ice-servers fetch fails
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'turn:freeturn.net:3478',  username: 'free', credential: 'free' },
  { urls: 'turns:freeturn.net:5349', username: 'free', credential: 'free' },
];

// Fetch the ICE server list from our API route (with a safe fallback)
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

// Shape of the lightweight "hello" handshake message
interface HelloMessage { from: PlayerRole }

export function useWebRTC(
  gameId: string,
  role: PlayerRole,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _otherPlayerJoined: boolean  // kept for API compatibility; no longer used
): UseWebRTCReturn {

  const [localStream,  setLocalStream]  = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [cameraError,  setCameraError]  = useState<string | null>(null);
  const [isConnected,  setIsConnected]  = useState(false);

  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Connection-state guards (reset on every (re)connection setup)
  const offerCreatedRef     = useRef(false); // host: ensure offer sent only once
  const remoteDescSetRef    = useRef(false); // true once remote description applied
  const pendingCandidates   = useRef<RTCIceCandidateInit[]>([]); // ICE arrived early

  // -------------------------------------------------------
  // startCamera — requests getUserMedia and stores the stream
  // -------------------------------------------------------
  const startCamera = useCallback(async () => {
    // Avoid requesting the camera twice
    if (localStreamRef.current) return;
    try {
      // Camera constraints: 16:9 HD, front-facing.
      // CHANGE THESE to adjust video quality / bandwidth.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:      { ideal: 1280 },
          height:     { ideal: 720 },
          facingMode: 'user',
          frameRate:  { ideal: 30 },
        },
        audio: true, // mic is needed for voice-recognition answers too
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
  // Main effect: set up the peer connection + signaling channel
  // Runs once we have a local stream.
  // -------------------------------------------------------
  useEffect(() => {
    if (!localStream || !gameId) return;

    // cancelled guards against the async setup finishing after unmount
    let cancelled = false;

    // Reset guards for this fresh connection attempt
    offerCreatedRef.current   = false;
    remoteDescSetRef.current  = false;
    pendingCandidates.current = [];

    // Setup is async because we first fetch the ICE/TURN server list
    async function setup() {
    const iceServers = await fetchIceServers();
    if (cancelled) return;
    console.log('[WebRTC] using', iceServers.length, 'ICE servers');

    // One broadcast channel per game for all WebRTC signaling
    const channel = supabase.channel(`webrtc:${gameId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    // Create the peer connection and attach our local tracks
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    localStream!.getTracks().forEach((track) => pc.addTrack(track, localStream!));

    // ---- Remote media arrives here ----
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) setRemoteStream(stream);
    };

    // ---- Connection state for the LIVE/OFFLINE indicator ----
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[WebRTC] connectionState:', state);
      setIsConnected(state === 'connected');
      if (state === 'failed') {
        console.warn('[WebRTC] Connection failed — may need a TURN server on this network.');
        setCameraError(
          'Could not establish a video link on this network. ' +
          'Try without VPN, or add a TURN server (see useWebRTC.ts).'
        );
      }
    };

    // ---- ICE connection diagnostics (helps debug black video) ----
    // Open the browser console (F12) to watch these during a call.
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] iceConnectionState:', pc.iceConnectionState);
    };
    pc.onicegatheringstatechange = () => {
      console.log('[WebRTC] iceGatheringState:', pc.iceGatheringState);
    };

    // ---- Trickle our ICE candidates to the other side ----
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'ice-candidate',
            from: role,
            payload: event.candidate.toJSON(),
          } satisfies WebRTCSignal,
        });
      }
    };

    // Helper: small wrapper to send any signal
    const sendSignal = (signal: WebRTCSignal) =>
      channel.send({ type: 'broadcast', event: 'signal', payload: signal });

    // Helper: HOST creates + sends the offer (guarded to fire once)
    const createAndSendOffer = async () => {
      if (role !== 'host') return;
      if (offerCreatedRef.current) return;        // already offered
      if (pc.signalingState !== 'stable') return; // mid-negotiation
      offerCreatedRef.current = true;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: 'offer', from: 'host', payload: offer });
      } catch (err) {
        offerCreatedRef.current = false; // allow a retry on failure
        console.error('[WebRTC] createOffer failed:', err);
      }
    };

    // Helper: apply any ICE candidates that arrived before the
    // remote description was ready.
    const flushPendingCandidates = async () => {
      for (const c of pendingCandidates.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (err) {
          console.error('[WebRTC] addIceCandidate (flush) failed:', err);
        }
      }
      pendingCandidates.current = [];
    };

    // ---- Handle incoming offer / answer / ICE ----
    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const signal = payload as WebRTCSignal;
      if (signal.from === role) return; // ignore our own (safety)

      try {
        if (signal.type === 'offer') {
          // PLAYER side: accept the host's offer and answer it
          await pc.setRemoteDescription(
            new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)
          );
          remoteDescSetRef.current = true;
          await flushPendingCandidates();

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ type: 'answer', from: role, payload: answer });
        }

        else if (signal.type === 'answer') {
          // HOST side: apply the player's answer
          await pc.setRemoteDescription(
            new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)
          );
          remoteDescSetRef.current = true;
          await flushPendingCandidates();
        }

        else if (signal.type === 'ice-candidate') {
          const candidate = signal.payload as RTCIceCandidateInit;
          if (remoteDescSetRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            // Remote description not set yet — queue it for later
            pendingCandidates.current.push(candidate);
          }
        }
      } catch (err) {
        console.error('[WebRTC] Signal handling error:', err);
      }
    });

    // ---- Handle the "hello" handshake ----
    channel.on('broadcast', { event: 'hello' }, ({ payload }) => {
      const { from } = payload as HelloMessage;
      if (from === role) return;

      if (role === 'host') {
        // Player announced itself → host initiates the offer
        createAndSendOffer();
      } else {
        // Host announced itself → player replies so host is sure
        // to hear us (covers the "host subscribed last" ordering).
        channel.send({
          type: 'broadcast',
          event: 'hello',
          payload: { from: role } satisfies HelloMessage,
        });
      }
    });

    // ---- Subscribe, then announce ourselves ----
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'hello',
          payload: { from: role } satisfies HelloMessage,
        });
      }
    });
    } // end setup()

    setup();

    // ---- Cleanup on unmount / dependency change ----
    return () => {
      cancelled = true;
      pcRef.current?.close();
      pcRef.current = null;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [localStream, gameId, role]);

  // -------------------------------------------------------
  // Stop all camera/mic tracks when the hook fully unmounts
  // -------------------------------------------------------
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, []);

  return { localStream, remoteStream, cameraError, isConnected, startCamera };
}
