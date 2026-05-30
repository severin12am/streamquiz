'use client';
// ============================================================
// MCOptions — Multiple choice answer buttons
//
// Shown in place of the BUZZ button when mc_mode is ON.
// First player to click any option wins (no buzzing needed).
// Auto-scored: correct = green, wrong = red.
//
// Design: 2x2 grid of large clickable option cards.
// Letters A/B/C/D match classic quiz-show style.
// ============================================================

import React from 'react';

interface MCOptionsProps {
  options:            [string, string, string, string];
  correctAnswer?:     string;
  lockedIn?:          boolean;
  selectedIndex?:     number | null;
  disabled?:          boolean;  // steal-locked player cannot pick
  onSelect:           (index: number) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export default function MCOptions({
  options,
  correctAnswer,
  lockedIn = false,
  selectedIndex,
  disabled = false,
  onSelect,
}: MCOptionsProps) {
  const canSelect = !lockedIn && !disabled;

  return (
    <div className="grid grid-cols-2 gap-2 lg:gap-3 w-full max-w-lg">
      {options.map((option, i) => {
        const isSelected = selectedIndex === i;
        const isCorrect  = lockedIn && option === correctAnswer;
        const isWrong    = isSelected && lockedIn && option !== correctAnswer;

        // Uniform styling: neutral by default, status colour only on
        // reveal. No per-option colours, no glows.
        let borderColour = 'var(--border)';
        let background   = 'var(--bg-card)';
        if (isCorrect) {
          borderColour = 'var(--correct)';
          background   = 'rgba(34,160,107,0.12)';
        } else if (isWrong) {
          borderColour = 'var(--wrong)';
          background   = 'rgba(229,72,77,0.12)';
        }

        // Badge colour follows the option's state too.
        const badgeColour = isCorrect
          ? 'var(--correct)'
          : isWrong
          ? 'var(--wrong)'
          : 'var(--bg-elevated)';

        return (
          <button
            key={i}
            onClick={() => canSelect && onSelect(i)}
            disabled={!canSelect}
            className={[
              'flex items-center gap-2.5 lg:gap-3 p-2.5 lg:p-4 rounded-xl text-left',
              'font-medium transition-colors duration-150 border',
              canSelect ? 'cursor-pointer' : 'cursor-default opacity-60',
            ].join(' ')}
            style={{ borderColor: borderColour, background }}
            onMouseEnter={(e) => {
              if (canSelect) {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.background = 'var(--bg-elevated)';
              }
            }}
            onMouseLeave={(e) => {
              if (canSelect) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--bg-card)';
              }
            }}
          >
            {/* Letter badge */}
            <span
              className="flex-shrink-0 w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
              style={{
                background: badgeColour,
                color: isCorrect || isWrong ? 'white' : 'var(--text-secondary)',
              }}
            >
              {OPTION_LABELS[i]}
            </span>
            {/* Option text */}
            <span className="text-sm text-[var(--text-primary)] leading-tight">
              {option}
            </span>
            {/* Correct/wrong icon */}
            {isCorrect && <span className="ml-auto text-[var(--correct)] text-lg">✓</span>}
            {isWrong   && <span className="ml-auto text-[var(--wrong)] text-lg">✗</span>}
          </button>
        );
      })}
    </div>
  );
}
