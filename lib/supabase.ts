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
