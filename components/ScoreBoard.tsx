'use client';
// ============================================================
// ScoreBoard — Live multiplayer leaderboard
//
// Shows every player's score as a compact, wrapping row sorted highest
// first. The local player is highlighted, and a score that just changed
// briefly flashes gold.
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import type { Player } from '@/lib/types';

interface ScoreBoardProps {
  players: Player[];
  meId:    string;
}

export default function ScoreBoard({ players, meId }: ScoreBoardProps) {
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

  return (
    <div className="flex items-center justify-center flex-wrap gap-2">
      {ranked.map((p) => {
        const isMe  = p.id === meId;
        const flash = flashing[p.id];
        return (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1 border transition-all duration-300"
            style={{
              background: isMe ? 'var(--bg-elevated)' : 'var(--bg-card)',
              borderColor: isMe ? 'var(--accent)' : 'var(--border)',
              transform: flash ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            <span className="text-xs font-medium text-[var(--text-secondary)] truncate max-w-[88px]">
              {p.name}
            </span>
            <span
              className="text-base font-bold tabular-nums transition-colors duration-300"
              style={{ color: flash ? 'var(--gold)' : 'var(--text-primary)' }}
            >
              {p.score}
            </span>
          </div>
        );
      })}
    </div>
  );
}
