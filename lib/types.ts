// ============================================================
// StreamQuiz — TypeScript Types
// Central place for all shared types. If you add a DB column,
// add the matching field here too.
// ============================================================

// -------------------------------------------------------
// Game difficulty options
// -------------------------------------------------------
export type Difficulty = 'easy' | 'medium' | 'hard';

// -------------------------------------------------------
// Game mode — how a round starts
//   'think'   → locked think countdown, then both unlocked together
//               (fair: a faster connection can't click early). DEFAULT.
//   'classic' → buzz immediately when the question appears (original)
// -------------------------------------------------------
export type GameMode = 'think' | 'classic';

// -------------------------------------------------------
// A single question (as stored in games.questions JSONB)
// -------------------------------------------------------
export interface Question {
  /** The question text shown to both players */
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
  | 'waiting'    // host is on the page, player hasn't joined yet
  | 'thinking'   // (think mode) locked countdown — no buzz/speak/click yet
  | 'question'   // question is visible, waiting for buzz or MC click
  | 'buzzing'    // someone buzzed — 2-second countdown before speaking
  | 'answering'  // voice recognition running (open-ended only)
  | 'checking'   // AI is auto-judging the spoken answer
  | 'judging'    // (legacy) kept for backwards compat; no longer used
  | 'result'     // brief flash of correct/wrong outcome
  | 'ended';     // all questions finished

// -------------------------------------------------------
// Game status (top-level lifecycle)
// -------------------------------------------------------
export type GameStatus = 'waiting' | 'ready' | 'playing' | 'ended';

// -------------------------------------------------------
// Player role — determined by URL param
// -------------------------------------------------------
export type PlayerRole = 'host' | 'player';

// -------------------------------------------------------
// Full game row (mirrors the Supabase games table exactly)
// -------------------------------------------------------
export interface Game {
  id: string;
  created_at: string;
  topic: string;
  difficulty: Difficulty;
  num_questions: number;
  mc_mode: boolean;
  /** Round-start mode: 'think' (locked countdown first) or 'classic'. */
  game_mode: GameMode;
  questions: Question[];
  status: GameStatus;
  current_question_index: number;
  phase: GamePhase;
  buzz_player: 'host' | 'player' | null;
  buzz_time: string | null;
  host_score: number;
  player_score: number;
  current_transcript: string;
  mc_answer_index: number | null;
  /** Per-player MC picks (0-3 index or null). Both players may answer
   *  within a grace window so near-simultaneous correct answers score. */
  host_mc_index: number | null;
  player_mc_index: number | null;
  /** Per-player voice transcripts + judged correctness. In voice mode
   *  both players talk freely; each answer is judged independently. */
  host_transcript: string;
  player_transcript: string;
  host_correct: boolean | null;
  player_correct: boolean | null;
  /** Result of the most recent answer (true=correct, false=wrong,
   *  null=not judged yet). Lets BOTH clients show the same ✓/✗. */
  answer_correct: boolean | null;

  // ---- v2: robust transitions, steal mechanic, streaks ----
  /** ISO timestamp when the current timed phase auto-advances.
   *  Both clients watch this; either can drive the transition. */
  phase_deadline: string | null;
  /** True while the OTHER player gets a rebound/steal chance. */
  is_steal: boolean;
  /** Who answered first this round (during a steal only the OTHER
   *  player may buzz). */
  first_answerer: 'host' | 'player' | null;
  /** Consecutive-correct streak counters (drive multipliers). */
  streak_host: number;
  streak_player: number;
  /** Points awarded on the most recent correct answer + who scored
   *  (used for the score pop animation). */
  last_points: number;
  last_scorer: 'host' | 'player' | null;

  /** Rematch votes — a rematch begins once the host AND at least one
   *  other player have accepted. Reset when a new match starts. */
  rematch_host: boolean;
  rematch_player: boolean;
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
  locale?: 'en' | 'ru';
}

// -------------------------------------------------------
// WebRTC signaling message types
// These are sent over Supabase Realtime Broadcast (not DB)
// -------------------------------------------------------
export type SignalType = 'offer' | 'answer' | 'ice-candidate';

export interface WebRTCSignal {
  type: SignalType;
  from: PlayerRole;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
}
