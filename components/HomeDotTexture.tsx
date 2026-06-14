'use client';

import { useEffect, useState } from 'react';

const TILE = 220;
const DOT_COUNT = 720;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDotTexture(): string {
  const rand = mulberry32((Date.now() ^ (DOT_COUNT * TILE)) >>> 0);
  const parts: string[] = [];

  for (let i = 0; i < DOT_COUNT; i += 1) {
    const x = rand() * TILE;
    const y = rand() * TILE;
    const roll = rand();
    const r = roll < 0.88 ? 0.22 + rand() * 0.62 : 0.75 + rand() * 0.7;
    const opacity = 0.08 + rand() * 0.2;
    parts.push(
      `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="rgba(47,125,119,${opacity.toFixed(3)})"/>`,
    );
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}">` +
    parts.join('') +
    '</svg>';

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export default function HomeDotTexture() {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Client-only so random dots don't cause SSR/hydration mismatch ("1 issue").
  useEffect(() => {
    setBackgroundImage(buildDotTexture());
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 bg-[var(--bg-base)]"
      style={
        backgroundImage
          ? { backgroundImage, backgroundRepeat: 'repeat' }
          : undefined
      }
    />
  );
}
