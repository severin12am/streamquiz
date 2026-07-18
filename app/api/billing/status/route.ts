// ============================================================
// API Route: GET /api/billing/status
//
// Current subscription tier + create quota for the signed-in web host.
// Used by the /upgrade page and the create form to show remaining
// quizzes and the right call-to-action.
//
// Returns: {
//   tier, status, currentPeriodEnd, hasStripeCustomer,
//   quota: { allowed, tier, used, limit, remaining }
// }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getUserFromRequest } from '@/lib/server-auth';
import { getQuotaSnapshot } from '@/lib/creator-quota';
import {
  getWebSubscription,
  tierFromSubscription,
  webQuotaKey,
} from '@/lib/web-subscriptions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = getSupabaseAdmin();
  const user = await getUserFromRequest(req, admin);
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  try {
    const sub = await getWebSubscription(admin, user.id);
    const tier = tierFromSubscription(sub);
    const quota = await getQuotaSnapshot(admin, webQuotaKey(user.id), tier);

    return NextResponse.json({
      tier,
      status: sub?.status ?? 'none',
      currentPeriodEnd: sub?.current_period_end ?? null,
      hasStripeCustomer: Boolean(sub?.stripe_customer_id),
      quota,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[billing/status] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
