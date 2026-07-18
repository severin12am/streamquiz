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
