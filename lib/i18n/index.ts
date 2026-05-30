// ============================================================
// StreamQuiz — i18n helpers
// ============================================================

import { messages, type Locale } from './messages';

export type { Locale };
export { messages };

export const LOCALES: Locale[] = ['en', 'ru'];
export const LOCALE_STORAGE_KEY = 'streamquiz-locale';

/** BCP-47 tag for the Web Speech API */
export function speechLangFor(locale: Locale): string {
  return locale === 'ru' ? 'ru-RU' : 'en-US';
}

type MessageTree = Record<string, unknown>;

function lookup(obj: MessageTree, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== 'object' || !(p in cur)) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/** Translate a dot-path key, with optional `{param}` interpolation. */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const text = lookup(messages[locale], key) ?? lookup(messages.en, key) ?? key;
  if (!params) return text;
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    text
  );
}

/** Pick initial locale from localStorage or browser language. */
export function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === 'en' || saved === 'ru') return saved;
  if (navigator.language.toLowerCase().startsWith('ru')) return 'ru';
  return 'en';
}
