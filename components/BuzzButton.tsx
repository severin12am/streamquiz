'use client';
// ============================================================
// BuzzButton — The big red BUZZ button
//
// Shown during the 'question' phase (open-ended mode).
// Clicking sends the buzz action to Supabase which then
// syncs to both players instantly.
//
// TO CHANGE BUZZ TIMING: edit BUZZ_WINDOW_SECONDS in useGameState.ts
//
// States:
//   idle        — available to click
//   buzzed_me   — I buzzed, waiting to speak
//   buzzed_them — other player buzzed
//   disabled    — game not in question phase
// ============================================================

import React from 'react';

type BuzzState = 'idle' | 'buzzed_me' | 'buzzed_them' | 'disabled';

interface BuzzButtonProps {
  state:       BuzzState;
  countdown?:  number; // seconds remaining in buzz window
  onBuzz:      () => void;
}

export default function BuzzButton({ state, countdown, onBuzz }: BuzzButtonProps) {
  const isClickable = state === 'idle';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* ---- BUZZ button ---- */}
      <button
        onClick={isClickable ? onBuzz : undefined}
        disabled={!isClickable}
        className={[
          'w-36 h-36 rounded-full text-white font-bold text-2xl tracking-wide',
          'uppercase select-none transition-all duration-150 border',
          isClickable
            ? 'cursor-pointer active:scale-95 hover:brightness-110'
            : 'cursor-not-allowed opacity-60',
          state === 'buzzed_me'
            ? 'bg-[var(--buzz-red)] border-white buzz-flash'
            : state === 'buzzed_them'
            ? 'bg-[var(--bg-card)] border-[var(--buzz-red)]'
            : 'bg-[var(--buzz-red)] border-[var(--buzz-red)]',
        ].join(' ')}
        style={isClickable ? { boxShadow: '0 8px 24px rgba(0,0,0,0.45)' } : undefined}
        aria-label={isClickable ? 'Buzz in to answer' : 'Buzz not available'}
      >
        Buzz
      </button>

      {/* ---- Status message under button ---- */}
      <div className="text-center text-sm font-medium h-6">
        {state === 'idle' && (
          <span className="text-[var(--text-secondary)]">
            Tap to answer first
          </span>
        )}
        {state === 'buzzed_me' && (
          <span className="text-[var(--buzz-red)] font-semibold">
            You buzzed, start speaking{' '}
            {countdown !== undefined && countdown > 0 && (
              <span className="text-[var(--text-primary)]">({countdown}s)</span>
            )}
          </span>
        )}
        {state === 'buzzed_them' && (
          <span className="text-[var(--text-secondary)]">
            Other player is answering
          </span>
        )}
        {state === 'disabled' && (
          <span className="text-[var(--text-muted)]">
            —
          </span>
        )}
      </div>
    </div>
  );
}
