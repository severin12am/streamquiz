// ============================================================
// API Route: GET /api/quota
//
// Read-only creator-quota lookup (no increment). Lets the iOS app refresh
// remaining create counts on launch. Keyed by the `X-Quota-Key` header
// (RevenueCat app user ID). If the app skips this, it gets quota from
// create-game / generate-questions responses instead.
//
// Returns: { quota: { allowed, tier, used, limit, remaining } }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getQuotaSnapshot } from '@/lib/creator-quota';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const quotaKey = req.headers.get('x-quota-key')?.trim();
  if (!quotaKey) {
    return NextResponse.json({ error: 'Missing quota key' }, { status: 400 });
  }

  try {
    const quota = await getQuotaSnapshot(getSupabaseAdmin(), quotaKey);
    return NextResponse.json({ quota });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[quota] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
