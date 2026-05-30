'use client';
// ============================================================
// GameScreen — The main 3-column game view
//
// LAYOUT (desktop only, fixed proportions):
//   ┌──────────────┬──────────────────────┬──────────────┐
//   │  LEFT 30%    │     MIDDLE 40%       │  RIGHT 30%   │
//   │  Host Camera │  Question + Timer    │Player Camera │
//   │              │  Scores + BUZZ btn   │              │
//   └──────────────┴──────────────────────┴──────────────┘
//
// TO CHANGE COLUMN WIDTHS: edit the flex values in the
//   outer container below (search for "flex-[3]", "flex-[4]")
//
// Both host and player use this exact same component.
// Role determines:
//   - Which camera is "local" (mirrored) vs "remote"
//   - Who sees the judge buttons (host only)
//   - Who drives the timer (host only)
// ============================================================

import React, { useEffect, useCallback, useState } from 'react';
import CameraPanel    from './CameraPanel';
import QuestionPanel  from './QuestionPanel';
import WinnerScreen   from './WinnerScreen';

import { useGameState } from '@/hooks/useGameState';
import { useWebRTC }    from '@/hooks/useWebRTC';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useMediaRecorder }     from '@/hooks/useMediaRecorder';
import { updateGame }   from '@/lib/supabase';
import { useLocale }    from '@/context/LocaleProvider';
import type { PlayerRole, CreateGamePayload } from '@/lib/types';

interface GameScreenProps {
  gameId: string;
  role:   PlayerRole;
}

export default function GameScreen({ gameId, role }: GameScreenProps) {
  const { t, locale, speechLang } = useLocale();

  // True while a rematch is regenerating a fresh set of questions.
  const [rematchLoading, setRematchLoading] = useState(false);
  // Guards the one-shot rematch trigger so it can't fire twice.
  const rematchTriggeredRef = React.useRef(false);

  // ----------------------------------------------------------
  // 1. Game state (synced via Supabase Realtime)
  // ----------------------------------------------------------
  const {
    game, loading, error,
    timeLeft, timeLeftMs, timerTotal,
    submitMCAnswer,
    startGame, updateTranscript, finishAnswer, rematch, voteRematch,
  } = useGameState(gameId, role);

  // Whether THIS player has already locked in their voice answer.
  const iAmDone = !!game && (role === 'host' ? game.host_done : game.player_done);

  // Determine whether the other player has joined
  // (game moves to 'ready' or 'playing' once both are present)
  const otherPlayerJoined = !!(game && game.status !== 'waiting');

  // ----------------------------------------------------------
  // 2. WebRTC cameras
  // ----------------------------------------------------------
  const {
    localStream, remoteStream, cameraError, isConnected, startCamera,
  } = useWebRTC(gameId, role, otherPlayerJoined);

  // Start camera automatically when the component mounts
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // Mark the game as 'ready' once both cameras connect
  // Only the player (second joiner) triggers this
  useEffect(() => {
    if (
      role === 'player' &&
      game?.status === 'waiting' &&
      localStream
    ) {
      updateGame(gameId, { status: 'ready' }).catch(console.error);
    }
  }, [role, game?.status, localStream, gameId]);

  // ----------------------------------------------------------
  // 3. Speech recognition (for voice answering)
  //    `answerDraft` is what we SHOW + save: it comes from the mic by
  //    default, but switches to TYPED text if the player uses the
  //    fallback input (e.g. on a browser with poor speech support).
  // ----------------------------------------------------------
  const [answerDraft, setAnswerDraft] = useState('');
  const [typedMode, setTypedMode]     = useState(false);
  const typedModeRef = React.useRef(false);
  useEffect(() => { typedModeRef.current = typedMode; }, [typedMode]);

  const onTranscriptUpdate = useCallback(
    (text: string) => {
      // Ignore mic results once the player has chosen to type instead.
      if (typedModeRef.current) return;
      setAnswerDraft(text);
      updateTranscript(text);
    },
    [updateTranscript]
  );

  const { isListening, isSupported, startListening, stopListening } =
    useSpeechRecognition(onTranscriptUpdate, speechLang);

  // Fresh draft each round.
  useEffect(() => {
    setAnswerDraft('');
    setTypedMode(false);
  }, [game?.current_question_index]);

  // Start/stop the microphone during the voice 'answering' phase.
  // There is NO buzzer: BOTH players talk at once, so every client
  // runs its OWN mic. The mic stops once this player is Done or has
  // switched to typing. (MC mode never enters 'answering'.)
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

  // Switch to the typed fallback: stop the mic and use the typed text.
  const handleTypeAnswer = useCallback((text: string) => {
    if (!typedMode) setTypedMode(true);
    if (isListening) stopListening();
    setAnswerDraft(text);
    updateTranscript(text);
  }, [typedMode, isListening, stopListening, updateTranscript]);

  // Lock in this player's answer early.
  const handleFinishAnswer = useCallback(() => {
    if (isListening) stopListening();
    finishAnswer(answerDraft);
  }, [isListening, stopListening, finishAnswer, answerDraft]);

  // ----------------------------------------------------------
  // 4. Media recorder (for clip downloads at the end)
  // ----------------------------------------------------------
  const { clips, startRecording, stopRecording } = useMediaRecorder();

  // Record each answer automatically (the local player's own clip,
  // since both players speak during 'answering').
  useEffect(() => {
    if (!game || !localStream) return;
    const iShouldSpeak = game.phase === 'answering';

    if (iShouldSpeak) {
      startRecording(localStream, game.current_question_index, role);
    } else {
      stopRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase]);

  // ----------------------------------------------------------
  // Rematch — generate a FRESH set of questions using the SAME
  // settings (topic/difficulty/count/mode), then reset to the lobby.
  // Falls back to reusing the old questions if generation fails so
  // the rematch never gets stuck. Runs on the HOST once enough players
  // have voted (the host has the locale/API access to regenerate).
  // ----------------------------------------------------------
  const handleRematch = useCallback(async () => {
    if (!game || rematchLoading) return;
    setRematchLoading(true);
    try {
      const payload: CreateGamePayload = {
        topic: game.topic,
        difficulty: game.difficulty,
        num_questions: game.num_questions,
        mc_mode: game.mc_mode,
        game_mode: game.game_mode,
        locale,
      };
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const { questions } = await res.json();
        if (Array.isArray(questions) && questions.length > 0) {
          await rematch(questions);
          return;
        }
      }
      // Generation failed → reuse the existing questions so we don't stall.
      await rematch();
    } catch (err) {
      console.error('[GameScreen] rematch generation failed:', err);
      await rematch();
    } finally {
      setRematchLoading(false);
    }
  }, [game, rematchLoading, locale, rematch]);

  // Start the rematch once the host AND at least one other player have
  // voted. The host's client drives the regeneration. A ref guards
  // against firing twice; it resets after we leave the end screen.
  useEffect(() => {
    if (!game) return;
    if (game.phase !== 'ended') {
      rematchTriggeredRef.current = false;
      return;
    }
    if (
      role === 'host' &&
      game.rematch_host &&
      game.rematch_player &&
      !rematchTriggeredRef.current
    ) {
      rematchTriggeredRef.current = true;
      handleRematch();
    }
  }, [role, game, handleRematch]);

  // ----------------------------------------------------------
  // Loading / error states
  // ----------------------------------------------------------
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin mx-auto mb-4"
          />
          <p className="text-[var(--text-secondary)]">{t('game.joining')}</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="card elevated text-center max-w-md px-8 py-10 mx-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            {error ?? t('game.notFound')}
          </h2>
          <p className="text-[var(--text-secondary)] text-sm">
            {t('game.notFoundHint')}
          </p>
          <a
            href="/"
            className="inline-block mt-6 px-6 py-2.5 rounded-xl font-semibold text-white transition-colors"
            style={{ background: 'var(--accent)' }}
          >
            {t('game.backHome')}
          </a>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Who goes on which side?
  //   Host  → their local camera is on the LEFT
  //   Player → their local camera is on the RIGHT
  // Both players see the same layout:
  //   LEFT = Host camera | MIDDLE = game | RIGHT = Player camera
  // ----------------------------------------------------------
  const hostCamera   = role === 'host'   ? localStream  : remoteStream;
  const playerCamera = role === 'player' ? localStream  : remoteStream;
  // During the voice answer phase BOTH players are talking, so both
  // camera frames get the "speaking" highlight.
  const hostSpeaking   = game.phase === 'answering';
  const playerSpeaking = game.phase === 'answering';

  return (
    /*
      RESPONSIVE LAYOUT
      ─────────────────
      Desktop (lg ≥ 1024px): 3 columns side-by-side (flex-row).
        [ Host cam 30% | Question 40% | Streamer cam 30% ]
      Phone / portrait (< 1024px): 3 rows stacked (flex-col).
        [ Host cam    — fixed 16vh ]
        [ Question    — fills the rest (flex-1) ]
        [ Streamer cam — fixed 16vh ]
      On phones the cameras are kept short so the question + all four
      answer options are fully visible WITHOUT scrolling. On desktop
      the flex-[3]/[4]/[3] ratios set the column WIDTHS instead.
      TO CHANGE THE BREAKPOINT: swap "lg:" for "md:" or "xl:".
      TO CHANGE PHONE CAMERA SIZE: edit the h-[16vh] values.
    */
    <div className="relative flex flex-col lg:flex-row h-screen w-screen overflow-hidden">
      {/* Language is chosen by the host on the home page BEFORE creating
          the quiz — no in-game switcher (questions are already generated
          in the chosen language). */}

      {/* =====================================================
          HOST camera — desktop: 30% width. Phone: smaller height
          so the question/answers stay fully visible.
          TO CHANGE: edit the flex-[..] values (phone | lg:desktop)
      ===================================================== */}
      <div className="h-[16vh] shrink-0 lg:h-full lg:flex-[3] min-w-0 min-h-0">
        <CameraPanel
          stream={hostCamera}
          label={t('game.host')}
          isSpeaking={hostSpeaking}
          mirrored={role === 'host'}
          error={role === 'host' ? cameraError : null}
          className="h-full w-full"
        />
      </div>

      {/* =====================================================
          QUESTION panel — desktop: 40% width. Phone: taller so the
          question + answer controls never get clipped.
          TO CHANGE: edit the flex-[..] values (phone | lg:desktop)
      ===================================================== */}
      <div className="flex-1 lg:flex-[4] min-w-0 min-h-0">
        <QuestionPanel
          game={game}
          role={role}
          timeLeft={timeLeft}
          timeLeftMs={timeLeftMs}
          timerTotal={timerTotal}
          transcript={answerDraft}
          iAmDone={iAmDone}
          speechSupported={isSupported}
          onMCSelect={(i) => submitMCAnswer(role, i)}
          onTypeAnswer={handleTypeAnswer}
          onFinish={handleFinishAnswer}
        />
      </div>

      {/* =====================================================
          STREAMER camera — desktop: 30% width. Phone: smaller height.
          TO CHANGE: edit the flex-[..] values (phone | lg:desktop)
      ===================================================== */}
      <div className="h-[16vh] shrink-0 lg:h-full lg:flex-[3] min-w-0 min-h-0">
        <CameraPanel
          stream={playerCamera}
          label={t('game.streamer')}
          isSpeaking={playerSpeaking}
          mirrored={role === 'player'}
          error={role === 'player' ? cameraError : null}
          className="h-full w-full"
        />
      </div>

      {/* =====================================================
          START BUTTON OVERLAY
          Shown when game is 'ready' (both cameras connected)
          but not yet 'playing'. Host-only.
      ===================================================== */}
      {game.status === 'ready' && role === 'host' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70 backdrop-blur-sm p-6">
          <div className="card elevated flex flex-col items-center gap-6 px-10 py-9 text-center max-w-sm w-full">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                {t('game.bothIn')}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1.5">
                {t('game.questionsCount', { n: game.questions.length })}
                <span className="mx-2 text-[var(--border-strong)]">·</span>
                {game.mc_mode ? t('game.modeMc') : t('game.modeVoice')}
                <span className="mx-2 text-[var(--border-strong)]">·</span>
                {game.game_mode === 'classic' ? t('create.modeClassic') : t('create.modeThink')}
              </p>
            </div>
            <button
              onClick={startGame}
              className="w-full px-10 py-3.5 rounded-xl font-semibold text-lg text-white transition-colors"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
            >
              {t('game.startQuiz')}
            </button>
          </div>
        </div>
      )}

      {/* Player's "waiting for host to start" — clear, not a frozen screen */}
      {game.status === 'ready' && role === 'player' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm p-6 pointer-events-none">
          <div className="card flex flex-col items-center gap-3 px-8 py-6 text-center">
            <div className="w-7 h-7 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <p className="text-[var(--text-primary)] font-semibold">{t('game.youreIn')}</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {t('game.waitHostStartOverlay')}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          WAITING OVERLAY
          Shown to host before player joins
      ===================================================== */}
      {game.status === 'waiting' && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 backdrop-blur-sm pointer-events-none"
        >
          <div className="text-center pointer-events-auto">
            <div className="w-9 h-9 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">
              {role === 'host'
                ? t('game.waitOpponent')
                : t('game.connecting')}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          WINNER SCREEN OVERLAY (end of game)
      ===================================================== */}
      {game.phase === 'ended' && (
        <WinnerScreen
          hostScore={game.host_score}
          playerScore={game.player_score}
          clips={clips}
          /* Rematch = FRESH questions (same settings), same link, back to
             the lobby. BOTH players vote; it starts once the host and at
             least one other have accepted. */
          onVoteRematch={() => voteRematch(role)}
          myVote={role === 'host' ? game.rematch_host : game.rematch_player}
          hostVoted={game.rematch_host}
          playerVoted={game.rematch_player}
          hostLabel={t('game.host')}
          guestLabel={t('game.streamer')}
          rematchLoading={rematchLoading}
          onExit={() => (window.location.href = '/')}
        />
      )}
    </div>
  );
}
