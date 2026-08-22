'use client';

import type {
  FailureStats,
  FunnelStep,
  PayStats,
  SetupMix,
  TrafficStats,
  UsageFunnel,
} from '@/lib/telemetry-dashboard';
import styles from './UsageFunnel.module.css';

export default function UsageFunnel({
  funnel,
  traffic,
  pay,
  setup,
  failures,
  rangeDays,
}: {
  funnel: UsageFunnel;
  traffic: TrafficStats;
  pay: PayStats;
  setup: SetupMix;
  failures: FailureStats;
  rangeDays: number;
}) {
  const created = funnel.steps[0]?.counts.total ?? 0;
  const barMax = Math.max(1, created, ...funnel.steps.map((s) => s.counts.total));

  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h2>How far quizzes get</h2>
          <p>
            Last {rangeDays} days. Each column is a unique quiz room, split by whether the host was on{' '}
            <b className={styles.web}>web</b> or <b className={styles.ios}>iOS</b>. This is seats/sessions, not
            unique humans.
          </p>
        </div>
      </header>

      <ol className={styles.steps}>
        {funnel.steps.map((step, i) => {
          const prev = i > 0 ? funnel.steps[i - 1] : null;
          const lost = prev ? Math.max(0, prev.counts.total - step.counts.total) : 0;
          const lostPct = prev && prev.counts.total > 0 ? Math.round((lost / prev.counts.total) * 100) : null;
          return (
            <li key={step.id}>
              {prev ? (
                <p className={styles.drop}>
                  {step.empty
                    ? emptyHint(step.id)
                    : lostPct == null
                      ? '—'
                      : lost === 0
                        ? 'No drop-off'
                        : `${lost.toLocaleString()} rooms stopped here (${lostPct}%)`}
                </p>
              ) : null}
              <FunnelCard step={step} barMax={barMax} />
            </li>
          );
        })}
      </ol>

      <div className={styles.video}>
        <h3>After finish — how peers connected</h3>
        <p>
          This is the audio/video <em>mesh</em> (one link per other player), not “did they turn the
          camera on.” Mic-only games still count. Failed includes real ICE failures, a peer who left
          early, and links we could not classify in time — not permission-deny.
        </p>
        <div className={styles.videoBars}>
          <VideoRow label="Direct P2P" value={funnel.video.p2p} total={pairTotal(funnel)} tone="ok" />
          <VideoRow label="TURN relay" value={funnel.video.relay} total={pairTotal(funnel)} tone="warn" />
          <VideoRow
            label="Failed / unknown"
            value={funnel.video.failed}
            total={pairTotal(funnel)}
            tone="bad"
          />
        </div>
        <p className={styles.videoMeta}>
          {funnel.video.summaries.toLocaleString()} finished rooms sent a summary · web{' '}
          {funnel.video.byPlatform.web} · iOS {funnel.video.byPlatform.ios}
        </p>
      </div>

      <div className={styles.video}>
        <h3>Page opens (tab sessions)</h3>
        <p>
          One count per browser tab per path — not unique people. No cookie. Ops pages are not
          counted.
        </p>
        <div className={styles.videoBars}>
          <VideoRow label="Home" value={traffic.home} total={traffic.total} tone="ok" />
          <VideoRow label="Game" value={traffic.game} total={traffic.total} tone="ok" />
          <VideoRow label="Upgrade" value={traffic.upgrade} total={traffic.total} tone="warn" />
          <VideoRow label="Legal" value={traffic.legal} total={traffic.total} tone="ok" />
        </div>
        <p className={styles.videoMeta}>
          {traffic.total.toLocaleString()} tab sessions in {rangeDays}d · web {traffic.byPlatform.web} ·
          iOS {traffic.byPlatform.ios}
        </p>
      </div>

      <div className={styles.video}>
        <h3>Paywall & checkout</h3>
        <p>
          Anonymous counts only. July 2026 charges you already know were team tests; new rows here
          mean someone hit the wall or opened Stripe after this shipped.
        </p>
        <div className={styles.videoBars}>
          <VideoRow
            label="Quota blocked"
            value={pay.quotaExceeded.total}
            total={Math.max(1, pay.quotaExceeded.total, pay.checkoutStarted, pay.checkoutCompleted)}
            tone="warn"
          />
          <VideoRow
            label="Opened Stripe"
            value={pay.checkoutStarted}
            total={Math.max(1, pay.quotaExceeded.total, pay.checkoutStarted, pay.checkoutCompleted)}
            tone="ok"
          />
          <VideoRow
            label="Paid"
            value={pay.checkoutCompleted}
            total={Math.max(1, pay.quotaExceeded.total, pay.checkoutStarted, pay.checkoutCompleted)}
            tone="ok"
          />
          <VideoRow
            label="Card failed"
            value={pay.billingFailed}
            total={Math.max(1, pay.checkoutStarted, pay.billingFailed)}
            tone="bad"
          />
          <VideoRow
            label="Canceled"
            value={pay.billingCanceled}
            total={Math.max(1, pay.checkoutCompleted, pay.billingCanceled)}
            tone="warn"
          />
        </div>
      </div>

      <div className={styles.video}>
        <h3>How rooms were set up</h3>
        <p>From create events already stored — invite vs public, cameras requested vs off.</p>
        <div className={styles.videoBars}>
          <VideoRow
            label="Invite only"
            value={setup.privateRooms}
            total={setup.privateRooms + setup.publicRooms}
            tone="ok"
          />
          <VideoRow
            label="Public list"
            value={setup.publicRooms}
            total={setup.privateRooms + setup.publicRooms}
            tone="warn"
          />
          <VideoRow
            label="Cameras on"
            value={setup.camerasOn}
            total={setup.camerasOn + setup.camerasOff}
            tone="ok"
          />
          <VideoRow
            label="Cameras off"
            value={setup.camerasOff}
            total={setup.camerasOn + setup.camerasOff}
            tone="warn"
          />
        </div>
      </div>

      <div className={styles.video}>
        <h3>Friction</h3>
        <p>
          Create errors, camera/mic permission (not ICE), rematches. Empty until these events start
          landing.
        </p>
        <ul className={styles.meta}>
          {failures.createFailed.length === 0 ? (
            <li>No failed creates yet</li>
          ) : (
            failures.createFailed.map((x) => (
              <li key={x.key}>
                create {x.key} <b>{x.count}</b>
              </li>
            ))
          )}
          {failures.mediaPermission.length === 0 ? (
            <li>No camera/mic blocks yet</li>
          ) : (
            failures.mediaPermission.map((x) => (
              <li key={x.key}>
                media {x.key} <b>{x.count}</b>
              </li>
            ))
          )}
          <li>
            rematch fresh <b>{failures.rematches.fresh}</b>
          </li>
          <li>
            rematch same questions <b>{failures.rematches.replay}</b>
          </li>
        </ul>
      </div>
    </section>
  );
}

function emptyHint(id: string): string {
  if (id === 'started') return 'No Start events yet — new matches will show up here.';
  if (id === 'joined') return 'No guest-seat events yet — new joins will show up here.';
  return 'No events yet.';
}

function FunnelCard({ step, barMax }: { step: FunnelStep; barMax: number }) {
  const width = `${Math.max(8, (step.counts.total / barMax) * 100)}%`;
  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <h3>{step.title}</h3>
        <strong>{step.counts.total.toLocaleString()}</strong>
      </div>
      <p className={styles.blurb}>{step.blurb}</p>
      <div className={styles.barTrack} aria-hidden>
        <div className={styles.bar} style={{ width }}>
          <span className={styles.segWeb} style={{ flex: Math.max(step.counts.web, 0.0001) }} />
          <span className={styles.segIos} style={{ flex: Math.max(step.counts.ios, 0.0001) }} />
          {step.counts.unknown > 0 ? (
            <span className={styles.segUnk} style={{ flex: step.counts.unknown }} />
          ) : null}
        </div>
      </div>
      <ul className={styles.meta}>
        <li>
          web <b>{step.counts.web.toLocaleString()}</b>
        </li>
        <li>
          iOS <b>{step.counts.ios.toLocaleString()}</b>
        </li>
        {step.ofCreatedPct != null ? (
          <li>
            {step.ofCreatedPct}% of created
          </li>
        ) : null}
        {step.seats != null ? (
          <li>
            {step.seats.toLocaleString()} player seats
          </li>
        ) : null}
      </ul>
    </article>
  );
}

function VideoRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: 'ok' | 'warn' | 'bad';
}) {
  const pct = total ? Math.round((value / total) * 1000) / 10 : 0;
  return (
    <div className={styles.videoRow}>
      <span>{label}</span>
      <div className={styles.videoTrack}>
        <i className={styles[tone]} style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
      </div>
      <b>
        {value.toLocaleString()} · {total ? `${pct}%` : '—'}
      </b>
    </div>
  );
}

function pairTotal(funnel: UsageFunnel): number {
  return funnel.video.p2p + funnel.video.relay + funnel.video.failed;
}
