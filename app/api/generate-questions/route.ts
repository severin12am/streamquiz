// ============================================================
// API Route: POST /api/generate-questions
//
// Pure question generation (no DB write). Used by the REMATCH flow to
// regenerate a fresh set of questions for an existing game. Initial game
// creation goes through /api/create-game instead.
//
// Provider order (xAI → fallback): lib/ai.ts
// Prompt:                          lib/quiz-prompts.ts
// Parsing/validation:              lib/question-generator.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateConfig, generateQuestions } from '@/lib/question-generator';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { consumeCreateQuota } from '@/lib/creator-quota';
import { enforce, rateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const LIMIT = Number(process.env.RL_GENERATE_LIMIT) || 12;
const WINDOW_MS = Number(process.env.RL_GENERATE_WINDOW_MS) || 60_000;

export async function POST(req: NextRequest) {
  const rl = enforce(req, { name: 'generate-questions', limit: LIMIT, windowMs: WINDOW_MS });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  try {
    const body = await req.json();

    const validation = validateConfig(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400, headers: rateLimitHeaders(rl) });
    }

    // Rematch counts as one create. Only enforced when X-Quota-Key is
    // present (iOS build 8+); web stays unmetered. Consume before the AI call.
    const quotaKey = req.headers.get('x-quota-key')?.trim();
    let quota = null;
    if (quotaKey) {
      quota = await consumeCreateQuota(getSupabaseAdmin(), quotaKey);
      if (!quota) {
        return NextResponse.json(
          { error: 'Create quota exceeded' },
          { status: 402, headers: rateLimitHeaders(rl) },
        );
      }
    }

    const { questions } = await generateQuestions(validation.config);
    return NextResponse.json(
      { questions, ...(quota ? { quota } : {}) },
      { headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate-questions] Error:', message);
    return NextResponse.json({ error: message }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
