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
//   • 'regular' (default): round opens immediately. The timer is fixed
//     (ANSWER_TIME_SECONDS) and NEVER shrinks when someone answers. In MC
//     you may CHANGE your pick until the timer ends. EVERY correct answer
//     scores +1. Round ends early only when EVERYONE has answered.
//   • 'hardcore': round opens immediately. Your answer LOCKS the instant you
//     submit (no changing; voice is one-shot, a wrong answer earns nothing).
//     ONLY the FIRST correct answer scores. "First" is decided by a
//     server-synced timestamp (answered_at) stamped the moment a player
//     commits — so a faster connection barely affects who wins.
//   • 'think'/'classic' (legacy): kept working for old game rows. 'think'
//     starts LOCKED for THINK_TIME_SECONDS; both legacy modes shrink the
//     timer to FIRST_ANSWER_GRACE_SECONDS once the first player answers.
//
// ROUND FLOW (voice — no buzzer):  [thinking →] answering → checking → result → next
//   Every player talks into their OWN row; each answer is judged
//   independently. In 'regular' everyone who's right scores; in 'hardcore'
//   only the earliest correct answer (by answered_at) scores.
//
// ROUND FLOW (multiple choice):    [thinking →] question → result → next
//   Everyone has the same answer window. The round resolves when the timer
//   ends OR when every player has answered (early advance).
//
// SCORING: each correct answer = 1 point ('regular'); first correct = 1 point
//   ('hardcore').
// ============================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  supabase, subscribeToGame, subscribeToPlayers, updateGame, updateGameIfPhase,
  updateGameIfDeadline,
  fetchGame, fetchPlayers, updatePlayer, joinGame,
  resetPlayersForRound, resetPlayersForMatch, serverNow, syncServerClock,
} from '@/lib/supabase';
import { isMcAnswerCorrect } from '@/lib/mc-utils';
import { getSavedName } from '@/lib/client-id';
import type { Game, Player, Question } from '@/lib/types';

// -------------------------------------------------------
// TIMING SETTINGS — change these to adjust game pacing (seconds)
// -------------------------------------------------------
const THINK_TIME_SECONDS    = 5;    // (legacy think mode) locked countdown before answering
const DEFAULT_ANSWER_SECONDS = 20;  // default MC / voice answer window
const MIN_ANSWER_SECONDS     = 5;
const MAX_ANSWER_SECONDS     = 30;
/** @deprecated use answerSeconds(game) — kept for export / legacy callers */
const QUESTION_TIME_SECONDS = DEFAULT_ANSWER_SECONDS;
const VOICE_ANSWER_SECONDS  = DEFAULT_ANSWER_SECONDS;
const RESULT_TIME_SECONDS   = 5;    // how long the result screen shows
const CHECK_TIMEOUT_SECONDS = 15;   // safety: max time to wait for AI judging
// (LEGACY 'classic'/'think' only) The moment the FIRST player locks in an
// answer, everyone else gets only this many seconds left to respond. The new
// 'regular'/'hardcore' modes never shrink the timer.
const FIRST_ANSWER_GRACE_SECONDS = 4;

/** Host-configured answer window (5–30s), falling back to 20 for legacy rows. */
function answerSeconds(game: Game | null | undefined): number {
  const n = game?.answer_seconds;
  if (typeof n === 'number' && Number.isFinite(n)) {
    return Math.min(MAX_ANSWER_SECONDS, Math.max(MIN_ANSWER_SECONDS, Math.round(n)));
  }
  return DEFAULT_ANSWER_SECONDS;
}

/** True when this round should use MC UI/scoring (global MC or per-question force). */
function questionUsesMc(game: Game | null, questionIndex?: number): boolean {
  if (!game) return false;
  if (game.mc_mode) return true;
  const idx = questionIndex ?? game.current_question_index;
  const q: Question | undefined = game.questions?.[idx];
  return Boolean(q?.force_mc);
}

// Modes where the timer shrinks to FIRST_ANSWER_GRACE_SECONDS once the first
// player answers. The new modes ('regular'/'hardcore') keep the full timer.
function shrinksOnFirstAnswer(game: Game | null): boolean {
  return game?.game_mode === 'classic' || game?.game_mode === 'think';
}

// Server-time milliseconds a player committed their answer (for ordering in
// 'hardcore'); players who never answered sort last.
function answeredMs(p: Player): number {
  return p.answered_at ? new Date(p.answered_at).getTime() : Number.POSITIVE_INFINITY;
}

// -------------------------------------------------------
// NETWORK RESILIENCE SETTINGS
// -------------------------------------------------------
const POLL_INTERVAL_HEALTHY_MS   = 12000; // always-on safety net when Realtime works
const POLL_INTERVAL_UNHEALTHY_MS = 2500;  // faster catch-up when Realtime is down/blocked
const REALTIME_CONNECT_GRACE_MS  = 5000;  // treat stuck "connecting" as unhealthy after this
const TICK_INTERVAL_MS           = 100;   // how often we check deadlines / update the timer
const MAX_INIT_ATTEMPTS          = 5;     // retries for the very first load
const INIT_RETRY_DELAY_MS        = 1200;  // wait between initial-load retries

type ChannelHealth = 'connecting' | 'healthy' | 'unhealthy';

function channelHealthFromStatus(status: string): ChannelHealth {
  if (status === 'SUBSCRIBED') return 'healthy';
  if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
    return 'unhealthy';
  }
  return 'connecting';
}

// Merge a Realtime UPDATE payload onto the previous game row, preserving
// the `questions` array when the payload omits it.
//
// WHY: `questions` is a large jsonb, so Postgres stores it out-of-line
// (TOAST). Supabase Realtime `postgres_changes` does NOT include unchanged
// TOASTed columns in the UPDATE payload — so every phase transition (which
// only writes small columns like `phase`/`phase_deadline`) arrives with
// `questions` missing/null. Blindly `setGame(payload.new)` would then wipe
// the questions and crash the render (`game.questions[idx]` → undefined).
// Questions never legitimately become empty mid-game, so keeping the prior
// value is always correct; all other columns are scalars that are always
// present in the payload (including intentional nulls), so we take those.
function mergeGameUpdate(prev: Game | null, updated: Game): Game {
  const incomingQuestions = updated.questions;
  const hasQuestions = Array.isArray(incomingQuestions) && incomingQuestions.length > 0;
  const next = hasQuestions || !prev ? updated : { ...updated, questions: prev.questions };
  // Never keep PDF source text in client state (realtime may include it).
  if (next && typeof next === 'object' && 'source_text' in next) {
    delete (next as { source_text?: unknown }).source_text;
  }
  return next;
}

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
  if (!game) return DEFAULT_ANSWER_SECONDS;
  switch (game.phase) {
    case 'thinking':  return THINK_TIME_SECONDS;
    case 'question':  return answerSeconds(game);
    case 'answering': return answerSeconds(game);
    case 'result':    return RESULT_TIME_SECONDS;
    default:          return answerSeconds(game);
  }
}

// Where a fresh round begins. Legacy THINK mode starts LOCKED; every other
// mode ('regular'/'hardcore'/'classic') jumps straight into answering.
function roundStartPatch(game: Game | null, questionIndex?: number): Partial<Game> {
  const mode = game?.game_mode ?? 'regular';
  if (mode === 'think') {
    return { phase: 'thinking', phase_deadline: deadlineIn(THINK_TIME_SECONDS) };
  }
  const secs = answerSeconds(game);
  return questionUsesMc(game, questionIndex)
    ? { phase: 'question',  phase_deadline: deadlineIn(secs) }
    : { phase: 'answering', phase_deadline: deadlineIn(secs) };
}

// Where to go when the think lock lifts (depends on the answer style).
function afterThinkPatch(game: Game | null): Partial<Game> {
  const secs = answerSeconds(game);
  return questionUsesMc(game)
    ? { phase: 'question',  phase_deadline: deadlineIn(secs) }
    : { phase: 'answering', phase_deadline: deadlineIn(secs) };
}

// True if a player has supplied an answer this round (MC or voice).
function hasAnswered(p: Player, mcMode: boolean): boolean {
  return mcMode ? p.mc_index !== null : p.done;
}

/**
 * True when the player's commit belongs to the CURRENT answer window.
 * Leftover mc_index/done from the previous round (cleared a beat after the
 * next question opens) must NOT count — otherwise early-advance auto-resolves
 * the new question using stale picks. We require answered_at to fall inside
 * the window that ends at `phase_deadline`.
 */
function answerBelongsToRound(
  p: Player,
  mcMode: boolean,
  deadline: string | null,
  phaseDurationSec: number,
): boolean {
  if (!hasAnswered(p, mcMode)) return false;
  if (!deadline || !p.answered_at) return false;
  const end = new Date(deadline).getTime();
  const start = end - phaseDurationSec * 1000;
  const at = new Date(p.answered_at).getTime();
  // 2s slack each side for clock skew / shrink races.
  return at >= start - 2000 && at <= end + 2000;
}

/** Cleared per-round fields — shared by optimistic UI reset. */
function withClearedRound(p: Player): Player {
  if (
    p.mc_index === null &&
    p.transcript === '' &&
    p.correct === null &&
    !p.done &&
    p.answered_at === null
  ) {
    return p;
  }
  return {
    ...p,
    mc_index: null,
    transcript: '',
    correct: null,
    done: false,
    answered_at: null,
  };
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
  /** True after this client lost its seat and cannot rejoin (host kick). */
  removed: boolean;
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
  const [removed, setRemoved] = useState(false);
  const hadSeatRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_ANSWER_SECONDS);
  const [timeLeftMs, setTimeLeftMs] = useState(DEFAULT_ANSWER_SECONDS * 1000);

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

  // Track whether we ever held a seat; if it vanishes, try rejoin once → ban = removed.
  useEffect(() => {
    if (me) {
      hadSeatRef.current = true;
      return;
    }
    if (!hadSeatRef.current || !clientId || !gameId || removed) return;

    let cancelled = false;
    (async () => {
      const result = await joinGame(gameId, clientId, getSavedName() || 'Player', false);
      if (cancelled) return;
      if (result.ok) {
        const list = await fetchPlayers(gameId);
        setPlayers(list);
        return;
      }
      if (result.reason === 'banned') setRemoved(true);
    })();

    return () => { cancelled = true; };
  }, [me, clientId, gameId, removed]);

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { playersRef.current = players; }, [players]);

  // -------------------------------------------------------
  // STALE-PICK GUARD: when a new round opens we bump
  // `current_question_index` in the games row and clear every player's
  // per-round state (mc_index, transcript, …) in a SEPARATE write — so they
  // arrive as two independent realtime events. The new-question event almost
  // always lands first, which would briefly render the fresh question with
  // the PREVIOUS round's pick still highlighted (the "answer flashes for half
  // a second" bug). To avoid it we OPTIMISTICALLY clear the per-round fields
  // locally the instant the question index changes; the authoritative reset
  // from the DB then confirms it a beat later.
  // -------------------------------------------------------
  const lastRoundIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (!game) return;
    const idx = game.current_question_index;
    if (lastRoundIndexRef.current === null) {
      lastRoundIndexRef.current = idx;
      return;
    }
    if (idx !== lastRoundIndexRef.current) {
      lastRoundIndexRef.current = idx;
      roundReadyRef.current = null;
      const cleared = playersRef.current.map(withClearedRound);
      playersRef.current = cleared;
      setPlayers(cleared);
    }
  }, [game?.current_question_index]);

  // =======================================================
  // 1. Initial load + realtime subscriptions + tiered polling
  //    Always poll (safety net for VPN / blocked Realtime), but slow
  //    when channels are healthy and fast when they are not.
  // =======================================================
  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let pollIntervalMs = POLL_INTERVAL_HEALTHY_MS;
    let connectGraceDone = false;

    let gameHealth: ChannelHealth = 'connecting';
    let playersHealth: ChannelHealth = 'connecting';

    syncServerClock();
    const clockTimer = setInterval(() => { syncServerClock(); }, 30000);

    const refreshPlayers = async () => {
      const list = await fetchPlayers(gameId);
      if (!cancelled) setPlayers(list);
    };

    const syncFromServer = async () => {
      const data = await fetchGame(gameId);
      if (!cancelled && data) {
        setGame(data);
        setError(null);
      }
      await refreshPlayers();
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const desiredPollIntervalMs = (): number => {
      const anyUnhealthy = gameHealth === 'unhealthy' || playersHealth === 'unhealthy';
      const connectTimedOut =
        connectGraceDone &&
        (gameHealth === 'connecting' || playersHealth === 'connecting');
      return (anyUnhealthy || connectTimedOut)
        ? POLL_INTERVAL_UNHEALTHY_MS
        : POLL_INTERVAL_HEALTHY_MS;
    };

    const applyPollInterval = (immediateSync = false) => {
      if (cancelled) return;

      const next = desiredPollIntervalMs();
      if (pollTimer && next === pollIntervalMs) return;

      pollIntervalMs = next;
      stopPolling();
      if (immediateSync) void syncFromServer();
      pollTimer = setInterval(() => { void syncFromServer(); }, pollIntervalMs);
    };

    const connectGraceTimer = setTimeout(() => {
      connectGraceDone = true;
      applyPollInterval(true);
    }, REALTIME_CONNECT_GRACE_MS);

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
    applyPollInterval();

    const gameChannel = subscribeToGame(
      gameId,
      (updated) => {
        if (!cancelled) setGame((prev) => mergeGameUpdate(prev, updated));
      },
      (status) => {
        gameHealth = channelHealthFromStatus(status);
        applyPollInterval(true);
      },
    );
    const playersChannel = subscribeToPlayers(
      gameId,
      () => { refreshPlayers(); },
      (status) => {
        playersHealth = channelHealthFromStatus(status);
        applyPollInterval(true);
      },
    );

    return () => {
      cancelled = true;
      clearTimeout(connectGraceTimer);
      stopPolling();
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
          answeredAt: answeredMs(p),
          correct: await judge(p.transcript),
        }))
      );
      const anyCorrect = results.some((r) => r.correct);

      // HARDCORE: only the EARLIEST correct answer (by server-stamped
      // answered_at) scores. REGULAR/legacy: every correct answer scores.
      const winnerId =
        g.game_mode === 'hardcore'
          ? results.filter((r) => r.correct).sort((a, b) => a.answeredAt - b.answeredAt)[0]?.id ?? null
          : null;
      const scores = (r: { id: string; correct: boolean }) =>
        g.game_mode === 'hardcore' ? r.id === winnerId : r.correct;

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
              score: r.score + (scores(r) ? 1 : 0),
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

    // Ignore leftover picks from the previous round (answered_at outside
    // this question's window) — same guard as the early-advance ticker.
    const live = (p: Player) =>
      answerBelongsToRound(p, true, g.phase_deadline, answerSeconds(g));

    const correctOf = (p: Player) =>
      live(p) &&
      isMcAnswerCorrect(q?.options?.[p.mc_index!] ?? '', q?.correct_answer);

    const anyCorrect = roster.some(correctOf);

    // HARDCORE: only the EARLIEST correct answer (by server-stamped
    // answered_at) scores. REGULAR/legacy: every correct answer scores.
    const winnerId =
      g.game_mode === 'hardcore'
        ? roster.filter(correctOf).sort((a, b) => answeredMs(a) - answeredMs(b))[0]?.id ?? null
        : null;
    const scores = (p: Player) =>
      g.game_mode === 'hardcore' ? p.id === winnerId : correctOf(p);

    const won = await updateGameIfPhase(gameId, 'question', {
      phase: 'result',
      answer_correct: anyCorrect,
      last_points: anyCorrect ? 1 : 0,
      phase_deadline: deadlineIn(RESULT_TIME_SECONDS),
    });

    if (won) {
      await Promise.all(
        roster.map((p) =>
          updatePlayer(p.id, {
            correct: correctOf(p),
            score: p.score + (scores(p) ? 1 : 0),
          })
        )
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
        ...roundStartPatch(g, nextIndex),
      });
      // Reset after advance (separate write). Stale picks that briefly linger
      // are ignored by answerBelongsToRound until this lands.
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
      //     roster with no answers that belong to THIS deadline. Leftover
      //     picks from the previous round (old answered_at) are ignored so
      //     they can't instantly resolve the new question — the bug that
      //     made Eliminate rounds flash by before the map painted. ---
      const mcRound = questionUsesMc(g);
      const answerablePhase = g.phase === 'question' || g.phase === 'answering';
      const phaseSecs = answerSeconds(g);
      const liveAnswer = (p: Player) =>
        answerBelongsToRound(p, mcRound, g.phase_deadline, phaseSecs);
      if (answerablePhase && g.phase_deadline && !roster.some(liveAnswer)) {
        roundReadyRef.current = g.phase_deadline;
      }
      const roundReady = answerablePhase && roundReadyRef.current === g.phase_deadline;

      // --- FIRST-ANSWER RACE (legacy 'classic'/'think' only): as soon as ONE
      //     player has answered, cut the remaining time down to
      //     FIRST_ANSWER_GRACE_SECONDS so the rest have to hurry. The new
      //     'regular'/'hardcore' modes keep the full timer. Compare-and-swap on
      //     the deadline keeps it safe: only one client wins and it can only
      //     fire once per round. ---
      if (shrinksOnFirstAnswer(g) &&
          roundReady &&
          g.phase_deadline &&
          shrunkDeadline.current !== g.phase_deadline &&
          roster.some(liveAnswer) &&
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
        roster.length > 0 && roster.every(liveAnswer);

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

  // Join / re-attach to a seat. Returns the player row (null if full/banned).
  const join = useCallback(async (name: string, asHost: boolean) => {
    const result = await joinGame(gameId, clientId, name, asHost);
    if (!result.ok) {
      if (result.reason === 'banned') setRemoved(true);
      const list = await fetchPlayers(gameId);
      setPlayers(list);
      return null;
    }
    const list = await fetchPlayers(gameId);
    setPlayers(list);
    return result.player;
  }, [gameId, clientId]);

  // Start the match (host only). Resets every player, then opens round 1.
  const startGame = useCallback(async () => {
    const meNow = playersRef.current.find((p) => p.client_id === clientId);
    if (!meNow || meNow.role !== 'host') return;
    await resetPlayersForMatch(gameId);
    // R1: unlist public rooms forever when the quiz starts (is_public true → false only).
    await updateGame(gameId, {
      status: 'playing',
      is_public: false,
      current_question_index: 0,
      answer_correct: null,
      last_points: 0,
      ...roundStartPatch(gameRef.current),
    });
  }, [gameId, clientId]);

  // Pick a multiple-choice option (records MY pick only). Everyone has
  // the same window; the round resolves on the timer or once all pick.
  //   • 'regular' → you may CHANGE your pick freely until the timer ends.
  //   • everything else → your pick LOCKS the instant you submit.
  // The FIRST commit stamps answered_at (server time) so 'hardcore' can rank
  // who answered first without rewarding a faster connection.
  const submitMCAnswer = useCallback(async (optionIndex: number) => {
    const g = gameRef.current;
    const meNow = playersRef.current.find((p) => p.client_id === clientId);
    if (!g || !meNow || !questionUsesMc(g)) return;
    if (g.phase !== 'question') return;
    const alreadyPicked = meNow.mc_index !== null;
    const canChange = g.game_mode === 'regular';
    if (alreadyPicked && !canChange) return; // locked pick (hardcore/legacy)
    const patch: Partial<Player> = { mc_index: optionIndex };
    if (!alreadyPicked) patch.answered_at = new Date(serverNow()).toISOString();
    await updatePlayer(meNow.id, patch);
  }, [clientId]);

  // Live transcript update (voice). Writes to MY row only.
  const updateTranscript = useCallback(async (text: string) => {
    const meNow = playersRef.current.find((p) => p.client_id === clientId);
    if (!meNow) return;
    await updatePlayer(meNow.id, { transcript: text });
  }, [clientId]);

  // Finish answering early (voice). Marks me done (+ optional final text).
  // Stamps answered_at (server time) on the FIRST commit so 'hardcore' can
  // rank who answered first fairly (voice is one-shot in that mode).
  const finishAnswer = useCallback(async (finalText?: string) => {
    const meNow = playersRef.current.find((p) => p.client_id === clientId);
    if (!meNow) return;
    if (meNow.done) return; // already locked in this round
    const patch: Partial<Player> = { done: true };
    if (typeof finalText === 'string') patch.transcript = finalText;
    if (!meNow.answered_at) patch.answered_at = new Date(serverNow()).toISOString();
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
    removed,
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
