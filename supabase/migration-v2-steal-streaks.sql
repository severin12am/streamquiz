-- ============================================================
-- StreamQuiz — Migration v2: Steal mechanic, streaks, and
--                            deadline-based robust transitions
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================

-- When the current timed phase should auto-advance. Both clients
-- watch this and either one can drive the transition (robust to
-- a host disconnect). NULL means "no timed deadline".
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS phase_deadline TIMESTAMPTZ DEFAULT NULL;

-- Steal mechanic: TRUE while the OTHER player gets a rebound chance
-- after the first player answered wrong.
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS is_steal BOOLEAN DEFAULT FALSE;

-- Who answered first this round (so during a steal only the OTHER
-- player may buzz). 'host' | 'player' | NULL.
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS first_answerer TEXT DEFAULT NULL;

-- Consecutive-correct streak counters (drive score multipliers).
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS streak_host   INTEGER DEFAULT 0;
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS streak_player INTEGER DEFAULT 0;

-- Points awarded on the most recent correct answer, and to whom
-- (used for the score-update animation). last_scorer: host|player|null.
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS last_points INTEGER DEFAULT 0;
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS last_scorer TEXT DEFAULT NULL;

-- Make sure the 'checking' phase value is allowed (from v1 migration).
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_phase_check;
ALTER TABLE games ADD CONSTRAINT games_phase_check
  CHECK (phase IN (
    'waiting','question','buzzing',
    'answering','checking','judging','result','ended'
  ));
