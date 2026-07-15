'use client';
// ============================================================
// SiteFooter — global footer shown on every page EXCEPT the game
// view (/game/[id]), where the screen is a full-viewport layout.
//
// Contains:
//   - IP / trademark disclaimer (required on all pages)
//   - Privacy link (→ /privacy) + Download iOS app link
//
// Text is localized via the current UI locale, falling back to
// English for the legal copy.
// ============================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/context/LocaleProvider';
import { disclaimer } from '@/lib/i18n/legal';

const APP_STORE_URL = 'https://apps.apple.com/us/app/id6780852034';

export default function SiteFooter() {
  const { t, locale } = useLocale();
  const pathname = usePathname();

  // No footer during an active game (full-screen immersive layout).
  if (pathname?.startsWith('/game/')) return null;

  const text = disclaimer[locale] ?? disclaimer.en;

  return (
    <footer className="w-full border-t border-[var(--border)] px-4 py-5 text-[var(--text-muted)]">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <p className="text-[11px] leading-relaxed">{text}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <Link
            href="/privacy"
            className="underline hover:text-[var(--text-secondary)]"
          >
            {t('footer.privacy')}
          </Link>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--text-secondary)]"
          >
            {t('auth.downloadIosApp')}
          </a>
        </div>
      </div>
    </footer>
  );
}
