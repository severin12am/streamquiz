// ============================================================
// API Route: POST /api/generate-questions
//
// Receives game config from the host's form and uses OpenAI
// to generate quiz questions. Returns a JSON array of questions.
//
// CHANGE THE PROMPT:
//   Look for the `messages` array below. Edit the system prompt
//   and user prompt to change how questions are generated.
//   Current style: crisp, unambiguous trivia questions.
//
// CHANGE THE MODEL:
//   Find `model:` below. Default is gpt-4o-mini (fast + cheap).
//   Use 'gpt-4o' for harder, better-crafted questions.
//
// CHANGE QUESTION FORMAT:
//   The prompt asks for a JSON array. If you change the structure,
//   update the Question interface in lib/types.ts to match.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { CreateGamePayload, Question } from '@/lib/types';

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

export async function POST(req: NextRequest) {
  try {
    const body: CreateGamePayload = await req.json();
    const { topic, difficulty, num_questions, mc_mode } = body;

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

    // -------------------------------------------------------
    // Build the prompt
    // -------------------------------------------------------
    // CHANGE THIS SECTION to alter question style, format, etc.
    const difficultyGuide = {
      easy:   'very simple, widely known facts suitable for a general audience',
      medium: 'moderately challenging, requires some knowledge',
      hard:   'difficult, expert-level trivia that would stump most people',
    }[difficulty];

    // MC format instructions (included only when mc_mode is true)
    const mcInstructions = mc_mode
      ? `Each question must have exactly 4 answer choices ("options" array) and a "correct_answer" field matching one of the options exactly.`
      : `Omit "options" and "correct_answer" — questions are open-ended.`;

    // ---- SYSTEM PROMPT — change this to adjust overall style ----
    const systemPrompt = `You are a professional quiz writer for a live TV quiz show.
Generate crisp, unambiguous questions. Avoid trick questions or ambiguous answers.
You MUST return ONLY a valid JSON array — no markdown, no explanation, no code fences, no extra text.
Start your response with [ and end with ].`;

    // ---- USER PROMPT — change this to adjust question framing ----
    const userPrompt = `Generate exactly ${count} ${difficultyGuide} quiz questions about: "${topic}".

${mcInstructions}

Return a JSON array where each item has this shape:
{
  "question": "string",
  ${mc_mode ? '"options": ["string","string","string","string"],' : ''}
  ${mc_mode ? '"correct_answer": "string"' : ''}
}

Example for ${mc_mode ? 'MC' : 'open-ended'} mode:
${mc_mode
  ? '{"question":"What is the capital of France?","options":["London","Paris","Berlin","Madrid"],"correct_answer":"Paris"}'
  : '{"question":"What is the capital of France?"}'
}`;

    // -------------------------------------------------------
    // Call OpenAI
    // -------------------------------------------------------
    const ai = getOpenAI();

    const completion = await ai.chat.completions.create({
      // CHANGE MODEL here. OpenRouter model list: https://openrouter.ai/models
      // Current: GPT-4o mini via OpenRouter — fast and cheap
      // Other good options: 'openai/gpt-4o', 'anthropic/claude-3-haiku'
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.7, // CHANGE: 0.0 = factual/consistent, 1.0 = more creative
      max_tokens:  2000,
    });

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
