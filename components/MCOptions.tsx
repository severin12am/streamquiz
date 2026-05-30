'use client';
// ============================================================
// MCOptions — Multiple choice answer buttons
//
// Both players answer independently. While the round is open each
// player sees ONLY their own pick highlighted (neutral accent — not a
// right/wrong colour, since the answer isn't revealed yet). At the
// reveal (result phase) the grid shows:
//   - the correct option in green (✓)
//   - each player's pick tagged ("You" / the opponent's name)
//   - wrong picks in red
// No full-screen colour flash — the grid itself shows the outcome.
// ============================================================

import React from 'react';

interface MCOptionsProps {
  options:        [string, string, string, string];
  /** Provided ONLY at the reveal (result phase). Undefined while open. */
  correctAnswer?: string;
  /** This viewer's own pick (0-3) or null. */
  myPick?:        number | null;
  /** The opponent's pick — only shown at the reveal. */
  opponentPick?:  number | null;
  /** Can this viewer still click an option? */
  canSelect:      boolean;
  /** Labels for the pick tags. */
  youLabel?:      string;
  opponentLabel?: string;
  onSelect:       (index: number) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export default function MCOptions({
  options,
  correctAnswer,
  myPick = null,
  opponentPick = null,
  canSelect,
  youLabel = 'You',
  opponentLabel = 'Guest 1',
  onSelect,
}: MCOptionsProps) {
  const revealed = correctAnswer != null;

  return (
    <div className="grid grid-cols-2 gap-2 lg:gap-3 w-full max-w-lg">
      {options.map((option, i) => {
        const pickedByMe  = myPick === i;
        const pickedByOpp = revealed && opponentPick === i;
        const isCorrect   = revealed && option === correctAnswer;
        const isWrongPick = revealed && (pickedByMe || pickedByOpp) && !isCorrect;

        // Colours: neutral by default. Only the reveal shows green/red.
        // Before the reveal, MY pick gets a calm accent highlight.
        let borderColour = 'var(--border)';
        let background   = 'var(--bg-card)';
        if (isCorrect) {
          borderColour = 'var(--correct)';
          background   = 'rgba(34,160,107,0.12)';
        } else if (isWrongPick) {
          borderColour = 'var(--wrong)';
          background   = 'rgba(229,72,77,0.12)';
        } else if (pickedByMe && !revealed) {
          borderColour = 'var(--accent)';
          background   = 'var(--bg-elevated)';
        }

        const badgeColour = isCorrect
          ? 'var(--correct)'
          : isWrongPick
          ? 'var(--wrong)'
          : pickedByMe && !revealed
          ? 'var(--accent)'
          : 'var(--bg-elevated)';

        return (
          <button
            key={i}
            onClick={() => canSelect && onSelect(i)}
            disabled={!canSelect}
            className={[
              'relative flex items-center gap-2.5 lg:gap-3 p-2.5 lg:p-4 rounded-xl text-left',
              'font-medium transition-colors duration-150 border',
              canSelect ? 'cursor-pointer' : 'cursor-default',
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
                color: isCorrect || isWrongPick || (pickedByMe && !revealed)
                  ? 'white'
                  : 'var(--text-secondary)',
              }}
            >
              {OPTION_LABELS[i]}
            </span>

            {/* Option text */}
            <span className="text-sm text-[var(--text-primary)] leading-tight flex-1">
              {option}
            </span>

            {/* Who-picked tags (mine while open; both at the reveal) */}
            <span className="flex flex-col items-end gap-0.5 ml-auto flex-shrink-0">
              {pickedByMe && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
                  style={{ background: 'var(--bg-base)', color: 'var(--accent)' }}
                >
                  {youLabel}
                </span>
              )}
              {pickedByOpp && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
                  style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)' }}
                >
                  {opponentLabel}
                </span>
              )}
            </span>

            {/* Correct/wrong icon (reveal only) */}
            {isCorrect    && <span className="text-[var(--correct)] text-lg">✓</span>}
            {isWrongPick  && <span className="text-[var(--wrong)] text-lg">✗</span>}
          </button>
        );
      })}
    </div>
  );
}
