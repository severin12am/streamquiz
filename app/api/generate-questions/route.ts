// ============================================================
// API Route: POST /api/generate-questions
//
// Receives game config from the host's form and uses OpenAI
// to generate quiz questions. Returns a JSON array of questions.
//
// CHANGE THE PROMPT: lib/quiz-prompts.ts
// CHANGE THE MODEL: modelForDifficulty() below
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { CreateGamePayload, Difficulty, Question } from '@/lib/types';
import { sanitizeMcQuestion } from '@/lib/mc-utils';
import { buildQuestionPrompts } from '@/lib/quiz-prompts';

export const dynamic = 'force-dynamic';

const MAX_PREVIOUS_QUESTIONS = 20;
const MAX_QUESTION_TEXT_LEN = 300;

// Lazily initialise so missing env var doesn't crash the whole app
let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set in .env.local');
    // Using OpenRouter (sk-or-v1-...) which is OpenAI-SDK compatible.
    // If you switch to a real OpenAI key (sk-proj-...), remove the baseURL line.
    openai = new OpenAI({
      apiKey: key,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }
  return openai;
}

function modelForDifficulty(difficulty: Difficulty): string {
  // Stronger model for medium/hard — same OpenRouter key, better calibration.
  return difficulty === 'easy' ? 'openai/gpt-4o-mini' : 'openai/gpt-4o';
}

function sanitizePreviousQuestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((q): q is string => typeof q === 'string')
    .map((q) => q.trim().slice(0, MAX_QUESTION_TEXT_LEN))
    .filter(Boolean)
    .slice(-MAX_PREVIOUS_QUESTIONS);
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateGamePayload = await req.json();
    const {
      topic,
      difficulty,
      num_questions,
      mc_mode,
      previous_questions,
    } = body;

    // -------------------------------------------------------
    // Validate input
    // -------------------------------------------------------
    if (!topic || typeof topic !== 'string' || topic.length > 200) {
      return NextResponse.json(
        { error: 'Invalid topic.' },
        { status: 400 }
      );
    }
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty.' },
        { status: 400 }
      );
    }
    const count = Math.min(Math.max(Number(num_questions) || 5, 3), 10);

    // Generate the quiz in the SAME language the TOPIC is written in (detected
    // from the topic text) — NOT the UI language. A Russian topic produces
    // Russian questions, an English topic English ones, etc.
    const languageInstruction =
      `Detect the language of the quiz topic and write ALL question text and ` +
      `answer options in that SAME language. Do not translate the topic or ` +
      `switch languages. For example: a Russian topic must produce Russian ` +
      `questions and options; an English topic must produce English questions ` +
      `and options.`;

    const { systemPrompt, userPrompt } = buildQuestionPrompts({
      topic,
      difficulty,
      count,
      mcMode: mc_mode,
      languageInstruction,
      previousQuestions: sanitizePreviousQuestions(previous_questions),
    });

    // -------------------------------------------------------
    // Call OpenAI (via OpenRouter)
    // -------------------------------------------------------
    const ai = getOpenAI();
    const model = modelForDifficulty(difficulty);

    const requestBody = {
      messages: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const,   content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens:  3000,
    };

    let completion;
    try {
      completion = await ai.chat.completions.create({ model, ...requestBody });
    } catch (primaryErr) {
      // If a stronger model isn't available on OpenRouter, fall back to mini.
      if (model !== 'openai/gpt-4o-mini') {
        console.warn('[generate-questions] Primary model failed, retrying with gpt-4o-mini:', primaryErr);
        completion = await ai.chat.completions.create({
          model: 'openai/gpt-4o-mini',
          ...requestBody,
        });
      } else {
        throw primaryErr;
      }
    }

    const raw = completion.choices[0].message.content ?? '[]';

    // Strip accidental markdown code fences if model adds them despite instructions
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    // The model may return { "questions": [...] } or just [...]
    // Handle both shapes
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
      // Fallback: try to find any array value in the returned object
      const firstArray = Object.values(parsed as object).find(Array.isArray);
      if (firstArray) {
        questions = firstArray as Question[];
      } else {
        throw new Error('Unexpected response format from OpenAI.');
      }
    }

    // Trim to requested count (in case model returns more)
    questions = questions.slice(0, count);

    // MC mode: validate structure and align correct_answer to an option
    if (mc_mode) {
      questions = questions.map((q) => sanitizeMcQuestion(q));
    }

    if (questions.length === 0) {
      throw new Error('No questions were generated. Please try a different topic.');
    }

    return NextResponse.json({ questions });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate-questions] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
