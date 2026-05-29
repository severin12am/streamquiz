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

interface ScoreBoardProps {
  hostScore:   number;
  playerScore: number;
  hostStreak?:   number;  // consecutive correct answers (host)
  playerStreak?: number;  // consecutive correct answers (player)
  hostLabel?:  string;    // default "HOST"
  playerLabel?: string;   // default "STREAMER"
}

// Small flame badge shown under a score when that player is on a
// streak of 2 or more correct answers. Bigger streak = hotter label.
function StreakBadge({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <span
      className="text-xs font-black px-2 py-0.5 rounded-full mt-1"
      style={{
        background: 'linear-gradient(90deg,#ff6a00,#ff0000)',
        color: 'white',
        boxShadow: '0 0 12px #ff4d0080',
      }}
    >
      🔥 {streak} streak
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
        <span className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
          {hostLabel}
        </span>
        <span
          className="text-5xl font-black tabular-nums transition-all duration-300"
          style={{
            color: hostFlash ? 'var(--gold)' : 'var(--text-primary)',
            textShadow: hostFlash ? '0 0 20px var(--gold)' : 'none',
            transform: hostFlash ? 'scale(1.2)' : 'scale(1)',
          }}
        >
          {hostScore}
        </span>
        <StreakBadge streak={hostStreak} />
      </div>

      {/* VS divider */}
      <div className="flex flex-col items-center">
        <span
          className="text-sm font-black tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          VS
        </span>
      </div>

      {/* Player score */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
          {playerLabel}
        </span>
        <span
          className="text-5xl font-black tabular-nums transition-all duration-300"
          style={{
            color: playerFlash ? 'var(--gold)' : 'var(--text-primary)',
            textShadow: playerFlash ? '0 0 20px var(--gold)' : 'none',
            transform: playerFlash ? 'scale(1.2)' : 'scale(1)',
          }}
        >
          {playerScore}
        </span>
        <StreakBadge streak={playerStreak} />
      </div>
    </div>
  );
}
