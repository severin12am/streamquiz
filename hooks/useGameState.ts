'use client';
// ============================================================
// useGameState — Master hook for all game state logic
//
// Responsibilities:
//   - Fetches the initial game row from Supabase
//   - Subscribes to real-time updates so both players stay in sync
//   - Exposes action functions (buzz, judge, startGame, etc.)
//   - Handles the question timer countdown
//
// All game mutations go through updateGame() → Supabase → real-time
// push to both players. This is the single source of truth.
// ============================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase, subscribeToGame, updateGame, fetchGame } from '@/lib/supabase';
import type { Game, PlayerRole, GamePhase } from '@/lib/types';

// -------------------------------------------------------
// TIMING SETTINGS — change these to adjust game pacing
// -------------------------------------------------------
const QUESTION_TIME_SECONDS = 15;   // seconds to answer before auto-move
const BUZZ_WINDOW_SECONDS   = 2;    // seconds given to start speaking after buzz
const RESULT_DISPLAY_MS     = 2500; // ms to show correct/wrong before next question

// -------------------------------------------------------
// NETWORK RESILIENCE SETTINGS
// -------------------------------------------------------
const POLL_INTERVAL_MS   = 2500; // how often to poll the game row as a fallback
const MAX_INIT_ATTEMPTS  = 5;    // retries for the very first load
const INIT_RETRY_DELAY_MS = 1200; // wait between initial-load retries

// -------------------------------------------------------
// Hook return type
// -------------------------------------------------------
export interface UseGameStateReturn {
  game: Game | null;
  loading: boolean;
  error: string | null;
  timeLeft: number;             // countdown timer value (0–15)
  buzzCountdown: number;        // 2-second buzz window countdown

  // Actions (only take effect if it's this player's turn / role)
  buzz: (role: PlayerRole) => Promise<void>;
  judgeAnswer: (correct: boolean) => Promise<void>;
  submitMCAnswer: (role: PlayerRole, optionIndex: number) => Promise<void>;
  startGame: () => Promise<void>;
  updateTranscript: (text: string) => Promise<void>;
  nextQuestion: () => Promise<void>;
}

export function useGameState(gameId: string, role: PlayerRole): UseGameStateReturn {
  const [game, setGame]             = useState<Game | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [timeLeft, setTimeLeft]     = useState(QUESTION_TIME_SECONDS);
  const [buzzCountdown, setBuzzCountdown] = useState(BUZZ_WINDOW_SECONDS);

  // Refs so interval callbacks always see latest values without re-subscribing
  const gameRef            = useRef<Game | null>(null);
  const questionTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const buzzTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep ref in sync with state
  useEffect(() => { gameRef.current = game; }, [game]);

  // -------------------------------------------------------
  // Initial fetch + real-time subscription + polling fallback
  //
  // RESILIENCE: On unstable networks (or where the realtime
  // WebSocket is throttled/blocked, e.g. some ISPs/VPNs), the
  // live push can fail. So we ALSO poll the game row over plain
  // HTTPS every POLL_INTERVAL_MS as a safety net. When realtime
  // works you get instant updates; when it doesn't, the game
  // still stays in sync within a couple seconds.
  //
  // The initial load retries a few times before giving up, so a
  // brief network blip doesn't show a false "game not found".
  // -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    // Retry the first load up to MAX_INIT_ATTEMPTS times
    async function tryInitialLoad(attempt = 0) {
      const data = await fetchGame(gameId);
      if (cancelled) return;

      if (data) {
        setGame(data);
        setError(null);
        setLoading(false);
      } else if (attempt < MAX_INIT_ATTEMPTS) {
        // Network blip or row not visible yet — wait and retry
        setTimeout(() => tryInitialLoad(attempt + 1), INIT_RETRY_DELAY_MS);
      } else {
        setError(
          "Couldn't load the game. Check the link is correct. " +
          'If your region blocks Supabase, connect to a VPN and reload.'
        );
        setLoading(false);
      }
    }
    tryInitialLoad();

    // Live updates (instant when the WebSocket is available)
    const channel = subscribeToGame(gameId, (updated) => {
      if (!cancelled) setGame(updated);
    });

    // Polling fallback (works even when the WebSocket is blocked)
    const pollTimer = setInterval(async () => {
      const data = await fetchGame(gameId);
      if (!cancelled && data) {
        setGame(data);
        setError(null);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // -------------------------------------------------------
  // Question countdown timer
  // Starts when phase = 'question', clears otherwise.
  // Only the HOST drives the countdown so there's no race.
  // -------------------------------------------------------
  useEffect(() => {
    // Clear any running timer first
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }

    if (!game || game.phase !== 'question') {
      setTimeLeft(QUESTION_TIME_SECONDS);
      return;
    }

    setTimeLeft(QUESTION_TIME_SECONDS);

    // Only the host manages the server-side phase transitions.
    // Both players show the same countdown locally (cosmetic only).
    questionTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          // Time ran out — if host, auto-advance to next question
          if (role === 'host' && gameRef.current?.phase === 'question') {
            clearInterval(questionTimerRef.current!);
            nextQuestion();
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase, game?.current_question_index]);

  // -------------------------------------------------------
  // Buzz window countdown (2-second speaking window)
  // Starts when phase = 'buzzing'.
  // -------------------------------------------------------
  useEffect(() => {
    if (buzzTimerRef.current) {
      clearInterval(buzzTimerRef.current);
      buzzTimerRef.current = null;
    }

    if (!game || game.phase !== 'buzzing') {
      setBuzzCountdown(BUZZ_WINDOW_SECONDS);
      return;
    }

    setBuzzCountdown(BUZZ_WINDOW_SECONDS);

    buzzTimerRef.current = setInterval(() => {
      setBuzzCountdown((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(buzzTimerRef.current!);
          // After buzz window — only host transitions to 'answering'
          if (role === 'host' && gameRef.current?.phase === 'buzzing') {
            updateGame(gameId, { phase: 'answering' }).catch(console.error);
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (buzzTimerRef.current) clearInterval(buzzTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase, game?.buzz_player]);

  // -------------------------------------------------------
  // ACTION: Start the game (host only)
  // Marks the game as playing and shows the first question.
  // -------------------------------------------------------
  const startGame = useCallback(async () => {
    if (role !== 'host') return;
    await updateGame(gameId, {
      status: 'playing',
      phase: 'question',
      current_question_index: 0,
      host_score: 0,
      player_score: 0,
    });
  }, [gameId, role]);

  // -------------------------------------------------------
  // ACTION: Buzz (either player)
  // Uses server timestamp to resolve simultaneous buzzes.
  // The first UPDATE with a non-null buzz_player wins.
  // -------------------------------------------------------
  const buzz = useCallback(async (buzzingRole: PlayerRole) => {
    if (!game) return;
    if (game.phase !== 'question') return; // too late or already buzzed

    // Optimistically prevent double-clicks by checking local state
    if (game.buzz_player !== null) return;

    await updateGame(gameId, {
      phase: 'buzzing',
      buzz_player: buzzingRole,
      buzz_time: new Date().toISOString(),
      current_transcript: '',
    });
  }, [game, gameId]);

  // -------------------------------------------------------
  // ACTION: Host judges the spoken answer
  // -------------------------------------------------------
  const judgeAnswer = useCallback(async (correct: boolean) => {
    if (!game || role !== 'host') return;

    const scorePatch: Partial<Game> = {
      phase: 'result',
      // Add 1 point to the winner's score
      host_score:   game.host_score   + (correct && game.buzz_player === 'host'   ? 1 : 0),
      player_score: game.player_score + (correct && game.buzz_player === 'player' ? 1 : 0),
    };

    await updateGame(gameId, scorePatch);

    // Auto-advance to next question after showing the result
    setTimeout(async () => {
      await nextQuestion();
    }, RESULT_DISPLAY_MS);
  }, [game, gameId, role]);

  // -------------------------------------------------------
  // ACTION: MC answer picked (auto-scored)
  // -------------------------------------------------------
  const submitMCAnswer = useCallback(async (
    answeringRole: PlayerRole,
    optionIndex: number
  ) => {
    if (!game) return;
    if (game.phase !== 'question') return; // prevent double-submit
    if (!game.mc_mode) return;

    const question = game.questions[game.current_question_index];
    const chosenOption = question.options?.[optionIndex] ?? '';
    const isCorrect    = chosenOption === question.correct_answer;

    const scorePatch: Partial<Game> = {
      phase: 'result',
      buzz_player: answeringRole,
      mc_answer_index: optionIndex,
      host_score:   game.host_score   + (isCorrect && answeringRole === 'host'   ? 1 : 0),
      player_score: game.player_score + (isCorrect && answeringRole === 'player' ? 1 : 0),
    };

    await updateGame(gameId, scorePatch);

    setTimeout(async () => {
      await nextQuestion();
    }, RESULT_DISPLAY_MS);
  }, [game, gameId]);

  // -------------------------------------------------------
  // ACTION: Live transcript update (called by useSpeechRecognition)
  // -------------------------------------------------------
  const updateTranscript = useCallback(async (text: string) => {
    await updateGame(gameId, { current_transcript: text });
  }, [gameId]);

  // -------------------------------------------------------
  // ACTION: Advance to next question (or end game)
  // -------------------------------------------------------
  const nextQuestion = useCallback(async () => {
    const g = gameRef.current;
    if (!g) return;

    const nextIndex = g.current_question_index + 1;

    if (nextIndex >= g.questions.length) {
      // All questions answered — game over
      await updateGame(gameId, {
        phase: 'ended',
        status: 'ended',
      });
    } else {
      await updateGame(gameId, {
        phase: 'question',
        current_question_index: nextIndex,
        buzz_player: null,
        buzz_time: null,
        current_transcript: '',
        mc_answer_index: null,
      });
    }
  }, [gameId]);

  return {
    game,
    loading,
    error,
    timeLeft,
    buzzCountdown,
    buzz,
    judgeAnswer,
    submitMCAnswer,
    startGame,
    updateTranscript,
    nextQuestion,
  };
}

// Export timing constants so components can use them for visual calculations
export { QUESTION_TIME_SECONDS, BUZZ_WINDOW_SECONDS };
