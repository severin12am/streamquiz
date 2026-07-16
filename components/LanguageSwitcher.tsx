'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/context/LocaleProvider';
import { LOCALES, type Locale } from '@/lib/i18n';

const LOCALE_LABEL_KEYS: Record<Locale, string> = {
  en: 'lang.en',
  ru: 'lang.ru',
  es: 'lang.es',
  fr: 'lang.fr',
  de: 'lang.de',
  ja: 'lang.ja',
  ar: 'lang.ar',
};

function GlobeIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A8.966 8.966 0 013 12c0-1.264.26-2.467.732-3.553"
      />
    </svg>
  );
}

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('lang.label')}
        className="keycap keycap-secondary flex items-center gap-2 rounded-xl px-3 py-2.5 min-h-11 text-sm font-medium"
      >
        <span style={{ color: 'var(--accent)' }}>
          <GlobeIcon />
        </span>
        <span>{t(LOCALE_LABEL_KEYS[locale])}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('lang.label')}
          className="card elevated absolute end-0 top-full z-50 mt-2 min-w-[10.5rem] overflow-hidden py-1.5"
        >
          {LOCALES.map((code) => {
            const selected = locale === code;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setLocale(code);
                  setOpen(false);
                }}
                className={`keycap-menu-item${selected ? ' is-selected' : ''}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: selected ? 'var(--accent)' : 'transparent' }}
                />
                {t(LOCALE_LABEL_KEYS[code])}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
