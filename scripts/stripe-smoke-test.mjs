// ============================================================
// One-off smoke test: can we reach Stripe with STRIPE_SECRET_KEY?
//
// Creates (and immediately expires) a TEST-mode Checkout Session with
// the same parameters /api/billing/checkout uses. Run with:
//   node scripts/stripe-smoke-test.mjs
//
// If the key is IP-restricted you'll see a permission/IP error here —
// that tells us whether the merchant's IP allowlist is enforced.
// ============================================================

import { readFileSync } from 'node:fs';
import Stripe from 'stripe';

// Minimal .env.local parser (no dotenv dependency).
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const key = env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('STRIPE_SECRET_KEY missing in .env.local');
  process.exit(1);
}
console.log(`Key: ${key.slice(0, 12)}… (${key.startsWith('rk_test') || key.startsWith('sk_test') ? 'TEST' : 'LIVE?'} mode)`);

const stripe = new Stripe(key, { timeout: 20_000 });

try {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 800,
          recurring: { interval: 'month' },
          product_data: { name: 'WhoSmarter Basic (smoke test)' },
        },
      },
    ],
    success_url: 'https://whosmarter.com/upgrade?status=success',
    cancel_url: 'https://whosmarter.com/upgrade?status=cancelled',
  });
  console.log('✅ Checkout Session created:', session.id);
  console.log('   URL:', session.url);
  await stripe.checkout.sessions.expire(session.id);
  console.log('✅ Session expired (cleaned up). The key WORKS from this machine.');
} catch (err) {
  console.error('❌ Stripe call failed:');
  console.error('   type:', err?.type);
  console.error('   code:', err?.code);
  console.error('   message:', err?.message);
  process.exit(2);
}
