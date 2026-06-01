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
}: CameraPanelProps) {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach the stream to the <video> element whenever it changes.
  // We also explicitly call play() because browsers can silently
  // block autoplay of UNMUTED video (the remote feed has audio),
  // which would otherwise show a frozen/black frame.
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch((err) => {
        // Autoplay was blocked — log it; user interaction (clicking
        // Start) usually unblocks it on the next attempt.
        console.warn('[CameraPanel] video.play() blocked:', err?.message);
      });
    }
  }, [stream]);

  return (
    <div
      className={`relative flex flex-col h-full bg-[var(--bg-panel)] overflow-hidden ${className}`}
      style={{
        border: isSpeaking
          ? '2px solid var(--buzz-red)'
          : '2px solid var(--border)',
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

      {/* ---- Player label + score badge at bottom ---- */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 gap-2"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      >
        <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-primary)] truncate">
          {label}
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

      {/* ---- Mic active indicator (top-right corner) ---- */}
      {isSpeaking && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-[var(--accent)] text-white text-xs font-semibold px-2 py-1 rounded-full">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {t('game.answering')}
        </div>
      )}
    </div>
  );
}
