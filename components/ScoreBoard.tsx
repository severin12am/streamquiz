'use client';
// ============================================================
// ScoreBoard — Live score display
//
// Shows HOST vs STREAMER scores with a "VS" divider.
// Animates score changes with a brief flash.
//
// TO CHANGE SCORING: see judgeAnswer() in useGameState.ts
// Currently: +1 point for correct answer
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/context/LocaleProvider';

interface ScoreBoardProps {
  hostScore:   number;
  playerScore: number;
  hostStreak?:   number;  // consecutive correct answers (host)
  playerStreak?: number;  // consecutive correct answers (player)
  hostLabel?:  string;    // default "HOST"
  playerLabel?: string;   // default "STREAMER"
}

// Small badge shown under a score when that player is on a streak of
// 2 or more correct answers. Flat, solid styling (no gradient/glow).
function StreakBadge({ streak }: { streak: number }) {
  const { t } = useLocale();
  if (streak < 2) return null;
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 uppercase tracking-wider"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        color: 'var(--gold)',
      }}
    >
      {t('score.streak', { n: streak })}
    </span>
  );
}

export default function ScoreBoard({
  hostScore,
  playerScore,
  hostStreak   = 0,
  playerStreak = 0,
  hostLabel   = 'HOST',
  playerLabel = 'STREAMER',
}: ScoreBoardProps) {
  const { t } = useLocale();
  // Track previous scores to flash the changed one
  const prevHostRef   = useRef(hostScore);
  const prevPlayerRef = useRef(playerScore);
  const [hostFlash,   setHostFlash]   = useState(false);
  const [playerFlash, setPlayerFlash] = useState(false);

  useEffect(() => {
    if (hostScore !== prevHostRef.current) {
      prevHostRef.current = hostScore;
      setHostFlash(true);
      setTimeout(() => setHostFlash(false), 800);
    }
  }, [hostScore]);

  useEffect(() => {
    if (playerScore !== prevPlayerRef.current) {
      prevPlayerRef.current = playerScore;
      setPlayerFlash(true);
      setTimeout(() => setPlayerFlash(false), 800);
    }
  }, [playerScore]);

  return (
    <div className="flex items-center justify-center gap-6">
      {/* Host score */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
          {hostLabel}
        </span>
        <span
          className="text-5xl font-bold tabular-nums transition-all duration-300"
          style={{
            color: hostFlash ? 'var(--gold)' : 'var(--text-primary)',
            transform: hostFlash ? 'scale(1.12)' : 'scale(1)',
          }}
        >
          {hostScore}
        </span>
        <StreakBadge streak={hostStreak} />
      </div>

      {/* VS divider */}
      <div className="flex flex-col items-center">
        <span
          className="text-xs font-medium tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('score.vs')}
        </span>
      </div>

      {/* Player score */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
          {playerLabel}
        </span>
        <span
          className="text-5xl font-bold tabular-nums transition-all duration-300"
          style={{
            color: playerFlash ? 'var(--gold)' : 'var(--text-primary)',
            transform: playerFlash ? 'scale(1.12)' : 'scale(1)',
          }}
        >
          {playerScore}
        </span>
        <StreakBadge streak={playerStreak} />
      </div>
    </div>
  );
}
