'use client';
// ============================================================
// PublicGamesBrowser — full home view of open public lobbies.
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/context/LocaleProvider';
import { playSound } from '@/lib/sounds';
import SoundToggle from './SoundToggle';

export type PublicGameSummary = {
  id: string;
  topic: string;
  difficulty: string;
  num_questions: number;
  mc_mode: boolean;
  game_mode: string;
  created_at: string;
  player_count: number;
  max_players: number;
};

interface PublicGamesBrowserProps {
  onBack: () => void;
}

function relativeTime(
  iso: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 60_000) return t('rooms.agoJustNow');
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return t('rooms.agoMinutes', { n: mins });
  const hours = Math.floor(mins / 60);
  return t('rooms.agoHours', { n: hours });
}

export default function PublicGamesBrowser({ onBack }: PublicGamesBrowserProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [games, setGames] = useState<PublicGameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/public-games', { cache: 'no-store' });
      if (!res.ok) throw new Error('fail');
      const data = (await res.json()) as { games?: PublicGameSummary[] };
      setGames(Array.isArray(data.games) ? data.games : []);
    } catch {
      setError(t('rooms.error'));
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function difficultyLabel(d: string) {
    if (d === 'easy') return t('create.difficultyEasy');
    if (d === 'hard') return t('create.difficultyHard');
    return t('create.difficultyMedium');
  }

  function modeLabel(m: string) {
    return m === 'hardcore' ? t('rooms.modeHardcore') : t('rooms.modeRegular');
  }

  return (
    <div className="relative w-full max-w-md">
      <SoundToggle className="fixed z-40 top-[max(0.75rem,env(safe-area-inset-top))] end-[max(0.75rem,env(safe-area-inset-right))]" />
      <div className="card elevated flex flex-col gap-5 w-full p-5 sm:p-7">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playSound('click');
              onBack();
            }}
            className="keycap keycap-secondary keycap-compact rounded-xl font-semibold"
          >
            {t('rooms.back')}
          </button>
          <h2 className="flex-1 text-center text-xl font-bold text-[var(--text-primary)] pe-16">
            {t('rooms.title')}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            playSound('click');
            void load();
          }}
          disabled={loading}
          className="keycap keycap-secondary py-2.5 rounded-xl text-sm font-medium"
        >
          {t('rooms.refresh')}
        </button>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-8">
            <span className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <p className="text-sm text-[var(--text-secondary)]">{t('rooms.loading')}</p>
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-center" style={{ color: 'var(--wrong)' }}>
            {error}
          </p>
        )}

        {!loading && !error && games.length === 0 && (
          <p className="text-sm text-center text-[var(--text-muted)] py-6">{t('rooms.empty')}</p>
        )}

        {!loading && games.length > 0 && (
          <div className="flex flex-col gap-2">
            {games.map((g) => (
              <div key={g.id} className="keycap-well-frame">
                <div className="keycap-well flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {g.topic}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                        {difficultyLabel(g.difficulty)}
                        {' · '}
                        {g.mc_mode ? t('rooms.mc') : t('rooms.voice')}
                        {' · '}
                        {modeLabel(g.game_mode)}
                        {' · '}
                        {t('rooms.players', { n: g.player_count, max: g.max_players })}
                        {' · '}
                        {relativeTime(g.created_at, t)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        router.push(`/game/${g.id}`);
                      }}
                      className="keycap keycap-primary keycap-compact flex-shrink-0 font-semibold text-white"
                    >
                      {t('rooms.join')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
