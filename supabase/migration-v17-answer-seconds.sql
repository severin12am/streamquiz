-- ============================================================
-- v17 — Configurable answer window (Every answer counts)
-- Host can set 5–30 seconds (default 20) for how long players
-- have to answer each question.
-- ============================================================

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS answer_seconds INTEGER NOT NULL DEFAULT 20;

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_answer_seconds_check;
ALTER TABLE games ADD CONSTRAINT games_answer_seconds_check
  CHECK (answer_seconds BETWEEN 5 AND 30);

COMMENT ON COLUMN games.answer_seconds IS
  'Seconds allowed to answer each question (MC or voice). Default 20.';

-- Lock as immutable setup column (same as mc_mode / game_mode).
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
   OR NEW.answer_seconds  IS DISTINCT FROM OLD.answer_seconds
  THEN
    RAISE EXCEPTION 'Cannot modify immutable game setup columns';
  END IF;

  IF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    IF NOT (OLD.is_public = TRUE AND NEW.is_public = FALSE) THEN
      RAISE EXCEPTION 'Cannot modify is_public except to unlist (true → false)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
