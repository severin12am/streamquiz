-- ============================================================
-- WhoSmarter — Migration v5: Rematch voting
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor.
-- Safe to run multiple times (IF NOT EXISTS).
--
-- A rematch now requires the host AND at least one other player to
-- accept it (instead of the host deciding alone). These flags record
-- who has accepted; they reset when a new match starts.
-- ============================================================

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS rematch_host   BOOLEAN DEFAULT FALSE;
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS rematch_player BOOLEAN DEFAULT FALSE;
