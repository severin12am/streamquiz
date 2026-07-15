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
// Game mode — how a round plays out
//   'regular'  → UI: "Every answer counts". Answer immediately; MC answers
//                can be changed until the timer ends; EVERY correct answer
//                scores. DEFAULT.
//   'hardcore' → UI: "Only first answer counts". Answers lock on submit;
//                ONLY the first correct answer scores (by answered_at).
//   'think'    → (legacy) locked think countdown, then everyone unlocked
//                together, with a short first-answer grace window.
//   'classic'  → (legacy) answer immediately; first answer shrinks the timer.
// -------------------------------------------------------
export type GameMode = 'regular' | 'hardcore' | 'think' | 'classic';

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

  // ---- Geography / media (optional; ignored by classic topic quizzes) ----
  /** Force MC UI + scoring for this question even when game.mc_mode is false
   *  (flags / map ID cannot be typed reliably). */
  force_mc?: boolean;
  /** Flag (or other) image shown in the question stem. */
  image_url?: string;
  /** ISO 3166-1 alpha-2 of the country to highlight on the map. */
  map_country?: string;
  /** ISO codes visible / fitted on the map (usually the selected region). */
  map_scope?: string[];
  /** When true, `options` are ISO country codes rendered as flag images. */
  options_as_flags?: boolean;
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

  /** When this player committed their answer this round, as an ISO timestamp
   *  in SERVER time (taken locally via serverNow() the instant they answer).
   *  Used by 'hardcore' mode to decide who answered FIRST without letting a
   *  faster connection win the race. null = hasn't answered this round. */
  answered_at: string | null;

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
  /** Game mode: 'regular' (default) or 'hardcore' (first correct scores).
   *  'think'/'classic' are legacy values kept for older game rows. */
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
  /** Supabase auth user id of the host who created the game (host-only
   *  Google auth). Null for legacy rows. Not used in client game logic. */
  host_user_id?: string | null;
  /** Discoverable in Browse while waiting. Default false (invite only).
   *  Cleared to false when the host starts the quiz (cannot re-list). */
  is_public?: boolean;
}

// -------------------------------------------------------
// Payload for creating a new game (sent from the form)
// -------------------------------------------------------
/** Geography create/rematch config (deterministic; no LLM). */
export interface GeographyPayload {
  types: string[];
  /** Empty / omitted = all regions. */
  regions?: string[];
}

export interface CreateGamePayload {
  topic: string;
  difficulty: Difficulty;
  num_questions: number;
  mc_mode: boolean;
  /** Game mode (defaults to 'regular'). */
  game_mode?: GameMode;
  /** UI language — questions are generated in this language. */
  locale?: Locale;
  /** Optional — question texts to avoid repeating (from session or rematch). */
  previous_questions?: string[];
  /** When true, listed publicly until the host starts. Default false. */
  is_public?: boolean;
  /** When set, build curated geography questions instead of calling the LLM. */
  geography?: GeographyPayload;
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
