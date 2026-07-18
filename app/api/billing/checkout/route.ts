// ============================================================
// API Route: POST /api/billing/checkout
//
// Starts a Stripe Checkout (hosted page) subscription purchase for the
// signed-in web host. Body: { plan: 'basic' | 'premium' }.
//
// Flow:
//   1. Verify the Supabase JWT (same as /api/create-game).
//   2. If the user already has an entitled subscription → send them to
//      the Billing Portal instead (upgrade/downgrade/cancel there).
//   3. Reuse (or create) their Stripe customer, create a Checkout
//      Session with inline price_data, and return { url } to redirect to.
//
// The webhook (/api/stripe/webhook) activates the tier after payment.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getUserFromRequest } from '@/lib/server-auth';
import { PLANS, isPaidPlan } from '@/lib/billing-plans';
import {
  getWebSubscription,
  tierFromSubscription,
  upsertWebSubscription,
} from '@/lib/web-subscriptions';
import { enforce, rateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function siteOrigin(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') ||
    new URL(req.url).origin
  );
}

export async function POST(req: NextRequest) {
  const rl = enforce(req, { name: 'billing-checkout', limit: 10, windowMs: 60_000 });
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
      { error: 'You must be signed in to subscribe.' },
      { status: 401, headers: rateLimitHeaders(rl) },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { plan?: unknown };
    if (!isPaidPlan(body.plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Expected "basic" or "premium".' },
        { status: 400, headers: rateLimitHeaders(rl) },
      );
    }
    const plan = PLANS[body.plan];
    const stripe = getStripe();
    const origin = siteOrigin(req);

    const existing = await getWebSubscription(admin, user.id);

    // Already subscribed → manage the subscription in the Billing Portal
    // instead of stacking a second subscription on the same customer.
    if (tierFromSubscription(existing) !== 'free' && existing?.stripe_customer_id) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: existing.stripe_customer_id,
        return_url: `${origin}/upgrade`,
      });
      return NextResponse.json(
        { url: portal.url, portal: true },
        { headers: rateLimitHeaders(rl) },
      );
    }

    // Reuse the Stripe customer if we have one; otherwise create it now so
    // the subscription is always attached to a customer we can look up by id.
    let customerId = existing?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { whosmarter_user_id: user.id },
      });
      customerId = customer.id;
      await upsertWebSubscription(admin, {
        user_id: user.id,
        stripe_customer_id: customerId,
        tier: 'free',
        status: existing?.status ?? 'none',
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: plan.priceCents,
            recurring: { interval: 'month' },
            product_data: {
              name: plan.name,
              description: `${plan.monthlyQuizzes} AI-generated quizzes per month on whosmarter.com`,
            },
          },
        },
      ],
      // Copied onto the subscription so webhook events self-describe the plan.
      subscription_data: {
        metadata: { whosmarter_user_id: user.id, whosmarter_plan: plan.id },
      },
      metadata: { whosmarter_user_id: user.id, whosmarter_plan: plan.id },
      success_url: `${origin}/upgrade?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/upgrade?status=cancelled`,
      allow_promotion_codes: true,
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    return NextResponse.json({ url: session.url }, { headers: rateLimitHeaders(rl) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[billing/checkout] Error:', message);
    return NextResponse.json(
      { error: 'Could not start checkout. Please try again later.' },
      { status: 500, headers: rateLimitHeaders(rl) },
    );
  }
}
