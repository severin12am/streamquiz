'use client';
// ============================================================
// CreateGame — Host's game creation form
//
// On submit:
//   1. If not signed in → prompt Google sign-in (form stays visible;
//      settings are saved and auto-submitted after OAuth returns).
//   2. Calls /api/create-game — server generates questions + creates row.
//   3. Redirects host to /game/[id]?role=host.
//
// TO CHANGE DEFAULT VALUES: edit the `useState` defaults below.
// ============================================================

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/context/LocaleProvider';
import { useAuth } from '@/context/AuthProvider';
import type { Difficulty, GameMode, CreateGamePayload, Question } from '@/lib/types';
import type { Locale } from '@/lib/i18n';
import KeycapSegSlider from '@/components/KeycapSegSlider';
import GeographySetupModal from '@/components/GeographySetupModal';
import { getPreviousQuestions, rememberQuestions } from '@/lib/question-history';
import { playSound } from '@/lib/sounds';
import SoundToggle from '@/components/SoundToggle';
import type { GeographyConfig } from '@/lib/geography/types';
import { displayGeographyTopic, encodeGeographyTopic } from '@/lib/geography/types';
import { extractPdfSource } from '@/lib/extract-pdf-text';
import {
  displayPdfTopic,
  encodePdfTopic,
  type PdfSource,
} from '@/lib/pdf-source';

const PENDING_CREATE_KEY = 'whosmarter-pending-create';

interface PendingCreateForm {
  topic: string;
  difficulty: Difficulty;
  numQuestions: number;
  mcMode: boolean;
  gameMode: GameMode;
  /** Seconds to answer each question (5–30). Default 20. */
  answerSeconds: number;
  camerasEnabled: boolean;
  /** When true (default), game is private. Maps to is_public: !inviteOnly */
  inviteOnly: boolean;
  locale: Locale;
  geography: GeographyConfig | null;
  /** Extracted PDF text + filename when quiz is from a document. */
  pdfSource: PdfSource | null;
}

interface CreateGameProps {
  /** Opens the full-page public room browser on home. */
  onBrowseOpen?: () => void;
}

function savePendingCreate(form: PendingCreateForm) {
  sessionStorage.setItem(PENDING_CREATE_KEY, JSON.stringify(form));
}

function loadPendingCreate(): PendingCreateForm | null {
  try {
    const raw = sessionStorage.getItem(PENDING_CREATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingCreateForm;
  } catch {
    return null;
  }
}

function clearPendingCreate() {
  sessionStorage.removeItem(PENDING_CREATE_KEY);
}

export default function CreateGame({ onBrowseOpen }: CreateGameProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { user, session, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const resumeStartedRef = useRef(false);

  // ---- Form state ----
  const [topic,        setTopic]        = useState('');
  const [difficulty,   setDifficulty]   = useState<Difficulty>('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [mcMode,       setMcMode]       = useState(true);
  const [gameMode,     setGameMode]     = useState<GameMode>('regular');
  const [answerSeconds, setAnswerSeconds] = useState(20);
  const [camerasEnabled, setCamerasEnabled] = useState(true);
  /** Default ON = private (not listed). */
  const [inviteOnly, setInviteOnly] = useState(true);
  const [geography, setGeography] = useState<GeographyConfig | null>(null);
  const [geoModalOpen, setGeoModalOpen] = useState(false);
  const [pdfSource, setPdfSource] = useState<PdfSource | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfDragOver, setPdfDragOver] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // ---- UI state ----
  const [showAdjust,    setShowAdjust]    = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  /** Server said 402: create quota exhausted → offer the upgrade page. */
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  /** Remaining quiz-creation quota for the signed-in host (billing status). */
  const [quotaInfo, setQuotaInfo] = useState<{
    tier: 'free' | 'basic' | 'premium';
    remaining: number;
    limit: number;
  } | null>(null);

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
  }, [measureAdjustPanel, locale, gameMode, answerSeconds, inviteOnly, geography, pdfSource]);

  useEffect(() => {
    const panel = adjustPanelRef.current;
    const inner = adjustInnerRef.current;
    if (!panel || !inner) return;

    const ro = new ResizeObserver(() => measureAdjustPanel());
    ro.observe(panel);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [measureAdjustPanel]);

  // Refresh the host's remaining quiz-creation quota whenever they sign in
  // (and again after each create/rematch, via applyQuotaFromResponse below).
  useEffect(() => {
    const token = session?.access_token;
    let active = true;
    if (!token) {
      Promise.resolve().then(() => { if (active) setQuotaInfo(null); });
      return () => { active = false; };
    }
    fetch('/api/billing/status', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { tier?: 'free' | 'basic' | 'premium'; quota?: { remaining: number; limit: number } } | null) => {
        if (!active || !data?.quota || !data.tier) return;
        setQuotaInfo({ tier: data.tier, remaining: data.quota.remaining, limit: data.quota.limit });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session?.access_token]);

  function toggleAdjust() {
    if (!showAdjust) measureAdjustPanel();
    setShowAdjust((v) => !v);
  }

  function currentFormSnapshot(): PendingCreateForm {
    return {
      topic: topic.trim(),
      difficulty,
      numQuestions,
      mcMode,
      gameMode,
      answerSeconds,
      camerasEnabled,
      inviteOnly,
      locale,
      geography,
      pdfSource,
    };
  }

  function applyFormSnapshot(form: PendingCreateForm) {
    setTopic(form.topic);
    setDifficulty(form.difficulty);
    setNumQuestions(form.numQuestions);
    setMcMode(form.mcMode);
    setGameMode(form.gameMode);
    const secs = form.answerSeconds;
    setAnswerSeconds(
      typeof secs === 'number' && Number.isFinite(secs)
        ? Math.min(30, Math.max(5, Math.round(secs)))
        : 20,
    );
    setCamerasEnabled(form.camerasEnabled);
    setInviteOnly(form.inviteOnly !== false);
    setGeography(form.geography ?? null);
    setPdfSource(form.pdfSource ?? null);
  }

  const applyPdfFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    setError(null);
    setPdfBusy(true);
    try {
      const source = await extractPdfSource(file);
      setPdfSource(source);
      setGeography(null);
      setTopic('');
      playSound('click');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('create.errorGeneric'));
    } finally {
      setPdfBusy(false);
    }
  }, [t]);

  const submitCreate = useCallback(
    async (accessToken: string, form: PendingCreateForm) => {
      setError(null);
      setQuotaExceeded(false);
      setLoading(true);

      try {
        const topicForApi = form.pdfSource
          ? encodePdfTopic(form.pdfSource.fileName)
          : form.geography
            ? encodeGeographyTopic(form.geography)
            : form.topic;
        const payload: CreateGamePayload & { cameras_enabled: boolean } = {
          topic: topicForApi,
          difficulty: form.geography || form.pdfSource ? 'medium' : form.difficulty,
          num_questions: form.numQuestions,
          mc_mode: form.mcMode,
          game_mode: form.gameMode,
          answer_seconds: form.answerSeconds,
          cameras_enabled: form.camerasEnabled,
          is_public: !form.inviteOnly,
          locale: form.locale,
          previous_questions: getPreviousQuestions(topicForApi),
          ...(form.pdfSource
            ? { source_text: form.pdfSource.text }
            : {}),
          ...(form.geography && !form.pdfSource
            ? {
                geography: {
                  types: form.geography.types,
                  regions: form.geography.regions,
                },
              }
            : {}),
        };

        const res = await fetch('/api/create-game', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          if (res.status === 402) {
            setQuotaExceeded(true);
            return;
          }
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? t('create.errorGenerate'));
        }

        const { gameId, questions, quota } = (await res.json()) as {
          gameId: string;
          questions: Question[];
          quota?: { tier: 'free' | 'basic' | 'premium'; remaining: number; limit: number };
        };
        if (!gameId) throw new Error(t('create.errorCreate'));
        if (quota) setQuotaInfo(quota);
        rememberQuestions(topicForApi, questions);
        router.push(`/game/${gameId}?role=host`);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('create.errorGeneric'));
      } finally {
        setLoading(false);
      }
    },
    [router, t],
  );

  // After Google OAuth redirect: resume the create the user started.
  useEffect(() => {
    if (authLoading || !session?.access_token) return;
    const pending = loadPendingCreate();
    if (!pending || resumeStartedRef.current) return;

    resumeStartedRef.current = true;
    clearPendingCreate();
    setShowAuthPrompt(false);
    applyFormSnapshot(pending);
    void submitCreate(session.access_token, pending);
  }, [authLoading, session?.access_token, submitCreate]);

  // -------------------------------------------------------
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!geography && !pdfSource && !topic.trim()) {
      setError(t('create.errorEmptyTopic'));
      return;
    }
    if (geography && geography.types.length === 0) {
      setError('Select at least one geography question type.');
      return;
    }
    if (authLoading) return;

    setError(null);
    setAuthError(null);
    playSound('click');

    const snapshot = currentFormSnapshot();

    // Not signed in yet → show the Google prompt; don't block the form.
    if (!session?.access_token) {
      savePendingCreate(snapshot);
      setShowAuthPrompt(true);
      return;
    }

    await submitCreate(session.access_token, snapshot);
  }

  async function handleSignInAndCreate() {
    setAuthError(null);
    playSound('click');
    savePendingCreate(currentFormSnapshot());
    try {
      await signInWithGoogle();
    } catch {
      setAuthError(t('auth.signInError'));
    }
  }

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
        {pdfSource ? (
          <div className="flex items-center gap-2">
            <div
              className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-[var(--text-primary)] min-w-0"
              style={{
                background: 'rgba(47,125,119,0.10)',
                border: '1px solid var(--accent)',
              }}
            >
              PDF quiz
              <span className="block text-xs font-normal text-[var(--text-muted)] mt-0.5 truncate">
                {displayPdfTopic(encodePdfTopic(pdfSource.fileName))}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setPdfSource(null);
              }}
              className="keycap keycap-secondary px-3 py-3 rounded-xl text-sm flex-shrink-0"
            >
              Clear
            </button>
          </div>
        ) : geography ? (
          <div className="flex items-center gap-2">
            <div
              className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-[var(--text-primary)]"
              style={{
                background: 'rgba(47,125,119,0.10)',
                border: '1px solid var(--accent)',
              }}
            >
              Geography chosen
              <span className="block text-xs font-normal text-[var(--text-muted)] mt-0.5 truncate">
                {displayGeographyTopic(encodeGeographyTopic(geography))}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setGeography(null);
              }}
              className="keycap keycap-secondary px-3 py-3 rounded-xl text-sm flex-shrink-0"
            >
              Clear
            </button>
          </div>
        ) : (
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
        )}
      </div>

      {/* ---- Quota exceeded → upgrade offer ---- */}
      {quotaExceeded && (
        <div
          className="rounded-xl px-4 py-4 flex flex-col gap-3 text-center"
          style={{ background: 'rgba(47,125,119,0.08)', border: '1px solid var(--accent)' }}
        >
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {t('billing.quotaExceededTitle')}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1.5">
              {t('billing.quotaExceededBody')}
            </p>
          </div>
          <Link
            href="/upgrade"
            className="keycap keycap-primary py-3 rounded-xl font-semibold text-sm text-white"
          >
            {t('billing.seePlans')}
          </Link>
        </div>
      )}

      {/* ---- Error message ---- */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(214,87,69,0.10)', border: '1px solid var(--wrong)', color: 'var(--wrong)' }}
        >
          {error}
        </div>
      )}

      {/* ---- Google sign-in prompt (only after clicking Create) ---- */}
      {showAuthPrompt && !user && (
        <div
          className="rounded-xl px-4 py-4 flex flex-col gap-3 text-center"
          style={{ background: 'rgba(47,125,119,0.08)', border: '1px solid var(--accent)' }}
        >
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {t('auth.signInTitle')}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1.5">
              {t('auth.signInHint')}
            </p>
          </div>

          {authError && (
            <div
              className="rounded-xl px-3 py-2 text-sm"
              style={{ background: 'rgba(214,87,69,0.10)', border: '1px solid var(--wrong)', color: 'var(--wrong)' }}
            >
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={handleSignInAndCreate}
            className="keycap keycap-primary py-3 rounded-xl font-semibold text-sm text-white"
          >
            {t('auth.signInGoogle')}
          </button>
        </div>
      )}

      {/* ---- Submit button ---- */}
      <button
        type="submit"
        disabled={loading || authLoading}
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
        <div ref={adjustInnerRef} className="adjust-panel-inner flex flex-col gap-6 pt-1 pb-3">
          {/* ---- Difficulty (hidden for Geography / PDF) ---- */}
          {!geography && !pdfSource && (
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
          )}

          {/* ---- Number of questions (Eliminate uses every country in region) ---- */}
          {!(geography?.types.includes('eliminate')) && (
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
          )}
          {geography?.types.includes('eliminate') && (
            <p className="text-xs text-[var(--text-muted)]">
              Eliminate mode asks one question per country in the selected region(s).
            </p>
          )}

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

          {/* ---- Answer time (Every answer counts) ---- */}
          {gameMode === 'regular' && (
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                {t('create.answerTime')}
              </label>
              <KeycapSegSlider
                min={5}
                max={30}
                value={answerSeconds}
                onChange={setAnswerSeconds}
                aria-label={t('create.answerTime')}
              />
            </div>
          )}

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

          {/* ---- Invite only (default ON = private) ---- */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {t('create.inviteOnlyTitle')}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {inviteOnly ? t('create.inviteOnlyHintOn') : t('create.inviteOnlyHintOff')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={inviteOnly}
              onClick={() => setInviteOnly(!inviteOnly)}
              className="toggle flex-shrink-0"
            >
              <span className="toggle-well" aria-hidden />
              <span className="toggle-thumb" aria-hidden />
            </button>
          </div>

          {/* ---- Specific types of quiz (above Browse) ---- */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
              Specific types of quiz
            </label>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                void applyPdfFile(file);
              }}
            />
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setGeoModalOpen(true);
                }}
                className={`keycap py-2.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-medium leading-tight ${
                  geography ? 'keycap-primary' : 'keycap-secondary'
                }`}
              >
                Geography
              </button>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="keycap py-2.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-medium leading-tight keycap-secondary opacity-50 cursor-not-allowed"
              >
                IQ testing
              </button>
              <button
                type="button"
                disabled={pdfBusy}
                title="Drop a PDF or click to choose"
                onClick={() => {
                  if (pdfBusy) return;
                  playSound('click');
                  pdfInputRef.current?.click();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPdfDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPdfDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPdfDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPdfDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  void applyPdfFile(file);
                }}
                className={`keycap py-2.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-medium leading-tight ${
                  pdfSource || pdfDragOver ? 'keycap-primary' : 'keycap-secondary'
                } ${pdfBusy ? 'opacity-70' : ''}`}
              >
                {pdfBusy ? 'Reading…' : pdfSource ? 'PDF ✓' : 'PDF'}
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1.5">
              {pdfSource
                ? 'Quiz from your PDF — topic and difficulty are off.'
                : 'Drop a PDF on PDF (or click) to quiz that document.'}
            </p>
          </div>

          {/* ---- Browse open games (after invite only / specific types) ---- */}
          <button
            type="button"
            onClick={() => {
              playSound('click');
              onBrowseOpen?.();
            }}
            className="keycap keycap-secondary w-full py-3 px-4 rounded-xl text-left flex flex-col gap-0.5"
          >
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {t('create.browseOpenGames')}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {t('create.browseOpenGamesHint')}
            </span>
          </button>
        </div>
      </div>

      {/* ---- Footer ---- */}
      <div
        className={`flex items-center gap-3 pt-1 text-xs text-[var(--text-muted)] ${
          user ? 'justify-between' : 'justify-end'
        }`}
      >
        {user && (
          <span className="truncate flex flex-col gap-0.5">
            <span>{t('auth.signedInAs', { email: user.email ?? '' })}</span>
            {quotaInfo && (
              <Link href="/upgrade" className="underline hover:text-[var(--text-secondary)]">
                {quotaInfo.tier === 'free'
                  ? t('billing.remainingFree', { n: quotaInfo.remaining, limit: quotaInfo.limit })
                  : t('billing.remainingMonthly', { n: quotaInfo.remaining, limit: quotaInfo.limit })}
              </Link>
            )}
          </span>
        )}
        <div className="flex shrink-0 items-center gap-3">
          <a
            href="https://apps.apple.com/us/app/id6780852034"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--text-secondary)]"
          >
            {t('auth.downloadIosApp')}
          </a>
          {user && (
            <button
              type="button"
              onClick={() => signOut()}
              className="underline hover:text-[var(--text-secondary)]"
            >
              {t('auth.signOut')}
            </button>
          )}
        </div>
      </div>
    </form>

    <GeographySetupModal
      open={geoModalOpen}
      initial={geography}
      onClose={() => setGeoModalOpen(false)}
      onConfirm={(cfg) => {
        setGeography(cfg);
        setPdfSource(null);
        setTopic('');
        setGeoModalOpen(false);
        playSound('click');
      }}
    />
    </div>
  );
}
