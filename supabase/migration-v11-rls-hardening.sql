-- ============================================================
-- WhoSmarter — Migration v11: tighten Row Level Security (RLS)
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor.
-- Safe to run multiple times (uses DROP ... IF EXISTS + CREATE).
--
-- WHAT THIS CHANGES (vs the old "USING (true) FOR ALL" free-for-all):
--
--   games:
--     • INSERT  → DENIED for the anon key. Games are now created ONLY by
--                 the server (/api/create-game) using the SERVICE ROLE key,
--                 which bypasses RLS. This kills spam game creation at the
--                 DB level and makes the API rate limit un-bypassable.
--     • DELETE  → DENIED for the anon key (no griefers wiping games).
--     • SELECT  → allowed (needed to join via link + realtime sync).
--     • UPDATE  → allowed (gameplay), BUT the immutable setup columns
--                 (topic/difficulty/num_questions/mc_mode/game_mode/
--                 cameras_enabled) are locked by a trigger so a vandal who
--                 has the game id can't rewrite the quiz settings.
--                 (questions stays mutable — the rematch flow regenerates it.)
--
--   players:
--     • INSERT  → allowed but validated (valid slot/role, sane name, score 0).
--     • DELETE  → DENIED for the anon key (can't kick other players).
--     • SELECT  → allowed (lobby + realtime).
--     • UPDATE  → allowed (gameplay), BUT identity columns
--                 (game_id/client_id/slot/role) are locked by a trigger.
--
-- ⚠️ RESIDUAL RISK (documented, by design):
--   There is no per-user auth — the anon key is public and client_id is
--   self-asserted. So anyone who has a game's UUID (i.e. the invite link)
--   can still READ that game and WRITE live gameplay state for it. True
--   per-participant write isolation requires either Supabase Auth or
--   routing ALL writes through the server. This migration removes the
--   worst footguns (anon create/delete, setup/identity tampering) without
--   breaking the realtime client-driven game loop.
-- ============================================================

-- -------------------------------------------------------
-- GAMES
-- -------------------------------------------------------
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Remove the old blanket policy.
DROP POLICY IF EXISTS "Allow full anonymous access" ON games;
DROP POLICY IF EXISTS "games_select" ON games;
DROP POLICY IF EXISTS "games_update" ON games;

-- Read: anyone (join-by-link + realtime need this).
CREATE POLICY "games_select" ON games
  FOR SELECT
  USING (true);

-- Update: anyone (the game loop is client-driven). Immutable columns are
-- guarded by the trigger below, not here.
CREATE POLICY "games_update" ON games
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- NOTE: no INSERT or DELETE policy for games → both are DENIED for anon.
--       The server's service-role client bypasses RLS to create games.

-- Lock the immutable setup columns on UPDATE.
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
  THEN
    RAISE EXCEPTION 'Cannot modify immutable game setup columns';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS games_lock_setup_columns_trg ON games;
CREATE TRIGGER games_lock_setup_columns_trg
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION games_lock_setup_columns();

-- -------------------------------------------------------
-- PLAYERS
-- -------------------------------------------------------
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full anonymous access to players" ON players;
DROP POLICY IF EXISTS "players_select" ON players;
DROP POLICY IF EXISTS "players_insert" ON players;
DROP POLICY IF EXISTS "players_update" ON players;

-- Read: anyone (lobby list + realtime).
CREATE POLICY "players_select" ON players
  FOR SELECT
  USING (true);

-- Insert: allowed but validated. (FK on game_id already requires the game
-- to exist.) A fresh seat must start at score 0 with a valid slot/role/name.
CREATE POLICY "players_insert" ON players
  FOR INSERT
  WITH CHECK (
    slot BETWEEN 0 AND 5
    AND role IN ('host', 'player')
    AND char_length(name) BETWEEN 1 AND 40
    AND score = 0
  );

-- Update: anyone (each client writes its own row during play). Identity
-- columns are guarded by the trigger below.
CREATE POLICY "players_update" ON players
  FOR UPDATE
  USING (true)
  WITH CHECK (
    slot BETWEEN 0 AND 5
    AND role IN ('host', 'player')
    AND char_length(name) BETWEEN 1 AND 40
  );

-- NOTE: no DELETE policy for players → DENIED for anon. Rows are removed
--       only via ON DELETE CASCADE when the game is deleted (service role).

-- Lock immutable identity columns on UPDATE.
CREATE OR REPLACE FUNCTION players_lock_identity_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF  NEW.id         IS DISTINCT FROM OLD.id
   OR NEW.created_at IS DISTINCT FROM OLD.created_at
   OR NEW.game_id    IS DISTINCT FROM OLD.game_id
   OR NEW.client_id  IS DISTINCT FROM OLD.client_id
   OR NEW.slot       IS DISTINCT FROM OLD.slot
   OR NEW.role       IS DISTINCT FROM OLD.role
  THEN
    RAISE EXCEPTION 'Cannot modify immutable player columns';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS players_lock_identity_columns_trg ON players;
CREATE TRIGGER players_lock_identity_columns_trg
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION players_lock_identity_columns();

-- -------------------------------------------------------
-- Done. Verify policies with:
--   SELECT schemaname, tablename, policyname, cmd
--   FROM pg_policies WHERE tablename IN ('games','players');
-- -------------------------------------------------------
