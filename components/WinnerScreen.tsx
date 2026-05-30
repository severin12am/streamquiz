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
import { useLocale } from '@/context/LocaleProvider';
import type { AnswerClip } from '@/hooks/useMediaRecorder';

interface WinnerScreenProps {
  hostScore:   number;
  playerScore: number;
  clips:       AnswerClip[];
  /** Host only: restart with FRESH questions (same settings, same link). */
  onRematch?:  () => void;
  /** True while the rematch is generating new questions. */
  rematchLoading?: boolean;
  /** Leave to the home page (available to everyone). */
  onExit?:     () => void;
}

export default function WinnerScreen({
  hostScore,
  playerScore,
  clips,
  onRematch,
  rematchLoading = false,
  onExit,
}: WinnerScreenProps) {
  const { t } = useLocale();

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
          {winner === 'TIE' ? t('winner.result') : t('winner.winner')}
        </p>
        <p
          className="text-6xl font-bold tracking-tight"
          style={{ color: winner === 'TIE' ? 'var(--text-primary)' : 'var(--gold)' }}
        >
          {winner === 'TIE'
            ? t('winner.tie')
            : winner === 'HOST'
            ? t('game.host')
            : t('game.streamer')}
        </p>
      </div>

      {/* ---- Final scores ---- */}
      <div className="flex items-center gap-8 text-center">
        <div>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider">{t('game.host')}</p>
          <p className="text-4xl font-bold text-[var(--text-primary)] tabular-nums">{hostScore}</p>
        </div>
        <span className="text-[var(--border-strong)] text-2xl">—</span>
        <div>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider">{t('game.streamer')}</p>
          <p className="text-4xl font-bold text-[var(--text-primary)] tabular-nums">{playerScore}</p>
        </div>
      </div>

      {/* ---- Download video clips ---- */}
      {clips.length > 0 && (
        <div className="w-full max-w-md">
          <p className="text-[var(--text-muted)] text-xs font-semibold tracking-wider uppercase mb-3 text-center">
            {t('winner.downloadClips')}
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
                  {t('winner.clipLabel', {
                    n: clip.questionIndex + 1,
                    role: clip.role === 'host' ? t('game.host') : t('game.streamer'),
                  })}
                </span>
                <span className="text-xs text-[var(--accent)]">{t('winner.download')}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ---- Actions: Rematch (host) + Exit ---- */}
      <div className="flex items-center gap-3">
        {/* Rematch generates fresh questions (same settings) and reuses
            the link, so the opponent's tab returns to the lobby. */}
        {onRematch && (
          <button
            onClick={onRematch}
            disabled={rematchLoading}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-70"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) => { if (!rematchLoading) e.currentTarget.style.background = 'var(--accent-hover)'; }}
            onMouseLeave={(e) => { if (!rematchLoading) e.currentTarget.style.background = 'var(--accent)'; }}
          >
            {rematchLoading && (
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            )}
            {rematchLoading ? t('create.generating') : t('winner.rematch')}
          </button>
        )}

        {/* The player (no rematch control) sees a waiting hint instead. */}
        {!onRematch && (
          <p className="text-[var(--text-secondary)] text-sm">
            {t('winner.waitRematch')}
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
            {t('winner.exit')}
          </button>
        )}
      </div>
    </div>
  );
}
