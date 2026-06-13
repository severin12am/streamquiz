import type { Locale } from './messages';

export const LOCALES: Locale[] = ['en', 'ru', 'es', 'fr', 'de', 'ja', 'ar'];

/** AI prompt: which language to generate questions in. */
export function languageInstructionFor(locale: Locale): string {
  const instructions: Record<Locale, string> = {
    en: 'Write all question text and answer options in English.',
    ru: 'Write ALL question text and answer options in Russian.',
    es: 'Write ALL question text and answer options in Spanish.',
    fr: 'Write ALL question text and answer options in French.',
    de: 'Write ALL question text and answer options in German.',
    ja: 'Write ALL question text and answer options in Japanese.',
    ar: 'Write ALL question text and answer options in Arabic.',
  };
  return instructions[locale];
}

/** BCP-47 tag for speech recognition. */
export function speechLangFor(locale: Locale): string {
  const tags: Record<Locale, string> = {
    en: 'en-US',
    ru: 'ru-RU',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    ja: 'ja-JP',
    ar: 'ar-SA',
  };
  return tags[locale];
}

const BROWSER_PREFIX: [string, Locale][] = [
  ['ru', 'ru'],
  ['es', 'es'],
  ['fr', 'fr'],
  ['de', 'de'],
  ['ja', 'ja'],
  ['ar', 'ar'],
];

export function localeFromBrowserLanguage(lang: string): Locale | null {
  const lower = lang.toLowerCase();
  for (const [prefix, locale] of BROWSER_PREFIX) {
    if (lower.startsWith(prefix)) return locale;
  }
  return null;
}
