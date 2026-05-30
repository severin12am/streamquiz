'use client';

import { useLocale } from '@/context/LocaleProvider';
import type { Locale } from '@/lib/i18n';

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  const options: { code: Locale; label: string }[] = [
    { code: 'en', label: t('lang.en') },
    { code: 'ru', label: t('lang.ru') },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
        {t('lang.label')}
      </span>
      <div
        className="flex rounded-lg overflow-hidden border"
        style={{ borderColor: 'var(--border)' }}
      >
        {options.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className="px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: locale === code ? 'var(--accent)' : 'var(--bg-card)',
              color: locale === code ? 'white' : 'var(--text-secondary)',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
