// ============================================================
// Home Page — Landing + game creation for the Host
// ============================================================

import CreateGame   from '@/components/CreateGame';
import SetupBanner  from '@/components/SetupBanner';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12">

      {/* Setup warning — shown when env vars are not configured */}
      <SetupBanner />

      {/* ---- Header ---- */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold tracking-tight mb-3 text-[var(--text-primary)]">
          StreamQuiz
        </h1>
        <p className="text-[var(--text-secondary)] text-lg">
          Live quiz show for you and your streamer
        </p>

        <div className="flex items-center justify-center gap-3 mt-6 text-sm text-[var(--text-muted)]">
          <span>Create challenge</span>
          <span className="text-[var(--border-strong)]">—</span>
          <span>Share link</span>
          <span className="text-[var(--border-strong)]">—</span>
          <span>Play live</span>
        </div>
      </div>

      {/* ---- Create Game form ---- */}
      <CreateGame />

    </main>
  );
}
