'use client';

import { useEffect, useState } from 'react';
import { onboarding } from '@/lib/i18n/onboarding';
import type { Locale } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface OnboardingModalProps {
  locale: Locale;
  onComplete: () => void;
}

export default function OnboardingModal({ locale, onComplete }: OnboardingModalProps) {
  const copy = onboarding[locale as keyof typeof onboarding] ?? onboarding.en;
  const steps = copy.steps;
  const [step, setStep] = useState(0);
  const isFirst = step <= 0;
  const isLast = step >= steps.length - 1;
  const current = steps[step];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onComplete();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onComplete]);

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
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-title"
        className="relative z-10 w-full max-w-md flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-[var(--border)] shrink-0">
          <h2
            id="onboarding-modal-title"
            className="text-sm font-semibold text-[var(--text-primary)]"
          >
            {copy.title}
          </h2>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={onComplete}
              className="keycap keycap-secondary px-3 py-1.5 rounded-lg text-xs font-medium"
            >
              {copy.skip}
            </button>
          </div>
        </div>

        <div className="px-5 py-6">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
            {step + 1} / {steps.length}
          </p>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {current.title}
          </h3>
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
            {current.body}
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-6" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                className={[
                  'h-1.5 rounded-full transition-all',
                  i === step
                    ? 'w-5 bg-[var(--accent)]'
                    : 'w-1.5 bg-[var(--border-strong)]',
                ].join(' ')}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 pb-4">
          {isFirst ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              className="keycap keycap-secondary px-4 py-2 rounded-xl text-sm font-medium"
            >
              {copy.back}
            </button>
          )}

          {!isLast ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
              className="keycap keycap-primary px-4 py-2 rounded-xl text-sm font-medium"
            >
              {copy.next}
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="keycap keycap-primary px-4 py-2 rounded-xl text-sm font-medium"
            >
              {copy.done}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
