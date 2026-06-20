'use client';
// ============================================================
// useGameState — Master hook for all game state logic (MULTIPLAYER)
//
// ARCHITECTURE (robust, host-disconnect tolerant):
//   • SHARED state (the question, phase, deadline) lives in ONE games
//     row. PER-PLAYER state (pick, transcript, score, done) lives in the
//     `players` table — one row each — so up to SIX people can answer at
//     the exact same time without clobbering each other.
//   • Every TIMED phase stores a `phase_deadline` timestamp. EVERY client
//     runs a local ticker; when a deadline passes, ANY client tries to
//     advance the phase with a GUARDED update (updateGameIfPhase).
//     Postgres guarantees only the FIRST one wins → no races, and the
//     game keeps going even if the host disconnects.
//
// GAME MODES (set at creation):
//   • 'think' (default, fair): each round starts LOCKED for
//     THINK_TIME_SECONDS — nobody can answer. When the server deadline
//     passes, EVERYONE unlocks at the same instant (the "GO").
//   • 'classic': round opens immediately.
//
// ROUND FLOW (voice — no buzzer):  [thinking →] answering → checking → result → next
//   Every player talks into their OWN row; each answer is judged
//   independently, so everyone who's right scores.
//
// ROUND FLOW (multiple choice):    [thinking →] question → result → next
//   Everyone has the same QUESTION_TIME window. The round resolves when
//   the timer ends OR when every player has picked (early advance). Each
//   correct pick scores +1.
//
// SCORING: each correct answer = 1 point.
// ============================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  supabase, subscribeToGame, subscribeToPlayers, updateGame, updateGameIfPhase,
  updateGameIfDeadline,
  fetchGame, fetchPlayers, updatePlayer, joinGame,
  resetPlayersForRound, resetPlayersForMatch, serverNow, syncServerClock,
} from '@/lib/supabase';
import { isMcAnswerCorrect } from '@/lib/mc-utils';
import type { Game, Player, Question } from '@/lib/types';

// -------------------------------------------------------
// TIMING SETTINGS — change these to adjust game pacing (seconds)
// -------------------------------------------------------
const THINK_TIME_SECONDS    = 5;    // (think mode) locked countdown before answering
const QUESTION_TIME_SECONDS = 15;   // MC: time to pick before the round resolves
const VOICE_ANSWER_SECONDS  = 12;   // voice: time everyone has to speak
const RESULT_TIME_SECONDS   = 5;    // how long the result screen shows
const CHECK_TIMEOUT_SECONDS = 15;   // safety: max time to wait for AI judging
// The moment the FIRST player locks in an answer, everyone else gets only
// this many seconds left to respond (it's a race — answer first). Applies to
// both multiple-choice ('question') and voice ('answering') rounds.
const FIRST_ANSWER_GRACE_SECONDS = 4;

// -------------------------------------------------------
// NETWORK RESILIENCE SETTINGS
// -------------------------------------------------------
const POLL_INTERVAL_MS    = 2500;   // fallback poll when realtime is blocked
const TICK_INTERVAL_MS     = 100;   // how often we check deadlines / update the timer
const MAX_INIT_ATTEMPTS   = 5;      // retries for the very first load
const INIT_RETRY_DELAY_MS = 1200;   // wait between initial-load retries

// Helper: an ISO timestamp `seconds` from now (server time).
function deadlineIn(seconds: number): string {
  return new Date(serverNow() + seconds * 1000).toISOString();
}

function secondsUntil(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - serverNow()) / 1000));
}

function msUntil(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, new Date(iso).getTime() - serverNow());
}

function phaseTotalSeconds(game: Game | null): number {
  if (!game) return QUESTION_TIME_SECONDS;
  switch (game.phase) {
    case 'thinking':  return THINK_TIME_SECONDS;
    case 'question':  return QUESTION_TIME_SECONDS;
    case 'answering': return VOICE_ANSWER_SECONDS;
    case 'result':    return RESULT_TIME_SECONDS;
    default:          return QUESTION_TIME_SECONDS;
  }
}

// Where a fresh round begins. THINK mode starts LOCKED; CLASSIC jumps in.
function roundStartPatch(game: Game | null): Partial<Game> {
  const mode = game?.game_mode ?? 'think';
  if (mode === 'think') {
    return { phase: 'thinking', phase_deadline: deadlineIn(THINK_TIME_SECONDS) };
  }
  return game?.mc_mode
    ? { phase: 'question',  phase_deadline: deadlineIn(QUESTION_TIME_SECONDS) }
    : { phase: 'answering', phase_deadline: deadlineIn(VOICE_ANSWER_SECONDS) };
}

// Where to go when the think lock lifts (depends on the answer style).
function afterThinkPatch(game: Game | null): Partial<Game> {
  return game?.mc_mode
    ? { phase: 'question',  phase_deadline: deadlineIn(QUESTION_TIME_SECONDS) }
    : { phase: 'answering', phase_deadline: deadlineIn(VOICE_ANSWER_SECONDS) };
}

// True if a player has supplied an answer this round (MC or voice).
function hasAnswered(p: Player, mcMode: boolean): boolean {
  return mcMode ? p.mc_index !== null : p.done;
}

// -------------------------------------------------------
// Hook return type
// -------------------------------------------------------
export interface UseGameStateReturn {
  game: Game | null;
  players: Player[];
  me: Player | null;
  loading: boolean;
  error: string | null;
  timeLeft: number;
  timeLeftMs: number;
  timerTotal: number;

  // Actions
  join: (name: string, asHost: boolean) => Promise<Player | null>;
  submitMCAnswer: (optionIndex: number) => Promise<void>;
  startGame: () => Promise<void>;
  updateTranscript: (text: string) => Promise<void>;
  finishAnswer: (finalText?: string) => Promise<void>;
  rematch: (newQuestions?: Question[]) => Promise<void>;
  voteRematch: () => Promise<void>;
}

export function useGameState(gameId: string, clientId: string): UseGameStateReturn {
  const [game, setGame]       = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
  const [timeLeftMs, setTimeLeftMs] = useState(QUESTION_TIME_SECONDS * 1000);

  const gameRef        = useRef<Game | null>(null);
  const playersRef     = useRef<Player[]>([]);
  const judgingRef     = useRef(false);
  const actedDeadline  = useRef<string | null>(null);
  const earlyDoneRef   = useRef<string | null>(null);
  const shrunkDeadline = useRef<string | null>(null);
  // The deadline of the round we've confirmed is "fresh" — i.e. we've seen
  // the roster fully unanswered for it. Early-advance / first-answer logic
  // is gated on this so leftover picks from the previous round (which clear
  // a beat after the next question opens) can't instantly resolve it.
  const roundReadyRef  = useRef<string | null>(null);

  const me = players.find((p) => p.client_id === clientId) ?? null;

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { playersRef.current = players; }, [players]);

  // =======================================================
  // 1. Initial load + realtime subscriptions + polling fallback
  // =======================================================
  useEffect(() => {
    let cancelled = false;

    syncServerClock();
    const clockTimer = setInterval(() => { syncServerClock(); }, 30000);

    const refreshPlayers = async () => {
      const list = await fetchPlayers(gameId);
      if (!cancelled) setPlayers(list);
    };

    async function tryInitialLoad(attempt = 0) {
      const data = await fetchGame(gameId);
      if (cancelled) return;
      if (data) {
        setGame(data);
        setError(null);
        setLoading(false);
        refreshPlayers();
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

    const gameChannel = subscribeToGame(gameId, (updated) => {
      if (!cancelled) setGame(updated);
    });
    const playersChannel = subscribeToPlayers(gameId, () => { refreshPlayers(); });

    const pollTimer = setInterval(async () => {
      const data = await fetchGame(gameId);
      if (!cancelled && data) {
        setGame(data);
        setError(null);
      }
      refreshPlayers();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      clearInterval(clockTimer);
      supabase.removeChannel(gameChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [gameId]);

  // =======================================================
  // 2. JUDGE A VOICE ROUND — judges EVERY player's spoken answer
  //    independently and scores each correct one (+1). Runs on the ONE
  //    client that won the answering→checking guard. Guarded on 'checking'.
  // =======================================================
  const runVoiceCheck = useCallback(async () => {
    if (judgingRef.current) return;
    judgingRef.current = true;
    try {
      const g = (await fetchGame(gameId)) ?? gameRef.current;
      if (!g) return;
      const roster = await fetchPlayers(gameId);
      const question = g.questions[g.current_question_index];

      const judge = async (transcript: string): Promise<boolean> => {
        if (!transcript || !transcript.trim()) return false;
        try {
          const res = await fetch('/api/check-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question:         question?.question,
              correct_answer:   question?.correct_answer,
              accepted_answers: question?.accepted_answers,
              transcript,
            }),
          });
          const data = await res.json();
          return !!data.correct;
        } catch {
          return false; // keep the game moving
        }
      };

      const results = await Promise.all(
        roster.map(async (p) => ({
          id: p.id,
          score: p.score,
          correct: await judge(p.transcript),
        }))
      );
      const anyCorrect = results.some((r) => r.correct);

      const won = await updateGameIfPhase(gameId, 'checking', {
        phase: 'result',
        answer_correct: anyCorrect,
        last_points: anyCorrect ? 1 : 0,
        phase_deadline: deadlineIn(RESULT_TIME_SECONDS),
      });

      if (won) {
        await Promise.all(
          results.map((r) =>
            updatePlayer(r.id, {
              correct: r.correct,
              score: r.score + (r.correct ? 1 : 0),
            })
          )
        );
      }
    } finally {
      judgingRef.current = false;
    }
  }, [gameId]);

  // =======================================================
  // 3. RESOLVE A MULTIPLE-CHOICE ROUND — score every correct pick (+1).
  //    Re-fetches players so we use AUTHORITATIVE picks (a realtime
  //    update may not have arrived locally yet). Guarded on 'question'.
  // =======================================================
  const resolveMcRound = useCallback(async () => {
    const g = gameRef.current;
    if (!g) return;
    const roster = await fetchPlayers(gameId);
    const q = g.questions[g.current_question_index];

    const correctOf = (p: Player) =>
      p.mc_index != null &&
      isMcAnswerCorrect(q?.options?.[p.mc_index] ?? '', q?.correct_answer);

    const anyCorrect = roster.some(correctOf);

    const won = await updateGameIfPhase(gameId, 'question', {
      phase: 'result',
      answer_correct: anyCorrect,
      last_points: anyCorrect ? 1 : 0,
      phase_deadline: deadlineIn(RESULT_TIME_SECONDS),
    });

    if (won) {
      await Promise.all(
        roster.map((p) => {
          const correct = correctOf(p);
          return updatePlayer(p.id, {
            correct,
            score: p.score + (correct ? 1 : 0),
          });
        })
      );
    }
  }, [gameId]);

  // =======================================================
  // 4. ADVANCE TO NEXT QUESTION (or end). Guarded on 'result'. The guard
  //    winner also clears every player's per-round state.
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
      const won = await updateGameIfPhase(gameId, 'result', {
        current_question_index: nextIndex,
        answer_correct: null,
        last_points: 0,
        ...roundStartPatch(g),
      });
      if (won) await resetPlayersForRound(gameId);
    }
  }, [gameId]);

  // =======================================================
  // 5. THE TICKER — recompute the countdown + run any due transition.
  //    Any client may drive transitions; guarded updates keep them safe.
  // =======================================================
  useEffect(() => {
    const interval = setInterval(async () => {
      const g = gameRef.current;
      if (!g) return;
      const roster = playersRef.current;

      setTimeLeft(secondsUntil(g.phase_deadline));
      setTimeLeftMs(msUntil(g.phase_deadline));

      // --- FRESH-ROUND GATE: a newly opened round only becomes eligible for
      //     early-advance / first-answer logic once we've actually seen the
      //     roster fully unanswered for THIS deadline. Otherwise leftover
      //     picks from the previous round (cleared a beat after the next
      //     question opens — see advanceToNext) would instantly resolve it,
      //     making every other question flash by. Robust to realtime events
      //     for `games` / `players` arriving in either order. ---
      const answerablePhase = g.phase === 'question' || g.phase === 'answering';
      if (answerablePhase && g.phase_deadline &&
          !roster.some((p) => hasAnswered(p, g.mc_mode))) {
        roundReadyRef.current = g.phase_deadline;
      }
      const roundReady = answerablePhase && roundReadyRef.current === g.phase_deadline;

      // --- FIRST-ANSWER RACE: as soon as ONE player has answered, cut the
      //     remaining time down to FIRST_ANSWER_GRACE_SECONDS so the rest
      //     have to hurry. Compare-and-swap on the deadline keeps it safe:
      //     only one client wins and it can only fire once per round. ---
      if (roundReady &&
          g.phase_deadline &&
          shrunkDeadline.current !== g.phase_deadline &&
          roster.some((p) => hasAnswered(p, g.mc_mode)) &&
          msUntil(g.phase_deadline) > (FIRST_ANSWER_GRACE_SECONDS + 0.4) * 1000) {
        shrunkDeadline.current = g.phase_deadline;
        updateGameIfDeadline(gameId, g.phase, g.phase_deadline, {
          phase_deadline: deadlineIn(FIRST_ANSWER_GRACE_SECONDS),
        });
        return;
      }

      // --- EARLY ADVANCE: everyone has answered before the timer ends. ---
      const everyoneAnswered =
        roundReady &&
        roster.length > 0 && roster.every((p) => hasAnswered(p, g.mc_mode));

      if (g.phase === 'question' && everyoneAnswered &&
          earlyDoneRef.current !== g.phase_deadline) {
        earlyDoneRef.current = g.phase_deadline;
        await resolveMcRound();
        return;
      }

      if (g.phase === 'answering' && everyoneAnswered &&
          earlyDoneRef.current !== g.phase_deadline) {
        earlyDoneRef.current = g.phase_deadline;
        const won = await updateGameIfPhase(gameId, 'answering', {
          phase: 'checking',
          phase_deadline: deadlineIn(CHECK_TIMEOUT_SECONDS),
        });
        if (won) runVoiceCheck();
        return;
      }

      // --- has the current phase's deadline passed? (server time) ---
      if (!g.phase_deadline) return;
      const expired = new Date(g.phase_deadline).getTime() <= serverNow();
      if (!expired) return;

      if (actedDeadline.current === g.phase_deadline) return;
      actedDeadline.current = g.phase_deadline;

      try {
        switch (g.phase) {
          case 'thinking':
            await updateGameIfPhase(gameId, 'thinking', afterThinkPatch(g));
            break;

          case 'question':
            await resolveMcRound();
            break;

          case 'answering': {
            const won = await updateGameIfPhase(gameId, 'answering', {
              phase: 'checking',
              phase_deadline: deadlineIn(CHECK_TIMEOUT_SECONDS),
            });
            if (won) runVoiceCheck();
            break;
          }

          case 'checking':
            // Safety net: the judge client vanished mid-check.
            await updateGameIfPhase(gameId, 'checking', {
              phase: 'result',
              answer_correct: false,
              last_points: 0,
              phase_deadline: deadlineIn(RESULT_TIME_SECONDS),
            });
            break;

          case 'result':
            await advanceToNext();
            break;
        }
      } catch (err) {
        console.error('[useGameState] tick transition error:', err);
        actedDeadline.current = null;
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, runVoiceCheck, resolveMcRound, advanceToNext]);

  // =======================================================
  // 6. ACTIONS
  // =======================================================

  // Join / re-attach to a seat. Returns the player row (null if full).
  const join = useCallback(async (name: string, asHost: boolean) => {
    const p = await joinGame(gameId, clientId, name, asHost);
    const list = await fetchPlayers(gameId);
    setPlayers(list);
    return p;
  }, [gameId, clientId]);

  // Start the match (host only). Resets every player, then opens round 1.
  const startGame = useCallback(async () => {
    const meNow = playersRef.current.find((p) => p.client_id === clientId);
    if (!meNow || meNow.role !== 'host') return;
    await resetPlayersForMatch(gameId);
    await updateGame(gameId, {
      status: 'playing',
      current_question_index: 0,
      answer_correct: null,
      last_points: 0,
      ...roundStartPatch(gameRef.current),
    });
  }, [gameId, clientId]);

  // Pick a multiple-choice option (records MY pick only). Everyone has
  // the same window; the round resolves on the timer or once all pick.
  const submitMCAnswer = useCallback(async (optionIndex: number) => {
    const g = gameRef.current;
    const meNow = playersRef.current.find((p) => p.client_id === clientId);
    if (!g || !meNow || !g.mc_mode) return;
    if (g.phase !== 'question') return;
    if (meNow.mc_index !== null) return; // can't change your pick
    await updatePlayer(meNow.id, { mc_index: optionIndex });
  }, [clientId]);

  // Live transcript update (voice). Writes to MY row only.
  const updateTranscript = useCallback(async (text: string) => {
    const meNow = playersRef.current.find((p) => p.client_id === clientId);
    if (!meNow) return;
    await updatePlayer(meNow.id, { transcript: text });
  }, [clientId]);

  // Finish answering early (voice). Marks me done (+ optional final text).
  const finishAnswer = useCallback(async (finalText?: string) => {
    const meNow = playersRef.current.find((p) => p.client_id === clientId);
    if (!meNow) return;
    const patch: Partial<Player> = { done: true };
    if (typeof finalText === 'string') patch.transcript = finalText;
    await updatePlayer(meNow.id, patch);
  }, [clientId]);

  // Rematch — send everyone back to the lobby with fresh (or same) questions.
  const rematch = useCallback(async (newQuestions?: Question[]) => {
    await resetPlayersForMatch(gameId);
    await updateGame(gameId, {
      ...(newQuestions ? { questions: newQuestions } : {}),
      status: 'waiting',
      phase: 'waiting',
      current_question_index: 0,
      answer_correct: null,
      last_points: 0,
      phase_deadline: null,
    });
  }, [gameId]);

  // Vote to rematch (idempotent).
  const voteRematch = useCallback(async () => {
    const meNow = playersRef.current.find((p) => p.client_id === clientId);
    if (!meNow) return;
    await updatePlayer(meNow.id, { rematch: true });
  }, [clientId]);

  return {
    game,
    players,
    me,
    loading,
    error,
    timeLeft,
    timeLeftMs,
    timerTotal: phaseTotalSeconds(game),
    join,
    submitMCAnswer,
    startGame,
    updateTranscript,
    finishAnswer,
    rematch,
    voteRematch,
  };
}

// Export timing constants for components that need them visually
export {
  THINK_TIME_SECONDS,
  QUESTION_TIME_SECONDS,
  VOICE_ANSWER_SECONDS,
  FIRST_ANSWER_GRACE_SECONDS,
};
