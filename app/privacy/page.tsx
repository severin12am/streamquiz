'use client';
// ============================================================
// /privacy — Privacy Policy & Support
//
// Localized via the current UI locale (falls back to English).
// Content lives in lib/i18n/legal/privacy.ts.
// ============================================================

import Link from 'next/link';
import { useLocale } from '@/context/LocaleProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { privacy } from '@/lib/i18n/legal';

export default function PrivacyPage() {
  const { t, locale } = useLocale();
  const p = privacy[locale] ?? privacy.en;

  return (
    <main className="min-h-dvh px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        {/* Header */}
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
            {p.pageTitle}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">{p.tagline}</p>
          <p className="text-xs text-[var(--text-muted)]">{p.lastUpdated}</p>
        </header>

        {/* Privacy Policy */}
        <Section title={p.introTitle}>
          <p>{p.intro}</p>
        </Section>

        {/* Information We Collect */}
        <Section title={p.collectTitle}>
          <p>{p.collectIntro}</p>
          <List
            items={[
              p.collectItem1,
              p.collectItem2,
              p.collectItem3,
              p.collectItem4,
              p.collectItem5,
            ]}
          />
          <p>{p.collectNote}</p>
        </Section>

        {/* How We Use Your Information */}
        <Section title={p.useTitle}>
          <List
            items={[p.useItem1, p.useItem2, p.useItem3, p.useItem4, p.useItem5]}
          />
        </Section>

        {/* Permissions */}
        <Section title={p.permissionsTitle}>
          <p>{p.permissions}</p>
        </Section>

        {/* Third-Party Services */}
        <Section title={p.thirdPartyTitle}>
          <p>{p.thirdPartyIntro}</p>
          <List
            items={[
              p.thirdPartyItem1,
              p.thirdPartyItem2,
              p.thirdPartyItem3,
              p.thirdPartyItem4,
            ]}
          />
          <p>{p.thirdPartyNote}</p>
        </Section>

        {/* Your Rights */}
        <Section title={p.rightsTitle}>
          <p>{p.rights}</p>
        </Section>

        {/* Support & Contact */}
        <Section title={p.supportTitle}>
          <p>{p.supportIntro}</p>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {p.supportEmailLabel}
            </span>
            <a
              href={`mailto:${p.supportEmail}`}
              className="text-[var(--accent)] underline"
            >
              {p.supportEmail}
            </a>
            <span className="text-sm text-[var(--text-muted)]">
              {p.supportReply}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {p.supportWebsiteLabel}
            </span>
            <Link href="/" className="text-[var(--accent)] underline">
              {p.supportWebsiteHint}
            </Link>
          </div>
          <p className="text-sm text-[var(--text-muted)]">{p.supportFooter}</p>
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-[var(--text-secondary)]">
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2 ps-5 [list-style:disc]">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
