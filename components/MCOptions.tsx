'use client';
// ============================================================
// MCOptions — Multiple choice answer buttons (multiplayer)
//
// Every player answers independently. While the round is open each
// player sees ONLY their own pick highlighted (neutral accent — the
// answer isn't revealed yet). At the reveal (result phase) the grid
// shows the correct option in green (✓), the viewer's own wrong pick in
// red (✗), and a small count of how many players chose each option.
// ============================================================

import React from 'react';
import { playerInitial } from '@/lib/player-colors';
import type { OptionPick } from './QuestionPanel';

interface MCOptionsProps {
  options:        [string, string, string, string];
  /** Provided ONLY at the reveal (result phase). Undefined while open. */
  correctAnswer?: string;
  /** This viewer's own pick (0-3) or null. */
  myPick?:        number | null;
  /** WHO chose each option (length 4) — shown at the reveal, colour-coded. */
  picksByOption?: OptionPick[][];
  /** Can this viewer still click an option? */
  canSelect:      boolean;
  /** Label for the "your pick" tag. */
  youLabel?:      string;
  onSelect:       (index: number) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export default function MCOptions({
  options,
  correctAnswer,
  myPick = null,
  picksByOption,
  canSelect,
  youLabel = 'You',
  onSelect,
}: MCOptionsProps) {
  const revealed = correctAnswer != null;

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full max-w-lg pb-1">
      {options.map((option, i) => {
        const pickedByMe  = myPick === i;
        const isCorrect   = revealed && option === correctAnswer;
        const isWrongPick = revealed && pickedByMe && !isCorrect;
        const picks       = picksByOption?.[i] ?? [];

        const revealedClass = isCorrect
          ? 'keycap-revealed-correct'
          : isWrongPick
          ? 'keycap-revealed-wrong'
          : 'keycap-revealed-neutral';

        const variantClass = canSelect
          ? pickedByMe && !revealed
            ? 'keycap-primary'
            : 'keycap-secondary'
          : revealed
          ? revealedClass
          : 'keycap-secondary';

        return (
          <button
            key={i}
            onClick={() => canSelect && onSelect(i)}
            aria-disabled={!canSelect || undefined}
            className={[
              'keycap keycap-glass relative flex items-start gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-xl text-left font-medium text-xs sm:text-sm',
              variantClass,
              canSelect ? 'cursor-pointer' : revealed ? 'keycap-revealed cursor-default' : 'cursor-default opacity-90 pointer-events-none',
            ].join(' ')}
          >
            {/* Letter badge */}
            <span
              className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[10px] sm:text-xs font-semibold"
              style={{
                background: isCorrect
                  ? 'var(--correct)'
                  : isWrongPick
                  ? 'var(--wrong)'
                  : pickedByMe && !revealed
                  ? 'var(--accent)'
                  : 'var(--bg-elevated)',
                color: isCorrect || isWrongPick || (pickedByMe && !revealed)
                  ? 'white'
                  : 'var(--text-secondary)',
              }}
            >
              {OPTION_LABELS[i]}
            </span>

            {/* Option text */}
            <span className="leading-tight flex-1 min-w-0 break-words [color:inherit]">
              {option}
            </span>

            {/* Tags */}
            <span className="flex flex-col items-end gap-1 ml-auto flex-shrink-0">
              {/* Your pick tag while the round is still open (pre-reveal) */}
              {pickedByMe && !revealed && (
                <span
                  className="text-[9px] font-semibold px-1 py-0.5 rounded uppercase tracking-wide"
                  style={{ background: 'var(--bg-base)', color: 'var(--accent)' }}
                >
                  {youLabel}
                </span>
              )}

              {/* At the reveal: colour avatars of everyone who chose this */}
              {revealed && picks.length > 0 && (
                <span className="flex items-center gap-0.5 flex-wrap justify-end max-w-[60px] sm:max-w-[90px]">
                  {picks.map((pick) => (
                    <span
                      key={pick.id}
                      title={pick.name}
                      className="flex items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{
                        background: pick.colour,
                        width: 16,
                        height: 16,
                        boxShadow: pick.isMe ? '0 0 0 1.5px var(--bg-card), 0 0 0 2.5px var(--text-primary)' : 'none',
                      }}
                    >
                      {playerInitial(pick.name)}
                    </span>
                  ))}
                </span>
              )}
            </span>

            {/* Correct/wrong icon (reveal only) */}
            {isCorrect   && <span className="text-[var(--correct)] text-base">✓</span>}
            {isWrongPick && <span className="text-[var(--wrong)] text-base">✗</span>}
          </button>
        );
      })}
    </div>
  );
}
