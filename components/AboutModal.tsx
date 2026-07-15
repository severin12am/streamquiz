'use client';

import { useEffect, useRef } from 'react';
import { about } from '@/lib/i18n/about';
import type { Locale } from '@/lib/i18n';

interface AboutModalProps {
  locale: Locale;
  onClose: () => void;
}

export default function AboutModal({ locale, onClose }: AboutModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const copy = about[locale as keyof typeof about] ?? about.en;
  const paragraphs = copy.body.split('\n\n').filter(Boolean);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
        className="relative z-10 w-full max-w-lg max-h-[min(85dvh,36rem)] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-[var(--border)] shrink-0">
          <h2
            id="about-modal-title"
            className="text-sm font-semibold text-[var(--text-primary)]"
          >
            WhoSmarter
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="keycap keycap-secondary px-3 py-1.5 rounded-lg text-xs font-medium"
          >
            {copy.close}
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-3 text-[13px] leading-relaxed text-[var(--text-muted)]">
          {paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
