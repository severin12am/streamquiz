'use client';

import { useCallback, useState } from 'react';
import { useLocale } from '@/context/LocaleProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function HomeHeader() {
  const { t } = useLocale();
  const [sPop, setSPop] = useState(false);

  const handleSPop = useCallback(() => {
    if (sPop) return;
    setSPop(true);
    window.setTimeout(() => setSPop(false), 420);
  }, [sPop]);

  return (
    <div className="text-center mb-10 w-full max-w-md">
      <div className="flex justify-end mb-4">
        <LanguageSwitcher />
      </div>
      <h1 className="text-5xl font-bold tracking-tight mb-3 text-[var(--text-primary)]">
        Who
        <button
          type="button"
          onClick={handleSPop}
          aria-label={t('app.logoS')}
          className={[
            'keycap keycap-primary keycap-inline keycap-logo rounded-xl',
            sPop ? 'is-pop' : '',
          ].join(' ')}
        >
          S
        </button>
        marter
      </h1>
      <div className="flex items-center justify-center gap-3 mt-6 text-sm text-[var(--text-muted)]">
        <span>{t('app.stepCreate')}</span>
        <span className="text-[var(--border-strong)]">-</span>
        <span>{t('app.stepShare')}</span>
        <span className="text-[var(--border-strong)]">-</span>
        <span>{t('app.stepPlay')}</span>
      </div>
    </div>
  );
}
