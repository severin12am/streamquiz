'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  FLOW_BY_ID,
  MODULE_BY_ID,
  OPS_FLOWS,
  OPS_MODULES,
  OPS_ZONES,
  ZONE_BY_ID,
  flowsThroughModule,
  modulesInZone,
} from '@/lib/ops-map/architecture';
import type { OpsMode, OpsPacket } from '@/lib/ops-map/types';
import IsoScene from './IsoScene';
import styles from './ops-map.module.css';

const SPEEDS = [0.5, 1, 2] as const;
const BASE_MS = 42_000;

type Kpi = { label: string; value: string };

export default function OpsMapApp({
  mode,
  packets,
  moduleHits,
  kpis,
  banner,
  extraControls,
}: {
  mode: OpsMode;
  packets: OpsPacket[];
  moduleHits?: Record<string, number>;
  kpis?: Kpi[];
  banner?: string | null;
  extraControls?: ReactNode;
}) {
  const [flowId, setFlowId] = useState<string | null>('create');
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [packetId, setPacketId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [playhead, setPlayhead] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0, scale: 1 });
  const playheadRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(speed);

  useEffect(() => {
    playheadRef.current = playhead;
  }, [playhead]);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastPaint = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (playingRef.current) {
        const next = playheadRef.current + dt / (BASE_MS / speedRef.current);
        const wrapped = next >= 1 ? 0 : next;
        playheadRef.current = wrapped;
        if (now - lastPaint > 32) {
          lastPaint = now;
          setPlayhead(wrapped);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const visiblePackets = useMemo(() => {
    if (!flowId) return packets;
    return packets.filter((p) => p.flowId === flowId);
  }, [packets, flowId]);

  const selectedPacket = packetId ? packets.find((p) => p.id === packetId) ?? null : null;
  const selectedModule = moduleId ? MODULE_BY_ID[moduleId] ?? null : null;
  const selectedFlow = flowId ? FLOW_BY_ID[flowId] ?? null : null;

  const selectModule = useCallback((id: string) => {
    setModuleId(id);
    setPacketId(null);
  }, []);

  const selectPacket = useCallback(
    (id: string) => {
      const p = packets.find((x) => x.id === id);
      setPacketId(id);
      setModuleId(null);
      if (p) setFlowId(p.flowId);
      setPlaying(false);
    },
    [packets],
  );

  const selectZone = useCallback((id: string | null) => {
    if (!id) {
      setModuleId(null);
      setPacketId(null);
      return;
    }
    const first = modulesInZone(id)[0];
    if (first) setModuleId(first.id);
    setPacketId(null);
  }, []);

  function resume() {
    if (playheadRef.current >= 0.995) {
      playheadRef.current = 0;
      setPlayhead(0);
    }
    setPlaying(true);
  }

  function traceStep() {
    setPlaying(false);
    const pool = visiblePackets;
    const upcoming = pool
      .map((p) => p.t)
      .filter((t) => t > playheadRef.current + 0.004)
      .sort((a, b) => a - b);
    const nextT = upcoming[0] ?? 0;
    playheadRef.current = nextT;
    setPlayhead(nextT);
    const spawned = pool.find((p) => Math.abs(p.t - nextT) < 0.0001);
    if (spawned) {
      setPacketId(spawned.id);
      setModuleId(null);
    }
  }

  const liveCount = packets.filter((p) => !p.demo).length;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <p className={styles.kicker}>{mode === 'studio' ? 'How the app works' : 'Who is playing (anonymous)'}</p>
          <h1>{selectedFlow?.name ?? (mode === 'studio' ? 'Pick a story on the left' : 'Session map')}</h1>
          <p className={styles.lead}>
            Each block is a part of WhoSmarter. The left list is a story. Teal dots are one quiz moving along
            that story — click a dot to read what it carried.
          </p>
        </div>
        <div className={styles.stats}>
          <span>
            <strong>{OPS_FLOWS.length}</strong> flows
          </span>
          <span>
            <strong>{OPS_MODULES.length}</strong> modules
          </span>
          <span>
            <strong>{liveCount || packets.length}</strong> packets
            {packets.some((p) => p.demo) && liveCount === 0 ? ' (demo)' : ''}
          </span>
          {kpis?.map((k) => (
            <span key={k.label}>
              <strong>{k.value}</strong> {k.label}
            </span>
          ))}
        </div>
        <div className={styles.headerRight}>
          <button type="button" className={`${styles.playBtn} ${styles.primary}`} onClick={resume}>
            {playing ? 'Playing' : 'Resume flow'}
          </button>
          <button type="button" className={styles.playBtn} onClick={() => setPlaying(false)}>
            Pause
          </button>
          <button type="button" className={styles.playBtn} onClick={traceStep}>
            Trace one step
          </button>
          <div className={styles.speed} role="group" aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                className={speed === s ? styles.active : undefined}
                onClick={() => setSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
          {extraControls}
          <nav className={styles.nav} aria-label="Ops views">
            <Link href="/ops/studio" className={mode === 'studio' ? styles.active : undefined}>
              Studio
            </Link>
            <Link
              href="/ops/telemetry?view=map"
              className={mode === 'sessions' ? styles.active : undefined}
            >
              Map
            </Link>
            <Link href="/ops/telemetry">Numbers</Link>
          </nav>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.side}>
          <section>
            <h2>Stories — click one</h2>
            <ul className={styles.flowList}>
              {OPS_FLOWS.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className={flowId === f.id ? styles.active : undefined}
                    onClick={() => setFlowId(f.id)}
                  >
                    <span>{f.name}</span>
                    <span className={styles.code}>{f.hops.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Parts of the app</h2>
            {OPS_ZONES.map((z) => (
              <div key={z.id}>
                <p className={styles.zoneLabel}>{z.name}</p>
                <ul className={styles.modList}>
                  {modulesInZone(z.id).map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className={moduleId === m.id ? styles.active : undefined}
                        onClick={() => selectModule(m.id)}
                      >
                        <span>
                          <span className={styles.code}>{m.code}</span> {m.name}
                        </span>
                        <span className={styles.code}>{m.files.length}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </aside>

        <div className={styles.stage}>
          {banner ? <p className={styles.banner}>{banner}</p> : null}
          <div className={styles.legend} aria-hidden>
            <p>
              <i className={styles.lgBlock} /> block = a part of the app
            </p>
            <p>
              <i className={styles.lgLine} /> line = the path a quiz takes
            </p>
            <p>
              <i className={styles.lgDot} /> dot = one event — click it
            </p>
          </div>
          <IsoScene
            packets={visiblePackets}
            playhead={playhead}
            selectedFlowId={flowId}
            selectedModuleId={moduleId}
            selectedPacketId={packetId}
            moduleHits={moduleHits}
            pan={pan}
            onSelectModule={selectModule}
            onSelectPacket={selectPacket}
            onSelectZone={selectZone}
            onPan={setPan}
          />
          <p className={styles.hint}>
            Start on the left: “Host creates a quiz”. Then click a moving teal dot.
          </p>
        </div>

        <aside className={`${styles.side} ${styles.sideRight}`}>
          <DetailPanel
            packet={selectedPacket}
            module={selectedModule}
            flow={selectedFlow}
            onFlow={(id) => setFlowId(id)}
          />
        </aside>
      </div>
    </div>
  );
}

function DetailPanel({
  packet,
  module,
  flow,
  onFlow,
}: {
  packet: OpsPacket | null;
  module: (typeof MODULE_BY_ID)[string] | null;
  flow: (typeof FLOW_BY_ID)[string] | null;
  onFlow: (id: string) => void;
}) {
  if (packet) {
    const travelled = FLOW_BY_ID[packet.flowId];
    return (
      <>
        <p className={styles.detailKicker}>{packet.demo ? 'Demo packet' : 'Live packet'}</p>
        <h2 className={styles.detailTitle}>{packet.label}</h2>
        <p className={styles.detailMeta}>
          {packet.event}
          {packet.at ? ` · ${new Date(packet.at).toLocaleString()}` : ''}
        </p>
        <div className={styles.tags}>
          {packet.tags.map((t) => (
            <span key={t} className={styles.tag}>
              {t}
            </span>
          ))}
        </div>
        <h2 style={{ marginTop: '1.1rem' }}>Travelled by</h2>
        {travelled ? (
          <div className={styles.tags}>
            <button type="button" className={`${styles.tag} ${styles.flow}`} onClick={() => onFlow(travelled.id)}>
              {travelled.name}
            </button>
          </div>
        ) : null}
        <h2 style={{ marginTop: '1.1rem' }}>Payload</h2>
        <dl className={styles.payload}>
          {Object.entries(packet.payload).map(([k, v]) => (
            <div key={k} className={styles.payloadRow}>
              <dt>{k}</dt>
              <dd>{formatVal(v)}</dd>
            </div>
          ))}
        </dl>
      </>
    );
  }

  if (module) {
    const travelled = flowsThroughModule(module.id);
    const zone = ZONE_BY_ID[module.zoneId];
    return (
      <>
        <p className={styles.detailKicker}>{zone?.name}</p>
        <h2 className={styles.detailTitle}>
          {module.code} · {module.name}
        </h2>
        <p className={styles.detailMeta}>
          {module.files.length} files
        </p>
        <p className={styles.detailBody}>{module.summary}</p>
        <h2 style={{ marginTop: '1.1rem' }}>Travelled by</h2>
        <div className={styles.tags}>
          {travelled.map((f) => (
            <button key={f.id} type="button" className={`${styles.tag} ${styles.flow}`} onClick={() => onFlow(f.id)}>
              {f.name}
            </button>
          ))}
        </div>
        <h2 style={{ marginTop: '1.1rem' }}>Source</h2>
        <ul className={styles.files}>
          {module.files.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <h2 style={{ marginTop: '1.1rem' }}>Payload lanes</h2>
        <div className={styles.tags}>
          {module.payloadTags.map((t) => (
            <span key={t} className={styles.tag}>
              {t}
            </span>
          ))}
        </div>
      </>
    );
  }

  if (flow) {
    return (
      <>
        <p className={styles.detailKicker}>Flow</p>
        <h2 className={styles.detailTitle}>{flow.name}</h2>
        <p className={styles.detailBody}>{flow.summary}</p>
        <h2 style={{ marginTop: '1.1rem' }}>Hops</h2>
        <ul className={styles.files}>
          {flow.hops.map((id) => {
            const m = MODULE_BY_ID[id];
            return <li key={id}>{m ? `${m.code}  ${m.name}` : id}</li>;
          })}
        </ul>
      </>
    );
  }

  return (
    <>
      <p className={styles.detailKicker}>What you are looking at</p>
      <h2 className={styles.detailTitle}>This is not a spreadsheet</h2>
      <p className={styles.detailBody}>
        WhoSmarter is drawn as a little city. Click a story on the left — only that path stays bright. Click a
        block to see which files it is. Click a moving dot to see the anonymous payload (difficulty, platform,
        P2P vs TURN) — never a person’s name.
      </p>
    </>
  );
}

function formatVal(v: string | number | boolean | null): string {
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number' && v >= 100_000) return v.toLocaleString();
  return String(v);
}
