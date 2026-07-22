// ============================================================
// WhoSmarter — Resend client (SERVER ONLY)
//
// Lazily-created singleton, same pattern as lib/stripe.ts.
//
// SET UP (.env.local + host env vars):
//   RESEND_API_KEY=re_...
// ============================================================

import { Resend } from 'resend';

let resend: Resend | null = null;

/** Returns the Resend client, or null if RESEND_API_KEY isn't set. Callers
 * must handle the null case (log + skip) — a missing email key should
 * never crash a request that isn't primarily about sending email. */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!resend) resend = new Resend(key);
  return resend;
}
