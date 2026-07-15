'use client';
// ============================================================
// TopicPill — compact, single-line topic chip for the call overlay.
//
// The topic always fits on one line (truncated) so it never grows wide
// enough to cover the camera/mic indicators on the top row. Tapping the
// pill reveals the FULL topic in a small popover; tapping again (or
// tapping outside) hides it.
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/context/LocaleProvider';
import { displayGeographyTopic, isGeographyTopic } from '@/lib/geography/types';

interface TopicPillProps {
  topic:       string;
  /** Show the "TOPIC" label before the text (desktop). */
  showLabel?:  boolean;
  /** Translucent background colour of the pill. */
  background:  string;
  /** Max width of the collapsed (truncated) text, per breakpoint. */
  textClassName?: string;
}

export default function TopicPill({
  topic,
  showLabel = false,
  background,
  textClassName = 'max-w-[7rem] sm:max-w-[12rem] lg:max-w-[18rem]',
}: TopicPillProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = isGeographyTopic(topic) ? displayGeographyTopic(topic) : topic;

  // Close the popover on any outside tap.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative max-w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2.5 py-1 rounded-full max-w-full"
        style={{ background, backdropFilter: 'blur(6px)', border: '1px solid var(--border)' }}
        aria-expanded={open}
        title={label}
      >
        {showLabel && (
          <span className="text-[9px] font-semibold tracking-wider text-[var(--text-secondary)] uppercase flex-shrink-0">
            {t('game.topic')}
          </span>
        )}
        <span className={`text-[11px] lg:text-xs font-medium text-[var(--text-primary)] truncate ${textClassName}`}>
          {label}
        </span>
      </button>

      {open && (
        <div
          className="absolute z-30 top-full mt-1 start-0 px-3 py-2 rounded-xl w-[15rem] max-w-[80vw]"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          <p className="text-[9px] font-semibold tracking-wider text-[var(--text-muted)] uppercase mb-0.5">
            {t('game.topic')}
          </p>
          <p className="text-xs font-medium text-[var(--text-primary)] leading-snug break-words">
            {label}
          </p>
        </div>
      )}
    </div>
  );
}
