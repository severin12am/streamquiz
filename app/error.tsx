'use client';
// ============================================================
// Route error boundary — catches any render/runtime error thrown
// inside the page tree (home, game, etc.) and shows a recoverable
// screen instead of Next.js's bare "This page couldn't load" dead end.
//
// MUST be a Client Component and is given `reset()` to re-render the
// failed segment in place (no full reload needed).
// ============================================================

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[WhoSmarter] render error:', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card elevated mx-4 max-w-md px-8 py-10 text-center">
        <span className="mb-3 block text-4xl" aria-hidden>
          {'\u26A0\uFE0F'}
        </span>
        <h2 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          The page hit an unexpected error. You can try again — your game keeps
          running on the server, so reconnecting usually picks up right where you
          left off.
        </p>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="keycap keycap-primary rounded-xl px-6 py-2.5 font-semibold text-white"
          >
            Try again
          </button>
          <a
            href="/"
            className="keycap keycap-secondary rounded-xl px-6 py-2.5 font-semibold"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
