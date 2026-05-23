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
  correctAnswer?:     string;   // revealed after someone answers
  lockedIn?:          boolean;  // true after any answer submitted
  selectedIndex?:     number | null; // index chosen by the winner
  onSelect:           (index: number) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

// Colour class per option (TV-show classic colours)
const OPTION_COLOURS = [
  '#1565c0', // A — blue
  '#f57f17', // B — amber
  '#2e7d32', // C — green
  '#c62828', // D — red
] as const;

export default function MCOptions({
  options,
  correctAnswer,
  lockedIn = false,
  selectedIndex,
  onSelect,
}: MCOptionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
      {options.map((option, i) => {
        const isSelected = selectedIndex === i;
        const isCorrect  = lockedIn && option === correctAnswer;
        const isWrong    = isSelected && lockedIn && option !== correctAnswer;

        let borderColour: string = OPTION_COLOURS[i];
        if (isCorrect) borderColour = 'var(--correct)';
        if (isWrong)   borderColour = 'var(--wrong)';

        return (
          <button
            key={i}
            onClick={() => !lockedIn && onSelect(i)}
            disabled={lockedIn}
            className={[
              'flex items-center gap-3 p-4 rounded-xl text-left',
              'font-semibold transition-all duration-200',
              'border-2 bg-[var(--bg-card)]',
              lockedIn
                ? 'cursor-default'
                : 'cursor-pointer hover:brightness-125 active:scale-95',
              isCorrect ? 'glow-correct' : '',
              isWrong   ? 'glow-wrong'   : '',
            ].join(' ')}
            style={{
              borderColor: borderColour,
              background: isCorrect
                ? '#1a3322'
                : isWrong
                ? '#331a1a'
                : 'var(--bg-card)',
            }}
          >
            {/* Letter badge */}
            <span
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
              style={{ background: borderColour }}
            >
              {OPTION_LABELS[i]}
            </span>
            {/* Option text */}
            <span className="text-sm text-[var(--text-primary)] leading-tight">
              {option}
            </span>
            {/* Correct/wrong icon */}
            {isCorrect && (
              <span className="ml-auto text-[var(--correct)] text-lg">✓</span>
            )}
            {isWrong && (
              <span className="ml-auto text-[var(--wrong)] text-lg">✗</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
