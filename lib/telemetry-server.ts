// ============================================================
// Server-only telemetry inserts (SERVICE ROLE). Never import from client.
// Failures are logged and swallowed so stats never break gameplay.
// ============================================================

import { getSupabaseAdmin, isAdminConfigured } from '@/lib/supabase-admin';
import type { TelemetryEventRow } from '@/lib/telemetry-shared';

/**
 * Insert a telemetry row. Duplicate lifecycle events (unique index on
 * event+game_ref for create/finish/webrtc) are ignored.
 */
export async function insertTelemetryEvent(row: TelemetryEventRow): Promise<void> {
  if (!isAdminConfigured) return;
  try {
    const admin = getSupabaseAdmin();
    const payload = {
      event: row.event,
      game_ref: row.game_ref ?? null,
      platform: row.platform ?? null,
      locale: row.locale ?? null,
      difficulty: row.difficulty ?? null,
      game_mode: row.game_mode ?? null,
      mc_mode: row.mc_mode ?? null,
      cameras_on: row.cameras_on ?? null,
      num_questions: row.num_questions ?? null,
      player_count: row.player_count ?? null,
      is_public: row.is_public ?? null,
      status: row.status ?? null,
      webrtc_pairs_total: row.webrtc_pairs_total ?? null,
      webrtc_pairs_p2p: row.webrtc_pairs_p2p ?? null,
      webrtc_pairs_relay: row.webrtc_pairs_relay ?? null,
      webrtc_pairs_failed: row.webrtc_pairs_failed ?? null,
      relay_provider: row.relay_provider ?? null,
      bytes_sent_total: row.bytes_sent_total ?? null,
      bytes_recv_total: row.bytes_recv_total ?? null,
      cameras_enabled_mesh: row.cameras_enabled_mesh ?? null,
      meta: row.meta && typeof row.meta === 'object' ? row.meta : {},
    };

    const { error } = await admin.from('telemetry_events').insert(payload);
    if (error && !isDuplicateError(error.message)) {
      console.error('[telemetry] insert failed:', error.message);
    }
  } catch (err) {
    console.error('[telemetry] insert error:', err instanceof Error ? err.message : err);
  }
}

function isDuplicateError(msg: string): boolean {
  return /duplicate|unique/i.test(msg);
}
