'use client';

import { useLocale } from '@/context/LocaleProvider';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { terms } from '@/lib/i18n/legal';

export default function TermsPage() {
  const { locale } = useLocale();
  const doc = terms[locale] ?? terms.en;

  return <LegalDocumentPage doc={doc} />;
}
