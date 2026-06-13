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

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/context/LocaleProvider';
import type { Difficulty, GameMode, CreateGamePayload, Question } from '@/lib/types';
import { getPreviousQuestions, rememberQuestions } from '@/lib/question-history';

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

  // -------------------------------------------------------
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      setError(t('create.errorEmptyTopic'));
      return;
    }
    setError(null);
    setLoading(true);

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
    if (gameId) router.push(`/game/${gameId}?role=host`);
  }

  // -------------------------------------------------------
  // After creation: show share screen
  // -------------------------------------------------------
  if (shareLink && gameId) {
    return (
      <div className="flex flex-col items-center gap-8 text-center">
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
          <div
            className="flex items-center gap-2 rounded-xl border p-3"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <span
              className="flex-1 text-sm text-[var(--text-primary)] truncate font-mono"
            >
              {shareLink}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex-shrink-0 text-xs font-semibold hover:underline"
              style={{ color: copied ? 'var(--correct)' : 'var(--accent)' }}
            >
              {copied ? t('create.copied') : t('create.copy')}
            </button>
          </div>
        </div>

        {/* Enter the game */}
        <button
          onClick={handleGoToGame}
          className="px-12 py-4 rounded-xl font-semibold text-lg text-white transition-colors"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
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
    <form
      onSubmit={handleCreate}
      className="card elevated flex flex-col gap-6 w-full max-w-md p-7"
    >

      {/* ---- Topic ---- */}
      <div>
        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
          {t('create.topic')}
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t('create.topicPlaceholder')}
          maxLength={100}
          className="w-full rounded-xl px-4 py-3 text-[var(--text-primary)] text-base outline-none transition-colors"
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
          autoFocus
        />
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
        className="py-3.5 rounded-xl font-semibold text-base text-white transition-colors disabled:cursor-not-allowed"
        style={{ background: loading ? 'var(--bg-elevated)' : 'var(--accent)' }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--accent-hover)'; }}
        onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'var(--accent)'; }}
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
        onClick={() => setShowAdjust((v) => !v)}
        className="py-2.5 rounded-xl text-sm font-medium transition-colors"
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
        aria-expanded={showAdjust}
      >
        {showAdjust ? t('create.adjustHide') : t('create.adjustShow')}
      </button>

      {showAdjust && (
        <div className="flex flex-col gap-6 pt-1">
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
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: difficulty === d ? 'var(--accent)' : 'var(--bg-base)',
                    border: `1px solid ${difficulty === d ? 'var(--accent)' : 'var(--border)'}`,
                    color: difficulty === d ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {d === 'easy' ? t('create.difficultyEasy') : d === 'medium' ? t('create.difficultyMedium') : t('create.difficultyHard')}
                </button>
              ))}
            </div>
          </div>

          {/* ---- Number of questions ---- */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
              {t('create.questions')}: <span className="text-[var(--text-primary)]">{numQuestions}</span>
            </label>
            <input
              type="range"
              min={3}
              max={10}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full cursor-pointer h-2"
              style={{ accentColor: 'var(--accent)' }}
            />
            <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
              <span>3</span><span>10</span>
            </div>
          </div>

          {/* ---- Game mode ---- */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
              {t('create.modeTitle')}
            </label>
            <div className="flex gap-2">
              {(['think', 'classic'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setGameMode(m)}
                  className="flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors text-left"
                  style={{
                    background: gameMode === m ? 'var(--accent)' : 'var(--bg-base)',
                    border: `1px solid ${gameMode === m ? 'var(--accent)' : 'var(--border)'}`,
                    color: gameMode === m ? 'white' : 'var(--text-secondary)',
                  }}
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
              className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: mcMode ? 'var(--accent)' : 'var(--border-strong)' }}
            >
              <span
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
                style={{ left: mcMode ? '26px' : '4px' }}
              />
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
              className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: camerasEnabled ? 'var(--accent)' : 'var(--border-strong)' }}
            >
              <span
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
                style={{ left: camerasEnabled ? '26px' : '4px' }}
              />
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
