'use client';
// ============================================================
// useWebRTC — Peer-to-peer camera streaming
//
// Uses the browser's built-in WebRTC API.
// Signaling (offer/answer/ICE exchange) happens over Supabase
// Realtime Broadcast channels — no third-party service needed.
//
// Flow:
//   Host   → creates offer  → sends via Supabase Broadcast
//   Player → receives offer → sends answer
//   Both   → exchange ICE candidates until connected
//
// Result: each player's camera appears on the other's screen
// via a direct peer-to-peer media stream.
//
// TROUBLESHOOTING:
//   - Works best on Chrome/Edge
//   - Both players need getUserMedia permission granted
//   - Corporate firewalls may block WebRTC; in that case the
//     remote video will stay black (local still works)
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PlayerRole, WebRTCSignal } from '@/lib/types';

// -------------------------------------------------------
// ICE STUN servers — public Google servers, free to use.
// For better reliability you can add TURN server credentials here.
// -------------------------------------------------------
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export interface UseWebRTCReturn {
  localStream:  MediaStream | null;
  remoteStream: MediaStream | null;
  cameraError:  string | null;
  isConnected:  boolean;
  startCamera:  () => Promise<void>;
}

export function useWebRTC(
  gameId: string,
  role: PlayerRole,
  otherPlayerJoined: boolean  // true when both players are on the page
): UseWebRTCReturn {

  const [localStream,  setLocalStream]  = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [cameraError,  setCameraError]  = useState<string | null>(null);
  const [isConnected,  setIsConnected]  = useState(false);

  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // -------------------------------------------------------
  // startCamera — requests getUserMedia and stores the stream
  // -------------------------------------------------------
  const startCamera = useCallback(async () => {
    try {
      // Camera constraints: 16:9 HD, front-facing
      // Change these to adjust video quality
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:       { ideal: 1280 },
          height:      { ideal: 720 },
          facingMode:  'user',
          frameRate:   { ideal: 30 },
        },
        audio: true, // audio for voice recognition too
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
    } catch (err) {
      const msg = err instanceof DOMException
        ? `Camera error: ${err.message}. Please allow camera access.`
        : 'Could not access your camera.';
      setCameraError(msg);
      console.error('[WebRTC] getUserMedia failed:', err);
    }
  }, []);

  // -------------------------------------------------------
  // Setup signaling channel + peer connection
  // -------------------------------------------------------
  useEffect(() => {
    if (!localStream || !gameId) return;

    // Each game gets its own broadcast channel for WebRTC signals
    const channel = supabase.channel(`webrtc:${gameId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    // Create RTCPeerConnection
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add all local tracks to the peer connection
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // When remote tracks arrive, build the remote stream
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      setIsConnected(pc.connectionState === 'connected');
      if (pc.connectionState === 'failed') {
        console.warn('[WebRTC] Connection failed — check firewall/TURN config');
        setCameraError('Peer connection failed. Both players are connected but video may not work.');
      }
    };

    // Send ICE candidates to the other player via broadcast
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

    // Listen for signals from the other player
    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const signal = payload as WebRTCSignal;

      // Ignore our own signals (shouldn't happen with self:false but safe)
      if (signal.from === role) return;

      try {
        if (signal.type === 'offer') {
          // Player receives the host's offer
          await pc.setRemoteDescription(
            new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)
          );
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { type: 'answer', from: role, payload: answer } satisfies WebRTCSignal,
          });
        }

        if (signal.type === 'answer') {
          // Host receives the player's answer
          await pc.setRemoteDescription(
            new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)
          );
        }

        if (signal.type === 'ice-candidate') {
          await pc.addIceCandidate(
            new RTCIceCandidate(signal.payload as RTCIceCandidateInit)
          );
        }
      } catch (err) {
        console.error('[WebRTC] Signal handling error:', err);
      }
    });

    channel.subscribe();

    return () => {
      pc.close();
      supabase.removeChannel(channel);
    };
  }, [localStream, gameId, role]);

  // -------------------------------------------------------
  // Once both players are present, host sends the offer
  // -------------------------------------------------------
  useEffect(() => {
    if (!otherPlayerJoined || role !== 'host') return;
    if (!pcRef.current || !channelRef.current) return;
    if (pcRef.current.signalingState !== 'stable') return; // already negotiating

    async function createOffer() {
      const pc      = pcRef.current!;
      const channel = channelRef.current!;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'offer', from: 'host', payload: offer } satisfies WebRTCSignal,
        });
      } catch (err) {
        console.error('[WebRTC] createOffer failed:', err);
      }
    }

    createOffer();
  }, [otherPlayerJoined, role]);

  // -------------------------------------------------------
  // Cleanup: stop all tracks when hook unmounts
  // -------------------------------------------------------
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { localStream, remoteStream, cameraError, isConnected, startCamera };
}
