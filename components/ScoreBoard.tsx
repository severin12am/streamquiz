'use client';
// ============================================================
// ScoreBoard — Live multiplayer leaderboard
//
// Shows every player's score as a compact, wrapping row sorted highest
// first. Each player has a STABLE colour (by seat) shown as an avatar so
// they're easy to tell apart everywhere. The local player is highlighted,
// and a score that just changed briefly flashes gold.
//
// During an answer phase a small dot shows WHO has already answered
// (filled in the player's colour) vs. who's still thinking (hollow).
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import type { Player, GamePhase } from '@/lib/types';
import { playerColor, playerInitial } from '@/lib/player-colors';

interface ScoreBoardProps {
  players: Player[];
  meId:    string;
  /** Current phase — used to show who has already answered. */
  phase?:  GamePhase;
}

export default function ScoreBoard({ players, meId, phase }: ScoreBoardProps) {
  // Track previous scores so we can flash the ones that changed.
  const prevScores = useRef<Record<string, number>>({});
  const [flashing, setFlashing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const changed: Record<string, boolean> = {};
    for (const p of players) {
      if (prevScores.current[p.id] !== undefined && prevScores.current[p.id] !== p.score) {
        changed[p.id] = true;
      }
      prevScores.current[p.id] = p.score;
    }
    if (Object.keys(changed).length > 0) {
      setFlashing((f) => ({ ...f, ...changed }));
      const t = setTimeout(() => setFlashing({}), 800);
      return () => clearTimeout(t);
    }
  }, [players]);

  const ranked = [...players].sort((a, b) => b.score - a.score || a.slot - b.slot);

  // Whether we should show "answered" dots, and how to read "answered".
  const showAnswered = phase === 'question' || phase === 'answering';
  const hasAnswered = (p: Player) =>
    phase === 'question' ? p.mc_index !== null : p.done;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0">
      {ranked.map((p) => {
        const isMe   = p.id === meId;
        const flash  = flashing[p.id];
        const colour = playerColor(p.slot);
        const answered = hasAnswered(p);
        return (
          <div key={p.id} className="keycap-chip shrink-0">
            <div
              className={`keycap-chip-inner flex items-center gap-2 pl-1 pr-2.5 py-1 transition-all duration-300${isMe ? ' is-me' : ''}`}
              style={{ transform: flash ? 'scale(1.08)' : 'scale(1)' }}
            >
            {/* Colour avatar (player identity) */}
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: colour }}
            >
              {playerInitial(p.name)}
            </span>
            <span
              className="text-xs font-medium truncate max-w-[64px] sm:max-w-[88px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {p.name}
            </span>
            {/* Answered indicator (only during an open answer phase) */}
            {showAnswered && (
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0 transition-all duration-200"
                style={{
                  background: answered ? colour : 'transparent',
                  border: answered ? 'none' : '1.5px solid var(--border-strong)',
                }}
                title={answered ? 'Answered' : 'Thinking…'}
              />
            )}
            <span
              className="text-base font-bold tabular-nums transition-colors duration-300"
              style={{ color: flash ? 'var(--gold)' : 'var(--text-primary)' }}
            >
              {p.score}
            </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
