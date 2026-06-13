// ============================================================
// StreamQuiz — i18n helpers
// ============================================================

import {
  LOCALES,
  languageInstructionFor,
  localeFromBrowserLanguage,
  speechLangFor,
} from './locale-meta';
import { messages, type Locale } from './messages';

export type { Locale };
export { messages, LOCALES, languageInstructionFor, speechLangFor };

export const LOCALE_STORAGE_KEY = 'streamquiz-locale';

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
  if (saved && (LOCALES as string[]).includes(saved)) return saved as Locale;
  const fromBrowser = localeFromBrowserLanguage(navigator.language);
  if (fromBrowser) return fromBrowser;
  return 'en';
}
