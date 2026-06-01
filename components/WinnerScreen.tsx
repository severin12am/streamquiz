'use client';
// ============================================================
// WinnerScreen — End-of-game overlay (multiplayer)
//
// Shown when game.phase === 'ended'. Ranks every player by score and
// crowns the top scorer (or declares a tie). Everyone can vote to
// rematch; the match restarts once the host + at least one other vote.
// ============================================================

import React from 'react';
import { useLocale } from '@/context/LocaleProvider';
import type { AnswerClip } from '@/hooks/useMediaRecorder';
import type { Player } from '@/lib/types';

interface WinnerScreenProps {
  players: Player[];
  meId:    string;
  clips:   AnswerClip[];
  onVoteRematch?: () => void;
  myVote?:        boolean;
  rematchLoading?: boolean;
  onExit?:        () => void;
}

export default function WinnerScreen({
  players,
  meId,
  clips,
  onVoteRematch,
  myVote = false,
  rematchLoading = false,
  onExit,
}: WinnerScreenProps) {
  const { t } = useLocale();

  const ranked = [...players].sort((a, b) => b.score - a.score || a.slot - b.slot);
  const topScore = ranked.length > 0 ? ranked[0].score : 0;
  const winners = ranked.filter((p) => p.score === topScore && topScore > 0);
  const isTie = winners.length !== 1;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 p-8 overflow-y-auto"
      style={{ background: 'rgba(13,13,16,0.97)', backdropFilter: 'blur(8px)' }}
    >
      {/* ---- Winner label ---- */}
      <div className="text-center">
        <p className="text-[var(--text-muted)] text-xs font-semibold tracking-wider uppercase mb-3">
          {topScore === 0 ? t('winner.result') : isTie ? t('winner.winners') : t('winner.winner')}
        </p>
        <p
          className="text-4xl lg:text-6xl font-bold tracking-tight"
          style={{ color: topScore === 0 ? 'var(--text-primary)' : 'var(--gold)' }}
        >
          {topScore === 0
            ? t('winner.tie')
            : winners.map((w) => w.name).join(', ')}
        </p>
      </div>

      {/* ---- Final scores (ranked) ---- */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        <p className="text-[var(--text-muted)] text-xs font-semibold tracking-wider uppercase text-center mb-1">
          {t('winner.finalScores')}
        </p>
        {ranked.map((p, i) => {
          const isWinner = p.score === topScore && topScore > 0;
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 border"
              style={{
                background: 'var(--bg-card)',
                borderColor: p.id === meId ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <span
                className="w-6 text-center text-sm font-bold tabular-nums"
                style={{ color: isWinner ? 'var(--gold)' : 'var(--text-muted)' }}
              >
                {i + 1}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)] truncate flex-1">
                {p.name}
                {p.id === meId && (
                  <span className="text-[var(--text-muted)] ml-1.5">({t('lobby.you')})</span>
                )}
              </span>
              <span className="text-xl font-bold tabular-nums" style={{ color: isWinner ? 'var(--gold)' : 'var(--text-primary)' }}>
                {p.score}
              </span>
            </div>
          );
        })}
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
                  {t('winner.clipLabel', { n: clip.questionIndex + 1, role: clip.role })}
                </span>
                <span className="text-xs text-[var(--accent)]">{t('winner.download')}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ---- Rematch voting ---- */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center flex-wrap justify-center gap-3 text-xs">
          {players.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1.5"
              style={{ color: p.rematch ? 'var(--correct)' : 'var(--text-muted)' }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: p.rematch ? 'var(--correct)' : 'var(--border-strong)' }}
              />
              {p.name}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {onVoteRematch && (
            <button
              onClick={onVoteRematch}
              disabled={myVote || rematchLoading}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-70"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={(e) => { if (!myVote && !rematchLoading) e.currentTarget.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={(e) => { if (!myVote && !rematchLoading) e.currentTarget.style.background = 'var(--accent)'; }}
            >
              {rematchLoading && (
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              )}
              {rematchLoading
                ? t('create.generating')
                : myVote
                ? t('winner.rematchWaiting')
                : t('winner.rematch')}
            </button>
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
    </div>
  );
}
