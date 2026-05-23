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
  onPlayAgain?: () => void;
}

export default function WinnerScreen({
  hostScore,
  playerScore,
  clips,
  onPlayAgain,
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
        background: 'rgba(10,10,15,0.97)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* ---- Trophy icon ---- */}
      <div
        className="text-8xl"
        style={{ textShadow: '0 0 40px var(--gold)' }}
      >
        🏆
      </div>

      {/* ---- Winner label ---- */}
      <div className="text-center">
        <p className="text-[var(--text-muted)] text-sm font-bold tracking-widest uppercase mb-2">
          Winner
        </p>
        <p
          className="text-6xl font-black tracking-wider"
          style={{
            color: 'var(--gold)',
            textShadow: '0 0 30px var(--gold)',
          }}
        >
          {winner}
        </p>
      </div>

      {/* ---- Final scores ---- */}
      <div className="flex items-center gap-8 text-center">
        <div>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest">Host</p>
          <p className="text-4xl font-black text-[var(--text-primary)]">{hostScore}</p>
        </div>
        <span className="text-[var(--text-muted)] text-2xl font-bold">—</span>
        <div>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest">Streamer</p>
          <p className="text-4xl font-black text-[var(--text-primary)]">{playerScore}</p>
        </div>
      </div>

      {/* ---- Download video clips ---- */}
      {clips.length > 0 && (
        <div className="w-full max-w-md">
          <p className="text-[var(--text-secondary)] text-sm font-bold tracking-widest uppercase mb-3 text-center">
            Download Answer Clips
          </p>
          <div className="flex flex-col gap-2">
            {clips.map((clip, i) => (
              <a
                key={i}
                href={clip.url}
                download={`streamquiz-q${clip.questionIndex + 1}-${clip.role}.webm`}
                className="flex items-center justify-between px-4 py-3 rounded-xl border hover:brightness-110 transition-all"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                }}
              >
                <span className="text-sm">
                  Q{clip.questionIndex + 1} · {clip.role.toUpperCase()} answer
                </span>
                <span className="text-xs text-[var(--accent)]">↓ Download</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ---- Play again ---- */}
      {onPlayAgain && (
        <button
          onClick={onPlayAgain}
          className="px-8 py-3 rounded-xl font-bold text-white transition-all hover:brightness-110 active:scale-95"
          style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}
        >
          Play Again
        </button>
      )}
    </div>
  );
}
