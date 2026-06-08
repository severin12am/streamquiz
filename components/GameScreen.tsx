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

import React, { useEffect, useCallback, useState } from 'react';
import CameraGrid    from './CameraGrid';
import QuestionPanel  from './QuestionPanel';
import WinnerScreen   from './WinnerScreen';
import JoinScreen     from './JoinScreen';
import Lobby          from './Lobby';

import { useGameState } from '@/hooks/useGameState';
import { useMeshWebRTC } from '@/hooks/useMeshWebRTC';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useMediaRecorder }     from '@/hooks/useMediaRecorder';
import { getClientId } from '@/lib/client-id';
import { useLocale }    from '@/context/LocaleProvider';
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

  // ----------------------------------------------------------
  // 2. WebRTC camera mesh (one connection per other player)
  // ----------------------------------------------------------
  const camerasEnabled = game?.cameras_enabled ?? false;
  const {
    localStream, remoteStreams, connected, cameraError, startCamera,
  } = useMeshWebRTC(gameId, me?.id ?? '', camerasEnabled);

  // TEMP DEBUG — log WebRTC-related game + stream state
  useEffect(() => {
    console.log('[WebRTC] GameScreen state', {
      gameId,
      playerId: me?.id ?? '(not seated)',
      playerName: me?.name,
      camerasEnabled,
      hasLocalStream: !!localStream,
      localStreamId: localStream?.id ?? null,
      localTracks: localStream?.getTracks().map((t) => t.kind) ?? [],
      remotePeerIds: Object.keys(remoteStreams),
      connectedPeers: connected,
      cameraError,
    });
  }, [gameId, me?.id, me?.name, camerasEnabled, localStream, remoteStreams, connected, cameraError]);

  // Start the camera as soon as we've taken a seat (so the mesh can form
  // while we're still in the lobby).
  useEffect(() => {
    if (me) {
      console.log('[Camera] GameScreen calling startCamera', {
        playerId: me.id,
        camerasEnabled,
      });
      startCamera();
    }
  }, [me, startCamera, camerasEnabled]);

  // ----------------------------------------------------------
  // 3. Speech recognition (voice answering)
  // ----------------------------------------------------------
  const [answerDraft, setAnswerDraft] = useState('');
  const [typedMode, setTypedMode]     = useState(false);
  const typedModeRef = React.useRef(false);
  useEffect(() => { typedModeRef.current = typedMode; }, [typedMode]);

  const onTranscriptUpdate = useCallback(
    (text: string) => {
      if (typedModeRef.current) return;
      setAnswerDraft(text);
      updateTranscript(text);
    },
    [updateTranscript]
  );

  const { isListening, isSupported, startListening, stopListening } =
    useSpeechRecognition(onTranscriptUpdate, speechLang);

  useEffect(() => {
    setAnswerDraft('');
    setTypedMode(false);
  }, [game?.current_question_index]);

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
    updateTranscript(text);
  }, [typedMode, isListening, stopListening, updateTranscript]);

  const handleFinishAnswer = useCallback(() => {
    if (isListening) stopListening();
    finishAnswer(answerDraft);
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
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin mx-auto mb-4" />
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
          <p className="text-[var(--text-secondary)] text-sm">{t('game.notFoundHint')}</p>
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
  // Not seated yet → join screen
  // ----------------------------------------------------------
  if (!me) {
    return <JoinScreen asHost={asHost} full={joinFull} onJoin={handleJoin} />;
  }

  const shareLink =
    typeof window !== 'undefined' ? `${window.location.origin}/game/${gameId}` : '';

  // ----------------------------------------------------------
  // Lobby (match not started yet)
  // ----------------------------------------------------------
  if (game.status === 'waiting') {
    return <Lobby players={players} me={me} shareLink={shareLink} onStart={startGame} />;
  }

  // ----------------------------------------------------------
  // Playing / ended → camera mesh + question panel
  // ----------------------------------------------------------
  const speaking   = game.phase === 'answering';
  const showResult = game.phase === 'result';

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-screen overflow-hidden">
      {/* ---- Camera mesh (all players) ---- */}
      <div className="h-[26vh] shrink-0 lg:h-full lg:flex-[2] min-w-0 min-h-0 p-1.5">
        <CameraGrid
          players={players}
          me={me}
          localStream={localStream}
          remoteStreams={remoteStreams}
          cameraError={cameraError}
          speaking={speaking}
          showResult={showResult}
          phase={game.phase}
          mcMode={game.mc_mode}
          className="h-full"
        />
      </div>

      {/* ---- Question panel ---- */}
      <div className="flex-1 lg:flex-[3] min-w-0 min-h-0">
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
        />
      </div>

      {/* ---- Winner overlay ---- */}
      {game.phase === 'ended' && (
        <WinnerScreen
          players={players}
          meId={me.id}
          clips={clips}
          onVoteRematch={() => voteRematch()}
          myVote={me.rematch}
          rematchLoading={rematchLoading}
          onExit={() => (window.location.href = '/')}
        />
      )}
    </div>
  );
}
