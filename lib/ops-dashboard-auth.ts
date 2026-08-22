// ============================================================
// Ops dashboard gate — local / private tools only.
// If OPS_DASHBOARD_SECRET is unset, the dashboard is completely off.
// Do NOT set this secret in Netlify production unless you intend
// the route to be reachable there with the key.
// ============================================================

import { timingSafeEqual } from 'crypto';

export function isOpsDashboardConfigured(): boolean {
  return Boolean(process.env.OPS_DASHBOARD_SECRET?.trim());
}

/** True when the request presents the matching OPS_DASHBOARD_SECRET. */
export function authorizeOpsDashboard(req: Request): boolean {
  const secret = process.env.OPS_DASHBOARD_SECRET?.trim();
  if (!secret) return false;

  const header =
    req.headers.get('x-ops-dashboard-secret')?.trim() ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    '';
  const key = header || new URL(req.url).searchParams.get('key')?.trim() || '';
  return secretsMatch(key, secret);
}

function secretsMatch(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
