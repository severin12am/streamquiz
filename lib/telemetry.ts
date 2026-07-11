// ============================================================
// Client-side telemetry helper (fire-and-forget).
// Never throws into game logic; never logs PII.
// ============================================================

import type { TelemetryEventRow } from '@/lib/telemetry-shared';

/** POST a sanitized event to /api/telemetry. Safe to call from effects. */
export function sendTelemetry(row: TelemetryEventRow): void {
  try {
    const body = JSON.stringify(row);
    if (body.length > 4096) return;

    void fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
      keepalive: true,
    }).catch(() => {
      /* ignore network errors */
    });
  } catch {
    /* ignore */
  }
}
