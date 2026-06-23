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
const CAMERA_DEBUG = false;

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
  /** Render as a small picture-in-picture tile (self feed): trims the chrome. */
  compact?:   boolean;
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
  compact = false,
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

  // Stable identity of the attached media. We key the attach/play effects on
  // this (NOT on the stream object or unrelated props) so we only touch the
  // <video> element when the actual media changes.
  const streamId = stream?.id ?? null;

  // Attach the MediaStream to the <video> element.
  //
  // CRITICAL: the <video> element is ALWAYS mounted (see render below) — it is
  // never conditionally removed from the DOM. A remote stream can briefly drop
  // and return (ICE restart / presence flap, common on iOS + TURN); if the
  // element were unmounted at that moment, a pending play() throws
  // "play() request was interrupted because the media was removed from the
  // document" and the returning feed never renders. Keeping one stable element
  // and just swapping srcObject avoids that entirely.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!stream) {
      if (video.srcObject) video.srcObject = null;
      return;
    }
    if (video.srcObject === stream) return; // already attached — no churn
    video.srcObject = stream;

    if (CAMERA_DEBUG) {
      console.log('[Camera] attached stream to <video>', {
        label, mirrored, streamId: stream.id,
        tracks: stream.getTracks().map((tr) => ({ kind: tr.kind, readyState: tr.readyState, muted: tr.muted })),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key on stream identity only
  }, [streamId]);

  // Play guard: start playback once metadata is ready and SWALLOW the benign
  // AbortError (a superseded play) and autoplay-gate NotAllowedError. Without
  // this, transient interruptions spam the console and can leave a black tile.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    const tryPlay = () => {
      video.play().catch((err: DOMException) => {
        if (err?.name === 'AbortError' || err?.name === 'NotAllowedError') return;
        console.warn('[Camera] play() failed', { label, error: err?.message });
      });
    };

    video.addEventListener('loadedmetadata', tryPlay);
    if (video.readyState >= 1) tryPlay(); // metadata already present (re-attach)
    return () => video.removeEventListener('loadedmetadata', tryPlay);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key on stream identity only
  }, [streamId]);

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
      {/* ---- Camera video — ALWAYS mounted (never conditionally removed) so a
           briefly-dropped remote stream can't interrupt play() / blank the tile. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={mirrored} // mute local video to avoid audio echo
        className="w-full h-full object-cover"
        style={{
          transform: mirrored ? 'scaleX(-1)' : 'none',
          visibility: stream ? 'visible' : 'hidden',
        }}
      />

      {/* Placeholder overlay when there's no stream yet */}
      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
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

      {/* ---- IDENTITY PILL (top-left): color · name · score · answered ----
           Everything a player needs to know about this feed lives here, so
           the quiz overlay can keep the rest of the tile clear. */}
      <div
        className={`absolute z-10 top-1.5 start-1.5 flex items-center rounded-full text-white
          ${compact ? 'gap-1 px-1.5 py-0.5' : 'gap-1.5 px-2 py-1'}`}
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      >
        {color && (
          <span
            className={`inline-block rounded-full flex-shrink-0 ${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'}`}
            style={{ background: color }}
          />
        )}
        {!compact && (
          <span className="text-[11px] font-semibold tracking-wide uppercase truncate max-w-[8rem]">
            {label}
          </span>
        )}
        {typeof score === 'number' && (
          <span
            className={`font-bold tabular-nums ${compact ? 'text-[11px]' : 'text-xs'}`}
            style={{ color: 'var(--gold)' }}
          >
            {score}
          </span>
        )}
        {/* Answered-this-round indicator */}
        {answered !== null && (
          <span
            className={`inline-block rounded-full flex-shrink-0 ${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'}`}
            style={{
              background: answered ? 'var(--correct)' : 'transparent',
              border: answered ? 'none' : '1.5px solid rgba(255,255,255,0.6)',
            }}
            title={answered ? t('game.tileAnswered') : t('game.tileThinking')}
          />
        )}
      </div>

      {/* ---- Connection / mic diagnostics (top-right) — hidden on PiP ---- */}
      {!compact && (
        <div className="absolute top-1.5 end-1.5 flex items-center gap-1.5">
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
      )}

      {/* ---- Round result badge (bottom-right) ---- */}
      {correct !== null && (
        <div
          className={`absolute bottom-1.5 end-1.5 rounded-full flex items-center justify-center font-bold text-white
            ${compact ? 'w-5 h-5 text-xs' : 'w-7 h-7 text-base'}`}
          style={{ background: correct ? 'var(--correct)' : 'var(--wrong)' }}
        >
          {correct ? '\u2713' : '\u2717'}
        </div>
      )}

      {/* ---- Answering indicator (bottom-left corner) ---- */}
      {isSpeaking && !compact && (
        <div className="absolute bottom-1.5 start-1.5 flex items-center gap-1.5 bg-[var(--accent)] text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
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
