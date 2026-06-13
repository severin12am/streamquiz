'use client';

import { useLocale } from '@/context/LocaleProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function HomeHeader() {
  const { t } = useLocale();

  return (
    <div className="text-center mb-10 w-full max-w-md">
      <div className="flex justify-end mb-4">
        <LanguageSwitcher />
      </div>
      <h1 className="text-5xl font-bold tracking-tight mb-3 text-[var(--text-primary)]">
        Who<span style={{ color: 'var(--accent)' }}>S</span>marter
      </h1>
      <p className="text-[var(--text-secondary)] text-lg">{t('app.tagline')}</p>
      <div className="flex items-center justify-center gap-3 mt-6 text-sm text-[var(--text-muted)]">
        <span>{t('app.stepCreate')}</span>
        <span className="text-[var(--border-strong)]">—</span>
        <span>{t('app.stepShare')}</span>
        <span className="text-[var(--border-strong)]">—</span>
        <span>{t('app.stepPlay')}</span>
      </div>
    </div>
  );
}
