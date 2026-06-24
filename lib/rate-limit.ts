// ============================================================
// WhoSmarter — Rate limiting (SERVER ONLY)
//
// A lightweight in-memory fixed-window limiter for API routes.
// Keyed by client IP + a route name.
//
// ⚠️ SCOPE / LIMITATION:
//   This counter lives in process memory. On a single long-running
//   server (`next start`, a container, a VM) it is shared across all
//   requests and works well. On SERVERLESS platforms (Netlify/Vercel
//   functions) each cold instance has its OWN memory, so the effective
//   limit is "per instance". That still blunts spam/floods from a single
//   IP hitting one instance, but is NOT a hard global guarantee.
//
//   For a hard global limit across instances, swap `hit()` for a shared
//   store (e.g. Upstash Redis / @upstash/ratelimit). The call sites below
//   don't need to change — only this file.
// ============================================================

import type { NextRequest } from 'next/server';

interface Bucket {
  count: number;
  resetAt: number; // epoch ms when the window resets
}

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so the map can't grow unbounded.
// (Runs at most once per minute, lazily, on access.)
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
  /** Seconds until reset (for Retry-After). */
  retryAfter: number;
}

/**
 * Record a hit for `key` and report whether it is within `limit` per
 * `windowMs`. The first request in a window starts the clock.
 */
export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;

  const ok = b.count <= limit;
  return {
    ok,
    limit,
    remaining: Math.max(0, limit - b.count),
    resetAt: b.resetAt,
    retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
  };
}

/**
 * Best-effort client IP. Honors common proxy headers; Netlify sets
 * `x-nf-client-connection-ip`, most CDNs set `x-forwarded-for`.
 * Falls back to a constant so the limiter still groups unknown clients.
 */
export function clientIp(req: NextRequest): string {
  const h = req.headers;
  const xff = h.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return (
    h.get('x-nf-client-connection-ip') ||
    h.get('x-real-ip') ||
    h.get('cf-connecting-ip') ||
    'unknown'
  );
}

export interface RateLimitConfig {
  /** Logical route name, namespaces the key. */
  name: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/**
 * Convenience: derive the key from the request IP + route name and apply
 * the limit. Returns the full result so the caller can build a 429 with
 * the right headers.
 */
export function enforce(req: NextRequest, config: RateLimitConfig): RateLimitResult {
  return hit(`${config.name}:${clientIp(req)}`, config.limit, config.windowMs);
}

/** Standard rate-limit response headers for a result. */
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(Math.ceil(r.resetAt / 1000)),
    ...(r.ok ? {} : { 'Retry-After': String(r.retryAfter) }),
  };
}
