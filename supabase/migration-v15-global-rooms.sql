-- ============================================================
-- WhoSmarter — Migration v15: global rooms + host kick
-- ============================================================
-- Run ONCE in Supabase SQL Editor. Safe to re-run.
--
-- Adds:
--   • games.is_public  — discoverable while waiting (default false)
--   • game_bans        — per-game client_id bans after host kick
--   • trigger blocks re-join of banned clients
--   • setup lock allows is_public only true → false (unlist on Start)
-- ============================================================

-- 1) Public listing flag
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN games.is_public IS
  'When true, lobby is listable while status=waiting. Cleared on Start (R1).';

CREATE INDEX IF NOT EXISTS games_public_waiting_idx
  ON games (created_at DESC)
  WHERE is_public = TRUE AND status = 'waiting';

-- 2) Lock setup columns; allow is_public only to go true → false
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

  -- is_public: only allow unlisting (true → false). Never re-list after create.
  IF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    IF NOT (OLD.is_public = TRUE AND NEW.is_public = FALSE) THEN
      RAISE EXCEPTION 'Cannot modify is_public except to unlist (true → false)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS games_lock_setup_columns_trg ON games;
CREATE TRIGGER games_lock_setup_columns_trg
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION games_lock_setup_columns();

-- 3) Per-game bans (host kick)
CREATE TABLE IF NOT EXISTS game_bans (
  game_id              UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  client_id            TEXT NOT NULL,
  banned_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  banned_by_player_id  UUID NULL,
  PRIMARY KEY (game_id, client_id)
);

CREATE INDEX IF NOT EXISTS game_bans_game_id_idx ON game_bans (game_id);

ALTER TABLE game_bans ENABLE ROW LEVEL SECURITY;
-- No policies for anon → service role only for reads/writes.

-- 4) Block banned clients from taking a seat (BEFORE INSERT, owner rights)
CREATE OR REPLACE FUNCTION players_reject_banned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM game_bans b
    WHERE b.game_id = NEW.game_id AND b.client_id = NEW.client_id
  ) THEN
    RAISE EXCEPTION 'banned_from_game' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_reject_banned_trg ON players;
CREATE TRIGGER players_reject_banned_trg
  BEFORE INSERT ON players
  FOR EACH ROW EXECUTE FUNCTION players_reject_banned();

-- Verify:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'games' AND column_name = 'is_public';
--   SELECT * FROM game_bans LIMIT 1;
