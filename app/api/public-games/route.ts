// ============================================================
// API Route: GET /api/public-games
//
// Lists discoverable waiting lobbies (is_public + status=waiting).
// Never returns questions or host_user_id. Service role only.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { enforce, rateLimitHeaders } from '@/lib/rate-limit';
import { MAX_PLAYERS } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LIMIT = Number(process.env.RL_PUBLIC_GAMES_LIMIT) || 30;
const WINDOW_MS = Number(process.env.RL_PUBLIC_GAMES_WINDOW_MS) || 60_000;
const STALE_HOURS = 6;
const LIST_LIMIT = 30;

export type PublicGameSummary = {
  id: string;
  topic: string;
  difficulty: string;
  num_questions: number;
  mc_mode: boolean;
  game_mode: string;
  created_at: string;
  player_count: number;
  max_players: number;
};

export async function GET(req: NextRequest) {
  const rl = enforce(req, { name: 'public-games', limit: LIMIT, windowMs: WINDOW_MS });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  try {
    const admin = getSupabaseAdmin();
    const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();

    const { data: games, error } = await admin
      .from('games')
      .select('id, topic, difficulty, num_questions, mc_mode, game_mode, created_at, is_public, status')
      .eq('is_public', true)
      .eq('status', 'waiting')
      .gt('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT);

    if (error) throw new Error(error.message);

    const rows = (games ?? []) as Array<{
      id: string;
      topic: string;
      difficulty: string;
      num_questions: number;
      mc_mode: boolean;
      game_mode: string;
      created_at: string;
    }>;

    if (rows.length === 0) {
      return NextResponse.json({ games: [] as PublicGameSummary[] }, { headers: rateLimitHeaders(rl) });
    }

    const ids = rows.map((g) => g.id);
    const { data: playerRows, error: pErr } = await admin
      .from('players')
      .select('game_id')
      .in('game_id', ids);

    if (pErr) throw new Error(pErr.message);

    const counts = new Map<string, number>();
    for (const p of playerRows ?? []) {
      const gid = (p as { game_id: string }).game_id;
      counts.set(gid, (counts.get(gid) ?? 0) + 1);
    }

    const list: PublicGameSummary[] = rows
      .map((g) => {
        const player_count = counts.get(g.id) ?? 0;
        return {
          id: g.id,
          topic: g.topic,
          difficulty: g.difficulty,
          num_questions: g.num_questions,
          mc_mode: g.mc_mode,
          game_mode: g.game_mode,
          created_at: g.created_at,
          player_count,
          max_players: MAX_PLAYERS,
        };
      })
      .filter((g) => g.player_count < MAX_PLAYERS);

    return NextResponse.json({ games: list }, { headers: rateLimitHeaders(rl) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[public-games]', message);
    return NextResponse.json(
      { error: 'Failed to list open games' },
      { status: 500, headers: rateLimitHeaders(rl) },
    );
  }
}
