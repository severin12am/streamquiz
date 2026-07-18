'use client';
// ============================================================
// WinnerScreen — End-of-game overlay (multiplayer)
//
// Shown when game.phase === 'ended'. Ranks every player by score and
// crowns the top scorer (or declares a tie). Everyone can vote to
// rematch; the match restarts once the host + at least one other vote.
// ============================================================

import React from 'react';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleProvider';
import type { Player } from '@/lib/types';
import { playerColor, playerInitial } from '@/lib/player-colors';

interface WinnerScreenProps {
  players: Player[];
  meId:    string;
  onVoteRematch?: () => void;
  myVote?:        boolean;
  rematchLoading?: boolean;
  /** Last rematch replayed the same quiz because the host's create quota ran out. */
  rematchQuotaExceeded?: boolean;
  onExit?:        () => void;
  /** Seconds left in the post-game discussion window (cameras still live). */
  discussLeft?:   number;
  /** True once the discussion window elapsed and the feeds were cut. */
  feedsCut?:      boolean;
}

export default function WinnerScreen({
  players,
  meId,
  onVoteRematch,
  myVote = false,
  rematchLoading = false,
  rematchQuotaExceeded = false,
  onExit,
  discussLeft,
  feedsCut = false,
}: WinnerScreenProps) {
  const { t } = useLocale();

  const ranked = [...players].sort((a, b) => b.score - a.score || a.slot - b.slot);
  const topScore = ranked.length > 0 ? ranked[0].score : 0;
  const winners = ranked.filter((p) => p.score === topScore && topScore > 0);
  const isTie = winners.length !== 1;
  const soleWinner = !isTie && topScore > 0 ? winners[0] : null;

  const showDiscuss = !feedsCut && typeof discussLeft === 'number';

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-30 flex flex-col gap-3 sm:gap-4 p-3 sm:p-5 max-h-[88vh] overflow-y-auto rounded-t-2xl"
      style={{ background: 'rgba(238,243,236,0.82)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)' }}
    >
      {/* ---- Winner banner ---- */}
      <div className="flex flex-col items-center text-center">
        <span className="text-4xl lg:text-5xl mb-1" aria-hidden>
          {topScore === 0 ? '🤝' : '🏆'}
        </span>
        <p className="text-[var(--text-muted)] text-[10px] font-semibold tracking-[0.2em] uppercase mb-2">
          {topScore === 0 ? t('winner.result') : isTie ? t('winner.winners') : t('winner.winner')}
        </p>

        {/* Sole winner — big colour avatar + name */}
        {soleWinner ? (
          <div className="flex flex-col items-center gap-1.5">
            <span
              className="w-16 h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center text-2xl lg:text-3xl font-bold text-white"
              style={{
                background: playerColor(soleWinner.slot),
                boxShadow: '0 0 0 4px var(--bg-base), 0 0 0 7px var(--gold)',
              }}
            >
              {playerInitial(soleWinner.name)}
            </span>
            <p
              className="text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight max-w-full break-words px-2"
              style={{ color: playerColor(soleWinner.slot) }}
            >
              {soleWinner.name}
            </p>
            <p className="text-base font-semibold" style={{ color: 'var(--gold)' }}>
              {soleWinner.score} {t('score.points')}
            </p>
          </div>
        ) : (
          <p
            className="text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight max-w-full break-words px-2 text-center"
            style={{ color: topScore === 0 ? 'var(--text-primary)' : 'var(--gold)' }}
          >
            {topScore === 0
              ? t('winner.tie')
              : winners.map((w) => w.name).join(', ')}
          </p>
        )}
      </div>

      {/* ---- Discussion-window banner (cameras still live) ---- */}
      {showDiscuss && (
        <div
          className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(47,125,119,0.12)', color: 'var(--accent)' }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          {t('winner.discuss', { n: discussLeft })}
        </div>
      )}
      {feedsCut && (
        <p className="text-center text-[10px] text-[var(--text-muted)]">
          {t('winner.discussHint')}
        </p>
      )}

      {/* ---- Final scores (ranked, compact horizontal-ish) ---- */}
      <div className="w-full max-w-sm mx-auto flex flex-col gap-1.5">
        <p className="text-[var(--text-muted)] text-[10px] font-semibold tracking-wider uppercase text-center">
          {t('winner.finalScores')}
        </p>
        {ranked.map((p, i) => {
          const isWinner = p.score === topScore && topScore > 0;
          const colour = playerColor(p.slot);
          return (
            <div
              key={p.id}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid var(--border)',
                boxShadow: isWinner ? '0 0 0 2px var(--gold)' : undefined,
              }}
            >
              <span
                className="w-5 text-center text-xs font-bold tabular-nums"
                style={{ color: isWinner ? 'var(--gold)' : 'var(--text-muted)' }}
              >
                {isWinner ? '🏆' : i + 1}
              </span>
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: colour }}
              >
                {playerInitial(p.name)}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)] truncate flex-1">
                {p.name}
                {p.id === meId && (
                  <span className="text-[var(--text-muted)] ml-1.5">({t('lobby.you')})</span>
                )}
              </span>
              <span className="text-lg font-bold tabular-nums" style={{ color: isWinner ? 'var(--gold)' : 'var(--text-primary)' }}>
                {p.score}
              </span>
            </div>
          );
        })}
      </div>

      {/* ---- Rematch voting ---- */}
      <div className="flex flex-col items-center gap-2">
        {rematchQuotaExceeded && (
          <p className="text-center text-xs text-[var(--text-muted)] max-w-sm px-2">
            {t('billing.rematchQuotaExceeded')}{' '}
            <Link href="/upgrade" className="underline hover:text-[var(--text-secondary)]">
              {t('billing.seePlans')}
            </Link>
          </p>
        )}
        <div className="flex items-center flex-wrap justify-center gap-2 text-[10px]">
          {players.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1"
              style={{ color: p.rematch ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: p.rematch ? playerColor(p.slot) : 'transparent',
                  border: p.rematch ? 'none' : '1.5px solid var(--border-strong)',
                }}
              />
              {p.name}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full max-w-sm px-2 sm:px-0">
          {onVoteRematch && (
            <button
              onClick={onVoteRematch}
              disabled={myVote || rematchLoading}
              className="keycap keycap-primary flex items-center justify-center gap-2 px-5 sm:px-7 py-2.5 rounded-xl font-semibold text-white w-full sm:w-auto"
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
              className="keycap keycap-secondary px-5 py-2.5 rounded-xl font-semibold w-full sm:w-auto"
            >
              {t('winner.exit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
