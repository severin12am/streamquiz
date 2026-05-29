-- ============================================================
-- StreamQuiz — Migration: add answer_correct column
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor if you created your
-- database BEFORE auto-judging was added.
--
-- It's safe to run even if the column already exists.
-- ============================================================

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS answer_correct BOOLEAN DEFAULT NULL;

-- Allow the new 'checking' phase value (drop + recreate the check).
-- Safe to run multiple times.
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_phase_check;
ALTER TABLE games ADD CONSTRAINT games_phase_check
  CHECK (phase IN (
    'waiting','question','buzzing',
    'answering','checking','judging','result','ended'
  ));
