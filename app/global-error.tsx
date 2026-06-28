'use client';
// ============================================================
// Global error boundary — the last line of defense. Catches errors
// thrown in the ROOT layout / providers (AuthProvider, LocaleProvider)
// or anywhere they aren't caught by app/error.tsx.
//
// It REPLACES the root layout, so it must render its own <html>/<body>
// and can't rely on the app's providers or (reliably) the global CSS —
// hence the self-contained inline styles. Only active in production.
// ============================================================

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[WhoSmarter] fatal error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#eef3ec',
          color: '#13211d',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          padding: '1rem',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            background: '#ffffff',
            borderRadius: 16,
            padding: '2.5rem 2rem',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>
            {'\u26A0\uFE0F'}
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p
            style={{
              margin: '0 0 24px',
              fontSize: 14,
              lineHeight: 1.5,
              color: '#5a6b65',
            }}
          >
            The app hit an unexpected error while loading. Reloading usually
            fixes it.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={reset}
              style={{
                cursor: 'pointer',
                border: 'none',
                borderRadius: 12,
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 600,
                color: '#ffffff',
                background: '#2f7d77',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                textDecoration: 'none',
                borderRadius: 12,
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 600,
                color: '#13211d',
                background: '#dfe7e2',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
