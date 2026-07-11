// ============================================================
// API Route: POST /api/kick-player
//
// Host removes a guest: ban client_id for this game + delete players row.
// Service role only. See docs/GLOBAL_ROOMS.md §14.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { enforce, rateLimitHeaders } from '@/lib/rate-limit';
import { isUuid } from '@/lib/telemetry-shared';

export const dynamic = 'force-dynamic';

const LIMIT = Number(process.env.RL_KICK_LIMIT) || 20;
const WINDOW_MS = Number(process.env.RL_KICK_WINDOW_MS) || 60_000;

export async function POST(req: NextRequest) {
  const rl = enforce(req, { name: 'kick-player', limit: LIMIT, windowMs: WINDOW_MS });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: rateLimitHeaders(rl) });
  }

  const gameId = typeof body.gameId === 'string' ? body.gameId : '';
  const targetPlayerId = typeof body.targetPlayerId === 'string' ? body.targetPlayerId : '';
  const hostClientId = typeof body.hostClientId === 'string' ? body.hostClientId.trim() : '';

  if (!isUuid(gameId) || !isUuid(targetPlayerId)) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400, headers: rateLimitHeaders(rl) });
  }
  if (!hostClientId || hostClientId.length > 80) {
    return NextResponse.json({ error: 'hostClientId required' }, { status: 400, headers: rateLimitHeaders(rl) });
  }

  try {
    const admin = getSupabaseAdmin();

    const { data: game, error: gErr } = await admin
      .from('games')
      .select('id, host_user_id')
      .eq('id', gameId)
      .maybeSingle();

    if (gErr || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404, headers: rateLimitHeaders(rl) });
    }

    // Authorize host: client_id matches host seat, and/or Bearer matches host_user_id.
    const { data: hostRow } = await admin
      .from('players')
      .select('id, client_id, role')
      .eq('game_id', gameId)
      .eq('role', 'host')
      .maybeSingle();

    let authorized = Boolean(
      hostRow &&
        (hostRow as { client_id: string }).client_id === hostClientId &&
        (hostRow as { role: string }).role === 'host',
    );

    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';
    if (!authorized && token) {
      const { data: userData } = await admin.auth.getUser(token);
      const uid = userData?.user?.id;
      const hostUserId = (game as { host_user_id?: string | null }).host_user_id;
      if (uid && hostUserId && uid === hostUserId) authorized = true;
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403, headers: rateLimitHeaders(rl) });
    }

    const { data: target, error: tErr } = await admin
      .from('players')
      .select('id, game_id, client_id, role')
      .eq('id', targetPlayerId)
      .eq('game_id', gameId)
      .maybeSingle();

    if (tErr || !target) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404, headers: rateLimitHeaders(rl) });
    }

    if ((target as { role: string }).role === 'host') {
      return NextResponse.json({ error: 'Cannot kick the host' }, { status: 400, headers: rateLimitHeaders(rl) });
    }

    const targetClientId = (target as { client_id: string }).client_id;
    const hostPlayerId = hostRow ? (hostRow as { id: string }).id : null;

    const { error: banErr } = await admin.from('game_bans').upsert(
      {
        game_id: gameId,
        client_id: targetClientId,
        banned_by_player_id: hostPlayerId,
      },
      { onConflict: 'game_id,client_id' },
    );
    if (banErr) throw new Error(banErr.message);

    const { error: delErr } = await admin
      .from('players')
      .delete()
      .eq('id', targetPlayerId)
      .eq('game_id', gameId);

    if (delErr) throw new Error(delErr.message);

    return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(rl) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[kick-player]', message);
    return NextResponse.json(
      { error: 'Failed to remove player' },
      { status: 500, headers: rateLimitHeaders(rl) },
    );
  }
}
