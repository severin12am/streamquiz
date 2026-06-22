'use client';
// ============================================================
// CameraPanel — Single camera section (left or right)
//
// Shows either the local camera stream or the remote stream.
// Includes a player label, connection indicator, and a
// "speaking" pulse ring when that player is answering.
//
// Props:
//   stream       — MediaStream to display
//   label        — "HOST" or "STREAMER"
//   isSpeaking   — true when this player is answering (adds pulse)
//   mirrored     — true for local camera (looks more natural)
//   error        — camera error message to display
// ============================================================

import React, { useEffect, useRef } from 'react';
import { useLocale } from '@/context/LocaleProvider';
import { useStreamStatus } from '@/hooks/useStreamStatus';

// Flip to true to print verbose camera attach/play logs while debugging.
// TEMP: enabled while diagnosing "each player only sees their own video".
const CAMERA_DEBUG = true;

interface CameraPanelProps {
  stream:     MediaStream | null;
  label:      string;
  isSpeaking: boolean;
  mirrored?:  boolean;
  error?:     string | null;
  className?: string;
  /** Live score to show on the tile (multiplayer). Omit to hide. */
  score?:     number;
  /** Round outcome for the badge: true=✓, false=✗, null/undefined=none. */
  correct?:   boolean | null;
  /** Stable per-player identity colour. */
  color?:     string;
  /** Has this player answered this round? Shows a small status dot. */
  answered?:  boolean | null;
  /** This is the local player's own tile. */
  isLocal?:   boolean;
  /** Host enabled cameras for this game (show camera diagnostics). */
  camerasEnabled?: boolean;
  /** Remote peer connection state: true=connected, false=connecting, undefined=n/a (local). */
  connected?: boolean;
}

export default function CameraPanel({
  stream,
  label,
  isSpeaking,
  mirrored = false,
  error,
  className = '',
  score,
  correct = null,
  color,
  answered = null,
  isLocal = false,
  camerasEnabled = false,
  connected,
}: CameraPanelProps) {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const status = useStreamStatus(stream);

  // ---- Diagnostics derived from the live stream ----
  // Connection: only meaningful for remote peers.
  const connState: 'connected' | 'connecting' | null = isLocal
    ? null
    : connected
    ? 'connected'
    : 'connecting';

  // Mic health: no track at all is a hard failure (their mic/permission).
  // Otherwise it's neutral at rest and turns green while actually being heard.
  // (We deliberately DON'T flag a quiet/muted mic as an error — with
  // push-to-talk, everyone's mic is muted most of the time by design.)
  const micState: 'off' | 'active' | 'idle' = !status.hasAudio
    ? 'off'
    : status.speaking
    ? 'active'
    : 'idle';

  // Camera health: only flag when the host actually turned cameras on.
  const cameraMissing =
    camerasEnabled && !!stream && !status.videoLive && (!isLocal || !error);

  // Attach the stream to the <video> element whenever it changes.
  // We also explicitly call play() because browsers can silently
  // block autoplay of UNMUTED video (the remote feed has audio),
  // which would otherwise show a frozen/black frame.
  useEffect(() => {
    const video = videoRef.current;
    if (CAMERA_DEBUG) {
      if (!video) {
        console.log('[Camera] effect — no video element yet', { label, mirrored, hasStream: !!stream });
      } else if (!stream) {
        console.log('[Camera] no stream — showing placeholder', { label, mirrored, error });
      } else {
        console.log('[Camera] attaching stream to <video>', {
          label,
          mirrored,
          streamId: stream.id,
          muted: mirrored,
          tracks: stream.getTracks().map((t) => ({
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
            muted: t.muted,
          })),
        });
      }
    }

    if (video && stream) {
      video.srcObject = stream;
      video.play()
        .then(() => {
          if (CAMERA_DEBUG) {
            console.log('[Camera] video.play() succeeded', {
              label,
              mirrored,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              readyState: video.readyState,
              paused: video.paused,
            });
          }
        })
        .catch((err) => {
          // Autoplay was blocked — log it; user interaction (clicking
          // Start) usually unblocks it on the next attempt.
          console.warn('[Camera] video.play() blocked', { label, mirrored, error: err?.message });
        });

      // ---- TEMP DEBUG: confirm whether frames actually render ----
      // A remote tile can have a stream attached yet stay black if no media
      // ever arrives. These events tell us if/when real frames show up.
      if (CAMERA_DEBUG && !mirrored) {
        const onLoadedMetadata = () =>
          console.log('[Camera] remote <video> loadedmetadata', {
            label, w: video.videoWidth, h: video.videoHeight,
          });
        const onPlaying = () =>
          console.log('[Camera] remote <video> PLAYING (frames flowing)', {
            label, w: video.videoWidth, h: video.videoHeight,
          });
        const onResize = () =>
          console.log('[Camera] remote <video> resize', {
            label, w: video.videoWidth, h: video.videoHeight,
          });
        const onStalled = () => console.warn('[Camera] remote <video> stalled', { label });
        const onWaiting = () => console.warn('[Camera] remote <video> waiting (no data)', { label });

        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('resize', onResize);
        video.addEventListener('stalled', onStalled);
        video.addEventListener('waiting', onWaiting);

        const trackListeners = stream.getVideoTracks().map((track) => {
          const onMute = () => console.warn('[Camera] remote video track MUTED (no frames arriving)', { label, trackId: track.id });
          const onUnmute = () => console.log('[Camera] remote video track unmuted (frames arriving)', { label, trackId: track.id });
          const onEnded = () => console.warn('[Camera] remote video track ENDED', { label, trackId: track.id });
          console.log('[Camera] remote video track attached', {
            label, trackId: track.id, readyState: track.readyState, muted: track.muted, enabled: track.enabled,
          });
          track.addEventListener('mute', onMute);
          track.addEventListener('unmute', onUnmute);
          track.addEventListener('ended', onEnded);
          return { track, onMute, onUnmute, onEnded };
        });

        return () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('playing', onPlaying);
          video.removeEventListener('resize', onResize);
          video.removeEventListener('stalled', onStalled);
          video.removeEventListener('waiting', onWaiting);
          trackListeners.forEach(({ track, onMute, onUnmute, onEnded }) => {
            track.removeEventListener('mute', onMute);
            track.removeEventListener('unmute', onUnmute);
            track.removeEventListener('ended', onEnded);
          });
        };
      }
    }
  }, [stream, label, mirrored, error]);

  return (
    <div
      className={`relative flex flex-col h-full bg-[var(--bg-panel)] overflow-hidden ${className}`}
      style={{
        border: isSpeaking
          ? '2px solid var(--buzz-red)'
          : `2px solid ${color ?? 'var(--border)'}`,
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* ---- Camera video ---- */}
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={mirrored} // mute local video to avoid audio echo
          className="w-full h-full object-cover"
          style={{
            transform: mirrored ? 'scaleX(-1)' : 'none',
          }}
        />
      ) : (
        /* Placeholder when camera isn't ready yet */
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] flex items-center justify-center">
            {/* Simple camera icon made with CSS */}
            <svg
              className="w-8 h-8 text-[var(--text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z"
              />
            </svg>
          </div>
          <p className="text-[var(--text-muted)] text-sm text-center px-4">
            {error ?? t('game.waitingCamera')}
          </p>
        </div>
      )}

      {/* ---- Camera-off overlay (stream is up but no live video) ---- */}
      {cameraMissing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.45)' }}>
          <svg className="w-7 h-7" style={{ color: 'var(--wrong)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wrong)' }}>
            {t('diag.cameraOff')}
          </span>
        </div>
      )}

      {/* ---- Real-talking glow (push-to-talk / spoken answer) ---- */}
      {status.speaking && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ border: '2px solid var(--correct)', borderRadius: 'inherit' }}
        />
      )}

      {/* ---- Speaking pulse overlay ---- */}
      {isSpeaking && (
        <div
          className="absolute inset-0 pointer-events-none speaking-pulse"
          style={{ border: '2px solid var(--accent)', borderRadius: 'inherit' }}
        />
      )}

      {/* ---- Round result badge (top-left) ---- */}
      {correct !== null && (
        <div
          className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-base font-bold text-white"
          style={{ background: correct ? 'var(--correct)' : 'var(--wrong)' }}
        >
          {correct ? '\u2713' : '\u2717'}
        </div>
      )}

      {/* ---- Connection / mic diagnostics (top-left) ---- */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        {connState && (
          <span
            className="flex items-center justify-center w-6 h-6 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            title={connState === 'connected' ? t('diag.connected') : t('diag.connecting')}
          >
            <span
              className={`inline-block w-2 h-2 rounded-full ${connState === 'connected' ? '' : 'animate-pulse'}`}
              style={{ background: connState === 'connected' ? 'var(--correct)' : 'var(--timer-warning)' }}
            />
          </span>
        )}
        <MicBadge
          state={micState}
          level={status.audioLevel}
          title={
            micState === 'off'
              ? t('diag.micOff')
              : micState === 'active'
              ? t('diag.micActive')
              : t('diag.micIdle')
          }
        />
      </div>

      {/* ---- Player label + score badge at bottom ---- */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 gap-2"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {color && (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: color }}
            />
          )}
          <span className="text-xs font-semibold tracking-wider uppercase text-white truncate">
            {label}
          </span>
          {/* Answered-this-round dot */}
          {answered !== null && (
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: answered ? 'var(--correct)' : 'transparent',
                border: answered ? 'none' : '1.5px solid rgba(255,255,255,0.6)',
              }}
              title={answered ? 'Answered' : 'Thinking…'}
            />
          )}
        </span>
        {typeof score === 'number' ? (
          <span
            className="flex-shrink-0 text-sm font-bold tabular-nums px-2 py-0.5 rounded-md"
            style={{ background: 'var(--bg-card)', color: 'var(--gold)' }}
          >
            {score}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: stream ? 'var(--correct)' : 'var(--text-muted)' }}
            />
            {stream ? t('game.live') : t('game.offline')}
          </span>
        )}
      </div>

      {/* ---- Answering indicator (top-right corner) ---- */}
      {isSpeaking && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-[var(--accent)] text-white text-xs font-semibold px-2 py-1 rounded-full">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {t('game.answering')}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// MicBadge — small mic icon that reflects live mic health:
//   off     → red mic with a slash (no audio track at all)
//   stalled → amber mic (track exists but no audio is reaching us)
//   active  → green mic with a live level bar (currently being heard)
//   idle    → neutral mic (present but quiet / not transmitting)
// ------------------------------------------------------------
function MicBadge({
  state, level, title,
}: {
  state: 'off' | 'active' | 'idle';
  level: number;
  title: string;
}) {
  const colour =
    state === 'off'
      ? 'var(--wrong)'
      : state === 'active'
      ? 'var(--correct)'
      : 'rgba(255,255,255,0.75)';

  // Level meter height (4 → 14px) only when actively transmitting.
  const meterH = state === 'active' ? 4 + Math.min(1, level * 2.2) * 10 : 0;

  return (
    <span
      className="flex items-center gap-1 px-1.5 h-6 rounded-full"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      title={title}
    >
      <svg className="w-3.5 h-3.5" style={{ color: colour }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        {state === 'off' && (
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        )}
      </svg>
      {meterH > 0 && (
        <span
          className="inline-block w-1 rounded-full"
          style={{ height: meterH, background: 'var(--correct)', transition: 'height 0.1s linear' }}
        />
      )}
    </span>
  );
}
