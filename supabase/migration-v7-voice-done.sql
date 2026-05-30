-- ============================================================
-- StreamQuiz — Migration v7: "Done" lock-in for voice mode
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor. Safe to re-run.
--
-- In voice mode each player can press "Done" to lock their answer
-- early. When BOTH players are done the round advances immediately
-- (no waiting out the full talk window). These flags track that.
-- ============================================================

ALTER TABLE games ADD COLUMN IF NOT EXISTS host_done   BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS player_done BOOLEAN DEFAULT FALSE;
