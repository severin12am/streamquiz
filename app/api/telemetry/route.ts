// ============================================================
// API Route: POST /api/telemetry
//
// Accepts allowlisted, non-PII product metrics from web/iOS clients.
// Rate-limited. Never stores IP. See docs/ANALYTICS.md.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { enforce, rateLimitHeaders } from '@/lib/rate-limit';
import { insertTelemetryEvent } from '@/lib/telemetry-server';
import {
  isUuid,
  platformFromClientHeader,
  roundTelemetryBytes,
  type TelemetryEventName,
  type TelemetryEventRow,
  type TelemetryPlatform,
} from '@/lib/telemetry-shared';

export const dynamic = 'force-dynamic';

const LIMIT = Number(process.env.RL_TELEMETRY_LIMIT) || 40;
const WINDOW_MS = Number(process.env.RL_TELEMETRY_WINDOW_MS) || 60_000;

const EVENTS = new Set<TelemetryEventName>([
  'game_created',
  'game_finished',
  'webrtc_summary',
  'ice_config_served',
]);

const FORBIDDEN_KEYS = new Set([
  'email',
  'name',
  'ip',
  'candidate',
  'sdp',
  'token',
  'client_id',
  'host_user_id',
  'topic',
  'transcript',
  'password',
  'authorization',
  'access_token',
  'quota_key',
  'quotaKey',
]);

const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const GAME_MODES = new Set(['regular', 'hardcore', 'think', 'classic']);
const PLATFORMS = new Set<TelemetryPlatform>(['web', 'ios', 'unknown']);
const RELAY_POOLS = new Set(['coturn', 'metered', 'stun_only', 'unknown']);

function clampInt(v: unknown, min: number, max: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.min(max, Math.max(min, Math.round(v)));
}

function clampLocale(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, 8);
  return s || null;
}

function hasForbiddenKey(obj: unknown, depth = 0): boolean {
  if (!obj || typeof obj !== 'object' || depth > 3) return false;
  for (const key of Object.keys(obj as object)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) return true;
    if (hasForbiddenKey((obj as Record<string, unknown>)[key], depth + 1)) return true;
  }
  return false;
}

function sanitizeBody(
  raw: Record<string, unknown>,
  headerPlatform: TelemetryPlatform,
): TelemetryEventRow | null {
  const event = raw.event;
  if (typeof event !== 'string' || !EVENTS.has(event as TelemetryEventName)) return null;

  if (hasForbiddenKey(raw)) return null;

  const game_ref =
    typeof raw.game_ref === 'string' && isUuid(raw.game_ref) ? raw.game_ref : null;

  // Lifecycle events need a game_ref.
  if (
    (event === 'game_created' || event === 'game_finished' || event === 'webrtc_summary') &&
    !game_ref
  ) {
    return null;
  }

  let platform: TelemetryPlatform = headerPlatform;
  if (typeof raw.platform === 'string' && PLATFORMS.has(raw.platform as TelemetryPlatform)) {
    platform = raw.platform as TelemetryPlatform;
  }

  const difficulty =
    typeof raw.difficulty === 'string' && DIFFICULTIES.has(raw.difficulty)
      ? raw.difficulty
      : null;
  const game_mode =
    typeof raw.game_mode === 'string' && GAME_MODES.has(raw.game_mode) ? raw.game_mode : null;

  const locale = clampLocale(raw.locale);
  const num_questions = clampInt(raw.num_questions, 3, 20);
  const player_count = clampInt(raw.player_count, 1, 6);

  const webrtc_pairs_total = clampInt(raw.webrtc_pairs_total, 0, 30);
  const webrtc_pairs_p2p = clampInt(raw.webrtc_pairs_p2p, 0, 30);
  const webrtc_pairs_relay = clampInt(raw.webrtc_pairs_relay, 0, 30);
  const webrtc_pairs_failed = clampInt(raw.webrtc_pairs_failed, 0, 30);

  let bytes_sent_total: number | null = null;
  let bytes_recv_total: number | null = null;
  if (typeof raw.bytes_sent_total === 'number' && Number.isFinite(raw.bytes_sent_total)) {
    bytes_sent_total = roundTelemetryBytes(Math.max(0, raw.bytes_sent_total));
  }
  if (typeof raw.bytes_recv_total === 'number' && Number.isFinite(raw.bytes_recv_total)) {
    bytes_recv_total = roundTelemetryBytes(Math.max(0, raw.bytes_recv_total));
  }

  let relay_provider: string | null = null;
  if (typeof raw.relay_provider === 'string' && RELAY_POOLS.has(raw.relay_provider)) {
    relay_provider = raw.relay_provider;
  }

  let status: string | null = null;
  if (raw.status === 'ended' || raw.status === 'abandoned') status = raw.status;

  // meta: only allow small non-nested scalar map for ice_config_served
  let meta: Record<string, unknown> = {};
  if (raw.meta && typeof raw.meta === 'object' && !Array.isArray(raw.meta)) {
    const m = raw.meta as Record<string, unknown>;
    if (hasForbiddenKey(m)) return null;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(m)) {
      if (FORBIDDEN_KEYS.has(k.toLowerCase())) continue;
      if (k.length > 32) continue;
      if (typeof v === 'string' && v.length <= 64) out[k] = v;
      else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
      else if (typeof v === 'boolean') out[k] = v;
    }
    meta = out;
  }

  // Promote relay_pool from top-level into meta for ice_config_served
  if (event === 'ice_config_served' && typeof raw.relay_pool === 'string' && RELAY_POOLS.has(raw.relay_pool)) {
    meta = { ...meta, relay_pool: raw.relay_pool };
  }

  return {
    event: event as TelemetryEventName,
    game_ref,
    platform,
    locale,
    difficulty,
    game_mode,
    mc_mode: typeof raw.mc_mode === 'boolean' ? raw.mc_mode : null,
    cameras_on: typeof raw.cameras_on === 'boolean' ? raw.cameras_on : null,
    num_questions,
    player_count,
    is_public: typeof raw.is_public === 'boolean' ? raw.is_public : null,
    status,
    webrtc_pairs_total,
    webrtc_pairs_p2p,
    webrtc_pairs_relay,
    webrtc_pairs_failed,
    relay_provider,
    bytes_sent_total,
    bytes_recv_total,
    cameras_enabled_mesh:
      typeof raw.cameras_enabled_mesh === 'boolean'
        ? raw.cameras_enabled_mesh
        : typeof raw.cameras_on === 'boolean'
          ? raw.cameras_on
          : null,
    meta,
  };
}

export async function POST(req: NextRequest) {
  const rl = enforce(req, { name: 'telemetry', limit: LIMIT, windowMs: WINDOW_MS });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  let raw: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 4096) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413, headers: rateLimitHeaders(rl) });
    }
    raw = JSON.parse(text) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: rateLimitHeaders(rl) });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: rateLimitHeaders(rl) });
  }

  const headerPlatform = platformFromClientHeader(req.headers.get('x-whosmarter-client'));
  const row = sanitizeBody(raw, headerPlatform);
  if (!row) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400, headers: rateLimitHeaders(rl) });
  }

  // Clients must not invent game_created (server emits that).
  if (row.event === 'game_created') {
    return NextResponse.json({ error: 'Forbidden event' }, { status: 403, headers: rateLimitHeaders(rl) });
  }

  await insertTelemetryEvent(row);
  return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(rl) });
}
