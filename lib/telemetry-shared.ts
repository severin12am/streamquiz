// ============================================================
// Shared telemetry types + pure helpers (client + server safe).
// Privacy: no PII fields live here — see docs/ANALYTICS.md.
// ============================================================

export type TelemetryPlatform = 'web' | 'ios' | 'unknown';

export type TelemetryEventName =
  | 'game_created'
  | 'game_finished'
  | 'webrtc_summary'
  | 'ice_config_served';

export type RelayPool = 'coturn' | 'metered' | 'stun_only' | 'unknown';

/** Allowlisted row shape written to telemetry_events. */
export interface TelemetryEventRow {
  event: TelemetryEventName;
  game_ref?: string | null;
  platform?: TelemetryPlatform | null;
  locale?: string | null;
  difficulty?: string | null;
  game_mode?: string | null;
  mc_mode?: boolean | null;
  cameras_on?: boolean | null;
  num_questions?: number | null;
  player_count?: number | null;
  is_public?: boolean | null;
  status?: string | null;
  webrtc_pairs_total?: number | null;
  webrtc_pairs_p2p?: number | null;
  webrtc_pairs_relay?: number | null;
  webrtc_pairs_failed?: number | null;
  relay_provider?: string | null;
  bytes_sent_total?: number | null;
  bytes_recv_total?: number | null;
  cameras_enabled_mesh?: boolean | null;
  meta?: Record<string, unknown>;
}

/** Round media bytes to 100 KB buckets (less fingerprint-y, good enough for ops). */
export function roundTelemetryBytes(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n / 100_000) * 100_000;
}

export function platformFromClientHeader(header: string | null | undefined): TelemetryPlatform {
  const v = header?.trim().toLowerCase();
  if (v === 'ios') return 'ios';
  if (v === 'web') return 'web';
  // Web create-game does not send the header; treat as web.
  if (!v) return 'web';
  return 'unknown';
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}
