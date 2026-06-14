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
import { playerColor, playerInitial } from '@/lib/player-colors';

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
  const soleWinner = !isTie && topScore > 0 ? winners[0] : null;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 sm:gap-6 p-4 sm:p-8 overflow-y-auto"
      style={{ background: 'rgba(238,243,236,0.96)', backdropFilter: 'blur(8px)' }}
    >
      {/* ---- Winner banner ---- */}
      <div className="flex flex-col items-center text-center">
        <span className="text-5xl lg:text-6xl mb-2" aria-hidden>
          {topScore === 0 ? '🤝' : '🏆'}
        </span>
        <p className="text-[var(--text-muted)] text-xs font-semibold tracking-[0.2em] uppercase mb-3">
          {topScore === 0 ? t('winner.result') : isTie ? t('winner.winners') : t('winner.winner')}
        </p>

        {/* Sole winner — big colour avatar + name */}
        {soleWinner ? (
          <div className="flex flex-col items-center gap-3">
            <span
              className="w-20 h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center text-3xl lg:text-4xl font-bold text-white"
              style={{
                background: playerColor(soleWinner.slot),
                boxShadow: '0 0 0 4px var(--bg-base), 0 0 0 7px var(--gold)',
              }}
            >
              {playerInitial(soleWinner.name)}
            </span>
            <p
              className="text-2xl sm:text-4xl lg:text-6xl font-bold tracking-tight max-w-full break-words px-2"
              style={{ color: playerColor(soleWinner.slot) }}
            >
              {soleWinner.name}
            </p>
            <p className="text-lg font-semibold" style={{ color: 'var(--gold)' }}>
              {soleWinner.score} {t('score.points')}
            </p>
          </div>
        ) : (
          <p
            className="text-2xl sm:text-4xl lg:text-6xl font-bold tracking-tight max-w-full break-words px-2 text-center"
            style={{ color: topScore === 0 ? 'var(--text-primary)' : 'var(--gold)' }}
          >
            {topScore === 0
              ? t('winner.tie')
              : winners.map((w) => w.name).join(', ')}
          </p>
        )}
      </div>

      {/* ---- Final scores (ranked) ---- */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        <p className="text-[var(--text-muted)] text-xs font-semibold tracking-wider uppercase text-center mb-1">
          {t('winner.finalScores')}
        </p>
        {ranked.map((p, i) => {
          const isWinner = p.score === topScore && topScore > 0;
          const colour = playerColor(p.slot);
          return (
            <div
              key={p.id}
              className="keycap-well-frame"
              style={isWinner ? { boxShadow: '0 0 0 2px var(--gold)' } : undefined}
            >
              <div className="keycap-well flex items-center gap-3 px-4 py-2.5">
              <span
                className="w-6 text-center text-sm font-bold tabular-nums"
                style={{ color: isWinner ? 'var(--gold)' : 'var(--text-muted)' }}
              >
                {isWinner ? '🏆' : i + 1}
              </span>
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
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
              <span className="text-xl font-bold tabular-nums" style={{ color: isWinner ? 'var(--gold)' : 'var(--text-primary)' }}>
                {p.score}
              </span>
              </div>
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
                download={`whosmarter-q${clip.questionIndex + 1}-${clip.role}.webm`}
                className="keycap keycap-secondary w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium no-underline"
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
              style={{ color: p.rematch ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: p.rematch ? playerColor(p.slot) : 'transparent',
                  border: p.rematch ? 'none' : '1.5px solid var(--border-strong)',
                }}
              />
              {p.name}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-sm px-2 sm:px-0">
          {onVoteRematch && (
            <button
              onClick={onVoteRematch}
              disabled={myVote || rematchLoading}
              className="keycap keycap-primary flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-xl font-semibold text-white w-full sm:w-auto"
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
              className="keycap keycap-secondary px-6 py-3 rounded-xl font-semibold w-full sm:w-auto"
            >
              {t('winner.exit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
