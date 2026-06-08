'use client';
// ============================================================
// CountdownTimer — Circular SVG countdown ring
//
// Shows a smoothly-draining arc around a number.
// Colour shifts green → orange → red as time runs out.
//
// SMOOTHNESS: pass `remainingMs` (fractional milliseconds left) and the
// ring drains continuously instead of jumping a whole second at a time.
// The big number still shows whole seconds (rounded up) so it's easy to
// read. If `remainingMs` is omitted we fall back to the integer `current`.
//
// TO CHANGE TIMING:
//   - Total seconds comes from the `total` prop
//   - Danger threshold: change the 5 and 10 values below
// ============================================================

import React from 'react';

interface CountdownTimerProps {
  current:     number; // whole seconds remaining (fallback / number shown)
  total:       number; // total seconds of this phase (e.g. 12)
  remainingMs?: number; // fractional ms remaining (smooth ring) — optional
}

export default function CountdownTimer({ current, total, remainingMs }: CountdownTimerProps) {
  const RADIUS        = 45;                     // circle radius (px)
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;   // ~283px

  // Use the precise ms remaining for the ring when available so it drains
  // continuously; otherwise fall back to whole seconds.
  const totalMs   = Math.max(1, total * 1000);
  const leftMs    = remainingMs != null ? Math.max(0, remainingMs) : current * 1000;
  const progress  = Math.min(1, leftMs / totalMs);   // 0 → 1
  const display   = remainingMs != null ? Math.ceil(leftMs / 1000) : current;

  // Stroke offset: 0 = full ring, CIRCUMFERENCE = empty ring
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  // Colour changes based on time remaining
  // CHANGE THESE THRESHOLDS to adjust when colours shift
  const colour =
    display > 10 ? 'var(--timer-ok)'        // green  >10s
    : display > 5 ? 'var(--timer-warning)'  // orange >5s
    :               'var(--timer-urgent)';  // red    ≤5s

  return (
    <div className="relative flex items-center justify-center w-[60px] h-[60px] lg:w-[120px] lg:h-[120px]">
      {/* Background track */}
      <svg
        className="absolute inset-0 -rotate-90 w-full h-full"
        viewBox="0 0 110 110"
      >
        {/* Grey background ring */}
        <circle
          cx="55" cy="55"
          r={RADIUS}
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
        />
        {/* Coloured progress ring — short transition matches the ~100ms
            tick so the drain looks continuous, not steppy. */}
        <circle
          cx="55" cy="55"
          r={RADIUS}
          fill="none"
          stroke={colour}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.12s linear, stroke 0.3s ease' }}
        />
      </svg>

      {/* Number in the centre */}
      <span
        className="relative z-10 text-xl lg:text-3xl font-bold tabular-nums"
        style={{ color: colour, transition: 'color 0.3s ease' }}
      >
        {display}
      </span>
    </div>
  );
}
