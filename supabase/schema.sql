-- ============================================================
-- StreamQuiz — Supabase Database Schema
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

  -- Game mode:
  --   'think'   → locked think countdown before answering (default, fair)
  --   'classic' → buzz immediately when the question appears (original)
  game_mode              TEXT DEFAULT 'think' CHECK (game_mode IN ('think', 'classic')),

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

  -- Voice transcript of the current answer (shown live to both players)
  current_transcript     TEXT DEFAULT '',

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
-- Done! You can verify with:
--   SELECT * FROM games LIMIT 5;
-- -------------------------------------------------------
