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

  return (
    <div
      className="w-full max-w-md mb-8 rounded-2xl p-5 border text-sm"
      style={{
        background: '#1a1200',
        borderColor: '#f57f17',
        color: '#ffcc80',
      }}
    >
      <p className="font-bold text-base mb-3" style={{ color: '#ffa726' }}>
        ⚙️ Setup required before you can play
      </p>
      <ol className="list-decimal list-inside space-y-2 text-[#ffcc80]">
        <li>
          Copy{' '}
          <code
            className="px-1.5 py-0.5 rounded text-xs"
            style={{ background: '#2a1f00', color: '#ffb74d' }}
          >
            .env.local.example
          </code>{' '}
          →{' '}
          <code
            className="px-1.5 py-0.5 rounded text-xs"
            style={{ background: '#2a1f00', color: '#ffb74d' }}
          >
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
            style={{ color: '#ffa726' }}
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
            style={{ color: '#ffa726' }}
          >
            OpenAI API key
          </a>
        </li>
        <li>
          Run{' '}
          <code
            className="px-1.5 py-0.5 rounded text-xs"
            style={{ background: '#2a1f00', color: '#ffb74d' }}
          >
            supabase/schema.sql
          </code>{' '}
          in your Supabase SQL Editor
        </li>
        <li>Restart the dev server</li>
      </ol>
    </div>
  );
}
