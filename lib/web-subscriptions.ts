// ============================================================
// WhoSmarter — web subscription state (SERVER ONLY)
//
// Reads/writes the `web_subscriptions` table (Stripe-backed tier for
// web hosts, keyed by Supabase auth uid). Uses the SERVICE ROLE client —
// RLS forbids anon/authenticated access by design.
//
// The webhook (/api/stripe/webhook) is the source of truth for writes;
// the quota path only READS the cached tier (no Stripe call per create).
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { QuotaTier } from '@/lib/creator-quota';
import { isPaidPlan } from '@/lib/billing-plans';

export interface WebSubscriptionRow {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  tier: 'free' | 'basic' | 'premium';
  status: string;
  current_period_end: string | null;
}

/** Quota key for web users; never collides with RevenueCat app user ids. */
export function webQuotaKey(userId: string): string {
  return `web:${userId}`;
}

/** Subscription statuses that keep paid entitlements on. `past_due` gets a
 * grace period until current_period_end so a single failed charge doesn't
 * instantly lock a paying user out mid-cycle. */
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due']);

export async function getWebSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<WebSubscriptionRow | null> {
  const { data } = await supabase
    .from('web_subscriptions')
    .select('user_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as WebSubscriptionRow | null) ?? null;
}

/** Resolve the effective tier from a cached subscription row. */
export function tierFromSubscription(row: WebSubscriptionRow | null): QuotaTier {
  if (!row || !isPaidPlan(row.tier)) return 'free';
  if (!ENTITLED_STATUSES.has(row.status)) return 'free';
  if (row.current_period_end) {
    // 24h grace over the recorded period end covers webhook delivery lag
    // around renewals.
    const graceMs = 24 * 60 * 60 * 1000;
    if (new Date(row.current_period_end).getTime() + graceMs < Date.now()) {
      return 'free';
    }
  }
  return row.tier;
}

/** One-call helper for the hot path (create-game / generate-questions). */
export async function fetchTierForWebUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuotaTier> {
  return tierFromSubscription(await getWebSubscription(supabase, userId));
}

export async function upsertWebSubscription(
  supabase: SupabaseClient,
  row: {
    user_id: string;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    tier: 'free' | 'basic' | 'premium';
    status: string;
    current_period_end?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('web_subscriptions').upsert(
    { ...row, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}
