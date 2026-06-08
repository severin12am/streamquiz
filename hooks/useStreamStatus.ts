'use client';
// ============================================================
// useStreamStatus — live mic/camera health for ONE media stream.
//
// Given a player's MediaStream (local or remote), this reports whether a
// mic / camera track is actually present and producing data, plus a live
// audio level so the UI can show who is really being heard. It's the data
// behind the per-tile status badges that make it obvious WHY you can't
// see or hear someone:
//
//   • no audio track at all      → their mic/permission is the problem
//   • audio track but muted=true → no audio is currently reaching us
//   • audioLevel stays at 0       → mic captured but silent / not talking
//   • no video track (cams on)    → their camera is the problem
//
// Audio level is measured with the Web Audio API (an AnalyserNode that is
// NOT connected to the speakers, so it never produces sound or echo).
// ============================================================

import { useEffect, useRef, useState } from 'react';

export interface StreamStatus {
  /** An audio track exists on the stream. */
  hasAudio: boolean;
  /** The audio track is enabled (not locally muted via push-to-talk). */
  audioEnabled: boolean;
  /** The audio track is muted = no media is flowing right now. */
  audioMuted: boolean;
  /** Smoothed mic loudness, 0 (silent) → 1 (loud). */
  audioLevel: number;
  /** True when audioLevel is above the "is making sound" threshold. */
  speaking: boolean;
  /** A video track exists on the stream. */
  hasVideo: boolean;
  /** The video track is live and unmuted (actually delivering frames). */
  videoLive: boolean;
}

const SILENT: StreamStatus = {
  hasAudio: false,
  audioEnabled: false,
  audioMuted: false,
  audioLevel: 0,
  speaking: false,
  hasVideo: false,
  videoLive: false,
};

const SPEAKING_THRESHOLD = 0.06;

// Browsers cap the number of live AudioContexts (~6), so every tile shares
// ONE context instead of opening its own. Each tile still gets its own
// source + analyser node off this shared context.
let sharedCtx: AudioContext | null = null;
function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedCtx && sharedCtx.state !== 'closed') return sharedCtx;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctx();
    return sharedCtx;
  } catch {
    return null;
  }
}

export function useStreamStatus(stream: MediaStream | null): StreamStatus {
  const [status, setStatus] = useState<StreamStatus>(SILENT);
  const levelRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let data: Uint8Array<ArrayBuffer> | null = null;

    // Build an analyser if (and only if) there's an audio track to measure.
    const audioTrack = stream?.getAudioTracks()[0] ?? null;
    const audioCtx = audioTrack ? getSharedAudioContext() : null;
    if (stream && audioTrack && audioCtx) {
      try {
        audioCtx.resume?.().catch(() => {});
        source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser); // NOT connected to destination → silent
        data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      } catch {
        analyser = null;
      }
    }

    const measure = () => {
      let level = 0;
      if (analyser && data) {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128; // -1 → 1
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length); // 0 → ~1
        // Smooth so the meter doesn't flicker.
        level = Math.max(rms, levelRef.current * 0.8);
      }
      levelRef.current = level;
      return level;
    };

    const tick = () => {
      if (cancelled) return;
      if (!stream) {
        // Stable constant reference → React skips the re-render.
        setStatus(SILENT);
        return;
      }
      const aTrack = stream.getAudioTracks()[0] ?? null;
      const vTrack = stream.getVideoTracks()[0] ?? null;
      const level = measure();

      setStatus({
        hasAudio: !!aTrack,
        audioEnabled: !!aTrack && aTrack.enabled,
        audioMuted: !!aTrack && aTrack.muted,
        audioLevel: level,
        speaking: !!aTrack && aTrack.enabled && level > SPEAKING_THRESHOLD,
        hasVideo: !!vTrack,
        videoLive: !!vTrack && vTrack.readyState === 'live' && !vTrack.muted,
      });
    };
    // ~8 updates/sec is plenty for status badges + a level meter, and keeps
    // re-renders cheap even with six tiles on screen at once.
    timer = setInterval(tick, 120);
    tick();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      // Only tear down this tile's nodes — the shared context stays alive.
      try { source?.disconnect(); } catch { /* noop */ }
      try { analyser?.disconnect(); } catch { /* noop */ }
    };
  }, [stream]);

  return status;
}
