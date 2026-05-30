'use client';
// ============================================================
// SetupBanner — shown when Supabase env vars are not configured
// ============================================================

import { isMisconfigured } from '@/lib/supabase';
import { useLocale } from '@/context/LocaleProvider';

export default function SetupBanner() {
  const { t } = useLocale();

  if (!isMisconfigured) return null;

  const codeStyle = { background: 'var(--bg-base)', color: 'var(--gold)' };

  return (
    <div
      className="card w-full max-w-md mb-8 p-5 text-sm"
      style={{ borderColor: 'var(--gold)', color: 'var(--text-secondary)' }}
    >
      <p className="font-semibold text-base mb-3" style={{ color: 'var(--gold)' }}>
        {t('setup.title')}
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li>{t('setup.step1')}</li>
        <li>
          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            target="_blank"
            rel="noreferrer"
            className="underline"
            style={{ color: 'var(--gold)' }}
          >
            {t('setup.step2')}
          </a>
        </li>
        <li>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noreferrer"
            className="underline"
            style={{ color: 'var(--gold)' }}
          >
            {t('setup.step3')}
          </a>
        </li>
        <li>
          {t('setup.step4')}{' '}
          <code className="px-1.5 py-0.5 rounded text-xs" style={codeStyle}>
            supabase/schema.sql
          </code>
        </li>
        <li>{t('setup.step5')}</li>
      </ol>
    </div>
  );
}
