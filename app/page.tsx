// ============================================================
// Home Page — Landing + game creation for the Host
// ============================================================

import CreateGame  from '@/components/CreateGame';
import SetupBanner from '@/components/SetupBanner';
import HomeHeader  from '@/components/HomeHeader';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <SetupBanner />
      <HomeHeader />
      <CreateGame />
    </main>
  );
}
