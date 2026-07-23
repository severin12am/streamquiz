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
import { generateGeographyQuestions } from './geography/generate';
import {
  encodeGeographyTopic,
  GEOGRAPHY_REGIONS,
  GEOGRAPHY_TYPES,
  type GeographyConfig,
  type GeographyRegion,
  type GeographyType,
} from './geography/types';
import {
  encodePdfTopic,
  isPdfTopic,
  MAX_PDF_TEXT_CHARS,
  truncatePdfText,
} from './pdf-source';

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

const PDF_LANGUAGE_INSTRUCTION =
  `Detect the language of the SOURCE DOCUMENT and write ALL question text and ` +
  `answer options in that SAME language. Do not translate or switch languages.`;

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
  /** When set, questions come from curated geography data (no LLM). */
  geography?: GeographyConfig;
  /** When set, LLM questions are grounded in this PDF/document text. */
  sourceText?: string;
}

export type ValidationResult =
  | { ok: true; config: ValidatedConfig }
  | { ok: false; error: string };

function parseGeographyPayload(raw: unknown): GeographyConfig | { error: string } {
  if (raw == null || typeof raw !== 'object') {
    return { error: 'Invalid geography config.' };
  }
  const g = raw as Record<string, unknown>;
  const typesRaw = Array.isArray(g.types) ? g.types : [];
  const types = typesRaw
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter((t): t is GeographyType =>
      (GEOGRAPHY_TYPES as readonly string[]).includes(t),
    );

  if (types.length === 0) {
    return { error: 'Select at least one geography question type.' };
  }

  // Eliminate is exclusive.
  const normalized: GeographyType[] = types.includes('eliminate')
    ? ['eliminate']
    : types;

  const regionsRaw = Array.isArray(g.regions) ? g.regions : [];
  const regions = regionsRaw
    .filter((r): r is string => typeof r === 'string')
    .map((r) => r.trim())
    .filter((r): r is GeographyRegion =>
      (GEOGRAPHY_REGIONS as readonly string[]).includes(r),
    );

  return { types: normalized, regions };
}

function parseSourceText(raw: unknown): string | { error: string } | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== 'string') {
    return { error: 'Invalid PDF source text.' };
  }
  const text = truncatePdfText(raw);
  if (text.length < 40) {
    return { error: 'PDF text is too short to build a quiz.' };
  }
  if (text.length > MAX_PDF_TEXT_CHARS + 80) {
    return { error: 'PDF text is too long.' };
  }
  return text;
}

/**
 * Validate the raw request body. Returns either a clean config or an error
 * string suitable for a 400 response.
 * Caps num_questions to [3, 20] for normal quizzes; eliminate may be higher.
 */
export function validateConfig(body: unknown): ValidationResult {
  const b = (body ?? {}) as Record<string, unknown>;

  const sourceParsed = parseSourceText(b.source_text);
  if (sourceParsed && typeof sourceParsed === 'object' && 'error' in sourceParsed) {
    return { ok: false, error: sourceParsed.error };
  }
  const sourceText = typeof sourceParsed === 'string' ? sourceParsed : undefined;

  let geography: GeographyConfig | undefined;
  if (!sourceText && b.geography != null) {
    const parsed = parseGeographyPayload(b.geography);
    if ('error' in parsed) {
      return { ok: false, error: parsed.error };
    }
    geography = parsed;
  }

  let topic: string;
  if (sourceText) {
    const fileHint =
      typeof b.topic === 'string' && b.topic.trim()
        ? b.topic.trim()
        : 'document.pdf';
    topic = encodePdfTopic(
      isPdfTopic(fileHint)
        ? fileHint.slice(4).trim() || 'document.pdf'
        : fileHint,
    );
  } else if (geography) {
    topic = encodeGeographyTopic(geography);
  } else {
    topic = typeof b.topic === 'string' ? b.topic.trim() : '';
  }

  if (!topic || topic.length > 200) {
    return { ok: false, error: 'Invalid topic.' };
  }

  // Geography / PDF ignore difficulty in the UI; still store a valid DB value.
  const difficulty = geography || sourceText
    ? 'medium'
    : b.difficulty;
  if (difficulty !== 'easy' && difficulty !== 'medium' && difficulty !== 'hard') {
    return { ok: false, error: 'Invalid difficulty.' };
  }

  const rawCount = Number(b.num_questions) || 5;
  const count = geography?.types.includes('eliminate')
    ? Math.min(Math.max(rawCount, 3), 250)
    : Math.min(Math.max(rawCount, 3), 20);

  return {
    ok: true,
    config: {
      topic,
      difficulty,
      count,
      mcMode: Boolean(b.mc_mode),
      previousQuestions: sanitizePreviousQuestions(b.previous_questions),
      geography,
      sourceText,
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
 * Geography: curated data (no LLM). Otherwise: AI provider chain.
 */
export async function generateQuestions(
  config: ValidatedConfig,
): Promise<GenerateResult> {
  const {
    topic,
    difficulty,
    count,
    mcMode,
    previousQuestions,
    geography,
    sourceText,
  } = config;

  if (geography) {
    let questions = generateGeographyQuestions(
      geography,
      mcMode,
      count,
      previousQuestions,
    );
    questions = questions.map((q) =>
      q.options ? sanitizeMcQuestion(q) : q,
    );
    if (questions.length === 0) {
      throw new Error('No geography questions could be built.');
    }
    return {
      questions,
      provider: 'geography',
      model: 'curated',
    };
  }

  const { systemPrompt, userPrompt } = buildQuestionPrompts({
    topic,
    difficulty,
    count,
    mcMode,
    languageInstruction: sourceText
      ? PDF_LANGUAGE_INSTRUCTION
      : LANGUAGE_INSTRUCTION,
    previousQuestions,
    sourceText,
  });

  const { content, provider, model } = await chatWithFallback(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    difficulty,
    {
      temperature: 0.8,
      // PDF source adds a large user prompt; leave room for the JSON quiz.
      maxTokens: sourceText ? 4000 : 3000,
    },
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
