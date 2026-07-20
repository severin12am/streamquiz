// ============================================================
// WhoSmarter — subscription plan catalog (shared, client-safe)
//
// Single source of truth for plan pricing and quota limits, used by:
//   • lib/creator-quota.ts   (server quota enforcement)
//   • /api/billing/checkout  (Stripe price_data)
//   • the /upgrade page      (plan cards)
//
// MUST stay in sync with the iOS app (RevenueCat products) and the
// marketing copy in lib/i18n/about.ts.
// ============================================================

export type PaidPlan = 'basic' | 'premium';

export interface PlanInfo {
  /** Stripe/RevenueCat-agnostic plan id. */
  id: PaidPlan;
  /** Display name used on plan cards AND as the Stripe product name. */
  name: string;
  /** Monthly price in USD cents (Stripe unit_amount). */
  priceCents: number;
  /** Quiz creations included per month. */
  monthlyQuizzes: number;
}

/** Lifetime free quiz creations before a subscription is required. */
export const FREE_TRIAL_CREATES = 5;

export const PLANS: Record<PaidPlan, PlanInfo> = {
  basic: {
    id: 'basic',
    name: 'WhoSmarter Basic',
    priceCents: 800,
    monthlyQuizzes: 30,
  },
  premium: {
    id: 'premium',
    name: 'WhoSmarter Premium',
    priceCents: 2400,
    monthlyQuizzes: 300,
  },
};

export function isPaidPlan(v: unknown): v is PaidPlan {
  return v === 'basic' || v === 'premium';
}

// ------------------------------------------------------------------
// TEMPORARY: Stripe Live Mode verification SKU.
//
// The payment provider asked for a $1 test tariff/subscription to pay
// with a real card and confirm Live Mode works end-to-end. This is NOT
// a real pricing tier — it's only reachable via /upgrade?test=1 and is
// internally recorded as the 'basic' tier (the DB/quota schema only
// knows free/basic/premium). DELETE this block + its call sites once
// the provider confirms everything works.
// ------------------------------------------------------------------
export const TEST_PLAN = {
  id: 'test' as const,
  name: 'WhoSmarter Live Mode Test',
  priceCents: 100,
  grantsTier: 'basic' as const,
};
