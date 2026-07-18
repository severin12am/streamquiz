// ============================================================
// WhoSmarter — Stripe client (SERVER ONLY)
//
// Lazily-created singleton, same pattern as lib/supabase-admin.ts.
//
// ⚠️ NEVER import this from a client component. STRIPE_SECRET_KEY has
//    full (or restricted-key) access to the merchant account.
//
// SET UP (.env.local + host env vars):
//   STRIPE_SECRET_KEY=rk_test_...   (rk_live_... in production)
//
// IP RESTRICTION NOTE:
//   The merchant provider locked the secret key to four fixed AWS IPs,
//   but Netlify functions egress from dynamic IPs. If Stripe rejects
//   requests because of that, set STRIPE_HTTP_PROXY to a static-IP
//   HTTPS proxy (e.g. http://user:pass@proxy-host:port) and all Stripe
//   API calls will be routed through it — no code changes needed.
// ============================================================

import Stripe from 'stripe';
import { HttpsProxyAgent } from 'https-proxy-agent';

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.',
    );
  }
  if (!stripe) {
    const proxy = process.env.STRIPE_HTTP_PROXY?.trim();
    stripe = new Stripe(key, {
      // Netlify functions are short-lived; keep retries snappy.
      maxNetworkRetries: 2,
      timeout: 20_000,
      ...(proxy ? { httpAgent: new HttpsProxyAgent(proxy) } : {}),
    });
  }
  return stripe;
}

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
