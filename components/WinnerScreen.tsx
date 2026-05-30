'use client';
// ============================================================
// WinnerScreen — End-of-game overlay
//
// Shown when game.phase === 'ended'.
// Displays the winner, final scores, and video clip downloads.
//
// TO CHANGE: winner logic is simply whoever has the higher score.
// Tie-breaking: currently shows "TIE!" — edit below to change.
// ============================================================

import React from 'react';
import type { AnswerClip } from '@/hooks/useMediaRecorder';

interface WinnerScreenProps {
  hostScore:   number;
  playerScore: number;
  clips:       AnswerClip[];
  /** Host only: restart the SAME match (same questions, same link). */
  onRematch?:  () => void;
  /** Leave to the home page (available to everyone). */
  onExit?:     () => void;
}

export default function WinnerScreen({
  hostScore,
  playerScore,
  clips,
  onRematch,
  onExit,
}: WinnerScreenProps) {
  const winner =
    hostScore > playerScore
      ? 'HOST'
      : playerScore > hostScore
      ? 'STREAMER'
      : 'TIE';

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 p-8"
      style={{
        background: 'rgba(13,13,16,0.97)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* ---- Winner label ---- */}
      <div className="text-center">
        <p className="text-[var(--text-muted)] text-xs font-semibold tracking-wider uppercase mb-3">
          {winner === 'TIE' ? 'Result' : 'Winner'}
        </p>
        <p
          className="text-6xl font-bold tracking-tight"
          style={{ color: winner === 'TIE' ? 'var(--text-primary)' : 'var(--gold)' }}
        >
          {winner === 'TIE' ? 'Tie' : winner === 'HOST' ? 'Host' : 'Streamer'}
        </p>
      </div>

      {/* ---- Final scores ---- */}
      <div className="flex items-center gap-8 text-center">
        <div>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider">Host</p>
          <p className="text-4xl font-bold text-[var(--text-primary)] tabular-nums">{hostScore}</p>
        </div>
        <span className="text-[var(--border-strong)] text-2xl">—</span>
        <div>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider">Streamer</p>
          <p className="text-4xl font-bold text-[var(--text-primary)] tabular-nums">{playerScore}</p>
        </div>
      </div>

      {/* ---- Download video clips ---- */}
      {clips.length > 0 && (
        <div className="w-full max-w-md">
          <p className="text-[var(--text-muted)] text-xs font-semibold tracking-wider uppercase mb-3 text-center">
            Download answer clips
          </p>
          <div className="flex flex-col gap-2">
            {clips.map((clip, i) => (
              <a
                key={i}
                href={clip.url}
                download={`streamquiz-q${clip.questionIndex + 1}-${clip.role}.webm`}
                className="flex items-center justify-between px-4 py-3 rounded-xl border transition-colors"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
              >
                <span className="text-sm">
                  Q{clip.questionIndex + 1} · {clip.role === 'host' ? 'Host' : 'Streamer'} answer
                </span>
                <span className="text-xs text-[var(--accent)]">Download</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ---- Actions: Rematch (host) + Exit ---- */}
      <div className="flex items-center gap-3">
        {/* Rematch keeps the same questions and the same link, so the
            opponent's tab will automatically return to the lobby. */}
        {onRematch && (
          <button
            onClick={onRematch}
            className="px-8 py-3 rounded-xl font-semibold text-white transition-colors"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            Rematch
          </button>
        )}

        {/* The player (no rematch control) sees a waiting hint instead. */}
        {!onRematch && (
          <p className="text-[var(--text-secondary)] text-sm">
            Waiting for the host to start a rematch
          </p>
        )}

        {onExit && (
          <button
            onClick={onExit}
            className="px-6 py-3 rounded-xl font-semibold transition-colors"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
          >
            Exit
          </button>
        )}
      </div>
    </div>
  );
}
