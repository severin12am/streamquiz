'use client';
// ============================================================
// JoinScreen — name entry before taking a seat in the game.
//
// Shown when this browser hasn't claimed a player row yet. The host
// arrives with `asHost` = true (from ?role=host) and takes slot 0;
// everyone else takes the next free guest seat (1..5).
// ============================================================

import React, { useState } from 'react';
import { useLocale } from '@/context/LocaleProvider';
import { getSavedName, saveName } from '@/lib/client-id';

interface JoinScreenProps {
  asHost: boolean;
  full: boolean;
  onJoin: (name: string) => Promise<void> | void;
}

export default function JoinScreen({ asHost, full, onJoin }: JoinScreenProps) {
  const { t } = useLocale();
  const [name, setName]       = useState(() => getSavedName());
  const [error, setError]     = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('join.errorEmptyName'));
      return;
    }
    setError(null);
    setJoining(true);
    try {
      saveName(trimmed);
      await onJoin(trimmed);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="card elevated flex flex-col gap-5 w-full max-w-sm p-7 text-center"
      >
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {asHost ? t('join.hostTitle') : t('join.title')}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            {t('join.subtitle')}
          </p>
        </div>

        {full ? (
          <p
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(229,72,77,0.12)', border: '1px solid var(--wrong)', color: '#f2a3a5' }}
          >
            {t('join.full')}
          </p>
        ) : (
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('join.namePlaceholder')}
              maxLength={24}
              autoFocus
              className="w-full rounded-xl px-4 py-3 text-[var(--text-primary)] text-base outline-none transition-colors text-center"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
            />

            {error && (
              <p className="text-sm" style={{ color: 'var(--wrong)' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={joining}
              className="py-3.5 rounded-xl font-semibold text-base text-white transition-colors disabled:cursor-not-allowed"
              style={{ background: joining ? 'var(--bg-elevated)' : 'var(--accent)' }}
              onMouseEnter={(e) => { if (!joining) e.currentTarget.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={(e) => { if (!joining) e.currentTarget.style.background = 'var(--accent)'; }}
            >
              {joining ? t('join.joining') : t('join.button')}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
