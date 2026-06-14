// ============================================================
// Home Page — Landing + game creation for the Host
// ============================================================

import CreateGame  from '@/components/CreateGame';
import SetupBanner from '@/components/SetupBanner';
import HomeHeader  from '@/components/HomeHeader';
import HomeDotTexture from '@/components/HomeDotTexture';

export default function HomePage() {
  return (
    <main className="relative flex flex-col items-center justify-center min-h-dvh px-4 sm:px-6 py-8 sm:py-12">
      <HomeDotTexture />
      <div className="relative z-10 flex w-full flex-col items-center">
        <SetupBanner />
        <HomeHeader />
        <CreateGame />
      </div>
    </main>
  );
}
