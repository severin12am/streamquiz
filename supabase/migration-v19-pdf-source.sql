-- ============================================================
-- v19 — PDF source text for rematch regeneration
-- Stores extracted document text on PDF-sourced quizzes so
-- rematch can ask the LLM for a NEW set of questions.
-- -------------------------------------------------------
-- Run in Supabase SQL Editor after deploying the app changes.
-- ============================================================

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS source_text TEXT DEFAULT NULL;

COMMENT ON COLUMN games.source_text IS
  'Extracted PDF/document text used to ground AI questions. NULL for topic/geography quizzes. Immutable after create; used by rematch regeneration.';

-- Lock as an immutable setup column (same as topic / difficulty).
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
   OR NEW.source_text     IS DISTINCT FROM OLD.source_text
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
