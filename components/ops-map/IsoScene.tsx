'use client';

import { useMemo, useRef } from 'react';
import {
  FLOW_BY_ID,
  MODULE_BY_ID,
  OPS_MODULES,
  OPS_ZONES,
  uniqueFlowEdges,
} from '@/lib/ops-map/architecture';
import {
  buildingFaces,
  edgePath,
  gridLines,
  moduleCenter,
  moduleHeight,
  pointAlong,
  project,
  sceneBounds,
} from '@/lib/ops-map/iso';
import type { OpsPacket } from '@/lib/ops-map/types';

const TRAVEL = 0.11;
const GRID_COLS = 25;
const GRID_ROWS = 14;

type Props = {
  packets: OpsPacket[];
  playhead: number;
  selectedFlowId: string | null;
  selectedModuleId: string | null;
  selectedPacketId: string | null;
  moduleHits?: Record<string, number>;
  pan: { x: number; y: number; scale: number };
  onSelectModule: (id: string) => void;
  onSelectPacket: (id: string) => void;
  onSelectZone: (id: string | null) => void;
  onPan: (next: { x: number; y: number; scale: number }) => void;
};

export default function IsoScene({
  packets,
  playhead,
  selectedFlowId,
  selectedModuleId,
  selectedPacketId,
  moduleHits,
  pan,
  onSelectModule,
  onSelectPacket,
  onSelectZone,
  onPan,
}: Props) {
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const dragged = useRef(false);
  const bounds = useMemo(() => sceneBounds(OPS_MODULES, OPS_ZONES), []);
  const centers = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    for (const m of OPS_MODULES) {
      const h = moduleHeight(m.files.length, moduleHits?.[m.id]);
      map[m.id] = moduleCenter(m, h * 0.55);
    }
    return map;
  }, [moduleHits]);

  const flowEdges = uniqueFlowEdges();
  const selectedHops = selectedFlowId ? new Set(FLOW_BY_ID[selectedFlowId]?.hops ?? []) : null;
  const selectedEdgeSet = selectedFlowId
    ? new Set(
        (FLOW_BY_ID[selectedFlowId]?.hops ?? [])
          .slice(0, -1)
          .map((a, i) => `${a}>${(FLOW_BY_ID[selectedFlowId]?.hops ?? [])[i + 1]}`),
      )
    : null;

  const dots = useMemo(() => {
    const visible: { id: string; x: number; y: number; hot: boolean }[] = [];
    for (const p of packets) {
      if (selectedFlowId && p.flowId !== selectedFlowId) continue;
      const u = (playhead - p.t) / TRAVEL;
      if (u < 0 || u > 1.2) continue;
      const pt = pointAlong(p.hops, Math.min(1, Math.max(0, u)), centers);
      if (!pt) continue;
      visible.push({ id: p.id, x: pt.x, y: pt.y, hot: p.id === selectedPacketId });
    }
    return visible;
  }, [packets, playhead, selectedFlowId, selectedPacketId, centers]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const next = Math.min(2.4, Math.max(0.55, pan.scale * (e.deltaY > 0 ? 0.92 : 1.08)));
    onPan({ ...pan, scale: next });
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragged.current = false;
    drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    if (Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y) > 4) {
      dragged.current = true;
    }
    onPan({
      ...pan,
      x: drag.current.panX + (e.clientX - drag.current.x),
      y: drag.current.panY + (e.clientY - drag.current.y),
    });
  }

  function onPointerUp() {
    drag.current = null;
  }

  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;

  return (
    <svg
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      role="img"
      aria-label="WhoSmarter architecture map"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={() => {
        if (dragged.current) return;
        onSelectZone(null);
      }}
    >
      <g
        transform={`translate(${pan.x / pan.scale}, ${pan.y / pan.scale}) translate(${cx}, ${cy}) scale(${pan.scale}) translate(${-cx}, ${-cy})`}
      >
        <g opacity="0.28">
          {gridLines(GRID_COLS, GRID_ROWS).map((line, i) => (
            <path key={i} d={line.d} fill="none" stroke="#bccfb1" strokeWidth="0.7" />
          ))}
        </g>

        {OPS_ZONES.map((z) => {
          const selected = selectedModuleId
            ? MODULE_BY_ID[selectedModuleId]?.zoneId === z.id
            : false;
          const title = project(z.gx + z.w / 2, z.gz - 0.18);
          return (
            <g key={z.id}>
              <polygon
                points={zoneFloor(
                  z.gx,
                  z.gz,
                  z.w,
                  z.d,
                )}
                fill={selected ? 'rgba(47, 125, 119, 0.14)' : 'rgba(255,255,255,0.55)'}
                stroke={selected ? '#2f7d77' : '#d3decb'}
                strokeWidth={selected ? 2.2 : 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectZone(z.id);
                }}
              />
              <text
                x={title.x}
                y={title.y}
                textAnchor="middle"
                fontSize="14"
                fontWeight="750"
                letterSpacing="2"
                fill="#1d2b27"
              >
                {z.name}
              </text>
            </g>
          );
        })}

        {flowEdges.map(([a, b]) => {
          const pa = centers[a];
          const pb = centers[b];
          if (!pa || !pb) return null;
          const on = !selectedEdgeSet || selectedEdgeSet.has(`${a}>${b}`);
          return (
            <path
              key={`${a}-${b}`}
              d={edgePath(pa, pb)}
              fill="none"
              stroke={on ? '#2f7d77' : '#c5d3bc'}
              strokeWidth={on ? 1.8 : 1}
              opacity={on ? 0.85 : 0.28}
              strokeLinecap="round"
            />
          );
        })}

        {[...OPS_MODULES].sort(depthSort).map((m) => {
          const h = moduleHeight(m.files.length, moduleHits?.[m.id]);
          const faces = buildingFaces(m, h);
          const selected = m.id === selectedModuleId;
          const onPath = !selectedHops || selectedHops.has(m.id);
          const top = selected ? '#2f7d77' : onPath ? '#ffffff' : '#eef3ec';
          const left = selected ? '#276964' : '#c5d6bb';
          const right = selected ? '#1f5854' : '#9cb592';
          return (
            <g
              key={m.id}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer', opacity: onPath ? 1 : 0.38 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectModule(m.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectModule(m.id);
                }
              }}
            >
              <polygon points={faces.left} fill={left} stroke="#8aa37e" strokeWidth="0.6" />
              <polygon points={faces.right} fill={right} stroke="#7d9872" strokeWidth="0.6" />
              <polygon
                points={faces.top}
                fill={top}
                stroke={selected ? '#1d2b27' : '#d3decb'}
                strokeWidth={selected ? 1.6 : 0.8}
              />
              <text
                x={faces.label.x}
                y={faces.label.y + 1}
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill={selected ? '#ffffff' : '#1d2b27'}
                style={{ pointerEvents: 'none' }}
              >
                {shortMapLabel(m.name)}
              </text>
            </g>
          );
        })}

        {dots.map((d) => (
          <g
            key={d.id}
            transform={`translate(${d.x}, ${d.y})`}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectPacket(d.id);
            }}
          >
            <circle
              r={d.hot ? 7 : 5}
              fill={d.hot ? '#c8922f' : '#2f7d77'}
              stroke="#fff"
              strokeWidth="1.5"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

function zoneFloor(gx: number, gz: number, w: number, d: number): string {
  const pts = [project(gx, gz), project(gx + w, gz), project(gx + w, gz + d), project(gx, gz + d)];
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

function depthSort(a: { gx: number; gz: number }, b: { gx: number; gz: number }) {
  return a.gx + a.gz - (b.gx + b.gz);
}

function shortMapLabel(name: string): string {
  const cleaned = name.replace(' & ', ' ');
  if (cleaned.length <= 10) return cleaned;
  return cleaned.split(' ')[0] ?? cleaned;
}
