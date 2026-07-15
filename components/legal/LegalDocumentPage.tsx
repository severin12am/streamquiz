'use client';

import Link from 'next/link';
import { useLocale } from '@/context/LocaleProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { LegalList, LegalSection } from '@/components/legal/LegalSection';
import type { RefundDoc } from '@/lib/i18n/legal/refund';
import type { TermsDoc } from '@/lib/i18n/legal/terms';

type LegalDoc = TermsDoc | RefundDoc;

export function LegalDocumentPage({ doc }: { doc: LegalDoc }) {
  const { t } = useLocale();

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
            {doc.pageTitle}
          </h1>
          <p className="text-xs text-[var(--text-muted)]">{doc.effectiveDate}</p>
        </header>

        <div className="flex flex-col gap-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {doc.intro.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {doc.sections.map((section) => (
          <LegalSection key={section.title} title={section.title}>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
            {section.list && <LegalList items={section.list} />}
          </LegalSection>
        ))}

        <LegalSection title={doc.contactTitle}>
          <p>{doc.contactBody}</p>
          <a
            href={`mailto:${doc.contactEmail}`}
            className="text-[var(--accent)] underline"
          >
            {doc.contactEmail}
          </a>
        </LegalSection>
      </div>
    </main>
  );
}
