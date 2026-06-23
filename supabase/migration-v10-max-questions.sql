-- ============================================================
-- WhoSmarter — Migration v10: raise max question count to 20
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor.
-- Safe to run multiple times (uses IF EXISTS / DROP+ADD).
-- ============================================================

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_num_questions_check;
ALTER TABLE games ADD CONSTRAINT games_num_questions_check
  CHECK (num_questions BETWEEN 3 AND 20);
