'use client';
// ============================================================
// SoundToggle — mute / unmute game sound effects.
// ============================================================

import React, { useState } from 'react';
import { isSoundsMuted, setSoundsMuted } from '@/lib/sounds';

interface SoundToggleProps {
  className?: string;
}

export default function SoundToggle({ className = '' }: SoundToggleProps) {
  const [muted, setMuted] = useState(() =>
    typeof window !== 'undefined' && isSoundsMuted()
  );

  return (
    <button
      type="button"
      onClick={() => {
        const next = !muted;
        setSoundsMuted(next);
        setMuted(next);
      }}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      className={`keycap keycap-secondary flex items-center justify-center rounded-full w-9 h-9 sm:w-10 sm:h-10 ${className}`}
    >
      {muted ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M9.75 9.75l-3.75-3.75v12l3.75-3.75M9.75 9.75H5.25A2.25 2.25 0 003 12v0a2.25 2.25 0 002.25 2.25H9.75" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l-3.75-3.75v12l3.75-3.75M9.75 9.75H5.25A2.25 2.25 0 003 12v0a2.25 2.25 0 002.25 2.25H9.75" />
        </svg>
      )}
    </button>
  );
}
