-- ============================================================
-- WhoSmarter — Supabase Database Schema
-- Run this entire file in your Supabase SQL Editor once.
-- ============================================================
-- 
-- HOW TO RUN:
--   1. Open your Supabase project dashboard
--   2. Go to SQL Editor → New Query
--   3. Paste this entire file and click "Run"
-- ============================================================

-- -------------------------------------------------------
-- 1. GAMES TABLE
--    One row per quiz session.
--    All game state lives here and is synced in real-time.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS games (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at             TIMESTAMPTZ DEFAULT NOW(),

  -- Setup (set at creation, never change)
  topic                  TEXT NOT NULL,
  difficulty             TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  num_questions          INTEGER NOT NULL CHECK (num_questions BETWEEN 3 AND 10),
  mc_mode                BOOLEAN DEFAULT FALSE,

  -- Host-chosen on the create screen. FALSE (default) = no cameras
  -- requested; players still get a mic (voice answers + peer audio work).
  cameras_enabled        BOOLEAN DEFAULT FALSE,

  -- Game mode:
  --   'regular'  → answer immediately; MC answers changeable until the timer
  --                ends; timer never shrinks; EVERY correct answer scores (default)
  --   'hardcore' → answers lock on submit (voice one-shot); ONLY the first
  --                correct answer scores (ordered by a server-synced timestamp)
  --   'think'/'classic' → legacy modes, kept for older rows
  game_mode              TEXT DEFAULT 'regular'
                           CHECK (game_mode IN ('regular', 'hardcore', 'think', 'classic')),

  -- Generated questions array — stored as JSON.
  -- Each item: { question, options (MC only), correct_answer (MC only) }
  questions              JSONB DEFAULT '[]'::JSONB,

  -- Live game state (updated constantly during gameplay)
  status                 TEXT DEFAULT 'waiting'
                           CHECK (status IN ('waiting', 'ready', 'playing', 'ended')),

  -- Which question we're on (0-indexed)
  current_question_index INTEGER DEFAULT 0,

  -- Current phase of one question round:
  --   waiting    → game not started
  --   thinking   → (think mode) locked countdown, no buzz/speak/click yet
  --   question   → question is shown, waiting for BUZZ / MC click
  --   buzzing    → someone buzzed, 2-second window before they speak
  --   answering  → voice recognition active
  --   judging    → host is clicking Correct / Wrong
  --   result     → brief display of correct/wrong before next question
  --   ended      → all questions done
  phase                  TEXT DEFAULT 'waiting'
                           CHECK (phase IN (
                             'waiting','thinking','question','buzzing',
                             'answering','checking','judging','result','ended'
                           )),

  -- Who buzzed: 'host' | 'player' | NULL
  -- BUZZ race: supabase uses server-side timestamp to pick the winner
  buzz_player            TEXT DEFAULT NULL CHECK (buzz_player IN ('host', 'player', NULL)),
  buzz_time              TIMESTAMPTZ DEFAULT NULL,

  -- Scores
  host_score             INTEGER DEFAULT 0,
  player_score           INTEGER DEFAULT 0,

  -- Voice transcript (legacy single-answer field; kept for compat).
  current_transcript     TEXT DEFAULT '',

  -- Per-player voice transcripts + judged correctness. In voice mode
  -- both players talk freely (no buzzer); each answer is transcribed
  -- into their own column and judged independently so both can score.
  host_transcript        TEXT DEFAULT '',
  player_transcript      TEXT DEFAULT '',
  host_correct           BOOLEAN DEFAULT NULL,
  player_correct         BOOLEAN DEFAULT NULL,
  -- "Done" lock-in: when both are true the voice round advances early.
  host_done              BOOLEAN DEFAULT FALSE,
  player_done            BOOLEAN DEFAULT FALSE,

  -- MC answer picked by the winner: 0-3 index, or NULL (legacy single).
  mc_answer_index        INTEGER DEFAULT NULL,

  -- Per-player MC picks (0-3 index, or NULL = not answered). Both can
  -- answer within a short grace window so near-simultaneous correct
  -- answers BOTH score (fair regardless of connection speed).
  host_mc_index          INTEGER DEFAULT NULL,
  player_mc_index        INTEGER DEFAULT NULL,

  -- Result of the most recent answer so BOTH clients show the same
  -- ✓/✗ (TRUE=correct, FALSE=wrong, NULL=not judged yet).
  answer_correct         BOOLEAN DEFAULT NULL,

  -- ---- v2: robust transitions, steal mechanic, streaks ----

  -- When the current timed phase should auto-advance. Both clients
  -- watch this; EITHER can drive the transition (robust to a host
  -- disconnect). NULL = no timed deadline.
  phase_deadline         TIMESTAMPTZ DEFAULT NULL,

  -- Steal/rebound: TRUE while the OTHER player gets a second chance
  -- after the first player answered wrong.
  is_steal               BOOLEAN DEFAULT FALSE,

  -- Who answered first this round (during a steal only the OTHER
  -- player may buzz). 'host' | 'player' | NULL.
  first_answerer         TEXT DEFAULT NULL,

  -- Consecutive-correct streak counters (drive score multipliers).
  streak_host            INTEGER DEFAULT 0,
  streak_player          INTEGER DEFAULT 0,

  -- Points awarded on the most recent correct answer + who scored
  -- (used for the score pop animation). last_scorer: host|player|null.
  last_points            INTEGER DEFAULT 0,
  last_scorer            TEXT DEFAULT NULL,

  -- Rematch voting: a rematch starts when the host AND at least one
  -- other player have accepted. Reset when a new match begins.
  rematch_host           BOOLEAN DEFAULT FALSE,
  rematch_player         BOOLEAN DEFAULT FALSE
);

-- -------------------------------------------------------
-- 2. ROW LEVEL SECURITY
--    Fully open (anonymous access) — everyone can read/write
--    any game row. Fine for a private link-based quiz.
--    If you later want auth, replace these policies.
-- -------------------------------------------------------
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full anonymous access" ON games;
CREATE POLICY "Allow full anonymous access"
  ON games FOR ALL
  USING (true)
  WITH CHECK (true);

-- -------------------------------------------------------
-- 3. REAL-TIME
--    Tell Supabase to stream changes on the games table.
--    This powers the live-sync between Host and Player.
-- -------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- -------------------------------------------------------
-- 4. HELPFUL INDEXES
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS games_created_at_idx ON games (created_at DESC);

-- -------------------------------------------------------
-- 5. PLAYERS TABLE — one row per participant (up to 6 players)
--    All PER-PLAYER state lives here so six people can answer at the
--    same time without clobbering each other. The games row above keeps
--    only SHARED state (question, phase, deadline). The host_*/player_*
--    columns on `games` are legacy (2-player era) and unused by the app.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  -- Stable per-browser id (localStorage) → a reload re-attaches to the
  -- SAME row instead of taking a new seat.
  client_id   TEXT NOT NULL,
  name        TEXT NOT NULL,

  -- 'host' (creator, slot 0, can start/rematch) or 'player' (slots 1..5).
  role        TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('host', 'player')),
  slot        INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 5),

  score       INTEGER NOT NULL DEFAULT 0,

  -- Per-round state (reset at the start of every question)
  mc_index    INTEGER DEFAULT NULL,           -- MC pick 0-3, NULL = none
  transcript  TEXT NOT NULL DEFAULT '',        -- voice answer this round
  correct     BOOLEAN DEFAULT NULL,            -- judged correct? NULL before
  done        BOOLEAN NOT NULL DEFAULT FALSE,  -- voice "Done" lock-in

  -- When this player committed their answer this round (server time, stamped
  -- locally via serverNow()). 'hardcore' mode uses it to decide who was first
  -- without rewarding a faster connection. NULL = not answered yet.
  answered_at TIMESTAMPTZ DEFAULT NULL,

  rematch     BOOLEAN NOT NULL DEFAULT FALSE,  -- rematch vote

  UNIQUE (game_id, slot),
  UNIQUE (game_id, client_id)
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full anonymous access to players" ON players;
CREATE POLICY "Allow full anonymous access to players"
  ON players FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE players;

CREATE INDEX IF NOT EXISTS players_game_id_idx ON players (game_id);

-- -------------------------------------------------------
-- Done! You can verify with:
--   SELECT * FROM games LIMIT 5;
--   SELECT * FROM players LIMIT 5;
-- -------------------------------------------------------
