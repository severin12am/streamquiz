// ============================================================
// Home Page — Landing + game creation for the Host
// ============================================================

'use client';

import { useState } from 'react';
import CreateGame  from '@/components/CreateGame';
import PublicGamesBrowser from '@/components/PublicGamesBrowser';
import SetupBanner from '@/components/SetupBanner';
import HomeHeader  from '@/components/HomeHeader';
import HomeDotTexture from '@/components/HomeDotTexture';

export default function HomePage() {
  const [homeView, setHomeView] = useState<'create' | 'browse'>('create');

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
    </main>
  );
}
