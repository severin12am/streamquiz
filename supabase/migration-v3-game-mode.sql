-- ============================================================
-- StreamQuiz — Migration v3: Game modes (think race vs classic)
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor.
-- Safe to run multiple times (uses IF NOT EXISTS / DROP+ADD).
--
-- Adds the "think race" mode: each round starts with a short
-- server-controlled LOCKED countdown (phase = 'thinking') during
-- which nobody can buzz/speak/click. When the deadline passes,
-- both players are unlocked at the EXACT same moment — so a faster
-- connection no longer wins by clicking early.
-- ============================================================

-- Which mode this game uses:
--   'think'   → locked think countdown before answering (default, fair)
--   'classic' → buzz immediately when the question appears (original)
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'think';

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_game_mode_check;
ALTER TABLE games ADD CONSTRAINT games_game_mode_check
  CHECK (game_mode IN ('think', 'classic'));

-- Allow the new 'thinking' phase (the locked pre-answer countdown).
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_phase_check;
ALTER TABLE games ADD CONSTRAINT games_phase_check
  CHECK (phase IN (
    'waiting','thinking','question','buzzing',
    'answering','checking','judging','result','ended'
  ));
