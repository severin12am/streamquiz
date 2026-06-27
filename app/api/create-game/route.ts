// ============================================================
// API Route: POST /api/create-game
//
// The SINGLE server-side chokepoint for creating a game:
//   1. Rate-limit by client IP (anti-spam).
//   2. Generate questions via the AI provider chain (xAI → fallback).
//   3. Insert the game row using the SERVICE ROLE client.
//
// Why server-side? RLS now FORBIDS anonymous INSERTs into `games`
// (see supabase/migration-v11-rls-hardening.sql), so games can only be
// created here. That makes the rate limit un-bypassable (a client can't
// just INSERT directly with the anon key) and stops spam game creation.
//
// Returns: { gameId, questions, provider }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateConfig, generateQuestions } from '@/lib/question-generator';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { consumeCreateQuota } from '@/lib/creator-quota';
import { enforce, rateLimitHeaders } from '@/lib/rate-limit';
import type { GameMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Creating a game is heavy (an LLM call + a DB write), so keep this tight.
// Override via env if you need a different ceiling.
const LIMIT = Number(process.env.RL_CREATE_GAME_LIMIT) || 6;
const WINDOW_MS = Number(process.env.RL_CREATE_GAME_WINDOW_MS) || 60_000;

function validGameMode(v: unknown): GameMode {
  return v === 'hardcore' || v === 'think' || v === 'classic' ? v : 'regular';
}

export async function POST(req: NextRequest) {
  // ---- 1. Rate limit ----
  const rl = enforce(req, { name: 'create-game', limit: LIMIT, windowMs: WINDOW_MS });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many games created. Please wait a moment and try again.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const admin = getSupabaseAdmin();

  // ---- 2. Host identity (web = Google JWT; iOS = no auth) ----
  // Web: Bearer token from Supabase Auth (Google sign-in).
  // iOS: send X-WhoSmarter-Client: ios — no Google account; rate-limited only.
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const clientPlatform = req.headers.get('x-whosmarter-client')?.trim().toLowerCase();
  const isIosClient = clientPlatform === 'ios';

  let hostUserId: string | null = null;

  if (token) {
    const { data: userData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !userData?.user) {
      return NextResponse.json(
        { error: 'Your session has expired. Please sign in again.' },
        { status: 401, headers: rateLimitHeaders(rl) },
      );
    }
    hostUserId = userData.user.id;
  } else if (!isIosClient) {
    return NextResponse.json(
      { error: 'You must be signed in to create a game.' },
      { status: 401, headers: rateLimitHeaders(rl) },
    );
  }

  try {
    const body = await req.json();

    // ---- 3. Validate + generate ----
    const validation = validateConfig(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400, headers: rateLimitHeaders(rl) });
    }

    // ---- 3a. Server-side create quota (iOS only) ----
    // Only enforced when X-Quota-Key is present (iOS build 8+). The web
    // frontend doesn't send it and stays unmetered. Consume BEFORE the AI
    // call so a blocked user spends no tokens. Returns null when exceeded.
    const quotaKey = req.headers.get('x-quota-key')?.trim();
    let quota = null;
    if (quotaKey) {
      quota = await consumeCreateQuota(admin, quotaKey);
      if (!quota) {
        return NextResponse.json(
          { error: 'Create quota exceeded' },
          { status: 402, headers: rateLimitHeaders(rl) },
        );
      }
    }

    const { questions, provider } = await generateQuestions(validation.config);

    // ---- 4. Insert the game (service role bypasses RLS) ----
    const camerasEnabled = Boolean((body as Record<string, unknown>).cameras_enabled);
    const gameMode = validGameMode((body as Record<string, unknown>).game_mode);

    const { data, error } = await admin
      .from('games')
      .insert({
        topic: validation.config.topic,
        difficulty: validation.config.difficulty,
        num_questions: validation.config.count,
        mc_mode: validation.config.mcMode,
        game_mode: gameMode,
        cameras_enabled: camerasEnabled,
        questions,
        status: 'waiting',
        phase: 'waiting',
        host_user_id: hostUserId,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create the game.');
    }

    return NextResponse.json(
      { gameId: (data as { id: string }).id, questions, provider, ...(quota ? { quota } : {}) },
      { headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[create-game] Error:', message);
    return NextResponse.json({ error: message }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
