'use client';
// ============================================================
// SiteFooter — global footer shown on every page EXCEPT the game
// view (/game/[id]), where the screen is a full-viewport layout.
//
// Contains:
//   - IP / trademark disclaimer (required on all pages)
//   - Privacy link (→ /privacy)
//   - Terms (→ /terms)
//   - Refunds (→ /refund-policy)
//   - Support (→ /support)
//
// Text is localized via the current UI locale, falling back to
// English for the legal copy.
// ============================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/context/LocaleProvider';
import { disclaimer } from '@/lib/i18n/legal';

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
          <Link
            href="/terms"
            className="underline hover:text-[var(--text-secondary)]"
          >
            {t('footer.terms')}
          </Link>
          <Link
            href="/refund-policy"
            className="underline hover:text-[var(--text-secondary)]"
          >
            {t('footer.refunds')}
          </Link>
          <Link
            href="/upgrade"
            className="underline hover:text-[var(--text-secondary)]"
          >
            {t('footer.pricing')}
          </Link>
          <Link
            href="/support"
            className="underline hover:text-[var(--text-secondary)]"
          >
            {t('footer.support')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
