// ============================================================
// WhoSmarter — server-side creator quota (SERVER ONLY)
//
// Authoritative create-quiz counters, keyed by:
//   • iOS: the RevenueCat app user ID (`X-Quota-Key` header). Tier is
//     resolved from RevenueCat via REVENUECAT_SECRET_API_KEY.
//   • Web: 'web:{auth uid}'. Tier is resolved from the Stripe-backed
//     `web_subscriptions` table (see lib/web-subscriptions.ts) and passed
//     in as the pre-resolved `tier` argument.
//
// Limits live in lib/billing-plans.ts and MUST stay in sync with the
// iOS app: free = 5 (lifetime trial), basic = 30/mo, premium = 300/mo.
//
// Uses the SERVICE ROLE Supabase client — RLS forbids anon/authenticated
// access to `creator_quota` by design.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { FREE_TRIAL_CREATES, PLANS } from '@/lib/billing-plans';

export type QuotaTier = 'free' | 'basic' | 'premium';

export interface QuotaSnapshot {
  allowed: boolean;
  tier: QuotaTier;
  used: number;
  limit: number;
  remaining: number;
}

const BASIC_MONTHLY_GAMES = PLANS.basic.monthlyQuizzes;
const PREMIUM_MONTHLY_GAMES = PLANS.premium.monthlyQuizzes;

function currentMonth(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthlyLimit(tier: QuotaTier): number | null {
  if (tier === 'basic') return BASIC_MONTHLY_GAMES;
  if (tier === 'premium') return PREMIUM_MONTHLY_GAMES;
  return null;
}

function snapshot(tier: QuotaTier, used: number, limit: number): QuotaSnapshot {
  const remaining = Math.max(0, limit - used);
  return { allowed: remaining > 0, tier, used, limit, remaining };
}

/** Resolve subscription tier from RevenueCat REST API (authoritative). */
export async function fetchTierFromRevenueCat(quotaKey: string): Promise<QuotaTier> {
  const secret = process.env.REVENUECAT_SECRET_API_KEY?.trim();
  if (!secret || !quotaKey) return 'free';
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(quotaKey)}`,
      { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store' },
    );
    if (!res.ok) return 'free';
    const data = (await res.json()) as {
      subscriber?: { entitlements?: Record<string, { expires_date?: string | null }> };
    };
    const entitlements = data.subscriber?.entitlements ?? {};
    const active = (id: string) => {
      const e = entitlements[id];
      if (!e) return false;
      if (!e.expires_date) return true;
      return new Date(e.expires_date).getTime() > Date.now();
    };
    if (active('premium')) return 'premium';
    if (active('basic')) return 'basic';
    return 'free';
  } catch {
    return 'free';
  }
}

interface QuotaRow {
  free_used: number;
  monthly_used: number;
  month_key: string;
}

async function readRow(supabase: SupabaseClient, quotaKey: string): Promise<QuotaRow> {
  const { data } = await supabase
    .from('creator_quota')
    .select('free_used, monthly_used, month_key')
    .eq('quota_key', quotaKey)
    .maybeSingle();
  const month = currentMonth();
  if (!data) return { free_used: 0, monthly_used: 0, month_key: month };
  if (data.month_key !== month) {
    return { free_used: data.free_used, monthly_used: 0, month_key: month };
  }
  return data as QuotaRow;
}

/** Read-only quota check (no increment). For GET /api/quota. */
export async function getQuotaSnapshot(
  supabase: SupabaseClient,
  quotaKey: string,
  tier?: QuotaTier,
): Promise<QuotaSnapshot> {
  const resolvedTier = tier ?? (await fetchTierFromRevenueCat(quotaKey));
  const row = await readRow(supabase, quotaKey);
  const monthly = monthlyLimit(resolvedTier);
  if (monthly != null) return snapshot(resolvedTier, row.monthly_used, monthly);
  return snapshot(resolvedTier, row.free_used, FREE_TRIAL_CREATES);
}

/**
 * Atomically check + consume one create. Returns null when quota is exceeded.
 * Call BEFORE generating AI questions / inserting the game row.
 *
 * Pass `presetTier` when the tier is already known (web users — resolved
 * from web_subscriptions); otherwise it is fetched from RevenueCat (iOS).
 */
export async function consumeCreateQuota(
  supabase: SupabaseClient,
  quotaKey: string,
  presetTier?: QuotaTier,
): Promise<QuotaSnapshot | null> {
  if (!quotaKey) return null;
  const tier = presetTier ?? (await fetchTierFromRevenueCat(quotaKey));
  const row = await readRow(supabase, quotaKey);
  const month = currentMonth();
  const monthly = monthlyLimit(tier);

  if (monthly != null) {
    const used = row.month_key === month ? row.monthly_used : 0;
    if (used >= monthly) return null;
    const nextUsed = used + 1;
    const { error } = await supabase.from('creator_quota').upsert(
      {
        quota_key: quotaKey,
        free_used: row.free_used,
        monthly_used: nextUsed,
        month_key: month,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'quota_key' },
    );
    if (error) throw error;
    return snapshot(tier, nextUsed, monthly);
  }

  if (row.free_used >= FREE_TRIAL_CREATES) return null;
  const nextFree = row.free_used + 1;
  const { error } = await supabase.from('creator_quota').upsert(
    {
      quota_key: quotaKey,
      free_used: nextFree,
      monthly_used: row.month_key === month ? row.monthly_used : 0,
      month_key: month,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'quota_key' },
  );
  if (error) throw error;
  return snapshot(tier, nextFree, FREE_TRIAL_CREATES);
}
