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

/**
 * Best-effort detection of the BCP-47 speech-recognition tag from the quiz
 * text itself (topic + questions). Because the quiz is generated in the
 * topic's language, voice answering should listen in that same language —
 * not the UI language. Every client runs this on the same text, so they all
 * agree without needing a server round-trip.
 *
 * Strategy: unambiguous scripts first (Arabic, Cyrillic, Japanese), then
 * Latin languages via language-specific letters and common question words.
 * Falls back to `fallback` (the UI speech tag) when nothing matches.
 */
export function detectSpeechLang(text: string, fallback = 'en-US'): string {
  if (!text || !text.trim()) return fallback;

  // --- Unambiguous scripts ---
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return 'ar-SA';            // Arabic
  if (/[\u0400-\u04FF]/.test(text)) return 'ru-RU';                          // Cyrillic
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)) return 'ja-JP'; // Kana / Kanji

  // --- Latin-script languages ---
  const lower = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;

  // Spanish: ñ and inverted punctuation are unique to it.
  if (/[ñ¿¡]/.test(text) || /\b(qué|cuál|cuáles|quién|dónde|cómo|cuándo|por qué|el|los|las)\b/.test(lower)) {
    return 'es-ES';
  }
  // German: ß is unique; umlauts + question words back it up.
  if (/ß/.test(text) || /[äöü]/.test(text) || /\b(welche|welcher|welches|wer|was|wann|warum|wie|der|die|das|und)\b/.test(lower)) {
    return 'de-DE';
  }
  // French: œ / ç and French-only accented vowels, plus question words.
  if (/[œçàâêèîïôûù]/.test(text) || /\b(quel|quelle|quels|quelles|qui|où|quand|comment|pourquoi|combien|le|la|les|des)\b/.test(lower)) {
    return 'fr-FR';
  }

  return fallback;
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
