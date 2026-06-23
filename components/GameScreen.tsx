'use client';
// ============================================================
// GameScreen — the main game view (multiplayer, up to 6 players)
//
// FLOW:
//   1. Pick a stable client id (localStorage) + read the host intent.
//   2. If we haven't claimed a seat yet → JoinScreen (enter a name).
//   3. While the match hasn't started → Lobby (player list + invite/start).
//   4. Playing → a responsive grid of EVERY player's camera (a WebRTC
//      mesh) + the central question panel.
//   5. Ended → WinnerScreen overlay (ranked scores + rematch voting).
//
// Every participant runs this same component. The host (slot 0) is the
// only one who can start the game / drive the rematch regeneration.
// ============================================================

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import CameraGrid    from './CameraGrid';
import QuestionPanel  from './QuestionPanel';
import WinnerScreen   from './WinnerScreen';
import JoinScreen     from './JoinScreen';
import Lobby          from './Lobby';

import { useGameState } from '@/hooks/useGameState';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useMeshWebRTC } from '@/hooks/useMeshWebRTC';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useMediaRecorder }     from '@/hooks/useMediaRecorder';
import SoundToggle from './SoundToggle';
import { getClientId } from '@/lib/client-id';
import { useLocale }    from '@/context/LocaleProvider';
import { detectSpeechLang } from '@/lib/i18n';
import type { PlayerRole, CreateGamePayload, Question } from '@/lib/types';
import { mergePreviousQuestions, rememberQuestions, filterUnseenQuestions } from '@/lib/question-history';

interface GameScreenProps {
  gameId: string;
  role:   PlayerRole;
}

export default function GameScreen({ gameId, role }: GameScreenProps) {
  const { t, locale, speechLang } = useLocale();

  // Stable per-browser id (set after mount to avoid an SSR mismatch).
  const [clientId, setClientId] = useState('');
  useEffect(() => { setClientId(getClientId()); }, []);

  const asHost = role === 'host';

  const [rematchLoading, setRematchLoading] = useState(false);
  const [joinFull, setJoinFull] = useState(false);
  const rematchTriggeredRef = React.useRef(false);

  // ----------------------------------------------------------
  // 1. Game state (synced via Supabase Realtime)
  // ----------------------------------------------------------
  const {
    game, players, me, loading, error,
    timeLeft, timeLeftMs, timerTotal,
    join, submitMCAnswer, startGame, updateTranscript, finishAnswer,
    rematch, voteRematch,
  } = useGameState(gameId, clientId);

  const iAmDone = !!me && me.done;

  useGameSounds({ game, players, me, timeLeft });

  // Voice answering should listen in the QUIZ's language (derived from the
  // topic/questions), not the UI language. Falls back to the UI speech tag.
  const quizSpeechLang = useMemo(() => {
    if (!game) return speechLang;
    const sample = `${game.topic ?? ''} ${game.questions?.[0]?.question ?? ''} ${game.questions?.[1]?.question ?? ''}`;
    return detectSpeechLang(sample, speechLang);
  }, [game?.id, game?.topic, game?.questions, speechLang]);

  // ----------------------------------------------------------
  // 2. WebRTC camera mesh (one connection per other player)
  // ----------------------------------------------------------
  const camerasEnabled = game?.cameras_enabled ?? false;
  const {
    localStream, remoteStreams, connected, cameraError, startCamera, stopCamera,
    micEnabled, setMicEnabled,
  } = useMeshWebRTC(gameId, me?.id ?? '', camerasEnabled);

  // Start the camera as soon as we've taken a seat (so the mesh can form
  // while we're still in the lobby).
  useEffect(() => {
    if (me) startCamera();
  }, [me, startCamera]);

  // ----------------------------------------------------------
  // Mic policy depends on the answer style:
  //   • Multiple-choice mode → mic is ALWAYS ON. There's no spoken answer,
  //     so there's nothing to confuse it with — everyone can just chat.
  //   • Voice mode → mic is MUTED by default (so your chatter isn't mistaken
  //     for an answer). It opens automatically while you answer out loud, and
  //     while you HOLD the push-to-talk button to talk between questions.
  // ----------------------------------------------------------
  const voiceMode  = !!game && !game.mc_mode;
  const isAnswering = game?.phase === 'answering';
  const [pttHeld, setPttHeld] = useState(false);
  useEffect(() => {
    // `localStream` in deps so the desired mic state is re-applied once the
    // mic track actually exists (it's captured a moment after we seat).
    if (!game) return;
    if (!voiceMode) {
      setMicEnabled(true);            // MC mode: open mic for everyone
    } else {
      setMicEnabled(isAnswering || pttHeld);
    }
  }, [game, voiceMode, isAnswering, pttHeld, setMicEnabled, localStream]);

  // ----------------------------------------------------------
  // End-of-game DISCUSSION window. When the match ends we keep the cameras
  // live for DISCUSSION_SECONDS so players can react, then cut every feed
  // (mic + video) automatically. A rematch re-acquires the camera via the
  // startCamera effect below. The countdown is shown in the winner sheet.
  // ----------------------------------------------------------
  const DISCUSSION_SECONDS = 60;
  const [discussLeft, setDiscussLeft] = useState(DISCUSSION_SECONDS);
  const [feedsCut, setFeedsCut] = useState(false);

  // Open the mic during the discussion window so everyone can talk freely,
  // even in voice mode (no PTT needed while discussing results).
  useEffect(() => {
    if (!game) return;
    if (game.phase === 'ended' && !feedsCut) {
      setMicEnabled(true);
    }
  }, [game, feedsCut, setMicEnabled]);

  // Countdown + auto-cut when the discussion window elapses.
  useEffect(() => {
    if (!game || game.phase !== 'ended' || feedsCut) return;
    setDiscussLeft(DISCUSSION_SECONDS);
    const startedAt = Date.now();
    const id = setInterval(() => {
      const left = Math.max(0, DISCUSSION_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
      setDiscussLeft(left);
      if (left <= 0) {
        clearInterval(id);
        stopCamera();
        setFeedsCut(true);
      }
    }, 250);
    return () => clearInterval(id);
  }, [game?.phase, feedsCut, stopCamera]);

  // Re-acquire the camera if a rematch starts after we cut the feeds.
  useEffect(() => {
    if (game && game.phase !== 'ended' && feedsCut) {
      setFeedsCut(false);
      startCamera();
    }
  }, [game?.phase, feedsCut, startCamera]);

  // Hold SPACE to talk (voice mode only; ignored while typing in an input).
  useEffect(() => {
    if (!voiceMode) return;
    const isTyping = () => {
      const el = document.activeElement;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isTyping()) { e.preventDefault(); setPttHeld(true); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping()) { e.preventDefault(); setPttHeld(false); }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [voiceMode]);

  // ----------------------------------------------------------
  // 3. Speech recognition (voice answering)
  // ----------------------------------------------------------
  const [answerDraft, setAnswerDraft] = useState('');
  const [typedMode, setTypedMode]     = useState(false);
  const typedModeRef = React.useRef(false);
  useEffect(() => { typedModeRef.current = typedMode; }, [typedMode]);

  // Keep the latest draft in a ref so we can guarantee a final save when the
  // answering phase ends (no "Done" click required).
  const answerDraftRef = React.useRef('');

  // Throttle transcript writes to Supabase. Live speech fires many interim
  // results per second; writing every one floods the DB and the LAST words
  // could land after judging (the old "you gave no answer" bug). We instead
  // write at most ~3×/sec and always flush the final value.
  const TRANSCRIPT_THROTTLE_MS = 350;
  const writeState = React.useRef<{ last: number; timer: ReturnType<typeof setTimeout> | null }>({
    last: 0, timer: null,
  });
  const pushTranscript = useCallback((text: string) => {
    answerDraftRef.current = text;
    const s = writeState.current;
    const now = Date.now();
    const elapsed = now - s.last;
    if (elapsed >= TRANSCRIPT_THROTTLE_MS) {
      s.last = now;
      updateTranscript(text);
    } else if (!s.timer) {
      s.timer = setTimeout(() => {
        s.timer = null;
        s.last = Date.now();
        updateTranscript(answerDraftRef.current);
      }, TRANSCRIPT_THROTTLE_MS - elapsed);
    }
  }, [updateTranscript]);

  const onTranscriptUpdate = useCallback(
    (text: string) => {
      if (typedModeRef.current) return;
      setAnswerDraft(text);
      pushTranscript(text);
    },
    [pushTranscript]
  );

  const { isListening, isSupported, startListening, stopListening } =
    useSpeechRecognition(onTranscriptUpdate, quizSpeechLang);

  useEffect(() => {
    setAnswerDraft('');
    setTypedMode(false);
    answerDraftRef.current = '';
  }, [game?.current_question_index]);

  // Auto-submit: when the answering phase ends, save whatever was said/typed
  // and mark it in — so you never lose an answer by not pressing "Done".
  const prevPhaseRef = React.useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const cur = game?.phase;
    prevPhaseRef.current = cur;
    if (prev === 'answering' && cur && cur !== 'answering' && !game?.mc_mode) {
      const s = writeState.current;
      if (s.timer) { clearTimeout(s.timer); s.timer = null; }
      if (!iAmDone && answerDraftRef.current.trim()) {
        finishAnswer(answerDraftRef.current);
      }
    }
  }, [game?.phase, game?.mc_mode, iAmDone, finishAnswer]);

  useEffect(() => {
    if (!game) return;
    const iShouldSpeak = game.phase === 'answering' && !iAmDone && !typedMode;
    if (iShouldSpeak && !isListening) {
      startListening();
    } else if (!iShouldSpeak && isListening) {
      stopListening();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase, iAmDone, typedMode]);

  const handleTypeAnswer = useCallback((text: string) => {
    if (!typedMode) setTypedMode(true);
    if (isListening) stopListening();
    setAnswerDraft(text);
    pushTranscript(text);
  }, [typedMode, isListening, stopListening, pushTranscript]);

  const handleFinishAnswer = useCallback(() => {
    if (isListening) stopListening();
    const s = writeState.current;
    if (s.timer) { clearTimeout(s.timer); s.timer = null; }
    finishAnswer(answerDraftRef.current || answerDraft);
  }, [isListening, stopListening, finishAnswer, answerDraft]);

  // ----------------------------------------------------------
  // 4. Media recorder (answer clips)
  // ----------------------------------------------------------
  const { clips, startRecording, stopRecording } = useMediaRecorder();

  useEffect(() => {
    if (!game || !localStream || !me) return;
    if (game.phase === 'answering') {
      startRecording(localStream, game.current_question_index, me.name);
    } else {
      stopRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase]);

  // ----------------------------------------------------------
  // Rematch — regenerate fresh questions (same settings), reset to lobby.
  // ----------------------------------------------------------
  const handleRematch = useCallback(async () => {
    if (!game || rematchLoading) return;
    setRematchLoading(true);
    try {
      const currentTexts = game.questions.map((q) => q.question);
      const payload: CreateGamePayload = {
        topic: game.topic,
        difficulty: game.difficulty,
        num_questions: game.num_questions,
        mc_mode: game.mc_mode,
        game_mode: game.game_mode,
        locale,
        previous_questions: mergePreviousQuestions(game.topic, currentTexts),
      };
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const { questions } = (await res.json()) as { questions: Question[] };
        if (Array.isArray(questions) && questions.length > 0) {
          // Cache-aware dedupe: drop any question already seen this session
          // for this topic so a rematch never repeats. If the generator
          // returned only repeats (rare), fall back to its raw output so the
          // rematch can still proceed.
          const unseen = filterUnseenQuestions(game.topic, questions);
          const finalQuestions = unseen.length > 0 ? unseen : questions;
          rememberQuestions(game.topic, finalQuestions);
          await rematch(finalQuestions);
          return;
        }
      }
      await rematch();
    } catch (err) {
      console.error('[GameScreen] rematch generation failed:', err);
      await rematch();
    } finally {
      setRematchLoading(false);
    }
  }, [game, rematchLoading, locale, rematch]);

  // Host drives the rematch once they AND at least one other player voted.
  useEffect(() => {
    if (!game || !me) return;
    if (game.phase !== 'ended') {
      rematchTriggeredRef.current = false;
      return;
    }
    const hostVoted  = players.find((p) => p.role === 'host')?.rematch ?? false;
    const otherVoted = players.some((p) => p.role !== 'host' && p.rematch);
    if (me.role === 'host' && hostVoted && otherVoted && !rematchTriggeredRef.current) {
      rematchTriggeredRef.current = true;
      handleRematch();
    }
  }, [me, game, players, handleRematch]);

  // ----------------------------------------------------------
  // Join handler
  // ----------------------------------------------------------
  const handleJoin = useCallback(async (name: string) => {
    const p = await join(name, asHost);
    if (!p) setJoinFull(true);
  }, [join, asHost]);

  // ----------------------------------------------------------
  // Loading / error states
  // ----------------------------------------------------------
  if (!clientId || loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">{t('game.joining')}</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="card elevated text-center max-w-md px-8 py-10 mx-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            {error ?? t('game.notFound')}
          </h2>
          <p className="text-[var(--text-secondary)] text-sm">{t('game.notFoundHint')}</p>
          <a
            href="/"
            className="keycap keycap-primary inline-flex mt-6 px-6 py-2.5 rounded-xl font-semibold text-white"
          >
            {t('game.backHome')}
          </a>
        </div>
      </div>
    );
  }

  const shareLink =
    typeof window !== 'undefined' ? `${window.location.origin}/game/${gameId}` : '';

  // ----------------------------------------------------------
  // Lobby (match not started yet) — handles BOTH joining (no seat yet) and
  // the seated waiting state in one screen: name input + invite + start.
  // ----------------------------------------------------------
  if (game.status === 'waiting') {
    return (
      <>
        <SoundToggle className="fixed z-40 top-[max(0.75rem,env(safe-area-inset-top))] end-[max(0.75rem,env(safe-area-inset-right))]" />
        <Lobby
          players={players}
          me={me}
          asHost={asHost}
          shareLink={shareLink}
          full={joinFull}
          onStart={startGame}
          onJoin={handleJoin}
        />
      </>
    );
  }

  // ----------------------------------------------------------
  // Game already started but this browser hasn't taken a seat → late join.
  // ----------------------------------------------------------
  if (!me) {
    return <JoinScreen asHost={asHost} full={joinFull} onJoin={handleJoin} />;
  }

  // ----------------------------------------------------------
  // Playing / ended → full-screen camera mesh + overlay quiz layer
  // ----------------------------------------------------------
  const speaking   = game.phase === 'answering';
  const showResult = game.phase === 'result';
  const ended      = game.phase === 'ended';

  return (
    <div className="relative h-dvh w-full min-h-0 overflow-hidden bg-black">
      <SoundToggle className="fixed z-40 top-[max(0.75rem,env(safe-area-inset-top))] end-[max(0.75rem,env(safe-area-inset-right))]" />

      {/* ---- BACKGROUND: full-screen camera mesh (all players) ---- */}
      <div className="absolute inset-0 p-1 sm:p-1.5">
        <CameraGrid
          players={players}
          me={me}
          localStream={localStream}
          remoteStreams={remoteStreams}
          connected={connected}
          cameraError={cameraError}
          camerasEnabled={camerasEnabled}
          speaking={speaking}
          showResult={showResult}
          phase={game.phase}
          mcMode={game.mc_mode}
          className="h-full"
        />
      </div>

      {/* ---- OVERLAY: quiz layer (translucent panels, no page scroll) ----
           Hidden once the match ends (the winner sheet takes over).
           On desktop it's a right-hand column; on mobile it's the lower
           portion of the screen over the video. */}
      {!ended && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-1.5 sm:p-2
                     lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[42%] lg:max-w-[640px] lg:p-2.5"
          style={{ pointerEvents: 'none' }}
        >
          <div className="w-full max-w-lg h-full max-h-[62vh] lg:max-h-full flex" style={{ pointerEvents: 'auto' }}>
            <QuestionPanel
              game={game}
              me={me}
              players={players}
              timeLeft={timeLeft}
              timeLeftMs={timeLeftMs}
              timerTotal={timerTotal}
              transcript={answerDraft}
              iAmDone={iAmDone}
              speechSupported={isSupported}
              onMCSelect={(i) => submitMCAnswer(i)}
              onTypeAnswer={handleTypeAnswer}
              onFinish={handleFinishAnswer}
              voicePttActive={voiceMode && game.phase !== 'ended'}
            />
          </div>
        </div>
      )}

      {/* ---- Push-to-talk button (voice mode only; hold to chat) ----
           In MC mode the mic is always open, so no button is needed. */}
      {voiceMode && !ended && (
        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); setPttHeld(true); }}
          onPointerUp={() => setPttHeld(false)}
          onPointerLeave={() => setPttHeld(false)}
          onPointerCancel={() => setPttHeld(false)}
          disabled={isAnswering}
          aria-label={t('ptt.hold')}
          className={`keycap fixed z-30 flex items-center gap-2 rounded-full font-semibold select-none touch-none
            end-[max(0.75rem,env(safe-area-inset-right))] bottom-[max(0.75rem,env(safe-area-inset-bottom))]
            px-3 py-2.5 text-xs sm:px-4 sm:text-sm ${
            micEnabled ? 'keycap-success text-white' : 'keycap-secondary'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
          <span className="hidden min-[400px]:inline">
            {isAnswering ? t('ptt.answerLive') : pttHeld ? t('ptt.talking') : t('ptt.hold')}
          </span>
        </button>
      )}

      {/* ---- Winner / discussion sheet (cameras stay live behind it) ---- */}
      {ended && (
        <WinnerScreen
          players={players}
          meId={me.id}
          clips={clips}
          onVoteRematch={() => voteRematch()}
          myVote={me.rematch}
          rematchLoading={rematchLoading}
          onExit={() => (window.location.href = '/')}
          discussLeft={discussLeft}
          feedsCut={feedsCut}
        />
      )}
    </div>
  );
}
