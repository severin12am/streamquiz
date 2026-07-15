'use client';

import { useLocale } from '@/context/LocaleProvider';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { refund } from '@/lib/i18n/legal';

export default function RefundPolicyPage() {
  const { locale } = useLocale();
  const doc = refund[locale] ?? refund.en;

  return <LegalDocumentPage doc={doc} />;
}
