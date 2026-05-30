'use client';
// ============================================================
// SetupBanner — shown when Supabase env vars are not configured
//
// Renders a clear step-by-step setup guide above the form.
// Disappears automatically once the env vars are present.
// ============================================================

import { isMisconfigured } from '@/lib/supabase';

export default function SetupBanner() {
  if (!isMisconfigured) return null;

  const codeStyle = { background: 'var(--bg-base)', color: 'var(--gold)' };

  return (
    <div
      className="card w-full max-w-md mb-8 p-5 text-sm"
      style={{ borderColor: 'var(--gold)', color: 'var(--text-secondary)' }}
    >
      <p className="font-semibold text-base mb-3" style={{ color: 'var(--gold)' }}>
        Setup required before you can play
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li>
          Copy{' '}
          <code className="px-1.5 py-0.5 rounded text-xs" style={codeStyle}>
            .env.local.example
          </code>{' '}
          to{' '}
          <code className="px-1.5 py-0.5 rounded text-xs" style={codeStyle}>
            .env.local
          </code>
        </li>
        <li>
          Fill in your{' '}
          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            target="_blank"
            rel="noreferrer"
            className="underline"
            style={{ color: 'var(--gold)' }}
          >
            Supabase URL + Anon Key
          </a>
        </li>
        <li>
          Add your{' '}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noreferrer"
            className="underline"
            style={{ color: 'var(--gold)' }}
          >
            OpenAI API key
          </a>
        </li>
        <li>
          Run{' '}
          <code className="px-1.5 py-0.5 rounded text-xs" style={codeStyle}>
            supabase/schema.sql
          </code>{' '}
          in your Supabase SQL Editor
        </li>
        <li>Restart the dev server</li>
      </ol>
    </div>
  );
}
