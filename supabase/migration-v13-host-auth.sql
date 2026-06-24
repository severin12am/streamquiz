-- ============================================================
-- WhoSmarter — Migration v13: record the host (Google sign-in)
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor. Safe to re-run.
--
-- Host-only auth: the creator signs in with Google, and /api/create-game
-- stamps the game with their auth user id. Guests still join anonymously.
--
-- PREREQUISITE: enable the Google provider in
--   Supabase Dashboard → Authentication → Providers → Google
-- (see README for the Google Cloud OAuth client steps).
-- ============================================================

-- 1. Who created the game (Supabase auth user id). NULL for legacy rows.
ALTER TABLE games ADD COLUMN IF NOT EXISTS host_user_id UUID DEFAULT NULL;

-- 2. Lock host_user_id (plus the existing setup columns) so a client can't
--    rewrite ownership via an UPDATE. Re-create the v11 trigger function
--    with host_user_id added to the immutable set.
CREATE OR REPLACE FUNCTION games_lock_setup_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF  NEW.id              IS DISTINCT FROM OLD.id
   OR NEW.created_at      IS DISTINCT FROM OLD.created_at
   OR NEW.topic           IS DISTINCT FROM OLD.topic
   OR NEW.difficulty      IS DISTINCT FROM OLD.difficulty
   OR NEW.num_questions   IS DISTINCT FROM OLD.num_questions
   OR NEW.mc_mode         IS DISTINCT FROM OLD.mc_mode
   OR NEW.game_mode       IS DISTINCT FROM OLD.game_mode
   OR NEW.cameras_enabled IS DISTINCT FROM OLD.cameras_enabled
   OR NEW.host_user_id    IS DISTINCT FROM OLD.host_user_id
  THEN
    RAISE EXCEPTION 'Cannot modify immutable game setup columns';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists from v11; CREATE OR REPLACE above updates the body.
