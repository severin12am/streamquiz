'use client';

import { useCallback, useState } from 'react';
import { useLocale } from '@/context/LocaleProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import AboutModal from '@/components/AboutModal';
import { about } from '@/lib/i18n/about';
import { playSound } from '@/lib/sounds';

export default function HomeHeader() {
  const { t, locale } = useLocale();
  const [sPop, setSPop] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const aboutCopy = about[locale as keyof typeof about] ?? about.en;

  const handleSPop = useCallback(() => {
    if (sPop) return;
    playSound('meow');
    setSPop(true);
    window.setTimeout(() => setSPop(false), 420);
  }, [sPop]);

  return (
    <div className="text-center mb-10 w-full max-w-md">
      <div className="flex justify-end mb-4">
        <LanguageSwitcher />
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3 text-[var(--text-primary)]">
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
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-1.5 sm:gap-x-3 sm:gap-y-1 mt-6 text-xs sm:text-sm text-[var(--text-muted)] px-2">
        <span>{t('app.stepCreate')}</span>
        <span className="hidden sm:inline text-[var(--border-strong)]">-</span>
        <span>{t('app.stepShare')}</span>
        <span className="hidden sm:inline text-[var(--border-strong)]">-</span>
        <span>{t('app.stepPlay')}</span>
        <span className="hidden sm:inline text-[var(--border-strong)]">·</span>
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          className="underline underline-offset-2 hover:text-[var(--text-secondary)] transition-colors"
        >
          {aboutCopy.learnMore}
        </button>
      </div>

      {aboutOpen && (
        <AboutModal locale={locale} onClose={() => setAboutOpen(false)} />
      )}
    </div>
  );
}
