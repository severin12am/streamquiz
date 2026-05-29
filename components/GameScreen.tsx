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

import React, { useEffect, useCallback } from 'react';
import CameraPanel    from './CameraPanel';
import QuestionPanel  from './QuestionPanel';
import WinnerScreen   from './WinnerScreen';

import { useGameState } from '@/hooks/useGameState';
import { useWebRTC }    from '@/hooks/useWebRTC';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useMediaRecorder }     from '@/hooks/useMediaRecorder';
import { updateGame }   from '@/lib/supabase';
import type { PlayerRole } from '@/lib/types';

interface GameScreenProps {
  gameId: string;
  role:   PlayerRole;
}

export default function GameScreen({ gameId, role }: GameScreenProps) {

  // ----------------------------------------------------------
  // 1. Game state (synced via Supabase Realtime)
  // ----------------------------------------------------------
  const {
    game, loading, error,
    timeLeft, buzzCountdown,
    buzz, judgeAnswer, submitMCAnswer,
    startGame, updateTranscript,
  } = useGameState(gameId, role);

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
  // 3. Speech recognition (for open-ended answering)
  // ----------------------------------------------------------
  const onTranscriptUpdate = useCallback(
    (text: string) => { updateTranscript(text); },
    [updateTranscript]
  );

  const { transcript, isListening, startListening, stopListening } =
    useSpeechRecognition(onTranscriptUpdate);

  // Start/stop listening based on phase + who buzzed
  useEffect(() => {
    if (!game) return;
    const iAmAnswering =
      game.phase === 'answering' && game.buzz_player === role;

    if (iAmAnswering && !isListening) {
      startListening();
    } else if (!iAmAnswering && isListening) {
      stopListening();
      // When answering stops, transition to judging (host only)
      if (role === 'host' && game.phase === 'answering') {
        updateGame(gameId, { phase: 'judging' }).catch(console.error);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase, game?.buzz_player]);

  // ----------------------------------------------------------
  // 4. Media recorder (for clip downloads at the end)
  // ----------------------------------------------------------
  const { clips, startRecording, stopRecording } = useMediaRecorder();

  // Record each answer automatically
  useEffect(() => {
    if (!game || !localStream) return;
    const iAmAnswering =
      game.phase === 'answering' && game.buzz_player === role;

    if (iAmAnswering) {
      startRecording(localStream, game.current_question_index, role);
    } else {
      stopRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase, game?.buzz_player]);

  // ----------------------------------------------------------
  // Loading / error states
  // ----------------------------------------------------------
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-[var(--accent)] border-[var(--border)] animate-spin mx-auto mb-4"
          />
          <p className="text-[var(--text-secondary)]">Joining game…</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md px-6">
          <p className="text-5xl mb-4">😕</p>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            {error ?? 'Game not found'}
          </h2>
          <p className="text-[var(--text-secondary)] text-sm">
            Check the link and try again. If you're the host, create a new game.
          </p>
          <a
            href="/"
            className="inline-block mt-6 px-6 py-2 rounded-xl font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            ← Back to Home
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
  const hostSpeaking   = game.phase === 'answering' && game.buzz_player === 'host';
  const playerSpeaking = game.phase === 'answering' && game.buzz_player === 'player';

  return (
    /*
      RESPONSIVE LAYOUT
      ─────────────────
      Desktop (lg ≥ 1024px): 3 columns side-by-side (flex-row).
        [ Host cam 30% | Question 40% | Streamer cam 30% ]
      Phone / portrait (< 1024px): 3 rows stacked (flex-col).
        [ Host cam ]
        [ Question ]
        [ Streamer cam ]
      The flex-[3]/[4]/[3] ratios apply to WIDTH on desktop and
      to HEIGHT on phones automatically.
      TO CHANGE THE BREAKPOINT: swap "lg:" for "md:" or "xl:".
    */
    <div className="relative flex flex-col lg:flex-row h-screen w-screen overflow-hidden">

      {/* =====================================================
          HOST camera — 30% (left on desktop, top on phone)
          TO CHANGE: edit flex-[3] (ratio relative to 4 and 3)
      ===================================================== */}
      <div className="flex-[3] min-w-0 min-h-0">
        <CameraPanel
          stream={hostCamera}
          label="HOST"
          isSpeaking={hostSpeaking}
          mirrored={role === 'host'}
          error={role === 'host' ? cameraError : null}
          className="h-full w-full"
        />
      </div>

      {/* =====================================================
          QUESTION panel — 40% (middle on desktop, center on phone)
          TO CHANGE: edit flex-[4]
      ===================================================== */}
      <div className="flex-[4] min-w-0 min-h-0">
        <QuestionPanel
          game={game}
          role={role}
          timeLeft={timeLeft}
          buzzCountdown={buzzCountdown}
          onBuzz={() => buzz(role)}
          onJudge={judgeAnswer}
          onMCSelect={(i) => submitMCAnswer(role, i)}
        />
      </div>

      {/* =====================================================
          STREAMER camera — 30% (right on desktop, bottom on phone)
          TO CHANGE: edit flex-[3]
      ===================================================== */}
      <div className="flex-[3] min-w-0 min-h-0">
        <CameraPanel
          stream={playerCamera}
          label="STREAMER"
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
        <div
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
        >
          <button
            onClick={startGame}
            className="pointer-events-auto px-12 py-5 rounded-2xl font-black text-2xl text-white transition-all hover:brightness-110 active:scale-95"
            style={{
              background: 'var(--accent)',
              boxShadow: '0 0 40px var(--accent-glow), 0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            ▶ START QUIZ
          </button>
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
            <div className="w-10 h-10 rounded-full border-4 border-t-[var(--accent)] border-[var(--border)] animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">
              {role === 'host'
                ? 'Waiting for your opponent to join…'
                : 'Connecting to game…'}
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
          onPlayAgain={() => window.location.href = '/'}
        />
      )}
    </div>
  );
}
