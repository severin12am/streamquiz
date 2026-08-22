// ============================================================
// Aggregate privacy-safe telemetry_events for the local ops dashboard.
// Server-only — uses the service role client.
// ============================================================

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { FREE_TRIAL_CREATES } from '@/lib/billing-plans';
import {
  moduleHitsFromPackets,
  telemetryRowsToPackets,
} from '@/lib/ops-map/packets';
import type { OpsPacket } from '@/lib/ops-map/types';

export type DashboardRangeDays = 7 | 30 | 90;

export type TelemetryDashboardStats = {
  rangeDays: DashboardRangeDays;
  generatedAt: string;
  rowCount: number;
  kpis: {
    creates: number;
    finishes: number;
    finishRatePct: number | null;
    iceSamples: number;
    webrtcSummaries: number;
    approxMediaBytes: number;
    /** Rough estimate: coturn ice samples / 0.15 (healthy path is sampled). */
    estimatedCoturnIceCalls: number | null;
    meteredIceSamples: number;
  };
  platformCreates: PlatformSlice[];
  platformIce: PlatformSlice[];
  relayPool: { pool: string; samples: number; pct: number }[];
  webrtcPairs: { p2p: number; relay: number; failed: number; total: number };
  createsByDay: { day: string; web: number; ios: number; unknown: number; total: number }[];
  locales: { key: string; count: number }[];
  difficulties: { key: string; count: number }[];
  playerCounts: { players: number; games: number }[];
  funnel: UsageFunnel;
  traffic: TrafficStats;
  pay: PayStats;
  setup: SetupMix;
  failures: FailureStats;
  accounts: AccountStats;
  /** Hetzner coturn cost model (flat VPS + optional egress overage). */
  coturnCost: CoturnCostEstimate;
  /** Anonymous events as inspectable map packets (capped). */
  packets: OpsPacket[];
  moduleHits: Record<string, number>;
  caveats: string[];
};

export type CoturnCostEstimate = {
  /** Configured monthly VPS price (EUR). */
  vpsMonthlyEur: number;
  includedTb: number;
  overageEurPerTb: number;
  /** Host-reported media attributed to TURN pairs in this range (bytes). */
  estimatedRelayMediaBytes: number;
  /** Rough VPS *egress* estimate for the range (Hetzner bills outbound only). */
  estimatedEgressBytesInRange: number;
  /** extrapolated to 30 days from the selected range. */
  projectedMonthlyEgressGb: number;
  projectedMonthlyOverageEur: number;
  /** Flat VPS + projected overage. */
  projectedMonthlyTotalEur: number;
  /** Share of included traffic used by the monthly projection (0–100+). */
  projectedIncludedPct: number;
  notes: string[];
};

export type PlatformCounts = { web: number; ios: number; unknown: number; total: number };

type PlatformSlice = { platform: string; count: number; pct: number };

export type FunnelStep = {
  id: string;
  title: string;
  blurb: string;
  counts: PlatformCounts;
  /** Player seats when this step reports player_count (finish). */
  seats: number | null;
  /** % of the first step (created). */
  ofCreatedPct: number | null;
  /** % of the previous step. */
  ofPrevPct: number | null;
  /** True when we have no events of this kind in the range (new instrumentation). */
  empty: boolean;
};

export type UsageFunnel = {
  steps: FunnelStep[];
  video: {
    summaries: number;
    p2p: number;
    relay: number;
    failed: number;
    byPlatform: PlatformCounts;
  };
};

export type NamedCount = { key: string; count: number };

export type TrafficStats = {
  home: number;
  upgrade: number;
  game: number;
  legal: number;
  total: number;
  byPlatform: PlatformCounts;
  byDay: {
    day: string;
    home: number;
    upgrade: number;
    game: number;
    legal: number;
    total: number;
  }[];
};

export type PayStats = {
  quotaExceeded: PlatformCounts;
  checkoutStarted: number;
  checkoutCompleted: number;
  billingFailed: number;
  billingCanceled: number;
  startedByPlan: NamedCount[];
};

export type SetupMix = {
  publicRooms: number;
  privateRooms: number;
  camerasOn: number;
  camerasOff: number;
};

export type FailureStats = {
  createFailed: NamedCount[];
  mediaPermission: NamedCount[];
  rematches: { fresh: number; replay: number; total: number };
};

export type AccountStats = {
  signupsInRange: number;
  signupsTotal: number;
  webHosts: number;
  iosQuotaKeys: number;
  returningHosts: number;
  trialExhausted: number;
  paidActive: number;
  paidCanceled: number;
};

type RawRow = {
  event: string;
  created_at: string;
  game_ref: string | null;
  platform: string | null;
  locale: string | null;
  difficulty: string | null;
  game_mode: string | null;
  mc_mode: boolean | null;
  cameras_on: boolean | null;
  num_questions: number | null;
  player_count: number | null;
  is_public: boolean | null;
  status: string | null;
  webrtc_pairs_total: number | null;
  webrtc_pairs_p2p: number | null;
  webrtc_pairs_relay: number | null;
  webrtc_pairs_failed: number | null;
  relay_provider: string | null;
  bytes_sent_total: number | null;
  bytes_recv_total: number | null;
  cameras_enabled_mesh: boolean | null;
  meta: Record<string, unknown> | null;
};

const PAGE = 1000;

export async function buildTelemetryDashboardStats(
  rangeDays: DashboardRangeDays,
): Promise<TelemetryDashboardStats> {
  const rangeStartMs = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
  const since = new Date(rangeStartMs).toISOString();
  const [rows, accounts] = await Promise.all([
    fetchTelemetryRows(since),
    fetchAccountStats(since),
  ]);

  const creates = rows.filter((r) => r.event === 'game_created');
  const starts = rows.filter((r) => r.event === 'game_started');
  const finishes = rows.filter((r) => r.event === 'game_finished');
  const webrtc = rows.filter((r) => r.event === 'webrtc_summary');
  const ice = rows.filter((r) => r.event === 'ice_config_served');
  const guestJoins = rows.filter((r) => r.event === 'player_joined' && r.status === 'guest');
  const pageHits = rows.filter((r) => r.event === 'page_hit');
  const quotaRows = rows.filter((r) => r.event === 'quota_exceeded');
  const checkoutStartedRows = rows.filter((r) => r.event === 'checkout_started');
  const rematchRows = rows.filter((r) => r.event === 'game_rematch');
  const createFailedRows = rows.filter((r) => r.event === 'create_failed');
  const mediaRows = rows.filter((r) => r.event === 'media_permission');

  const finishRatePct =
    creates.length > 0 ? Math.round((finishes.length / creates.length) * 1000) / 10 : null;

  let p2p = 0;
  let relay = 0;
  let failed = 0;
  let approxMediaBytes = 0;
  for (const r of webrtc) {
    p2p += r.webrtc_pairs_p2p ?? 0;
    relay += r.webrtc_pairs_relay ?? 0;
    failed += r.webrtc_pairs_failed ?? 0;
    approxMediaBytes += (r.bytes_sent_total ?? 0) + (r.bytes_recv_total ?? 0);
  }

  const poolCounts = new Map<string, number>();
  let meteredIceSamples = 0;
  let coturnIceSamples = 0;
  for (const r of ice) {
    const pool =
      (typeof r.relay_provider === 'string' && r.relay_provider) ||
      (typeof r.meta?.relay_pool === 'string' ? r.meta.relay_pool : null) ||
      'unknown';
    poolCounts.set(pool, (poolCounts.get(pool) ?? 0) + 1);
    if (pool === 'metered') meteredIceSamples += 1;
    if (pool === 'coturn') coturnIceSamples += 1;
  }

  const relayPool = toPctList(
    [...poolCounts.entries()].map(([pool, samples]) => ({ pool, samples })),
    'samples',
  ).map((x) => ({ pool: x.pool, samples: x.samples, pct: x.pct }));

  // Healthy coturn path is sampled at ~15%; Metered always logged.
  const estimatedCoturnIceCalls =
    coturnIceSamples > 0 ? Math.round(coturnIceSamples / 0.15) : coturnIceSamples === 0 && ice.length === 0 ? null : 0;

  const pairTotal = p2p + relay + failed;
  const packets = telemetryRowsToPackets(rows, rangeStartMs, Date.now());
  const moduleHits = moduleHitsFromPackets(packets);

  const coturnCost = buildCoturnCostEstimate({
    rangeDays,
    approxMediaBytes,
    relayPairs: relay,
    pairTotal,
  });

  return {
    rangeDays,
    generatedAt: new Date().toISOString(),
    rowCount: rows.length,
    kpis: {
      creates: creates.length,
      finishes: finishes.length,
      finishRatePct,
      iceSamples: ice.length,
      webrtcSummaries: webrtc.length,
      approxMediaBytes,
      estimatedCoturnIceCalls,
      meteredIceSamples,
    },
    platformCreates: platformSlices(creates),
    platformIce: platformSlices(ice),
    relayPool,
    webrtcPairs: { p2p, relay, failed, total: pairTotal },
    createsByDay: buildsCreatesByDay(creates, rangeDays),
    locales: topCounts(creates.map((r) => r.locale || 'unknown')),
    difficulties: topCounts(creates.map((r) => r.difficulty || 'unknown')),
    playerCounts: playerHistogram(finishes),
    funnel: buildUsageFunnel(creates, starts, finishes, webrtc, guestJoins),
    traffic: buildTraffic(pageHits, rangeDays),
    pay: {
      quotaExceeded: countsOf(quotaRows),
      checkoutStarted: checkoutStartedRows.length,
      checkoutCompleted: rows.filter((r) => r.event === 'checkout_completed').length,
      billingFailed: rows.filter((r) => r.event === 'billing_failed').length,
      billingCanceled: rows.filter((r) => r.event === 'billing_canceled').length,
      startedByPlan: topCounts(checkoutStartedRows.map((r) => r.status || 'unknown')),
    },
    setup: {
      publicRooms: creates.filter((r) => r.is_public === true).length,
      privateRooms: creates.filter((r) => r.is_public !== true).length,
      camerasOn: creates.filter((r) => r.cameras_on === true).length,
      camerasOff: creates.filter((r) => r.cameras_on === false).length,
    },
    failures: {
      createFailed: topCounts(createFailedRows.map((r) => r.status || 'unknown')),
      mediaPermission: topCounts(mediaRows.map((r) => r.status || 'unknown')),
      rematches: {
        fresh: rematchRows.filter((r) => r.status === 'fresh').length,
        replay: rematchRows.filter((r) => r.status === 'replay').length,
        total: rematchRows.length,
      },
    },
    accounts,
    packets,
    moduleHits,
    coturnCost,
    caveats: [
      'Sessions / seats / tab-loads, not unique people. No visitor cookie or device id.',
      'Page hits: one count per browser tab session per path (home / upgrade / game / legal). Refresh does not add another.',
      'Funnel is unique quiz rooms: created → a guest sat down → started → finished. “Started” and “guest sat” are new — older rooms stay 0 until new matches.',
      'Checkout / quota / billing events have no emails or Stripe ids — only plan name and that it happened.',
      'Camera/mic “permission” is getUserMedia, not ICE failed pairs.',
      'Healthy coturn ICE responses are sampled (~15%); Metered fallback is always logged. Estimated coturn ICE calls ≈ coturn samples ÷ 0.15.',
      'Media bytes are rounded (~100 KB buckets) and host-reported — order of magnitude only.',
      'iOS share is only accurate when the iOS app sends X-WhoSmarter-Client: ios (and the new client events).',
      'Signups / quota / paid-tier counts come from existing auth and billing tables — we did not add new personal data.',
      'Coturn cost: Hetzner is mostly a flat monthly VPS fee; egress overage is only after included TB.',
    ],
  };
}

/** Defaults match typical Hetzner Cloud EU (CX/CPX): ~€4–5/mo, 20 TB included, €1/TB overage. */
function readCoturnCostConfig() {
  const num = (key: string, fallback: number) => {
    const raw = process.env[key];
    if (raw == null || raw.trim() === '') return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    vpsMonthlyEur: num('COTURN_VPS_MONTHLY_EUR', 4.35),
    includedTb: num('COTURN_INCLUDED_TB', 20),
    overageEurPerTb: num('COTURN_OVERAGE_EUR_PER_TB', 1),
  };
}

function buildCoturnCostEstimate(args: {
  rangeDays: number;
  approxMediaBytes: number;
  relayPairs: number;
  pairTotal: number;
}): CoturnCostEstimate {
  const { vpsMonthlyEur, includedTb, overageEurPerTb } = readCoturnCostConfig();
  const relayShare = args.pairTotal > 0 ? args.relayPairs / args.pairTotal : 0;
  // Attribute host-reported media to TURN pairs only.
  const estimatedRelayMediaBytes = Math.round(args.approxMediaBytes * relayShare);
  // Hetzner bills outbound only. TURN egress is roughly on the order of
  // relayed media volume (each RTP direction out of the VPS). Use 1.0× as
  // a mid estimate; real vnstat may differ for mesh/multi-peer.
  const estimatedEgressBytesInRange = estimatedRelayMediaBytes;
  const days = Math.max(1, args.rangeDays);
  const projectedMonthlyEgressGb =
    Math.round(((estimatedEgressBytesInRange / days) * 30) / (1024 ** 3) * 1000) / 1000;
  const includedGb = includedTb * 1024;
  const overageGb = Math.max(0, projectedMonthlyEgressGb - includedGb);
  const projectedMonthlyOverageEur = Math.round(overageGb * overageEurPerTb * 100) / 100;
  const projectedMonthlyTotalEur =
    Math.round((vpsMonthlyEur + projectedMonthlyOverageEur) * 100) / 100;
  const projectedIncludedPct =
    includedGb > 0 ? Math.round((projectedMonthlyEgressGb / includedGb) * 1000) / 10 : 0;

  return {
    vpsMonthlyEur,
    includedTb,
    overageEurPerTb,
    estimatedRelayMediaBytes,
    estimatedEgressBytesInRange,
    projectedMonthlyEgressGb,
    projectedMonthlyOverageEur,
    projectedMonthlyTotalEur,
    projectedIncludedPct,
    notes: [
      `Hetzner Cloud EU: flat ~€${vpsMonthlyEur}/mo VPS + €${overageEurPerTb}/TB after ${includedTb} TB included outbound.`,
      'Inbound traffic is free; only egress can incur overage.',
      'Egress here is inferred from host WebRTC byte totals × TURN pair share — not billing-grade. Check Hetzner Cloud Console / vnstat for truth.',
    ],
  };
}

async function fetchTelemetryRows(sinceIso: string): Promise<RawRow[]> {
  const admin = getSupabaseAdmin();
  const out: RawRow[] = [];
  let from = 0;

  for (;;) {
    const to = from + PAGE - 1;
    const { data, error } = await admin
      .from('telemetry_events')
      .select(
        'event,created_at,game_ref,platform,locale,difficulty,game_mode,mc_mode,cameras_on,num_questions,player_count,is_public,status,webrtc_pairs_total,webrtc_pairs_p2p,webrtc_pairs_relay,webrtc_pairs_failed,relay_provider,bytes_sent_total,bytes_recv_total,cameras_enabled_mesh,meta',
      )
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }
    const batch = (data ?? []) as RawRow[];
    out.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
    // Hard cap so a runaway table cannot blow memory on a laptop.
    if (out.length >= 50_000) break;
  }

  return out;
}

function platformSlices(rows: RawRow[]): PlatformSlice[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const p = (r.platform || 'unknown').toLowerCase();
    map.set(p, (map.get(p) ?? 0) + 1);
  }
  const total = rows.length || 1;
  return [...map.entries()]
    .map(([platform, count]) => ({
      platform,
      count,
      pct: Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);
}

function topCounts(keys: string[]): { key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const k of keys) map.set(k, (map.get(k) ?? 0) + 1);
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function playerHistogram(finishes: RawRow[]): { players: number; games: number }[] {
  const map = new Map<number, number>();
  for (const r of finishes) {
    const n = r.player_count;
    if (n == null || n < 1) continue;
    map.set(n, (map.get(n) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([players, games]) => ({ players, games }))
    .sort((a, b) => a.players - b.players);
}

function buildsCreatesByDay(
  creates: RawRow[],
  rangeDays: number,
): { day: string; web: number; ios: number; unknown: number; total: number }[] {
  const days: { day: string; web: number; ios: number; unknown: number; total: number }[] = [];
  const today = startOfUtcDay(new Date());

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    days.push({
      day: d.toISOString().slice(0, 10),
      web: 0,
      ios: 0,
      unknown: 0,
      total: 0,
    });
  }

  const index = new Map(days.map((d, i) => [d.day, i]));
  for (const r of creates) {
    const day = r.created_at.slice(0, 10);
    const i = index.get(day);
    if (i == null) continue;
    const p = (r.platform || 'unknown').toLowerCase();
    if (p === 'web') days[i].web += 1;
    else if (p === 'ios') days[i].ios += 1;
    else days[i].unknown += 1;
    days[i].total += 1;
  }
  return days;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toPctList<T extends Record<string, unknown>>(
  items: T[],
  countKey: keyof T,
): (T & { pct: number })[] {
  const total = items.reduce((s, x) => s + Number(x[countKey] ?? 0), 0) || 1;
  return items
    .map((x) => ({
      ...x,
      pct: Math.round((Number(x[countKey] ?? 0) / total) * 1000) / 10,
    }))
    .sort((a, b) => Number(b[countKey] ?? 0) - Number(a[countKey] ?? 0));
}

function buildTraffic(pageHits: RawRow[], rangeDays: number): TrafficStats {
  type DayRow = {
    day: string;
    home: number;
    upgrade: number;
    game: number;
    legal: number;
    total: number;
  };
  const emptyCounts = () => ({ home: 0, upgrade: 0, game: 0, legal: 0, total: 0 });
  const today = startOfUtcDay(new Date());
  const byDay: DayRow[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    byDay.push({ day: d.toISOString().slice(0, 10), ...emptyCounts() });
  }
  const index = new Map(byDay.map((d, i) => [d.day, i]));
  const totals = emptyCounts();

  for (const r of pageHits) {
    const path =
      r.status === 'home' || r.status === 'upgrade' || r.status === 'game' || r.status === 'legal'
        ? r.status
        : null;
    if (!path) continue;
    totals[path] += 1;
    totals.total += 1;
    const i = index.get(r.created_at.slice(0, 10));
    if (i == null) continue;
    byDay[i][path] += 1;
    byDay[i].total += 1;
  }

  return {
    ...totals,
    byPlatform: countsOf(pageHits),
    byDay,
  };
}

async function fetchAccountStats(sinceIso: string): Promise<AccountStats> {
  const empty: AccountStats = {
    signupsInRange: 0,
    signupsTotal: 0,
    webHosts: 0,
    iosQuotaKeys: 0,
    returningHosts: 0,
    trialExhausted: 0,
    paidActive: 0,
    paidCanceled: 0,
  };
  try {
    const admin = getSupabaseAdmin();
    const sinceMs = new Date(sinceIso).getTime();

    let signupsTotal = 0;
    let signupsInRange = 0;
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const list = data?.users ?? [];
      if (list.length === 0) break;
      for (const u of list) {
        signupsTotal += 1;
        if (new Date(u.created_at).getTime() >= sinceMs) signupsInRange += 1;
      }
      if (list.length < 200) break;
    }

    const { data: quotas } = await admin
      .from('creator_quota')
      .select('quota_key,free_used,monthly_used');
    let webHosts = 0;
    let iosQuotaKeys = 0;
    let returningHosts = 0;
    let trialExhausted = 0;
    for (const q of quotas ?? []) {
      const key = String((q as { quota_key: string }).quota_key ?? '');
      const freeUsed = Number((q as { free_used: number }).free_used ?? 0);
      const monthlyUsed = Number((q as { monthly_used: number }).monthly_used ?? 0);
      const isWeb = key.startsWith('web:');
      if (isWeb) webHosts += 1;
      else iosQuotaKeys += 1;
      if (freeUsed + monthlyUsed >= 2) returningHosts += 1;
      if (isWeb && freeUsed >= FREE_TRIAL_CREATES) trialExhausted += 1;
    }

    const { data: subs } = await admin.from('web_subscriptions').select('tier,status');
    let paidActive = 0;
    let paidCanceled = 0;
    for (const s of subs ?? []) {
      const tier = String((s as { tier: string }).tier ?? '');
      const status = String((s as { status: string }).status ?? '');
      if (tier !== 'basic' && tier !== 'premium') continue;
      if (status === 'active' || status === 'trialing' || status === 'past_due') paidActive += 1;
      if (status === 'canceled' || status === 'cancelled') paidCanceled += 1;
    }

    return {
      signupsInRange,
      signupsTotal,
      webHosts,
      iosQuotaKeys,
      returningHosts,
      trialExhausted,
      paidActive,
      paidCanceled,
    };
  } catch {
    return empty;
  }
}

function uniqueByGameRef(rows: RawRow[]): RawRow[] {
  const seen = new Set<string>();
  const out: RawRow[] = [];
  let anon = 0;
  for (const r of rows) {
    const key = r.game_ref || `__anon_${anon++}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function countsOf(rows: RawRow[]): PlatformCounts {
  const out: PlatformCounts = { web: 0, ios: 0, unknown: 0, total: 0 };
  for (const r of uniqueByGameRef(rows)) {
    const p = (r.platform || 'unknown').toLowerCase();
    if (p === 'web') out.web += 1;
    else if (p === 'ios') out.ios += 1;
    else out.unknown += 1;
    out.total += 1;
  }
  return out;
}

function seatsOf(rows: RawRow[]): number {
  let seats = 0;
  for (const r of uniqueByGameRef(rows)) {
    if (r.player_count && r.player_count > 0) seats += r.player_count;
  }
  return seats;
}

function pct(part: number, whole: number): number | null {
  if (!whole) return null;
  return Math.round((part / whole) * 1000) / 10;
}

function buildUsageFunnel(
  creates: RawRow[],
  starts: RawRow[],
  finishes: RawRow[],
  webrtc: RawRow[],
  guestJoins: RawRow[],
): UsageFunnel {
  const created = countsOf(creates);
  const joined = countsOf(guestJoins);
  const started = countsOf(starts);
  const finished = countsOf(finishes);
  const videoPlat = countsOf(webrtc);

  const steps: FunnelStep[] = [
    {
      id: 'created',
      title: 'Created a quiz',
      blurb: 'Host successfully created a room.',
      counts: created,
      seats: null,
      ofCreatedPct: created.total ? 100 : null,
      ofPrevPct: null,
      empty: created.total === 0,
    },
    {
      id: 'joined',
      title: 'Someone else sat down',
      blurb: 'A guest claimed a seat. New — older rooms stay 0.',
      counts: joined,
      seats: seatsOf(guestJoins) || null,
      ofCreatedPct: pct(joined.total, created.total),
      ofPrevPct: pct(joined.total, created.total),
      empty: guestJoins.length === 0,
    },
    {
      id: 'started',
      title: 'Started the match',
      blurb: 'Host pressed Start. Counted from now on — older rooms will read 0.',
      counts: started,
      seats: seatsOf(starts) || null,
      ofCreatedPct: pct(started.total, created.total),
      ofPrevPct: pct(started.total, joined.total || created.total),
      empty: starts.length === 0,
    },
    {
      id: 'finished',
      title: 'Finished the match',
      blurb: 'Host reached the winner screen.',
      counts: finished,
      seats: seatsOf(finishes) || null,
      ofCreatedPct: pct(finished.total, created.total),
      ofPrevPct: pct(finished.total, started.total || joined.total || created.total),
      empty: finished.total === 0,
    },
  ];

  return {
    steps,
    video: {
      summaries: videoPlat.total,
      p2p: webrtc.reduce((s, r) => s + (r.webrtc_pairs_p2p ?? 0), 0),
      relay: webrtc.reduce((s, r) => s + (r.webrtc_pairs_relay ?? 0), 0),
      failed: webrtc.reduce((s, r) => s + (r.webrtc_pairs_failed ?? 0), 0),
      byPlatform: videoPlat,
    },
  };
}
