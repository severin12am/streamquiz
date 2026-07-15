'use client';
// ============================================================
// GameScreen — the main game view (multiplayer, up to 6 players)
//
// FLOW:
//   1. Pick a stable client id (localStorage) + read the host intent.
//   2. Lobby auto-claims a seat (host → slot 0, guest → next free slot).
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
import SoundToggle from './SoundToggle';
import { getClientId, resolveDefaultPlayerName, saveName } from '@/lib/client-id';
import { useAuth } from '@/context/AuthProvider';
import { useLocale }    from '@/context/LocaleProvider';
import { detectSpeechLang } from '@/lib/i18n';
import type { PlayerRole, CreateGamePayload, Question } from '@/lib/types';
import { mergePreviousQuestions, rememberQuestions, filterUnseenQuestions } from '@/lib/question-history';
import { sendTelemetry } from '@/lib/telemetry';
import { roundTelemetryBytes } from '@/lib/telemetry-shared';
import { parseGeographyTopic } from '@/lib/geography/types';

interface GameScreenProps {
  gameId: string;
  role:   PlayerRole;
}

export default function GameScreen({ gameId, role }: GameScreenProps) {
  const { t, locale, speechLang } = useLocale();
  const { user, session } = useAuth();

  // Stable per-browser id (set after mount to avoid an SSR mismatch).
  const [clientId, setClientId] = useState('');
  useEffect(() => { setClientId(getClientId()); }, []);

  const asHost = role === 'host';

  const [rematchLoading, setRematchLoading] = useState(false);
  const [joinFull, setJoinFull] = useState(false);
  const rematchTriggeredRef = React.useRef(false);
  const autoJoinAttemptedRef = React.useRef(false);

  // Tap-any-feed camera layout scheme (cycles through CameraGrid layouts).
  const [layoutMode, setLayoutMode] = useState(0);
  const cycleLayout = useCallback(() => setLayoutMode((m) => m + 1), []);

  // ----------------------------------------------------------
  // 1. Game state (synced via Supabase Realtime)
  // ----------------------------------------------------------
  const {
    game, players, me, loading, error, removed,
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
    setMicEnabled, collectMeshTelemetry,
  } = useMeshWebRTC(gameId, me?.id ?? '', camerasEnabled);

  // Host-only product telemetry once the match ends (before discussion cut).
  // No names, IPs, topics, or account ids — see docs/ANALYTICS.md.
  const endTelemetrySentRef = React.useRef(false);
  useEffect(() => {
    if (!game || game.phase !== 'ended' || game.status !== 'ended') {
      if (game && game.phase !== 'ended') endTelemetrySentRef.current = false;
      return;
    }
    if (!me || me.role !== 'host') return;
    if (endTelemetrySentRef.current) return;
    endTelemetrySentRef.current = true;

    const playerCount = Math.min(6, Math.max(1, players.length));
    sendTelemetry({
      event: 'game_finished',
      game_ref: gameId,
      platform: 'web',
      difficulty: game.difficulty,
      game_mode: game.game_mode,
      mc_mode: game.mc_mode,
      cameras_on: game.cameras_enabled,
      num_questions: game.num_questions,
      player_count: playerCount,
      status: 'ended',
    });

    void collectMeshTelemetry().then((mesh) => {
      sendTelemetry({
        event: 'webrtc_summary',
        game_ref: gameId,
        platform: 'web',
        cameras_on: game.cameras_enabled,
        cameras_enabled_mesh: mesh.cameras_enabled_mesh,
        webrtc_pairs_total: mesh.webrtc_pairs_total,
        webrtc_pairs_p2p: mesh.webrtc_pairs_p2p,
        webrtc_pairs_relay: mesh.webrtc_pairs_relay,
        webrtc_pairs_failed: mesh.webrtc_pairs_failed,
        bytes_sent_total: roundTelemetryBytes(mesh.bytes_sent_total),
        bytes_recv_total: roundTelemetryBytes(mesh.bytes_recv_total),
        player_count: playerCount,
      });
    });
  }, [
    game,
    game?.phase,
    game?.status,
    me,
    me?.role,
    players.length,
    gameId,
    collectMeshTelemetry,
  ]);

  // Start the camera as soon as we've taken a seat (so the mesh can form
  // while we're still in the lobby). Keyed on `me?.id` (a stable primitive),
  // NOT the `me` object — otherwise every realtime/poll refresh of `players`
  // hands back a new object reference and re-fires this effect, hammering
  // startCamera (and flooding the console when the device is busy).
  const seated = !!me;
  useEffect(() => {
    if (seated) startCamera();
  }, [seated, startCamera]);

  // ----------------------------------------------------------
  // Mic policy + answering model:
  //   • Multiple-choice mode → mic is ALWAYS ON. There's no spoken answer,
  //     so everyone can just chat freely the whole time.
  //   • Voice mode → mic is OPEN by default so players hear each other like a
  //     normal call. To ANSWER you HOLD a button: while held your mic is
  //     MUTED to the others (so they can't hear your answer) and speech
  //     recognition records what you say. Releasing locks the answer in.
  //     Starting recognition on the hold (a user gesture) is also what makes
  //     it work reliably on mobile — the old auto-start never fired there.
  // ----------------------------------------------------------
  const voiceMode  = !!game && !(
    game.mc_mode ||
    Boolean(game.questions?.[game.current_question_index]?.force_mc)
  );
  const isAnswering = game?.phase === 'answering';
  const [answerHeld, setAnswerHeld] = useState(false);
  useEffect(() => {
    // `localStream` in deps so the desired mic state is re-applied once the
    // mic track actually exists (it's captured a moment after we seat).
    if (!game) return;
    if (!voiceMode) {
      setMicEnabled(true);              // MC mode: open mic for everyone
    } else {
      setMicEnabled(!answerHeld);       // voice: open unless answering aloud
    }
  }, [game, voiceMode, answerHeld, setMicEnabled, localStream]);

  // ----------------------------------------------------------
  // End-of-game DISCUSSION window. When the match ends we keep the cameras
  // live for DISCUSSION_SECONDS so players can react, then cut every feed
  // (mic + video) automatically. A rematch re-acquires the camera via the
  // startCamera effect below. The countdown is shown in the winner sheet.
  // ----------------------------------------------------------
  const DISCUSSION_SECONDS = 60;
  const [discussLeft, setDiscussLeft] = useState(DISCUSSION_SECONDS);
  const [feedsCut, setFeedsCut] = useState(false);

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
      startCamera({ force: true }); // deliberate rematch re-acquire — retry now
    }
  }, [game?.phase, feedsCut, startCamera]);

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
    if (prev === 'answering' && cur && cur !== 'answering' && voiceMode) {
      const s = writeState.current;
      if (s.timer) { clearTimeout(s.timer); s.timer = null; }
      if (!iAmDone && answerDraftRef.current.trim()) {
        finishAnswer(answerDraftRef.current);
      }
    }
  }, [game?.phase, voiceMode, iAmDone, finishAnswer]);

  // Listen ONLY while the answer button is held (voice mode, answering phase,
  // not typing). Starting on the hold is a user gesture, which is required for
  // SpeechRecognition to start on mobile.
  useEffect(() => {
    if (!game) return;
    const shouldListen = voiceMode && isAnswering && answerHeld && !iAmDone && !typedMode;
    if (shouldListen && !isListening) {
      startListening();
    } else if (!shouldListen && isListening) {
      stopListening();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode, isAnswering, answerHeld, iAmDone, typedMode]);

  const handleTypeAnswer = useCallback((text: string) => {
    if (!typedMode) setTypedMode(true);
    if (isListening) stopListening();
    setAnswerDraft(text);
    pushTranscript(text);
  }, [typedMode, isListening, stopListening, pushTranscript]);

  // Typed answers submit on Enter (voice answers lock in on button release).
  const handleFinishAnswer = useCallback(() => {
    if (isListening) stopListening();
    const s = writeState.current;
    if (s.timer) { clearTimeout(s.timer); s.timer = null; }
    finishAnswer(answerDraftRef.current || answerDraft);
  }, [isListening, stopListening, finishAnswer, answerDraft]);

  // Hold-to-answer: press starts recording (mic muted to peers); releasing
  // stops recording and locks the spoken answer in. Empty release = no-op so
  // a mis-tap doesn't burn your answer.
  const startAnswerHold = useCallback(() => {
    if (!voiceMode || !isAnswering || iAmDone) return;
    setTypedMode(false);
    setAnswerDraft('');
    answerDraftRef.current = '';
    setAnswerHeld(true);
  }, [voiceMode, isAnswering, iAmDone]);

  const endAnswerHold = useCallback(() => {
    if (!answerHeld) return;
    setAnswerHeld(false);
    if (isListening) stopListening();
    const s = writeState.current;
    if (s.timer) { clearTimeout(s.timer); s.timer = null; }
    // Give the final speech result a tick to flush, then lock in if non-empty.
    setTimeout(() => {
      const said = answerDraftRef.current.trim();
      if (said) finishAnswer(answerDraftRef.current);
    }, 150);
  }, [answerHeld, isListening, stopListening, finishAnswer]);

  // Safety: if the round ends while the button is still held, release it so
  // the mic re-opens for the next phase (and recognition stops via its effect).
  useEffect(() => {
    if (!isAnswering && answerHeld) setAnswerHeld(false);
  }, [isAnswering, answerHeld]);

  // Hold SPACE as a desktop shortcut for the answer button.
  useEffect(() => {
    if (!voiceMode) return;
    const isTyping = () => {
      const el = document.activeElement;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isTyping()) { e.preventDefault(); startAnswerHold(); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping()) { e.preventDefault(); endAnswerHold(); }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [voiceMode, startAnswerHold, endAnswerHold]);

  // ----------------------------------------------------------
  // Rematch — regenerate fresh questions (same settings), reset to lobby.
  // ----------------------------------------------------------
  const handleRematch = useCallback(async () => {
    if (!game || rematchLoading) return;
    setRematchLoading(true);
    try {
      const currentTexts = (game.questions ?? []).map((q) => q.question);
      const geography = parseGeographyTopic(game.topic);
      const payload: CreateGamePayload = {
        topic: game.topic,
        difficulty: game.difficulty,
        num_questions: game.num_questions,
        mc_mode: game.mc_mode,
        game_mode: game.game_mode,
        locale,
        previous_questions: mergePreviousQuestions(game.topic, currentTexts),
        ...(geography
          ? { geography: { types: geography.types, regions: geography.regions } }
          : {}),
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
          // Geography rematch reshuffles the bank; skip session dedupe so
          // eliminate / region packs stay complete.
          const unseen = geography
            ? questions
            : filterUnseenQuestions(game.topic, questions);
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

  const handleKick = useCallback(async (player: { id: string; name: string; role: string }) => {
    if (!clientId || player.role === 'host') return;
    if (typeof window !== 'undefined' && game?.status !== 'waiting') {
      const ok = window.confirm(t('lobby.removeConfirm', { name: player.name }));
      if (!ok) return;
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    const res = await fetch('/api/kick-player', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        gameId,
        targetPlayerId: player.id,
        hostClientId: clientId,
      }),
    });
    if (!res.ok) throw new Error('kick failed');
  }, [clientId, gameId, session?.access_token, t, game?.status]);

  // Claim a lobby seat on arrival so nobody has to tap Join first.
  useEffect(() => {
    if (!clientId || loading || !game || game.status !== 'waiting' || me || removed) return;
    if (autoJoinAttemptedRef.current) return;

    autoJoinAttemptedRef.current = true;
    const name = resolveDefaultPlayerName(user, asHost ? 'Host' : 'Player');
    saveName(name);
    void (async () => {
      const p = await join(name, asHost);
      if (!p) setJoinFull(true);
    })();
  }, [clientId, loading, game, me, asHost, user, join, removed]);

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

  if (removed) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="card elevated text-center max-w-md px-8 py-10 mx-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            {t('game.removedTitle')}
          </h2>
          <p className="text-[var(--text-secondary)] text-sm">{t('game.removedBody')}</p>
          <a
            href="/"
            className="keycap keycap-primary inline-flex mt-6 px-6 py-2.5 rounded-xl font-semibold text-white"
          >
            {t('game.removedHome')}
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
          isPublic={!!game.is_public}
          onStart={startGame}
          onJoin={handleJoin}
          onKick={handleKick}
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
          layoutMode={layoutMode}
          onCycleLayout={cycleLayout}
          className="h-full"
        />
      </div>

      {/* ---- OVERLAY: quiz layer — full-screen, centered, WhatsApp-style ----
           Panels float over the video: topic/scores/timer/question up top,
           answers pinned to the bottom, the middle left open so the call is
           always visible. QuestionPanel manages its own pointer-events so the
           transparent gaps don't swallow clicks. Hidden once the match ends. */}
      {!ended && (
        <div
          className="absolute inset-0 z-20 flex justify-center
                     px-2 sm:px-3 lg:px-6
                     pt-[max(0.5rem,env(safe-area-inset-top))]
                     pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          style={{ pointerEvents: 'none' }}
        >
          <div className="w-full max-w-2xl flex">
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
              answerHeld={answerHeld}
              onMCSelect={(i) => submitMCAnswer(i)}
              onTypeAnswer={handleTypeAnswer}
              onFinish={handleFinishAnswer}
              onAnswerHoldStart={startAnswerHold}
              onAnswerHoldEnd={endAnswerHold}
              canKick={me.role === 'host'}
              onKick={(p) => { void handleKick(p); }}
            />
          </div>
        </div>
      )}

      {/* ---- Winner / discussion sheet (cameras stay live behind it) ---- */}
      {ended && (
        <WinnerScreen
          players={players}
          meId={me.id}
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
