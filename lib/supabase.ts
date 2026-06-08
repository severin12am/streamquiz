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
import type { Game, Player, PlayerRole } from './types';
import { MAX_PLAYERS } from './types';

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
// Helper: GUARDED deadline change — compare-and-swap on phase_deadline.
// Only applies if the row is BOTH in the expected phase AND still has the
// exact deadline we last saw. Used to shrink the countdown the instant the
// first player answers: every client may try, but only the FIRST one (whose
// expected deadline still matches) wins, and a second shrink can't happen
// because the deadline has already changed. Returns true if THIS call won.
// -------------------------------------------------------
export async function updateGameIfDeadline(
  gameId: string,
  expectedPhase: string,
  expectedDeadline: string,
  patch: Partial<Game>
): Promise<boolean> {
  const { data, error } = await supabase
    .from('games')
    .update(patch)
    .eq('id', gameId)
    .eq('phase', expectedPhase)
    .eq('phase_deadline', expectedDeadline)
    .select('id');

  if (error) {
    console.error('[StreamQuiz] updateGameIfDeadline error:', error.message);
    return false;
  }
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

// ============================================================
// PLAYERS (multiplayer — up to 6 per game)
// All per-player state lives in its own table so every client only
// writes its OWN row; six people can answer at once with no clobbering.
// ============================================================

// -------------------------------------------------------
// Subscribe to ANY change (insert/update/delete) of the players in a
// game. The callback gets no payload — callers just refetch the full
// list (simple + always-consistent for a handful of rows).
// -------------------------------------------------------
export function subscribeToPlayers(gameId: string, onChange: () => void) {
  return supabase
    .channel(`players:${gameId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `game_id=eq.${gameId}`,
      },
      () => onChange()
    )
    .subscribe();
}

// -------------------------------------------------------
// Fetch all players in a game, ordered by seat.
// -------------------------------------------------------
export async function fetchPlayers(gameId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .order('slot', { ascending: true });

  if (error) {
    console.error('[StreamQuiz] fetchPlayers error:', error.message);
    return [];
  }
  return (data ?? []) as Player[];
}

// -------------------------------------------------------
// Update a single player row (partial). Each client only ever calls
// this for ITS OWN row during a round, so there's no contention.
// -------------------------------------------------------
export async function updatePlayer(playerId: string, patch: Partial<Player>) {
  const { error } = await supabase
    .from('players')
    .update(patch)
    .eq('id', playerId);

  if (error) {
    console.error('[StreamQuiz] updatePlayer error:', error.message);
    throw error;
  }
}

// -------------------------------------------------------
// Reset every player's PER-ROUND state (called by the one client that
// wins the "advance to next question" guard).
// -------------------------------------------------------
export async function resetPlayersForRound(gameId: string) {
  const { error } = await supabase
    .from('players')
    .update({ mc_index: null, transcript: '', correct: null, done: false })
    .eq('game_id', gameId);
  if (error) console.error('[StreamQuiz] resetPlayersForRound error:', error.message);
}

// -------------------------------------------------------
// Reset every player for a brand-new match (scores + votes + round).
// -------------------------------------------------------
export async function resetPlayersForMatch(gameId: string) {
  const { error } = await supabase
    .from('players')
    .update({
      score: 0,
      mc_index: null,
      transcript: '',
      correct: null,
      done: false,
      rematch: false,
    })
    .eq('game_id', gameId);
  if (error) console.error('[StreamQuiz] resetPlayersForMatch error:', error.message);
}

// -------------------------------------------------------
// JOIN a game — claim a seat (or re-attach to an existing one).
//
//   • If this browser (client_id) already has a row → reconnect to it.
//   • Otherwise claim the lowest free slot: the host takes slot 0,
//     guests take 1..5. The UNIQUE(game_id, slot) constraint guarantees
//     two people can't grab the same seat — on a collision we just
//     refetch and retry. Returns null if the game is full.
// -------------------------------------------------------
export async function joinGame(
  gameId: string,
  clientId: string,
  name: string,
  asHost: boolean
): Promise<Player | null> {
  // Reconnect path: we already have a seat in this game.
  const { data: existing } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('client_id', clientId)
    .maybeSingle();

  if (existing) {
    const row = existing as Player;
    if (name && row.name !== name) {
      await supabase.from('players').update({ name }).eq('id', row.id);
      row.name = name;
    }
    return row;
  }

  // Claim a fresh seat (retry on a slot collision).
  for (let attempt = 0; attempt < MAX_PLAYERS + 2; attempt++) {
    const players = await fetchPlayers(gameId);
    const taken = new Set(players.map((p) => p.slot));

    let slot = -1;
    let role: PlayerRole = 'player';

    if (asHost && !taken.has(0)) {
      slot = 0;
      role = 'host';
    } else {
      for (let s = 1; s < MAX_PLAYERS; s++) {
        if (!taken.has(s)) {
          slot = s;
          break;
        }
      }
    }

    if (slot === -1) return null; // game full

    const { data, error } = await supabase
      .from('players')
      .insert({ game_id: gameId, client_id: clientId, name, role, slot })
      .select('*')
      .single();

    if (!error && data) return data as Player;

    // A concurrent tab may have inserted OUR row, or grabbed the slot.
    const { data: mine } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .eq('client_id', clientId)
      .maybeSingle();
    if (mine) return mine as Player;
    // else: slot was taken → loop and pick the next free one
  }

  return null;
}
