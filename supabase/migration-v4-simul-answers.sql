-- ============================================================
-- WhoSmarter — Migration v4: Simultaneous multiple-choice answers
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor.
-- Safe to run multiple times (IF NOT EXISTS).
--
-- WHY: in multiple-choice mode the answer used to go to whoever's
-- click reached the database FIRST — unfair to players with higher
-- latency. Now each player has their OWN pick column and a short
-- grace window: any correct pick within the window scores, so two
-- players who answer at nearly the same time BOTH get the point.
-- ============================================================

-- Per-player multiple-choice picks (0-3 index, or NULL = not answered).
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS host_mc_index   INTEGER DEFAULT NULL;
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS player_mc_index INTEGER DEFAULT NULL;
