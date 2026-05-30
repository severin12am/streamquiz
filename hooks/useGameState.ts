'use client';
// ============================================================
// useGameState — Master hook for all game state logic
//
// ARCHITECTURE (v2 — robust, host-disconnect tolerant):
//   • All game state lives in ONE Supabase row (the source of truth).
//   • Every TIMED phase stores a `phase_deadline` timestamp.
//   • BOTH clients run a local ticker. When a deadline passes, EITHER
//     client tries to advance the phase using a GUARDED update
//     (updateGameIfPhase) — Postgres guarantees only the first one
//     wins, so there are no races and no double-scoring.
//   • Because either client can drive transitions, the game keeps
//     going even if the host's connection drops.
//
// GAME MODES (set at creation):
//   • 'think' (default, fair): each round starts in a LOCKED `thinking`
//     phase for THINK_TIME_SECONDS — nobody can buzz/speak/click. When
//     the server deadline passes, BOTH players unlock at the same instant
//     (the "GO"), so a faster connection can't win by acting early.
//   • 'classic': round opens directly in `question` (buzz immediately).
//
// ROUND FLOW (open-ended):
//   [thinking →] question → (buzz) → buzzing → answering → checking → result → next
//   On a WRONG answer the OTHER player gets a STEAL chance:
//   result is skipped and we re-enter `question` with is_steal=true.
//
// ROUND FLOW (multiple choice):
//   [thinking →] question → (first pick opens a grace window) → result → next
//   BOTH players answer independently (host_mc_index / player_mc_index).
//   Any correct pick within MC_GRACE_SECONDS of the first one scores,
//   so near-simultaneous correct answers BOTH get the point (fair on
//   any connection). No buzz/steal in MC mode.
//
// SCORING: each correct answer = 1 point. (No streaks/multipliers.)
// ============================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  supabase, subscribeToGame, updateGame, updateGameIfPhase,
  updateGameGuarded, fetchGame, serverNow, syncServerClock,
} from '@/lib/supabase';
import { isMcAnswerCorrect } from '@/lib/mc-utils';
import type { Game, PlayerRole, Question } from '@/lib/types';

// -------------------------------------------------------
// TIMING SETTINGS — change these to adjust game pacing (seconds)
// -------------------------------------------------------
const THINK_TIME_SECONDS    = 4;    // (think mode) locked countdown before answering
const QUESTION_TIME_SECONDS = 15;   // time to buzz / pick before auto-skip
const BUZZ_WINDOW_SECONDS   = 2;    // "get ready" window after buzzing
const ANSWER_TIME_SECONDS   = 7;    // time the buzzer has to speak
const STEAL_TIME_SECONDS    = 5;    // time the OTHER player has to steal (open-ended)
const RESULT_TIME_SECONDS   = 4;    // how long the result screen shows
const CHECK_TIMEOUT_SECONDS = 15;   // safety: max time to wait for AI judging

// -------------------------------------------------------
// FAIRNESS — multiple-choice "grace window"
// After the FIRST player picks, the other player still has this long
// to also answer. Any correct pick inside the window scores, so two
// players who answer at nearly the same time BOTH get the point.
// INCREASE this if players on slow connections still lose unfairly
// (costs a little pace); DECREASE for a snappier feel.
// -------------------------------------------------------
const MC_GRACE_SECONDS = 3;

// -------------------------------------------------------
// NETWORK RESILIENCE SETTINGS
// -------------------------------------------------------
const POLL_INTERVAL_MS    = 2500;   // fallback poll when realtime is blocked
const TICK_INTERVAL_MS     = 300;   // how often we check deadlines locally
const MAX_INIT_ATTEMPTS   = 5;      // retries for the very first load
const INIT_RETRY_DELAY_MS = 1200;   // wait between initial-load retries

// Helper: an ISO timestamp `seconds` from now (for phase_deadline).
// Uses SERVER time so every client agrees on the deadline.
function deadlineIn(seconds: number): string {
  return new Date(serverNow() + seconds * 1000).toISOString();
}

// Helper: whole seconds left until an ISO deadline (never negative).
// Compared against SERVER time to stay consistent across devices.
function secondsUntil(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - serverNow()) / 1000));
}

// The total duration (for the timer ring) of the current timed phase
function phaseTotalSeconds(game: Game | null): number {
  if (!game) return QUESTION_TIME_SECONDS;
  switch (game.phase) {
    case 'thinking':  return THINK_TIME_SECONDS;
    case 'question':
      // Once someone has picked in MC mode, the timer shows the short
      // grace window (so the ring drains correctly, not from 15s).
      if (game.mc_mode && (game.host_mc_index !== null || game.player_mc_index !== null)) {
        return MC_GRACE_SECONDS;
      }
      return game.is_steal ? STEAL_TIME_SECONDS : QUESTION_TIME_SECONDS;
    case 'buzzing':   return BUZZ_WINDOW_SECONDS;
    case 'answering': return ANSWER_TIME_SECONDS;
    case 'result':    return RESULT_TIME_SECONDS;
    default:          return QUESTION_TIME_SECONDS;
  }
}

// Where a fresh round begins. In THINK mode it starts LOCKED (no buzz)
// for THINK_TIME_SECONDS, then the ticker unlocks it into 'question'.
// In CLASSIC mode it jumps straight to the open 'question' phase.
function roundStartPatch(game: Game | null): Partial<Game> {
  const mode = game?.game_mode ?? 'think';
  if (mode === 'think') {
    return { phase: 'thinking', phase_deadline: deadlineIn(THINK_TIME_SECONDS) };
  }
  return { phase: 'question', phase_deadline: deadlineIn(QUESTION_TIME_SECONDS) };
}

// -------------------------------------------------------
// Hook return type
// -------------------------------------------------------
export interface UseGameStateReturn {
  game: Game | null;
  loading: boolean;
  error: string | null;
  timeLeft: number;       // seconds left in the current timed phase
  timerTotal: number;     // total seconds of the current phase (for the ring)
  buzzCountdown: number;  // alias of timeLeft during the buzzing phase

  // Actions
  buzz: (role: PlayerRole) => Promise<void>;
  submitMCAnswer: (role: PlayerRole, optionIndex: number) => Promise<void>;
  startGame: () => Promise<void>;
  updateTranscript: (text: string) => Promise<void>;
  rematch: (newQuestions?: Question[]) => Promise<void>;
  voteRematch: (role: PlayerRole) => Promise<void>;
}

export function useGameState(gameId: string, role: PlayerRole): UseGameStateReturn {
  const [game, setGame]       = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);

  const gameRef        = useRef<Game | null>(null);
  const judgingRef     = useRef(false); // this client is running the AI check
  const actedDeadline  = useRef<string | null>(null); // last deadline we acted on

  useEffect(() => { gameRef.current = game; }, [game]);

  // =======================================================
  // 1. Initial load + realtime subscription + polling fallback
  // =======================================================
  useEffect(() => {
    let cancelled = false;

    // Sync to the server clock ASAP (and refresh periodically) so both
    // devices agree on when each phase deadline passes.
    syncServerClock();
    const clockTimer = setInterval(() => { syncServerClock(); }, 30000);

    async function tryInitialLoad(attempt = 0) {
      const data = await fetchGame(gameId);
      if (cancelled) return;
      if (data) {
        setGame(data);
        setError(null);
        setLoading(false);
      } else if (attempt < MAX_INIT_ATTEMPTS) {
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

    const channel = subscribeToGame(gameId, (updated) => {
      if (!cancelled) setGame(updated);
    });

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
      clearInterval(clockTimer);
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // =======================================================
  // 2. SCORING HELPER — award 1 point for a correct answer.
  // =======================================================
  const buildCorrectPatch = useCallback((g: Game, who: 'host' | 'player'): Partial<Game> => {
    return {
      host_score:   g.host_score   + (who === 'host'   ? 1 : 0),
      player_score: g.player_score + (who === 'player' ? 1 : 0),
      last_points:  1,
      last_scorer:  who,
    };
  }, []);

  // =======================================================
  // 3. RESOLVE AN OPEN-ENDED ANSWER (voice/buzz mode)
  //    correct?  → award a point, go to result
  //    wrong?    → give the OTHER player a STEAL chance,
  //                or end the round if the steal already happened.
  //    `fromPhase` is the phase we must still be in (guards races).
  // =======================================================
  const resolveAnswer = useCallback(async (
    correct: boolean,
    answerer: 'host' | 'player',
    fromPhase: string
  ) => {
    const g = gameRef.current;
    if (!g) return;

    if (correct) {
      await updateGameIfPhase(gameId, fromPhase, {
        phase: 'result',
        answer_correct: true,
        phase_deadline: deadlineIn(RESULT_TIME_SECONDS),
        ...buildCorrectPatch(g, answerer),
      });
      return;
    }

    if (!g.is_steal) {
      // First wrong answer → the OTHER player gets a steal chance.
      await updateGameIfPhase(gameId, fromPhase, {
        phase: 'question',
        is_steal: true,
        first_answerer: answerer,
        buzz_player: null,
        current_transcript: '',
        answer_correct: null,
        last_points: 0,
        last_scorer: null,
        phase_deadline: deadlineIn(STEAL_TIME_SECONDS),
      });
    } else {
      // Steal also failed → round over, reveal answer, no points.
      await updateGameIfPhase(gameId, fromPhase, {
        phase: 'result',
        answer_correct: false,
        last_points: 0,
        last_scorer: null,
        phase_deadline: deadlineIn(RESULT_TIME_SECONDS),
      });
    }
  }, [gameId, buildCorrectPatch]);

  // =======================================================
  // 3b. RESOLVE A MULTIPLE-CHOICE ROUND.
  //    Reads BOTH players' picks and scores every correct one (+1).
  //    IMPORTANT: re-fetch the row first so we use the AUTHORITATIVE
  //    picks. The local copy may be missing the opponent's pick if
  //    their realtime update hasn't arrived yet — that bug caused a
  //    correct answer to occasionally not be counted.
  //    Guarded on 'question' so exactly one client resolves it.
  // =======================================================
  const resolveMcRound = useCallback(async () => {
    const g = (await fetchGame(gameId)) ?? gameRef.current;
    if (!g) return;
    const q = g.questions[g.current_question_index];
    const optionAt = (idx: number | null) =>
      idx != null ? (q?.options?.[idx] ?? '') : '';

    const hostCorrect =
      g.host_mc_index != null && isMcAnswerCorrect(optionAt(g.host_mc_index), q?.correct_answer);
    const playerCorrect =
      g.player_mc_index != null && isMcAnswerCorrect(optionAt(g.player_mc_index), q?.correct_answer);

    await updateGameIfPhase(gameId, 'question', {
      phase: 'result',
      // Global flag kept for any shared consumers; QuestionPanel shows a
      // per-player result using each side's own pick.
      answer_correct: hostCorrect || playerCorrect,
      host_score:   g.host_score   + (hostCorrect   ? 1 : 0),
      player_score: g.player_score + (playerCorrect ? 1 : 0),
      last_points:  hostCorrect || playerCorrect ? 1 : 0,
      phase_deadline: deadlineIn(RESULT_TIME_SECONDS),
    });
  }, [gameId]);

  // =======================================================
  // 4. AI ANSWER CHECK (open-ended). Runs on the ONE client that
  //    won the answering→checking guard. Calls /api/check-answer.
  // =======================================================
  const runAnswerCheck = useCallback(async () => {
    const g = gameRef.current;
    if (!g || judgingRef.current) return;
    judgingRef.current = true;

    const question = g.questions[g.current_question_index];
    let correct = false;
    try {
      const res = await fetch('/api/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question:         question?.question,
          correct_answer:   question?.correct_answer,
          accepted_answers: question?.accepted_answers,
          transcript:       g.current_transcript,
        }),
      });
      const data = await res.json();
      correct = !!data.correct;
    } catch (err) {
      console.error('[useGameState] check-answer failed:', err);
      correct = false; // default wrong so the game keeps moving
    }

    const answerer = g.buzz_player ?? 'player';
    await resolveAnswer(correct, answerer as 'host' | 'player', 'checking');
    judgingRef.current = false;
  }, [resolveAnswer]);

  // =======================================================
  // 4b. ADVANCE TO NEXT QUESTION (or end). Guarded on 'result'.
  //     Declared before the ticker because the ticker calls it.
  // =======================================================
  const advanceToNext = useCallback(async () => {
    const g = gameRef.current;
    if (!g) return;
    const nextIndex = g.current_question_index + 1;

    if (nextIndex >= g.questions.length) {
      await updateGameIfPhase(gameId, 'result', {
        phase: 'ended',
        status: 'ended',
        phase_deadline: null,
      });
    } else {
      await updateGameIfPhase(gameId, 'result', {
        current_question_index: nextIndex,
        buzz_player: null,
        buzz_time: null,
        current_transcript: '',
        mc_answer_index: null,
        host_mc_index: null,
        player_mc_index: null,
        answer_correct: null,
        is_steal: false,
        first_answerer: null,
        last_points: 0,
        last_scorer: null,
        // Next round starts locked (think) or open (classic).
        ...roundStartPatch(g),
      });
    }
  }, [gameId]);

  // =======================================================
  // 5. THE TICKER — the heart of the robust state machine.
  //    Every ~300ms: recompute the countdown + run any due
  //    transition. Either client may drive transitions; guarded
  //    updates keep them safe.
  // =======================================================
  useEffect(() => {
    const interval = setInterval(async () => {
      const g = gameRef.current;
      if (!g) return;

      // --- update the visible countdown ---
      setTimeLeft(secondsUntil(g.phase_deadline));

      // --- has the current phase's deadline passed? (server time) ---
      if (!g.phase_deadline) return;
      const expired = new Date(g.phase_deadline).getTime() <= serverNow();
      if (!expired) return;

      // Only act ONCE per deadline on this client (avoid DB spam)
      if (actedDeadline.current === g.phase_deadline) return;
      actedDeadline.current = g.phase_deadline;

      try {
        switch (g.phase) {
          case 'thinking':
            // Think-lock over → UNLOCK both players at the same instant.
            // This is the server-controlled "GO": neither side could act
            // before now, so a faster connection gains no early advantage.
            await updateGameIfPhase(gameId, 'thinking', {
              phase: 'question',
              phase_deadline: deadlineIn(QUESTION_TIME_SECONDS),
            });
            break;

          case 'question':
            if (g.mc_mode) {
              // MC: the deadline is either the 15s no-answer timeout OR
              // the grace window after the first pick. Either way, score
              // whatever picks are in (none = nobody answered → reveal).
              await resolveMcRound();
            } else {
              // Open-ended: nobody buzzed in time → reveal answer, move on.
              await updateGameIfPhase(gameId, 'question', {
                phase: 'result',
                answer_correct: g.is_steal ? false : null,
                last_points: 0,
                last_scorer: null,
                phase_deadline: deadlineIn(RESULT_TIME_SECONDS),
              });
            }
            break;

          case 'buzzing':
            // Get-ready window over → start the speaking window.
            await updateGameIfPhase(gameId, 'buzzing', {
              phase: 'answering',
              phase_deadline: deadlineIn(ANSWER_TIME_SECONDS),
            });
            break;

          case 'answering': {
            // Speaking window over → go to checking. The winner of
            // this guarded update becomes the judge and runs the AI.
            const won = await updateGameIfPhase(gameId, 'answering', {
              phase: 'checking',
              phase_deadline: deadlineIn(CHECK_TIMEOUT_SECONDS),
            });
            if (won) runAnswerCheck();
            break;
          }

          case 'checking':
            // Safety net: the judge client vanished mid-check.
            // Resolve as wrong so the game never stalls.
            await resolveAnswer(false, g.buzz_player ?? 'player', 'checking');
            break;

          case 'result':
            // Result shown long enough → next question (or end).
            await advanceToNext();
            break;
        }
      } catch (err) {
        console.error('[useGameState] tick transition error:', err);
        // Allow a retry on the next tick if it failed
        actedDeadline.current = null;
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, runAnswerCheck, resolveAnswer, resolveMcRound, advanceToNext]);

  // =======================================================
  // 7. ACTIONS
  // =======================================================

  // Start the game (host only)
  const startGame = useCallback(async () => {
    if (role !== 'host') return;
    await updateGame(gameId, {
      status: 'playing',
      current_question_index: 0,
      host_score: 0,
      player_score: 0,
      buzz_player: null,
      mc_answer_index: null,
      host_mc_index: null,
      player_mc_index: null,
      is_steal: false,
      first_answerer: null,
      answer_correct: null,
      last_points: 0,
      last_scorer: null,
      // Think mode starts locked; classic jumps to the open question.
      ...roundStartPatch(gameRef.current),
    });
  }, [gameId, role]);

  // Buzz in (open-ended). During a steal only the OTHER player may buzz.
  const buzz = useCallback(async (buzzingRole: PlayerRole) => {
    const g = gameRef.current;
    if (!g) return;
    if (g.phase !== 'question') return;     // too late / already buzzed
    if (g.buzz_player !== null) return;       // someone already has it
    if (g.is_steal && g.first_answerer === buzzingRole) return; // can't steal from yourself

    // Guarded: only the first buzz (while still in 'question') wins.
    await updateGameIfPhase(gameId, 'question', {
      phase: 'buzzing',
      buzz_player: buzzingRole,
      buzz_time: new Date().toISOString(),
      current_transcript: '',
      phase_deadline: deadlineIn(BUZZ_WINDOW_SECONDS),
    });
  }, [gameId]);

  // Pick a multiple-choice option. Each player records their OWN pick;
  // the round is scored when the grace window closes (see resolveMcRound).
  // The FIRST pick opens the grace window (sets phase_deadline); a later
  // pick just records itself without extending the window.
  const submitMCAnswer = useCallback(async (
    answeringRole: PlayerRole,
    optionIndex: number
  ) => {
    const g = gameRef.current;
    if (!g || !g.mc_mode) return;
    if (g.phase !== 'question') return;

    const isHost = answeringRole === 'host';
    const myColumn = isHost ? 'host_mc_index' : 'player_mc_index';
    const alreadyAnswered = (isHost ? g.host_mc_index : g.player_mc_index) !== null;
    if (alreadyAnswered) return; // can't change your pick

    // Try to be the FIRST answerer: this opens the grace window. Guarded
    // so it only succeeds while neither player has answered yet.
    const firstPatch: Partial<Game> = isHost
      ? { host_mc_index: optionIndex, phase_deadline: deadlineIn(MC_GRACE_SECONDS) }
      : { player_mc_index: optionIndex, phase_deadline: deadlineIn(MC_GRACE_SECONDS) };

    const wasFirst = await updateGameGuarded(gameId, firstPatch, {
      phase: 'question',
      nullColumns: ['host_mc_index', 'player_mc_index'],
    });

    if (!wasFirst) {
      // Someone already answered → just record my pick inside the window,
      // WITHOUT touching the deadline (so the window can't be extended).
      const myPatch: Partial<Game> = isHost
        ? { host_mc_index: optionIndex }
        : { player_mc_index: optionIndex };
      await updateGameGuarded(gameId, myPatch, {
        phase: 'question',
        nullColumns: [myColumn],
      });
    }
  }, [gameId]);

  // Live transcript update (called by useSpeechRecognition)
  const updateTranscript = useCallback(async (text: string) => {
    await updateGame(gameId, { current_transcript: text });
  }, [gameId]);

  // Rematch — reset the game back to the lobby. If `newQuestions` is
  // passed (freshly generated with the same settings) they REPLACE the
  // old set; otherwise the same questions are reused.
  const rematch = useCallback(async (newQuestions?: Question[]) => {
    await updateGame(gameId, {
      ...(newQuestions ? { questions: newQuestions } : {}),
      status: 'ready',
      phase: 'waiting',
      current_question_index: 0,
      host_score: 0,
      player_score: 0,
      buzz_player: null,
      buzz_time: null,
      current_transcript: '',
      mc_answer_index: null,
      host_mc_index: null,
      player_mc_index: null,
      answer_correct: null,
      is_steal: false,
      first_answerer: null,
      last_points: 0,
      last_scorer: null,
      phase_deadline: null,
      // Clear the rematch votes for the next round.
      rematch_host: false,
      rematch_player: false,
    });
  }, [gameId]);

  // Vote to rematch. A rematch only starts once the host AND at least
  // one other player have voted (see GameScreen). Voting is idempotent.
  const voteRematch = useCallback(async (votingRole: PlayerRole) => {
    await updateGame(gameId, votingRole === 'host'
      ? { rematch_host: true }
      : { rematch_player: true });
  }, [gameId]);

  return {
    game,
    loading,
    error,
    timeLeft,
    timerTotal: phaseTotalSeconds(game),
    buzzCountdown: timeLeft,
    buzz,
    submitMCAnswer,
    startGame,
    updateTranscript,
    rematch,
    voteRematch,
  };
}

// Export timing constants for components that need them visually
export {
  THINK_TIME_SECONDS,
  QUESTION_TIME_SECONDS,
  BUZZ_WINDOW_SECONDS,
  ANSWER_TIME_SECONDS,
  STEAL_TIME_SECONDS,
  MC_GRACE_SECONDS,
};
