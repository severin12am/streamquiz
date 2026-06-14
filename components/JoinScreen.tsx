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
          <div className="keycap-well-frame">
            <p
              className="keycap-well rounded-xl px-4 py-3 text-sm text-center"
              style={{ color: 'var(--wrong)' }}
            >
              {t('join.full')}
            </p>
          </div>
        ) : (
          <>
            <div className="keycap-input-frame">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('join.namePlaceholder')}
                maxLength={24}
                autoFocus
                className="keycap-input w-full rounded-xl px-4 py-3 text-[var(--text-primary)] text-base text-center"
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: 'var(--wrong)' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={joining}
              className="keycap keycap-primary py-3.5 rounded-xl font-semibold text-base text-white"
            >
              {joining ? t('join.joining') : t('join.button')}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
