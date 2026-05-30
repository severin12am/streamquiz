'use client';
// ============================================================
// CountdownTimer — Circular SVG countdown ring
//
// Shows a draining arc around a number.
// Colour shifts green → orange → red as time runs out.
//
// TO CHANGE TIMING:
//   - Total seconds comes from the `total` prop
//   - Danger threshold: change the 5 and 10 values below
// ============================================================

import React from 'react';

interface CountdownTimerProps {
  current: number; // seconds remaining
  total:   number; // total seconds (e.g. 15)
}

export default function CountdownTimer({ current, total }: CountdownTimerProps) {
  const RADIUS       = 45;           // circle radius (px)
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~283px
  const progress     = current / total;        // 0 → 1

  // Stroke offset: 0 = full ring, CIRCUMFERENCE = empty ring
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  // Colour changes based on time remaining
  // CHANGE THESE THRESHOLDS to adjust when colours shift
  const colour =
    current > 10 ? 'var(--timer-ok)'      // green  >10s
    : current > 5 ? 'var(--timer-warning)' // orange >5s
    :               'var(--timer-urgent)'; // red    ≤5s

  return (
    <div className="relative flex items-center justify-center w-[84px] h-[84px] lg:w-[120px] lg:h-[120px]">
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
        {/* Coloured progress ring */}
        <circle
          cx="55" cy="55"
          r={RADIUS}
          fill="none"
          stroke={colour}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
        />
      </svg>

      {/* Number in the centre */}
      <span
        className="relative z-10 text-2xl lg:text-3xl font-bold tabular-nums"
        style={{ color: colour, transition: 'color 0.3s ease' }}
      >
        {current}
      </span>
    </div>
  );
}
