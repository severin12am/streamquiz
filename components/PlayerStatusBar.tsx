'use client';
// ============================================================
// PlayerStatusBar — compact per-player status used in the call overlay.
//
// One chip per player, each showing:
//   • a circle in the player's (lobby-assigned) colour — an OUTLINE while
//     they haven't answered yet this round, FILLED once they have;
//   • their name (capped at 10 characters);
//   • their score, coloured in the same player colour.
//
// Replaces the old per-feed score/answered indicators so the camera tiles
// stay clean and every player's state lives in one place.
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import type { Player, GamePhase } from '@/lib/types';
import { playerColor } from '@/lib/player-colors';

interface PlayerStatusBarProps {
  players: Player[];
  meId:    string;
  /** Current phase — used to show who has already answered this round. */
  phase?:  GamePhase;
  /** True in multiple-choice mode (answered = picked an option). */
  mcMode?: boolean;
  /** Flex alignment (desktop). */
  align?:  'start' | 'center';
  /** Inline mode (mobile): chips are inline-flex so they wrap around the PiP
   *  float — flowing to its right first, then continuing below it. */
  inline?: boolean;
  /** When true, show remove control on guest chips. */
  canKick?: boolean;
  onKick?: (player: Player) => void;
}

/** Cap a name at 10 characters with an ellipsis. */
function shortName(name: string): string {
  const n = (name ?? '').trim();
  return n.length > 10 ? `${n.slice(0, 10)}\u2026` : n;
}

export default function PlayerStatusBar({
  players,
  meId,
  phase,
  mcMode = false,
  align = 'start',
  inline = false,
  canKick = false,
  onKick,
}: PlayerStatusBarProps) {
  // Flash a score that just changed.
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

  // During an open answer phase the circle reflects who has answered.
  const showAnswered = phase === 'question' || phase === 'answering';
  const hasAnswered = (p: Player) => (mcMode ? p.mc_index !== null : p.done);

  const ranked = [...players].sort((a, b) => b.score - a.score || a.slot - b.slot);

  // Per-chip class: inline-flex so chips can wrap around a float (mobile),
  // otherwise a flex item inside a flex-wrap row (desktop).
  const chipClass = inline
    ? 'inline-flex items-center gap-1.5 rounded-full px-2 py-1 mr-1.5 mb-1.5 align-middle'
    : 'flex items-center gap-1.5 rounded-full px-2 py-1';

  const chips = ranked.map((p) => {
    const colour   = playerColor(p.slot);
    const isMe     = p.id === meId;
    const flash    = flashing[p.id];
    const answered = !showAnswered || hasAnswered(p);
    return (
      <div
        key={p.id}
        className={chipClass}
        style={{
          background: isMe ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.22)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: `1px solid ${isMe ? colour : 'var(--border)'}`,
        }}
      >
        {/* Answered indicator — outline (empty) → filled in player colour */}
        <span
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-200"
          style={{
            background: answered ? colour : 'transparent',
            border: answered ? 'none' : `1.5px solid ${colour}`,
          }}
        />
        <span
          className="text-[11px] lg:text-xs font-medium leading-none whitespace-nowrap"
          style={{ color: 'var(--text-primary)' }}
        >
          {shortName(p.name)}
        </span>
        <span
          className="text-xs lg:text-sm font-bold tabular-nums leading-none transition-transform duration-200"
          style={{ color: colour, transform: flash ? 'scale(1.25)' : 'scale(1)' }}
        >
          {p.score}
        </span>
        {canKick && onKick && p.role === 'player' && (
          <button
            type="button"
            title="Remove"
            onClick={(e) => {
              e.stopPropagation();
              onKick(p);
            }}
            className="ml-0.5 text-[10px] font-bold leading-none opacity-80 hover:opacity-100"
            style={{ color: 'var(--wrong)' }}
          >
            ×
          </button>
        )}
      </div>
    );
  });

  // Inline layout: a plain block whose inline-flex chips flow around the PiP.
  if (inline) {
    return <div className="-mb-1.5">{chips}</div>;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
      {chips}
    </div>
  );
}
