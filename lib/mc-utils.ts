// ============================================================
// Multiple-choice helpers — scoring + AI response cleanup
// ============================================================

import type { Question } from '@/lib/types';

/** Normalize text for MC comparison (trim, lowercase, collapse spaces). */
export function normalizeMcText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** True if the chosen option matches the canonical correct answer. */
export function isMcAnswerCorrect(
  chosen: string,
  correctAnswer: string | undefined
): boolean {
  if (!correctAnswer) return false;
  return normalizeMcText(chosen) === normalizeMcText(correctAnswer);
}

/**
 * Fix up an MC question from the AI:
 *   - require exactly 4 options
 *   - align correct_answer to the exact option text when close match
 */
export function sanitizeMcQuestion(raw: Question): Question {
  const options = Array.isArray(raw.options)
    ? raw.options.map((o) => String(o).trim()).filter(Boolean)
    : [];

  if (options.length !== 4) {
    throw new Error(
      `MC question must have exactly 4 options (got ${options.length}): ${raw.question?.slice(0, 60)}`
    );
  }

  const tuple = options as [string, string, string, string];
  let correct = String(raw.correct_answer ?? '').trim();

  if (!correct) {
    throw new Error(`MC question missing correct_answer: ${raw.question?.slice(0, 60)}`);
  }

  // Exact normalized match → use the option's text as stored
  const exactIdx = tuple.findIndex((o) => normalizeMcText(o) === normalizeMcText(correct));
  if (exactIdx >= 0) {
    correct = tuple[exactIdx];
  } else {
    // Fuzzy: option contains correct or correct contains option
    const fuzzyIdx = tuple.findIndex((o) => {
      const a = normalizeMcText(o);
      const b = normalizeMcText(correct);
      return a.includes(b) || b.includes(a);
    });
    if (fuzzyIdx >= 0) {
      correct = tuple[fuzzyIdx];
    } else {
      throw new Error(
        `correct_answer "${correct}" does not match any option for: ${raw.question?.slice(0, 60)}`
      );
    }
  }

  return {
    question: String(raw.question ?? '').trim(),
    options: tuple,
    correct_answer: correct,
  };
}
