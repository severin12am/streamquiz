-- ============================================================
-- WhoSmarter — Migration v4: Regular vs Hardcore game modes
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor.
-- Safe to run multiple times (uses IF NOT EXISTS / DROP+ADD).
--
-- Replaces the old 'think'/'classic' modes (still accepted for old
-- rows) with the two modes the app now offers:
--   'regular'  → answer immediately; MC answers can be changed until the
--                timer ends; the timer never shrinks; EVERY correct answer
--                scores. (default)
--   'hardcore' → answers lock the instant you submit (voice is one-shot);
--                ONLY the first correct answer scores. "First" is decided by
--                a server-synced timestamp captured the moment the player
--                commits — so connection speed barely affects who wins.
-- ============================================================

-- Default new games to 'regular' and allow the new values (keep the old
-- ones valid so existing rows don't violate the constraint).
ALTER TABLE games ALTER COLUMN game_mode SET DEFAULT 'regular';

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_game_mode_check;
ALTER TABLE games ADD CONSTRAINT games_game_mode_check
  CHECK (game_mode IN ('regular', 'hardcore', 'think', 'classic'));

-- Per-player answer timestamp (server time), used by 'hardcore' to order
-- correct answers fairly. NULL = the player hasn't answered this round.
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ DEFAULT NULL;
