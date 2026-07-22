// ============================================================
// API Route: POST /api/stripe/webhook
//
// Receives Stripe events and keeps `web_subscriptions` in sync. This is
// the ONLY writer of subscription state after checkout; the quota path
// reads the cached tier from the table (no Stripe call per create).
//
// Handled events (register these with the merchant provider):
//   • checkout.session.completed   — payment done, activate the tier
//   • customer.subscription.updated — renewals, plan changes, cancellations scheduled
//   • customer.subscription.deleted — subscription fully ended
//   • invoice.payment_failed        — mark past_due (grace until period end)
//
// Signature verification uses STRIPE_WEBHOOK_SECRET (whsec_...). The raw
// request body is required — do not parse JSON before verifying.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isPaidPlan, PLANS, type PaidPlan } from '@/lib/billing-plans';
import { upsertWebSubscription } from '@/lib/web-subscriptions';
import { sendSubscriptionActivatedEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/** Plan from subscription metadata (set at checkout), with a price-amount
 * fallback in case metadata is ever missing. */
function planFromSubscription(sub: Stripe.Subscription): PaidPlan | null {
  const fromMeta = sub.metadata?.whosmarter_plan;
  if (isPaidPlan(fromMeta)) return fromMeta;
  const amount = sub.items.data[0]?.price?.unit_amount ?? null;
  if (amount === PLANS.premium.priceCents) return 'premium';
  if (amount === PLANS.basic.priceCents) return 'basic';
  return null;
}

/** current_period_end lives on subscription ITEMS in current Stripe API versions. */
function periodEndIso(sub: Stripe.Subscription): string | null {
  const unix = sub.items.data[0]?.current_period_end;
  return typeof unix === 'number' ? new Date(unix * 1000).toISOString() : null;
}

function customerIdOf(sub: Stripe.Subscription): string | null {
  return typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
}

async function userIdForCustomer(
  admin: SupabaseClient,
  customerId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('web_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return (data as { user_id: string } | null)?.user_id ?? null;
}

/** Write the subscription's current state into web_subscriptions. */
async function applySubscription(
  admin: SupabaseClient,
  sub: Stripe.Subscription,
  userIdHint?: string | null,
): Promise<void> {
  const customerId = customerIdOf(sub);
  let userId = sub.metadata?.whosmarter_user_id || userIdHint || null;
  if (!userId && customerId) userId = await userIdForCustomer(admin, customerId);
  if (!userId) {
    console.error('[stripe/webhook] No user for subscription', sub.id);
    return;
  }

  const plan = planFromSubscription(sub);
  await upsertWebSubscription(admin, {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    // Keep the plan on record even while canceled/past_due; the effective
    // tier is computed from status + period end (lib/web-subscriptions.ts).
    tier: plan ?? 'free',
    status: sub.status,
    current_period_end: periodEndIso(sub),
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe/webhook] Signature verification failed:', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription' || !session.subscription) break;
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await applySubscription(
          admin,
          sub,
          session.client_reference_id ?? session.metadata?.whosmarter_user_id,
        );

        // Best-effort — never let a broken email fail this webhook.
        const email = session.customer_details?.email ?? session.customer_email;
        if (email) await sendSubscriptionActivatedEmail(email);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await applySubscription(admin, event.data.object);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id ?? null;
        if (!customerId) break;
        const userId = await userIdForCustomer(admin, customerId);
        if (!userId) break;
        // Don't drop the tier here — 'past_due' keeps a grace period until
        // current_period_end; subscription.updated/deleted settles it.
        const { error } = await admin
          .from('web_subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        if (error) throw error;
        break;
      }

      default:
        // Unsubscribed event type — acknowledge and ignore.
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[stripe/webhook] Failed to handle ${event.type}:`, message);
    // Non-2xx → Stripe retries with backoff, which is what we want here.
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
