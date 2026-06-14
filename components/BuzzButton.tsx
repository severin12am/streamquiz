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
import { useLocale } from '@/context/LocaleProvider';

type BuzzState = 'idle' | 'buzzed_me' | 'buzzed_them' | 'disabled';

interface BuzzButtonProps {
  state:       BuzzState;
  countdown?:  number; // seconds remaining in buzz window
  onBuzz:      () => void;
}

export default function BuzzButton({ state, countdown, onBuzz }: BuzzButtonProps) {
  const { t } = useLocale();
  const isClickable = state === 'idle';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* ---- BUZZ button ---- */}
      <button
        onClick={isClickable ? onBuzz : undefined}
        disabled={state === 'disabled'}
        aria-disabled={!isClickable || undefined}
        className={[
          'keycap w-36 h-36 rounded-full font-bold text-2xl tracking-wide',
          'uppercase select-none',
          state === 'idle' || state === 'buzzed_me' || state === 'disabled'
            ? 'keycap-danger'
            : 'keycap-secondary',
          state === 'idle' ? 'cursor-pointer' : 'keycap-revealed cursor-not-allowed',
          state === 'buzzed_me' ? 'buzz-flash' : '',
          state === 'disabled' ? 'opacity-60' : '',
        ].join(' ')}
        aria-label={isClickable ? t('buzz.ariaBuzz') : t('buzz.ariaDisabled')}
      >
        {t('buzz.label')}
      </button>

      {/* ---- Status message under button ---- */}
      <div className="text-center text-sm font-medium h-6">
        {state === 'idle' && (
          <span className="text-[var(--text-secondary)]">
            {t('buzz.tapFirst')}
          </span>
        )}
        {state === 'buzzed_me' && (
          <span className="text-[var(--buzz-red)] font-semibold">
            {t('buzz.youBuzzed')}{' '}
            {countdown !== undefined && countdown > 0 && (
              <span className="text-[var(--text-primary)]">({countdown}s)</span>
            )}
          </span>
        )}
        {state === 'buzzed_them' && (
          <span className="text-[var(--text-secondary)]">
            {t('buzz.otherAnswering')}
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
