// ============================================================
// WhoSmarter — TypeScript Types
// Central place for all shared types. If you add a DB column,
// add the matching field here too.
// ============================================================

import type { Locale } from './i18n';

// -------------------------------------------------------
// Up to SIX players per game: 1 host (slot 0) + 5 guests (slots 1-5).
// -------------------------------------------------------
export const MAX_PLAYERS = 6;

// -------------------------------------------------------
// Game difficulty options
// -------------------------------------------------------
export type Difficulty = 'easy' | 'medium' | 'hard';

// -------------------------------------------------------
// Game mode — how a round starts
//   'think'   → locked think countdown, then everyone unlocked together
//               (fair: a faster connection can't click early). DEFAULT.
//   'classic' → answer immediately when the question appears (original)
// -------------------------------------------------------
export type GameMode = 'think' | 'classic';

// -------------------------------------------------------
// A single question (as stored in games.questions JSONB)
// -------------------------------------------------------
export interface Question {
  /** The question text shown to all players */
  question: string;
  /** MC only — 4 answer choices. Undefined for open-ended mode. */
  options?: [string, string, string, string];
  /** The canonical correct answer. Present in BOTH modes now —
   *  used for auto-scoring (MC) and AI answer-checking (open-ended). */
  correct_answer?: string;
  /** Open-ended only — alternative acceptable phrasings/synonyms.
   *  Used as a fast local check before falling back to the AI judge. */
  accepted_answers?: string[];
}

// -------------------------------------------------------
// Game phase — what's happening right now in the round
// -------------------------------------------------------
export type GamePhase =
  | 'waiting'    // lobby — players joining, host hasn't started yet
  | 'thinking'   // (think mode) locked countdown — nobody can answer yet
  | 'question'   // MC question is visible, players pick
  | 'buzzing'    // (legacy) unused
  | 'answering'  // voice recognition running (open-ended only)
  | 'checking'   // AI is auto-judging the spoken answers
  | 'judging'    // (legacy) unused
  | 'result'     // brief flash of correct/wrong outcome
  | 'ended';     // all questions finished

// -------------------------------------------------------
// Game status (top-level lifecycle)
// -------------------------------------------------------
export type GameStatus = 'waiting' | 'ready' | 'playing' | 'ended';

// -------------------------------------------------------
// Player role
//   'host'   → the creator (slot 0); starts the game + rematch
//   'player' → everyone else (slots 1-5)
// -------------------------------------------------------
export type PlayerRole = 'host' | 'player';

// -------------------------------------------------------
// A single participant — one row in the `players` table.
// All PER-PLAYER state lives here so up to six people can answer
// simultaneously without clobbering each other.
// -------------------------------------------------------
export interface Player {
  id: string;
  created_at: string;
  game_id: string;
  /** Stable per-browser id (localStorage) — survives reloads. */
  client_id: string;
  name: string;
  role: PlayerRole;
  /** Seat 0..5. Slot 0 is always the host. */
  slot: number;
  score: number;

  // ---- per-round state (reset each question) ----
  /** Multiple-choice pick this round (0-3) or null = not answered. */
  mc_index: number | null;
  /** Voice answer this round (each player talks into their own row). */
  transcript: string;
  /** Was this player correct this round? null until judged. */
  correct: boolean | null;
  /** Voice "Done" lock-in — when EVERY player is done the round advances. */
  done: boolean;

  /** Rematch vote — reset when a new match starts. */
  rematch: boolean;
}

// -------------------------------------------------------
// Full game row (mirrors the SHARED columns of the games table).
// Per-player state now lives in the `players` table (see Player).
// -------------------------------------------------------
export interface Game {
  id: string;
  created_at: string;
  topic: string;
  difficulty: Difficulty;
  num_questions: number;
  mc_mode: boolean;
  /** Host setting: request player cameras? Default false (mics only). */
  cameras_enabled: boolean;
  /** Round-start mode: 'think' (locked countdown first) or 'classic'. */
  game_mode: GameMode;
  questions: Question[];
  status: GameStatus;
  current_question_index: number;
  phase: GamePhase;
  /** ISO timestamp when the current timed phase auto-advances.
   *  Every client watches this; any one can drive the transition. */
  phase_deadline: string | null;
  /** True if ANY player answered correctly this round (drives shared UI). */
  answer_correct: boolean | null;
  /** Points awarded on the most recent correct answer (for the score pop). */
  last_points: number;
}

// -------------------------------------------------------
// Payload for creating a new game (sent from the form)
// -------------------------------------------------------
export interface CreateGamePayload {
  topic: string;
  difficulty: Difficulty;
  num_questions: number;
  mc_mode: boolean;
  /** Round-start mode (defaults to 'think'). */
  game_mode?: GameMode;
  /** UI language — questions are generated in this language. */
  locale?: Locale;
  /** Optional — question texts to avoid repeating (from session or rematch). */
  previous_questions?: string[];
}

// -------------------------------------------------------
// WebRTC signaling message types
// Sent over a Supabase Realtime Broadcast channel (not the DB).
// In the mesh, every message is ROUTED: `from`/`to` are player ids
// (the players.id), so each peer only consumes messages addressed to it.
// -------------------------------------------------------
export type SignalType = 'offer' | 'answer' | 'ice-candidate';

export interface WebRTCSignal {
  type: SignalType;
  /** Sender player id. */
  from: string;
  /** Recipient player id. */
  to: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
}
