// ============================================================
// Home Page — Landing + game creation for the Host
// ============================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import CreateGame  from '@/components/CreateGame';
import PublicGamesBrowser from '@/components/PublicGamesBrowser';
import SetupBanner from '@/components/SetupBanner';
import HomeHeader  from '@/components/HomeHeader';
import HomeDotTexture from '@/components/HomeDotTexture';
import OnboardingModal from '@/components/OnboardingModal';
import { useAuth } from '@/context/AuthProvider';
import { useLocale } from '@/context/LocaleProvider';
import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from '@/lib/onboarding';

export default function HomePage() {
  const [homeView, setHomeView] = useState<'create' | 'browse'>('create');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { locale } = useLocale();

  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    if (hasCompletedOnboarding()) return;
    setShowOnboarding(true);
  }, [authLoading, user]);

  const finishOnboarding = useCallback(() => {
    markOnboardingCompleted();
    setShowOnboarding(false);
  }, []);

  return (
    <main className="relative flex flex-col items-center justify-center min-h-dvh px-4 sm:px-6 py-8 sm:py-12">
      <HomeDotTexture />
      <div className="relative z-10 flex w-full flex-col items-center">
        {homeView === 'create' ? (
          <>
            <SetupBanner />
            <HomeHeader />
            <CreateGame onBrowseOpen={() => setHomeView('browse')} />
          </>
        ) : (
          <PublicGamesBrowser onBack={() => setHomeView('create')} />
        )}
      </div>

      {showOnboarding && (
        <OnboardingModal locale={locale} onComplete={finishOnboarding} />
      )}
    </main>
  );
}
