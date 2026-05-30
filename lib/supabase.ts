// ============================================================
// StreamQuiz — Supabase Client
//
// Uses the singleton pattern so the same client instance is
// reused across the entire app (important for Realtime subs).
//
// TO CONNECT YOUR PROJECT:
//   Copy .env.local.example → .env.local and fill in your
//   NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
//   from Supabase → Project Settings → API
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { Game } from './types';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isMisconfigured = !supabaseUrl || !supabaseKey;

if (isMisconfigured && typeof window !== 'undefined') {
  console.warn(
    '[StreamQuiz] Supabase env vars missing. ' +
    'Copy .env.local.example → .env.local and fill in your keys, then restart the dev server.'
  );
}

// Use placeholder values when keys are missing so the module loads without crashing.
// The app renders a setup banner instead of a blank error page.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseKey  || 'placeholder-key',
  {
    realtime: {
      heartbeatIntervalMs: 5000,
    },
  }
);

// -------------------------------------------------------
// SERVER CLOCK SYNC
// All game pacing is driven by `phase_deadline` timestamps. Those are
// written by ONE client and compared by BOTH clients. If the two
// devices' clocks disagree (very common — phones/laptops drift by
// seconds), one client sees deadlines as already-expired and races
// through the questions while the other lags far behind.
//
// To avoid this we sync to the DATABASE server's clock (read from the
// HTTP `Date` response header) and express ALL "now" comparisons in
// server time. Accuracy is ~1s (header resolution) — plenty to kill the
// multi-second skew that breaks pacing.
// -------------------------------------------------------
let serverOffsetMs = 0;

/** Current time in SERVER milliseconds (local clock + measured offset). */
export function serverNow(): number {
  return Date.now() + serverOffsetMs;
}

/** Measure the offset between this device's clock and the server's. */
export async function syncServerClock(): Promise<void> {
  if (isMisconfigured) return;
  try {
    const t0 = Date.now();
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: supabaseKey },
    });
    const t1 = Date.now();
    const dateHeader = res.headers.get('date');
    if (!dateHeader) return;
    const serverMs = new Date(dateHeader).getTime();
    if (Number.isNaN(serverMs)) return;
    // Assume the server stamped the response ~halfway through the round-trip.
    serverOffsetMs = serverMs - (t0 + (t1 - t0) / 2);
  } catch {
    // Network blocked → fall back to the local clock (offset stays 0).
  }
}

// -------------------------------------------------------
// Helper: subscribe to changes on a specific game row
// Returns the channel so the caller can remove it on cleanup
// -------------------------------------------------------
export function subscribeToGame(
  gameId: string,
  onUpdate: (game: Game) => void
) {
  return supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      },
      (payload) => onUpdate(payload.new as Game)
    )
    .subscribe();
}

// -------------------------------------------------------
// Helper: update the game row (partial update)
// All game state changes go through this single function
// so it's easy to find where mutations happen.
// -------------------------------------------------------
export async function updateGame(gameId: string, patch: Partial<Game>) {
  const { error } = await supabase
    .from('games')
    .update(patch)
    .eq('id', gameId);

  if (error) {
    console.error('[StreamQuiz] updateGame error:', error.message);
    throw error;
  }
}

// -------------------------------------------------------
// Helper: GUARDED update — only applies if the row is still in the
// expected phase. Returns true if THIS call actually changed the row.
//
// This is the heart of the robust state machine: when a timed phase
// ends, BOTH clients may try to advance it. Postgres guarantees only
// the FIRST update (whose `phase = expectedPhase` still matches) takes
// effect; the slower client's update matches zero rows and returns
// false. No double-scoring, no race conditions, no host dependency.
// -------------------------------------------------------
export async function updateGameIfPhase(
  gameId: string,
  expectedPhase: string,
  patch: Partial<Game>
): Promise<boolean> {
  const { data, error } = await supabase
    .from('games')
    .update(patch)
    .eq('id', gameId)
    .eq('phase', expectedPhase)
    .select('id');

  if (error) {
    console.error('[StreamQuiz] updateGameIfPhase error:', error.message);
    return false;
  }
  // data is the array of rows that matched + were updated
  return Array.isArray(data) && data.length > 0;
}

// -------------------------------------------------------
// Helper: GUARDED update with extra conditions.
// Like updateGameIfPhase, but also lets you require certain columns
// to currently be NULL (e.g. "only write my pick if I haven't picked
// yet"). Returns true if THIS call changed the row. Used for the MC
// grace window so each player writes their own pick exactly once.
// -------------------------------------------------------
export async function updateGameGuarded(
  gameId: string,
  patch: Partial<Game>,
  guards: { phase?: string; nullColumns?: string[] }
): Promise<boolean> {
  let q = supabase.from('games').update(patch).eq('id', gameId);
  if (guards.phase) q = q.eq('phase', guards.phase);
  for (const col of guards.nullColumns ?? []) q = q.is(col, null);

  const { data, error } = await q.select('id');
  if (error) {
    console.error('[StreamQuiz] updateGameGuarded error:', error.message);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

// -------------------------------------------------------
// Helper: fetch a single game by ID
// -------------------------------------------------------
export async function fetchGame(gameId: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (error) {
    console.error('[StreamQuiz] fetchGame error:', error.message);
    return null;
  }
  return data as Game;
}
