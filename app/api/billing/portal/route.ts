// ============================================================
// API Route: POST /api/billing/portal
//
// Returns a Stripe Billing Portal session URL for the signed-in web
// host (cancel subscription, update card, view invoices). Requires an
// existing Stripe customer (i.e. the user has been through checkout).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, isStaleModeCustomerError } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getUserFromRequest } from '@/lib/server-auth';
import { getWebSubscription, upsertWebSubscription } from '@/lib/web-subscriptions';
import { enforce, rateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rl = enforce(req, { name: 'billing-portal', limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const admin = getSupabaseAdmin();
  const user = await getUserFromRequest(req, admin);
  if (!user) {
    return NextResponse.json(
      { error: 'You must be signed in.' },
      { status: 401, headers: rateLimitHeaders(rl) },
    );
  }

  try {
    const sub = await getWebSubscription(admin, user.id);
    if (!sub?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found for this account.' },
        { status: 404, headers: rateLimitHeaders(rl) },
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') ||
      new URL(req.url).origin;

    try {
      const portal = await getStripe().billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: `${origin}/upgrade`,
      });
      return NextResponse.json({ url: portal.url }, { headers: rateLimitHeaders(rl) });
    } catch (err) {
      // Leftover customer id from before a TEST↔LIVE key switch — self-heal
      // instead of surfacing a raw 500 (see lib/stripe.ts).
      if (isStaleModeCustomerError(err)) {
        console.warn(
          '[billing/portal] Stale-mode customer id, clearing:',
          sub.stripe_customer_id,
        );
        await upsertWebSubscription(admin, {
          user_id: user.id,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          tier: 'free',
          status: 'none',
        });
        return NextResponse.json(
          { error: 'No subscription found for this account.' },
          { status: 404, headers: rateLimitHeaders(rl) },
        );
      }
      throw err;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[billing/portal] Error:', message);
    return NextResponse.json(
      { error: 'Could not open the billing portal. Please try again later.' },
      { status: 500, headers: rateLimitHeaders(rl) },
    );
  }
}
