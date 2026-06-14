'use client';
// ============================================================
// CreateGame — Host's game creation form
//
// 4 inputs + 1 button. That's it.
//
// On submit:
//   1. Calls /api/generate-questions (OpenAI) to make questions
//   2. Creates a row in Supabase games table
//   3. Redirects host to /game/[id]?role=host
//   4. Shows the shareable link + QR code
//
// TO CHANGE DEFAULT VALUES: edit the `useState` defaults below.
// ============================================================

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/context/LocaleProvider';
import type { Difficulty, GameMode, CreateGamePayload, Question } from '@/lib/types';
import KeycapSegSlider from '@/components/KeycapSegSlider';
import { getPreviousQuestions, rememberQuestions } from '@/lib/question-history';
import { playSound } from '@/lib/sounds';
import SoundToggle from '@/components/SoundToggle';

export default function CreateGame() {
  const router = useRouter();
  const { t, locale } = useLocale();

  // ---- Form state ----
  // TO CHANGE DEFAULTS: edit the values here
  const [topic,        setTopic]        = useState('');
  const [difficulty,   setDifficulty]   = useState<Difficulty>('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [mcMode,       setMcMode]       = useState(true);
  const [gameMode,     setGameMode]     = useState<GameMode>('classic');
  const [camerasEnabled, setCamerasEnabled] = useState(true);

  // ---- UI state ----
  const [showAdjust,    setShowAdjust]    = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [shareLink,     setShareLink]     = useState<string | null>(null);
  const [gameId,        setGameId]        = useState<string | null>(null);
  const [copied,        setCopied]        = useState(false);

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
      // Step 1: Generate questions via OpenAI API route
      const trimmedTopic = topic.trim();
      const payload: CreateGamePayload = {
        topic: trimmedTopic,
        difficulty,
        num_questions: numQuestions,
        mc_mode: mcMode,
        game_mode: gameMode,
        locale,
        previous_questions: getPreviousQuestions(trimmedTopic),
      };

      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t('create.errorGenerate'));
      }

      const { questions } = (await res.json()) as { questions: Question[] };
      rememberQuestions(trimmedTopic, questions);

      // Step 2: Create the game row in Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: dbError } = await (supabase as any)
        .from('games')
        .insert({
          topic: trimmedTopic,
          difficulty,
          num_questions: numQuestions,
          mc_mode: mcMode,
          game_mode: gameMode,
          cameras_enabled: camerasEnabled,
          questions,
          status: 'waiting',
          phase: 'waiting',
        })
        .select('id')
        .single();

      if (dbError || !data) {
        throw new Error(dbError?.message ?? t('create.errorCreate'));
      }

      // Step 3: Build the shareable link (no ?role= means player)
      const id   = (data as { id: string }).id;
      const link = `${window.location.origin}/game/${id}`;

      setGameId(id);
      setShareLink(link);

    } catch (err) {
      setError(err instanceof Error ? err.message : t('create.errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  function handleGoToGame() {
    if (gameId) {
      playSound('click');
      router.push(`/game/${gameId}?role=host`);
    }
  }

  // -------------------------------------------------------
  // After creation: show share screen
  // -------------------------------------------------------
  if (shareLink && gameId) {
    return (
      <div className="relative flex flex-col items-center gap-8 text-center">
        <SoundToggle className="fixed z-40 top-[max(0.75rem,env(safe-area-inset-top))] end-[max(0.75rem,env(safe-area-inset-right))]" />
        {/* Success heading */}
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {t('create.createdTitle')}
          </h2>
          <p className="text-[var(--text-secondary)] mt-1">
            {t('create.createdHint')}
          </p>
        </div>

        {/* QR code */}
        <div
          className="p-4 rounded-2xl"
          style={{ background: 'white' }}
        >
          <QRCodeSVG value={shareLink} size={180} />
        </div>

        {/* Shareable link */}
        <div className="w-full max-w-md">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-2 font-semibold">
            {t('create.shareLink')}
          </p>
          <div className="keycap-well-frame w-full max-w-md">
            <div className="keycap-well flex items-center gap-2 p-3">
            <span
              className="flex-1 text-sm text-[var(--text-primary)] truncate font-mono"
            >
              {shareLink}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareLink);
                playSound('click');
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className={`keycap keycap-secondary keycap-compact flex-shrink-0 font-semibold${copied ? ' text-[var(--correct)]' : ''}`}
            >
              {copied ? t('create.copied') : t('create.copy')}
            </button>
            </div>
          </div>
        </div>

        {/* Enter the game */}
        <button
          onClick={handleGoToGame}
          className="keycap keycap-primary px-12 py-4 rounded-xl font-semibold text-lg text-white"
        >
          {t('create.enterQuiz')}
        </button>
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
              max={10}
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
              {(['think', 'classic'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setGameMode(m)}
                  className={`keycap flex-1 py-2.5 px-3 rounded-xl text-sm font-medium text-left ${
                    gameMode === m ? 'keycap-primary' : 'keycap-secondary'
                  }`}
                >
                  {m === 'think' ? t('create.modeThink') : t('create.modeClassic')}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1.5">
              {gameMode === 'think' ? t('create.modeThinkHint') : t('create.modeClassicHint')}
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
    </form>
    </div>
  );
}
