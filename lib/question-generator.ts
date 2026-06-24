// ============================================================
// WhoSmarter — Question generation (SERVER ONLY)
//
// Shared by /api/create-game (initial creation) and
// /api/generate-questions (rematch regeneration).
//
// Builds the prompts, calls the AI provider chain (xAI → fallback),
// parses + sanitizes the model output into a clean Question[].
// ============================================================

import type { Difficulty, Question } from './types';
import { sanitizeMcQuestion } from './mc-utils';
import { buildQuestionPrompts } from './quiz-prompts';
import { chatWithFallback } from './ai';

const MAX_PREVIOUS_QUESTIONS = 20;
const MAX_QUESTION_TEXT_LEN = 300;

// Generate the quiz in the SAME language the TOPIC is written in (detected
// from the topic text) — NOT the UI language. A Russian topic produces
// Russian questions, an English topic English ones, etc.
const LANGUAGE_INSTRUCTION =
  `Detect the language of the quiz topic and write ALL question text and ` +
  `answer options in that SAME language. Do not translate the topic or ` +
  `switch languages. For example: a Russian topic must produce Russian ` +
  `questions and options; an English topic must produce English questions ` +
  `and options.`;

export function sanitizePreviousQuestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((q): q is string => typeof q === 'string')
    .map((q) => q.trim().slice(0, MAX_QUESTION_TEXT_LEN))
    .filter(Boolean)
    .slice(-MAX_PREVIOUS_QUESTIONS);
}

export interface ValidatedConfig {
  topic: string;
  difficulty: Difficulty;
  count: number;
  mcMode: boolean;
  previousQuestions: string[];
}

export type ValidationResult =
  | { ok: true; config: ValidatedConfig }
  | { ok: false; error: string };

/**
 * Validate the raw request body. Returns either a clean config or an error
 * string suitable for a 400 response. Caps num_questions to [3, 20].
 */
export function validateConfig(body: unknown): ValidationResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const topic = typeof b.topic === 'string' ? b.topic.trim() : '';

  if (!topic || topic.length > 200) {
    return { ok: false, error: 'Invalid topic.' };
  }
  const difficulty = b.difficulty;
  if (difficulty !== 'easy' && difficulty !== 'medium' && difficulty !== 'hard') {
    return { ok: false, error: 'Invalid difficulty.' };
  }
  const count = Math.min(Math.max(Number(b.num_questions) || 5, 3), 20);

  return {
    ok: true,
    config: {
      topic,
      difficulty,
      count,
      mcMode: Boolean(b.mc_mode),
      previousQuestions: sanitizePreviousQuestions(b.previous_questions),
    },
  };
}

export interface GenerateResult {
  questions: Question[];
  provider: string;
  model: string;
}

/**
 * Generate a clean array of quiz questions for the given config.
 * Throws on AI failure or unparseable output.
 */
export async function generateQuestions(
  config: ValidatedConfig,
): Promise<GenerateResult> {
  const { topic, difficulty, count, mcMode, previousQuestions } = config;

  const { systemPrompt, userPrompt } = buildQuestionPrompts({
    topic,
    difficulty,
    count,
    mcMode,
    languageInstruction: LANGUAGE_INSTRUCTION,
    previousQuestions,
  });

  const { content, provider, model } = await chatWithFallback(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    difficulty,
    { temperature: 0.8, maxTokens: 3000 },
  );

  // Strip accidental markdown code fences if the model adds them.
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI returned invalid JSON. Try again.');
  }

  let questions: Question[];
  if (Array.isArray(parsed)) {
    questions = parsed as Question[];
  } else if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'questions' in parsed &&
    Array.isArray((parsed as Record<string, unknown>).questions)
  ) {
    questions = (parsed as { questions: Question[] }).questions;
  } else {
    const firstArray = Object.values(parsed as object).find(Array.isArray);
    if (firstArray) {
      questions = firstArray as Question[];
    } else {
      throw new Error('Unexpected response format from the AI.');
    }
  }

  // Trim to requested count (model may return more).
  questions = questions.slice(0, count);

  // MC mode: validate structure and align correct_answer to an option.
  if (mcMode) {
    questions = questions.map((q) => sanitizeMcQuestion(q));
  }

  if (questions.length === 0) {
    throw new Error('No questions were generated. Please try a different topic.');
  }

  return { questions, provider, model };
}
