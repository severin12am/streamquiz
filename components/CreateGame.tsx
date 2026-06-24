'use client';
// ============================================================
// CreateGame — Host's game creation form
//
// 4 inputs + 1 button. That's it.
//
// On submit:
//   1. Calls /api/create-game — the server generates questions (xAI →
//      fallback) AND creates the Supabase game row (service role), so
//      game creation is rate-limited and can't be spammed directly.
//   2. Redirects host to /game/[id]?role=host (lobby has share link + QR).
//
// TO CHANGE DEFAULT VALUES: edit the `useState` defaults below.
// ============================================================

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/context/LocaleProvider';
import { useAuth } from '@/context/AuthProvider';
import type { Difficulty, GameMode, CreateGamePayload, Question } from '@/lib/types';
import KeycapSegSlider from '@/components/KeycapSegSlider';
import { getPreviousQuestions, rememberQuestions } from '@/lib/question-history';
import { playSound } from '@/lib/sounds';
import SoundToggle from '@/components/SoundToggle';

export default function CreateGame() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { user, session, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  // ---- Form state ----
  // TO CHANGE DEFAULTS: edit the values here
  const [topic,        setTopic]        = useState('');
  const [difficulty,   setDifficulty]   = useState<Difficulty>('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [mcMode,       setMcMode]       = useState(true);
  const [gameMode,     setGameMode]     = useState<GameMode>('regular');
  const [camerasEnabled, setCamerasEnabled] = useState(true);

  // ---- UI state ----
  const [showAdjust,    setShowAdjust]    = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const adjustPanelRef = useRef<HTMLDivElement>(null);
  const adjustInnerRef = useRef<HTMLDivElement>(null);

  const measureAdjustPanel = useCallback(() => {
    const panel = adjustPanelRef.current;
    const inner = adjustInnerRef.current;
    if (!panel || !inner) return;

    const width = panel.getBoundingClientRect().width;
    if (width <= 0) return;

    inner.style.position = 'absolute';
    inner.style.visibility = 'hidden';
    inner.style.width = `${width}px`;

    const height = inner.scrollHeight;

    inner.style.position = '';
    inner.style.visibility = '';
    inner.style.width = '';

    panel.style.setProperty('--adjust-panel-h', `${height}px`);
  }, []);

  useLayoutEffect(() => {
    measureAdjustPanel();

    const panel = adjustPanelRef.current;
    if (!panel) return;

    const width = panel.getBoundingClientRect().width;
    if (width <= 0) return;

    panel.style.setProperty('--warm-width', `${width}px`);
    panel.classList.add('adjust-panel--warm');
    void panel.offsetHeight;
    panel.classList.remove('adjust-panel--warm');
    panel.style.removeProperty('--warm-width');
  }, [measureAdjustPanel, locale, gameMode]);

  useEffect(() => {
    const panel = adjustPanelRef.current;
    const inner = adjustInnerRef.current;
    if (!panel || !inner) return;

    const ro = new ResizeObserver(() => measureAdjustPanel());
    ro.observe(panel);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [measureAdjustPanel]);

  function toggleAdjust() {
    if (!showAdjust) measureAdjustPanel();
    setShowAdjust((v) => !v);
  }

  // -------------------------------------------------------
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      setError(t('create.errorEmptyTopic'));
      return;
    }
    setError(null);
    setLoading(true);
    playSound('click');

    try {
      // Generate questions AND create the game in one server call. The
      // server owns DB writes for games (RLS forbids anon INSERTs), so
      // creation is rate-limited and spam-resistant.
      const trimmedTopic = topic.trim();
      const payload: CreateGamePayload & { cameras_enabled: boolean } = {
        topic: trimmedTopic,
        difficulty,
        num_questions: numQuestions,
        mc_mode: mcMode,
        game_mode: gameMode,
        cameras_enabled: camerasEnabled,
        locale,
        previous_questions: getPreviousQuestions(trimmedTopic),
      };

      const res = await fetch('/api/create-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Host-only auth: the server verifies this token before spending
          // AI credits / creating the game.
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // 429 = rate limited; surface a clear message, fall back to generic.
        throw new Error(body.error ?? t('create.errorGenerate'));
      }

      const { gameId, questions } = (await res.json()) as {
        gameId: string;
        questions: Question[];
      };
      if (!gameId) throw new Error(t('create.errorCreate'));
      rememberQuestions(trimmedTopic, questions);

      // Go straight to the lobby as host. The invite link + QR and the
      // host's name entry live on the lobby screen.
      router.push(`/game/${gameId}?role=host`);

    } catch (err) {
      setError(err instanceof Error ? err.message : t('create.errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    setAuthError(null);
    playSound('click');
    try {
      await signInWithGoogle();
    } catch {
      setAuthError(t('auth.signInError'));
    }
  }

  // -------------------------------------------------------
  // Host-only auth gate: the create form is for the host, so it requires a
  // Google sign-in. Guests never see this — they open the invite link and
  // join the lobby anonymously.
  // -------------------------------------------------------
  if (!authLoading && !user) {
    return (
      <div className="relative w-full max-w-md">
        <SoundToggle className="fixed z-40 top-[max(0.75rem,env(safe-area-inset-top))] end-[max(0.75rem,env(safe-area-inset-right))]" />
        <div className="card elevated flex flex-col gap-5 w-full p-5 sm:p-7 text-center">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t('auth.signInTitle')}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              {t('auth.signInHint')}
            </p>
          </div>

          {authError && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(214,87,69,0.10)', border: '1px solid var(--wrong)', color: 'var(--wrong)' }}
            >
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={handleSignIn}
            className="keycap keycap-primary py-3.5 rounded-xl font-semibold text-base text-white"
          >
            {t('auth.signInGoogle')}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // Creation form
  // -------------------------------------------------------
  return (
    <div className="relative w-full max-w-md">
      <SoundToggle className="fixed z-40 top-[max(0.75rem,env(safe-area-inset-top))] end-[max(0.75rem,env(safe-area-inset-right))]" />
      <form
      onSubmit={handleCreate}
      className="card elevated flex flex-col gap-6 w-full p-5 sm:p-7"
    >

      {/* ---- Topic ---- */}
      <div>
        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
          {t('create.topic')}
        </label>
        <div className="keycap-input-frame">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t('create.topicPlaceholder')}
            maxLength={100}
            className="keycap-input w-full rounded-xl px-4 py-3 text-[var(--text-primary)] text-base"
            autoFocus
          />
        </div>
      </div>

      {/* ---- Error message ---- */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(214,87,69,0.10)', border: '1px solid var(--wrong)', color: 'var(--wrong)' }}
        >
          {error}
        </div>
      )}

      {/* ---- Submit button ---- */}
      <button
        type="submit"
        disabled={loading}
        className="keycap keycap-primary py-3.5 rounded-xl font-semibold text-base text-white"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-3 text-[var(--text-secondary)]">
            <span className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            {t('create.generating')}
          </span>
        ) : (
          t('create.submit')
        )}
      </button>

      {/* ---- Adjust settings (collapsed by default) ---- */}
      <button
        type="button"
        onClick={toggleAdjust}
        className="keycap keycap-secondary py-2.5 rounded-xl text-sm font-medium"
        aria-expanded={showAdjust}
        aria-controls="create-adjust-panel"
      >
        {showAdjust ? t('create.adjustHide') : t('create.adjustShow')}
      </button>

      <div
        ref={adjustPanelRef}
        id="create-adjust-panel"
        className={`adjust-panel${showAdjust ? ' adjust-panel--open' : ''}`}
        aria-hidden={!showAdjust}
        {...(!showAdjust ? { inert: true } : {})}
      >
        <div ref={adjustInnerRef} className="adjust-panel-inner flex flex-col gap-6 pt-1">
          {/* ---- Difficulty ---- */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
              {t('create.difficulty')}
            </label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`keycap flex-1 py-2.5 rounded-xl text-sm font-medium ${
                    difficulty === d ? 'keycap-primary' : 'keycap-secondary'
                  }`}
                >
                  {d === 'easy' ? t('create.difficultyEasy') : d === 'medium' ? t('create.difficultyMedium') : t('create.difficultyHard')}
                </button>
              ))}
            </div>
          </div>

          {/* ---- Number of questions ---- */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
              {t('create.questions')}
            </label>
            <KeycapSegSlider
              min={3}
              max={20}
              value={numQuestions}
              onChange={setNumQuestions}
              aria-label={t('create.questions')}
            />
          </div>

          {/* ---- Game mode ---- */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
              {t('create.modeTitle')}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              {(['regular', 'hardcore'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setGameMode(m)}
                  className={`keycap flex-1 py-2.5 px-3 rounded-xl text-sm font-medium text-left ${
                    gameMode === m ? 'keycap-primary' : 'keycap-secondary'
                  }`}
                >
                  {m === 'regular' ? t('create.modeRegular') : t('create.modeHardcore')}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1.5">
              {gameMode === 'regular' ? t('create.modeRegularHint') : t('create.modeHardcoreHint')}
            </p>
          </div>

          {/* ---- Multiple Choice toggle ---- */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {t('create.mcTitle')}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {t('create.mcHint')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={mcMode}
              onClick={() => setMcMode(!mcMode)}
              className="toggle"
            >
              <span className="toggle-well" aria-hidden />
              <span className="toggle-thumb" aria-hidden />
            </button>
          </div>

          {/* ---- Cameras toggle ---- */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {t('create.cameraTitle')}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {t('create.cameraHint')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={camerasEnabled}
              onClick={() => setCamerasEnabled(!camerasEnabled)}
              className="toggle"
            >
              <span className="toggle-well" aria-hidden />
              <span className="toggle-thumb" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* ---- Signed-in footer (host) ---- */}
      {user && (
        <div className="flex items-center justify-between gap-3 pt-1 text-xs text-[var(--text-muted)]">
          <span className="truncate">
            {t('auth.signedInAs', { email: user.email ?? '' })}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="shrink-0 underline hover:text-[var(--text-secondary)]"
          >
            {t('auth.signOut')}
          </button>
        </div>
      )}
    </form>
    </div>
  );
}
