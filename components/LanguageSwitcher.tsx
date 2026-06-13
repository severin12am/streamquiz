'use client';

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

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="whosmarter-locale"
        className="text-xs text-[var(--text-muted)] uppercase tracking-wider"
      >
        {t('lang.label')}
      </label>
      <select
        id="whosmarter-locale"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded-lg px-3 py-1.5 text-xs font-medium outline-none transition-colors cursor-pointer"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {t(LOCALE_LABEL_KEYS[code])}
          </option>
        ))}
      </select>
    </div>
  );
}
