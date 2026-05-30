'use client';
// ============================================================
// ScoreBoard — Live score display
//
// Shows HOST vs GUEST scores with a "VS" divider.
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
  hostLabel?:  string;    // default "HOST"
  playerLabel?: string;   // default "GUEST"
}

export default function ScoreBoard({
  hostScore,
  playerScore,
  hostLabel   = 'HOST',
  playerLabel = 'GUEST',
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
      </div>
    </div>
  );
}
