'use client';

import Link from 'next/link';
import { useLocale } from '@/context/LocaleProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { support } from '@/lib/i18n/legal';

export default function SupportPage() {
  const { t, locale } = useLocale();
  const s = support[locale] ?? support.en;

  return (
    <main className="min-h-dvh px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm text-[var(--text-muted)] underline hover:text-[var(--text-secondary)]"
          >
            {t('game.backHome')}
          </Link>
          <LanguageSwitcher />
        </div>

        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {s.pageTitle}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">{s.tagline}</p>
        </header>

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            <p>{s.intro}</p>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {s.emailLabel}
              </span>
              <a
                href={`mailto:${s.email}`}
                className="text-[var(--accent)] underline"
              >
                {s.email}
              </a>
              <span className="text-sm text-[var(--text-muted)]">{s.reply}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {s.websiteLabel}
              </span>
              <a
                href={s.websiteUrl}
                className="text-[var(--accent)] underline"
              >
                {s.websiteHint}
              </a>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {s.manageLabel}
              </span>
              <a
                href={s.manageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] underline"
              >
                {s.manageUrl}
              </a>
              <span className="text-sm text-[var(--text-muted)]">{s.manageHint}</span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">{s.footer}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
