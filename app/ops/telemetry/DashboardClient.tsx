'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOpsSecret } from '@/components/ops-map/useOpsSecret';
import mapStyles from '@/components/ops-map/ops-map.module.css';
import { buildDemoPackets } from '@/lib/ops-map/demo-packets';
import UsageFunnel from './UsageFunnel';
import type { DashboardRangeDays, TelemetryDashboardStats } from '@/lib/telemetry-dashboard';

const OpsMapApp = dynamic(() => import('@/components/ops-map/OpsMapApp'), {
  ssr: false,
  loading: () => (
    <main style={{ minHeight: '100dvh', background: '#eef3ec', color: '#1d2b27', padding: '2rem' }}>
      Loading map…
    </main>
  ),
});

const RANGES: DashboardRangeDays[] = [7, 30, 90];
const DEMO_PACKETS = buildDemoPackets();

export default function TelemetryDashboardClient() {
  const [view, setView] = useState<'map' | 'numbers'>('numbers');
  const { secret, draft, setDraft, unlocked, unlock } = useOpsSecret();
  const [range, setRange] = useState<DashboardRangeDays>(30);
  const [stats, setStats] = useState<TelemetryDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'map') setView('map');
    if (v === 'numbers') setView('numbers');
  }, []);

  const load = useCallback(async (key: string, days: DashboardRangeDays) => {
    if (!key) return;
    try {
      const res = await fetch(`/api/ops/telemetry?range=${days}`, {
        headers: { 'X-Ops-Dashboard-Secret': key },
        cache: 'no-store',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStats(null);
        setError(typeof body.error === 'string' ? body.error : `HTTP ${res.status}`);
        setHint(typeof body.hint === 'string' ? body.hint : null);
        return;
      }
      setStats(body as TelemetryDashboardStats);
      setError(null);
      setHint(null);
    } catch (err) {
      setStats(null);
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!secret) return;
    const ac = new AbortController();
    fetch(`/api/ops/telemetry?range=${range}`, {
      headers: { 'X-Ops-Dashboard-Secret': secret },
      cache: 'no-store',
      signal: ac.signal,
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        return { res, body };
      })
      .then(({ res, body }) => {
        if (!res.ok) {
          setStats(null);
          setError(typeof body.error === 'string' ? body.error : `HTTP ${res.status}`);
          setHint(typeof body.hint === 'string' ? body.hint : null);
          return;
        }
        setStats(body as TelemetryDashboardStats);
        setError(null);
        setHint(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setStats(null);
        setError(err instanceof Error ? err.message : 'Network error');
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [secret, range]);

  function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    unlock(draft);
  }

  if (!unlocked) {
    return (
      <main className="ops-shell">
        <form className="ops-gate" onSubmit={onUnlock}>
          <p className="ops-kicker">Local ops</p>
          <h1>Telemetry</h1>
          <p className="ops-lead">
            Enter <code>OPS_DASHBOARD_SECRET</code> from your <code>.env.local</code>. This page is not linked
            from the public site.
          </p>
          <label>
            Secret
            <input
              type="password"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="OPS_DASHBOARD_SECRET"
            />
          </label>
          {error && <p className="ops-error">{error}</p>}
          {hint && <p className="ops-hint">{hint}</p>}
          <button type="submit">Open dashboard</button>
        </form>
        <style jsx global>{opsStyles}</style>
      </main>
    );
  }

  if (view === 'map') {
    const live = stats?.packets ?? [];
    const packets = live.length > 0 ? live : DEMO_PACKETS;
    const banner = error
      ? error
      : !stats && loading
        ? 'Loading telemetry packets…'
        : live.length === 0
          ? 'No telemetry rows in this range — playing scripted demo packets until events land.'
          : null;
    return (
      <OpsMapApp
        mode="sessions"
        packets={packets}
        moduleHits={live.length > 0 ? stats?.moduleHits : undefined}
        banner={banner}
        kpis={
          stats
            ? [
                { label: 'creates', value: fmt(stats.kpis.creates) },
                {
                  label: 'finish rate',
                  value: stats.kpis.finishRatePct != null ? `${stats.kpis.finishRatePct}%` : '—',
                },
                {
                  label: 'TURN pairs',
                  value: pctOf(stats.webrtcPairs.relay, stats.webrtcPairs.total),
                },
              ]
            : undefined
        }
        extraControls={
          <>
            <div className={mapStyles.speed} role="group" aria-label="Date range">
              {RANGES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={range === d ? mapStyles.active : undefined}
                  onClick={() => setRange(d)}
                >
                  {d}d
                </button>
              ))}
            </div>
            <button type="button" className={mapStyles.playBtn} onClick={() => void load(secret, range)}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </>
        }
      />
    );
  }

  return (
    <main className="ops-shell">
      <header className="ops-header">
        <div>
          <p className="ops-kicker">WhoSmarter · local ops</p>
          <h1>Usage</h1>
          <p className="ops-lead">
            How many quiz rooms reached each step, and from web vs iOS.
            {stats ? ` · ${stats.rowCount.toLocaleString()} telemetry rows in range` : null}
          </p>
        </div>
        <div className="ops-controls">
          <div className="ops-range" role="group" aria-label="Date range">
            {RANGES.map((d) => (
              <button
                key={d}
                type="button"
                className={range === d ? 'active' : undefined}
                onClick={() => setRange(d)}
              >
                {d}d
              </button>
            ))}
          </div>
          <button type="button" className="ghost" onClick={() => void load(secret, range)} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <nav className="ops-range" aria-label="Ops views">
            <Link href="/ops/studio">Studio</Link>
            <Link href="/ops/telemetry?view=map" onClick={() => setView('map')}>
              Map
            </Link>
            <Link href="/ops/telemetry" className="active" onClick={() => setView('numbers')}>
              Numbers
            </Link>
          </nav>
        </div>
      </header>

      {error && (
        <div className="ops-banner bad">
          <strong>{error}</strong>
          {hint ? <span>{hint}</span> : null}
        </div>
      )}

      {stats && (
        <>
          {stats.funnel && stats.traffic && stats.pay && stats.setup && stats.failures ? (
            <UsageFunnel
              funnel={stats.funnel}
              traffic={stats.traffic}
              pay={stats.pay}
              setup={stats.setup}
              failures={stats.failures}
              rangeDays={stats.rangeDays}
            />
          ) : null}

          <section className="ops-kpis">
            <Kpi
              label="Home opens"
              value={fmt(stats.traffic?.home ?? 0)}
              sub="tab sessions, not unique people"
            />
            <Kpi
              label="Sign-ups in range"
              value={fmt(stats.accounts?.signupsInRange ?? 0)}
              sub={`${fmt(stats.accounts?.signupsTotal ?? 0)} hosts all-time`}
            />
            <Kpi
              label="Quota blocked"
              value={fmt(stats.pay?.quotaExceeded.total ?? 0)}
              sub="create or rematch hit the free wall"
            />
            <Kpi
              label="Opened Stripe"
              value={fmt(stats.pay?.checkoutStarted ?? 0)}
              sub={`${fmt(stats.pay?.checkoutCompleted ?? 0)} completed`}
            />
            <Kpi
              label="Paid in DB"
              value={fmt(stats.accounts?.paidActive ?? 0)}
              sub={`${fmt(stats.accounts?.paidCanceled ?? 0)} canceled · existing table`}
            />
            <Kpi label="Quizzes created" value={fmt(stats.kpis.creates)} />
            <Kpi
              label="Finished"
              value={fmt(stats.kpis.finishes)}
              sub={stats.kpis.finishRatePct != null ? `${stats.kpis.finishRatePct}% of creates` : undefined}
            />
            <Kpi
              label="Est. coturn ICE calls"
              value={stats.kpis.estimatedCoturnIceCalls != null ? fmt(stats.kpis.estimatedCoturnIceCalls) : '—'}
              sub={`${fmt(stats.kpis.iceSamples)} samples logged`}
            />
            <Kpi
              label="Metered fallback samples"
              value={fmt(stats.kpis.meteredIceSamples)}
              sub="always logged when used"
            />
            <Kpi
              label="Approx. media volume"
              value={fmtBytes(stats.kpis.approxMediaBytes)}
              sub={`${fmt(stats.kpis.webrtcSummaries)} match summaries`}
            />
            <Kpi
              label="TURN share of pairs"
              value={pctOf(stats.webrtcPairs.relay, stats.webrtcPairs.total)}
              sub={`${fmt(stats.webrtcPairs.relay)} relay / ${fmt(stats.webrtcPairs.total)} pairs`}
            />
            <Kpi
              label="Est. coturn / mo"
              value={fmtEur(stats.coturnCost.projectedMonthlyTotalEur)}
              sub={`VPS €${stats.coturnCost.vpsMonthlyEur} + overage €${stats.coturnCost.projectedMonthlyOverageEur}`}
            />
          </section>

          <Panel
            title="Coturn cost (Hetzner)"
            caption="Flat VPS fee dominates until you burn through included outbound TB"
          >
            <div className="ops-cost">
              <div className="ops-cost-grid">
                <div>
                  <span className="ops-kpi-label">Projected monthly total</span>
                  <strong>{fmtEur(stats.coturnCost.projectedMonthlyTotalEur)}</strong>
                </div>
                <div>
                  <span className="ops-kpi-label">VPS (fixed)</span>
                  <strong>{fmtEur(stats.coturnCost.vpsMonthlyEur)}</strong>
                </div>
                <div>
                  <span className="ops-kpi-label">Projected egress</span>
                  <strong>{fmtGb(stats.coturnCost.projectedMonthlyEgressGb)}</strong>
                </div>
                <div>
                  <span className="ops-kpi-label">Of included {stats.coturnCost.includedTb} TB</span>
                  <strong>{stats.coturnCost.projectedIncludedPct}%</strong>
                </div>
                <div>
                  <span className="ops-kpi-label">Overage (€{stats.coturnCost.overageEurPerTb}/TB)</span>
                  <strong>{fmtEur(stats.coturnCost.projectedMonthlyOverageEur)}</strong>
                </div>
                <div>
                  <span className="ops-kpi-label">Relay media in range</span>
                  <strong>{fmtBytes(stats.coturnCost.estimatedRelayMediaBytes)}</strong>
                </div>
              </div>
              <p className="ops-cost-verdict">
                {stats.coturnCost.projectedMonthlyOverageEur <= 0
                  ? `At this pace you stay inside the included ${stats.coturnCost.includedTb} TB — cost ≈ the flat VPS bill (${fmtEur(stats.coturnCost.vpsMonthlyEur)}/mo).`
                  : `Projected overage ${fmtEur(stats.coturnCost.projectedMonthlyOverageEur)}/mo on top of the VPS.`}
              </p>
              <ul className="ops-cost-notes">
                {stats.coturnCost.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </Panel>

          <section className="ops-grid">
            <Panel title="Web vs iOS (quiz creates)" caption="platform on game_created">
              <BarList
                items={stats.platformCreates.map((p) => ({
                  label: p.platform,
                  value: p.count,
                  suffix: `${p.pct}%`,
                }))}
              />
            </Panel>
            <Panel title="Web vs iOS (ICE configs)" caption="platform on ice_config_served samples">
              <BarList
                items={stats.platformIce.map((p) => ({
                  label: p.platform,
                  value: p.count,
                  suffix: `${p.pct}%`,
                }))}
              />
            </Panel>
            <Panel
              title="Relay pool served"
              caption="coturn primary · Metered only when coturn down"
            >
              <BarList
                items={stats.relayPool.map((p) => ({
                  label: p.pool,
                  value: p.samples,
                  suffix: `${p.pct}%`,
                  accent: p.pool === 'coturn' ? 'accent' : p.pool === 'metered' ? 'warn' : undefined,
                }))}
              />
            </Panel>
            <Panel title="WebRTC path (host summaries)" caption="pairs across finished matches">
              <BarList
                items={[
                  { label: 'P2P', value: stats.webrtcPairs.p2p, suffix: pctOf(stats.webrtcPairs.p2p, stats.webrtcPairs.total) },
                  { label: 'TURN relay', value: stats.webrtcPairs.relay, suffix: pctOf(stats.webrtcPairs.relay, stats.webrtcPairs.total), accent: 'accent' as const },
                  { label: 'Failed', value: stats.webrtcPairs.failed, suffix: pctOf(stats.webrtcPairs.failed, stats.webrtcPairs.total), accent: 'warn' as const },
                ]}
              />
            </Panel>
          </section>

          <Panel title="Creates per day" caption={`last ${stats.rangeDays} days · stacked by platform`}>
            <StackedDayChart days={stats.createsByDay} />
          </Panel>

          <section className="ops-grid three">
            <Panel title="Hosts we already had" caption="auth + quota tables — counts only, no emails">
              <BarList
                items={[
                  { label: 'Web hosts who created', value: stats.accounts?.webHosts ?? 0 },
                  { label: 'iOS quota keys', value: stats.accounts?.iosQuotaKeys ?? 0 },
                  { label: 'Came back (2+ creates)', value: stats.accounts?.returningHosts ?? 0 },
                  { label: 'Free trial used up', value: stats.accounts?.trialExhausted ?? 0 },
                ]}
              />
            </Panel>
            <Panel title="Locale" caption="game_created">
              <BarList items={stats.locales.map((x) => ({ label: x.key, value: x.count }))} />
            </Panel>
            <Panel title="Difficulty" caption="game_created">
              <BarList items={stats.difficulties.map((x) => ({ label: x.key, value: x.count }))} />
            </Panel>
            <Panel title="Players at finish" caption="game_finished">
              <BarList
                items={stats.playerCounts.map((x) => ({
                  label: `${x.players} players`,
                  value: x.games,
                }))}
              />
            </Panel>
          </section>

          <section className="ops-caveats">
            <h2>How to read this</h2>
            <ul>
              {stats.caveats.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="ops-meta">Generated {new Date(stats.generatedAt).toLocaleString()}</p>
          </section>
        </>
      )}

      {!stats && !error && loading && <p className="ops-lead">Loading…</p>}

      <style jsx global>{opsStyles}</style>
    </main>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ops-kpi">
      <span className="ops-kpi-label">{label}</span>
      <strong>{value}</strong>
      {sub ? <span className="ops-kpi-sub">{sub}</span> : null}
    </div>
  );
}

function Panel({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ops-panel">
      <header>
        <h2>{title}</h2>
        {caption ? <p>{caption}</p> : null}
      </header>
      {children}
    </section>
  );
}

function BarList({
  items,
}: {
  items: { label: string; value: number; suffix?: string; accent?: 'accent' | 'warn' }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) {
    return <p className="ops-empty">No rows in this range.</p>;
  }
  return (
    <ul className="ops-bars">
      {items.map((item) => (
        <li key={item.label}>
          <div className="ops-bar-meta">
            <span>{item.label}</span>
            <span>
              {fmt(item.value)}
              {item.suffix ? ` · ${item.suffix}` : ''}
            </span>
          </div>
          <div className="ops-bar-track">
            <div
              className={`ops-bar-fill ${item.accent ?? ''}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function StackedDayChart({
  days,
}: {
  days: TelemetryDashboardStats['createsByDay'];
}) {
  const max = Math.max(1, ...days.map((d) => d.total));
  const tickEvery = Math.max(1, Math.ceil(days.length / 10));

  const totals = useMemo(
    () => ({
      web: days.reduce((s, d) => s + d.web, 0),
      ios: days.reduce((s, d) => s + d.ios, 0),
      unknown: days.reduce((s, d) => s + d.unknown, 0),
    }),
    [days],
  );

  return (
    <div className="ops-daychart">
      <div className="ops-legend">
        <span>
          <i className="swatch web" /> web {fmt(totals.web)}
        </span>
        <span>
          <i className="swatch ios" /> ios {fmt(totals.ios)}
        </span>
        {totals.unknown > 0 ? (
          <span>
            <i className="swatch unk" /> unknown {fmt(totals.unknown)}
          </span>
        ) : null}
      </div>
      <div className="ops-daybars" style={{ '--n': days.length } as React.CSSProperties}>
        {days.map((d, i) => (
          <div key={d.day} className="ops-daycol" title={`${d.day}: ${d.total}`}>
            <div className="ops-daystack" style={{ height: `${(d.total / max) * 100}%` }}>
              {d.web > 0 ? <span className="web" style={{ flex: d.web }} /> : null}
              {d.ios > 0 ? <span className="ios" style={{ flex: d.ios }} /> : null}
              {d.unknown > 0 ? <span className="unk" style={{ flex: d.unknown }} /> : null}
            </div>
            {i % tickEvery === 0 || i === days.length - 1 ? (
              <time>{d.day.slice(5)}</time>
            ) : (
              <time aria-hidden> </time>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function fmtBytes(n: number): string {
  if (!n) return '0 B';
  if (n < 1_000_000) return `${Math.round(n / 1000)} KB`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  return `${(n / 1_000_000_000).toFixed(2)} GB`;
}

function pctOf(part: number, total: number): string {
  if (!total) return '—';
  return `${Math.round((part / total) * 1000) / 10}%`;
}

function fmtEur(n: number): string {
  return `€${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtGb(n: number): string {
  if (n < 0.001) return `${Math.round(n * 1024 * 1024)} KB/mo`;
  if (n < 1) return `${Math.round(n * 1024)} MB/mo`;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} GB/mo`;
}

const opsStyles = `
  .ops-shell {
    min-height: 100vh;
    padding: 2rem clamp(1rem, 3vw, 2.5rem) 4rem;
    max-width: 1180px;
    margin: 0 auto;
    background:
      radial-gradient(1200px 480px at 10% -10%, rgba(47, 125, 119, 0.12), transparent 55%),
      var(--bg-base);
  }
  .ops-kicker {
    margin: 0 0 0.35rem;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    font-weight: 600;
  }
  h1 {
    margin: 0;
    font-size: clamp(1.75rem, 3vw, 2.35rem);
    letter-spacing: -0.03em;
    color: var(--text-primary);
  }
  .ops-lead {
    margin: 0.5rem 0 0;
    color: var(--text-secondary);
    max-width: 42rem;
    line-height: 1.45;
  }
  .ops-lead code, .ops-gate code {
    font-size: 0.9em;
    background: var(--bg-elevated);
    padding: 0.1em 0.35em;
    border-radius: 4px;
  }
  .ops-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem 2rem;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 1.75rem;
  }
  .ops-controls {
    display: flex;
    gap: 0.65rem;
    align-items: center;
  }
  .ops-range {
    display: inline-flex;
    border: 1px solid var(--border-strong);
    border-radius: 10px;
    overflow: hidden;
    background: var(--bg-card);
  }
  .ops-range button, .ops-range a, .ops-controls .ghost, .ops-gate button {
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    padding: 0.55rem 0.9rem;
    font: inherit;
    cursor: pointer;
    text-decoration: none;
  }
  .ops-range button.active, .ops-range a.active {
    background: var(--accent);
    color: #fff;
  }
  .ops-controls .ghost {
    border: 1px solid var(--border-strong);
    border-radius: 10px;
    background: var(--bg-card);
  }
  .ops-controls .ghost:disabled { opacity: 0.6; cursor: wait; }
  .ops-gate {
    margin: 12vh auto 0;
    max-width: 26rem;
    padding: 1.75rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 18px;
    display: grid;
    gap: 0.85rem;
  }
  .ops-gate label {
    display: grid;
    gap: 0.35rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }
  .ops-gate input {
    border: 1px solid var(--border-strong);
    border-radius: 10px;
    padding: 0.7rem 0.8rem;
    font: inherit;
    background: #fff;
  }
  .ops-gate button {
    background: var(--accent);
    color: #fff;
    border-radius: 10px;
    font-weight: 600;
  }
  .ops-error { color: var(--wrong); margin: 0; font-size: 0.9rem; }
  .ops-hint { color: var(--text-muted); margin: 0; font-size: 0.85rem; }
  .ops-banner {
    display: grid;
    gap: 0.25rem;
    padding: 0.9rem 1rem;
    border-radius: 12px;
    margin-bottom: 1.25rem;
    background: #f8e7e4;
    border: 1px solid #e8b4ab;
    color: #7a2e24;
  }
  .ops-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }
  .ops-kpi {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 0.95rem 1rem;
    display: grid;
    gap: 0.25rem;
  }
  .ops-kpi-label {
    font-size: 0.78rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .ops-kpi strong {
    font-size: 1.55rem;
    letter-spacing: -0.03em;
    color: var(--text-primary);
  }
  .ops-kpi-sub { font-size: 0.8rem; color: var(--text-secondary); }
  .ops-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
    margin-bottom: 0.85rem;
  }
  .ops-grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  @media (max-width: 900px) {
    .ops-grid, .ops-grid.three { grid-template-columns: 1fr; }
  }
  .ops-panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.1rem 1.15rem 1.2rem;
    margin-bottom: 0.85rem;
  }
  .ops-panel header { margin-bottom: 0.85rem; }
  .ops-panel h2 {
    margin: 0;
    font-size: 1.05rem;
    letter-spacing: -0.02em;
  }
  .ops-panel header p {
    margin: 0.2rem 0 0;
    font-size: 0.82rem;
    color: var(--text-muted);
  }
  .ops-bars { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.65rem; }
  .ops-bar-meta {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.88rem;
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
  }
  .ops-bar-track {
    height: 8px;
    background: var(--bg-elevated);
    border-radius: 999px;
    overflow: hidden;
  }
  .ops-bar-fill {
    height: 100%;
    background: var(--secondary-strong);
    border-radius: 999px;
    min-width: 2px;
  }
  .ops-bar-fill.accent { background: var(--accent); }
  .ops-bar-fill.warn { background: var(--gold); }
  .ops-empty { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
  .ops-daychart { display: grid; gap: 0.75rem; }
  .ops-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }
  .ops-legend .swatch {
    display: inline-block;
    width: 0.65rem;
    height: 0.65rem;
    border-radius: 2px;
    margin-right: 0.35rem;
  }
  .swatch.web { background: var(--accent); }
  .swatch.ios { background: var(--secondary-strong); }
  .swatch.unk { background: var(--text-muted); }
  .ops-daybars {
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
    align-items: end;
    gap: 3px;
    height: 180px;
    padding-top: 0.5rem;
  }
  .ops-daycol {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: stretch;
    height: 100%;
    gap: 0.35rem;
    min-width: 0;
  }
  .ops-daystack {
    display: flex;
    flex-direction: column-reverse;
    width: 100%;
    min-height: 2px;
    border-radius: 3px 3px 0 0;
    overflow: hidden;
  }
  .ops-daystack .web { background: var(--accent); }
  .ops-daystack .ios { background: var(--secondary-strong); }
  .ops-daystack .unk { background: var(--text-muted); }
  .ops-daycol time {
    font-size: 0.65rem;
    color: var(--text-muted);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
  }
  .ops-caveats {
    margin-top: 0.5rem;
    padding: 1rem 1.15rem;
    border-left: 3px solid var(--accent);
    background: rgba(47, 125, 119, 0.06);
    border-radius: 0 12px 12px 0;
  }
  .ops-caveats h2 {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
  }
  .ops-caveats ul {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--text-secondary);
    display: grid;
    gap: 0.35rem;
    font-size: 0.88rem;
    line-height: 1.4;
  }
  .ops-meta {
    margin: 0.75rem 0 0;
    font-size: 0.78rem;
    color: var(--text-muted);
  }
  .ops-cost-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.85rem;
  }
  .ops-cost-grid > div {
    display: grid;
    gap: 0.2rem;
  }
  .ops-cost-grid strong {
    font-size: 1.25rem;
    letter-spacing: -0.02em;
  }
  .ops-cost-verdict {
    margin: 1rem 0 0.65rem;
    padding: 0.7rem 0.85rem;
    background: rgba(47, 125, 119, 0.08);
    border-radius: 10px;
    color: var(--text-primary);
    font-size: 0.92rem;
    line-height: 1.4;
  }
  .ops-cost-notes {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--text-muted);
    font-size: 0.82rem;
    display: grid;
    gap: 0.3rem;
    line-height: 1.35;
  }
`;
