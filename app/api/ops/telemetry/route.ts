// ============================================================
// GET /api/ops/telemetry?range=30
// Private ops stats. Requires OPS_DASHBOARD_SECRET via header
// X-Ops-Dashboard-Secret or Authorization: Bearer … or ?key=
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  authorizeOpsDashboard,
  isOpsDashboardConfigured,
} from '@/lib/ops-dashboard-auth';
import { isAdminConfigured } from '@/lib/supabase-admin';
import {
  buildTelemetryDashboardStats,
  type DashboardRangeDays,
} from '@/lib/telemetry-dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isOpsDashboardConfigured()) {
    return NextResponse.json({ error: 'Ops dashboard not configured' }, { status: 404 });
  }
  if (!authorizeOpsDashboard(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdminConfigured) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in this environment' },
      { status: 503 },
    );
  }

  const raw = req.nextUrl.searchParams.get('range') ?? '30';
  const rangeDays = (raw === '7' || raw === '30' || raw === '90' ? Number(raw) : 30) as DashboardRangeDays;

  try {
    const stats = await buildTelemetryDashboardStats(rangeDays);
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load telemetry';
    const missingTable = /telemetry_events|schema cache|does not exist/i.test(message);
    return NextResponse.json(
      {
        error: message,
        hint: missingTable
          ? 'Run supabase/migration-v14-telemetry.sql once in the Supabase SQL Editor.'
          : undefined,
      },
      { status: 500 },
    );
  }
}
