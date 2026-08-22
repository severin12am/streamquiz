import type { IsoPoint, OpsModule, OpsZone } from './types';

/** 2:1 isometric — one tile is 52×26 screen px. */
export const TILE_W = 52;
export const TILE_H = 26;

export function project(gx: number, gz: number, gy = 0): IsoPoint {
  return {
    x: (gx - gz) * (TILE_W / 2),
    y: (gx + gz) * (TILE_H / 2) - gy,
  };
}

export function moduleCenter(m: OpsModule, heightPx = 0): IsoPoint {
  return project(m.gx + m.w / 2, m.gz + m.d / 2, heightPx);
}

export function zoneFloorPoints(z: OpsZone): string {
  const pts = [
    project(z.gx, z.gz),
    project(z.gx + z.w, z.gz),
    project(z.gx + z.w, z.gz + z.d),
    project(z.gx, z.gz + z.d),
  ];
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export function buildingFaces(m: OpsModule, heightPx: number) {
  const x0 = m.gx;
  const z0 = m.gz;
  const x1 = m.gx + m.w;
  const z1 = m.gz + m.d;
  const h = heightPx;
  const poly = (pts: IsoPoint[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return {
    right: poly([project(x1, z0, h), project(x1, z1, h), project(x1, z1, 0), project(x1, z0, 0)]),
    left: poly([project(x0, z1, h), project(x1, z1, h), project(x1, z1, 0), project(x0, z1, 0)]),
    top: poly([project(x0, z0, h), project(x1, z0, h), project(x1, z1, h), project(x0, z1, h)]),
    label: project(m.gx + m.w / 2, m.gz + m.d / 2, h + 2),
  };
}

export function lerpPoint(a: IsoPoint, b: IsoPoint, t: number): IsoPoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function pointAlong(
  hops: string[],
  u: number,
  centers: Record<string, IsoPoint>,
): IsoPoint | null {
  const pts = hops.map((id) => centers[id]).filter(Boolean);
  if (pts.length === 0) return null;
  if (pts.length === 1) return pts[0];
  const clamped = Math.min(1, Math.max(0, u));
  const scaled = clamped * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(scaled));
  const f = scaled - i;
  return lerpPoint(pts[i], pts[i + 1], f);
}

export function sceneBounds(modules: OpsModule[], zones: OpsZone[], pad = 48) {
  const pts: IsoPoint[] = [];
  for (const z of zones) {
    pts.push(project(z.gx, z.gz), project(z.gx + z.w, z.gz), project(z.gx + z.w, z.gz + z.d), project(z.gx, z.gz + z.d));
  }
  for (const m of modules) {
    pts.push(project(m.gx, m.gz, 80), project(m.gx + m.w, m.gz + m.d, 0));
  }
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

export function gridLines(cols: number, rows: number): { d: string }[] {
  const lines: { d: string }[] = [];
  for (let x = 0; x <= cols; x++) {
    const a = project(x, 0);
    const b = project(x, rows);
    lines.push({ d: `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}` });
  }
  for (let z = 0; z <= rows; z++) {
    const a = project(0, z);
    const b = project(cols, z);
    lines.push({ d: `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}` });
  }
  return lines;
}

export function edgePath(a: IsoPoint, b: IsoPoint): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - 8;
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

export function moduleHeight(fileCount: number, hits?: number): number {
  if (hits != null) return Math.min(92, 16 + Math.sqrt(hits) * 10);
  return Math.min(78, 22 + fileCount * 3.2);
}
