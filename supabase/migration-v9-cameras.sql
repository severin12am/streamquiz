-- ============================================================
-- StreamQuiz — Migration v9: CAMERA TOGGLE
-- Run this in your Supabase SQL Editor on an EXISTING project.
-- (Fresh projects can just run schema.sql, which already includes this.)
-- ============================================================
--
-- Adds a host-level setting chosen on the create screen. When FALSE
-- (the default) nobody's camera is requested — players still get a mic
-- (so voice answering + peer audio work), just no video.
-- ============================================================

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS cameras_enabled BOOLEAN DEFAULT FALSE;

-- -------------------------------------------------------
-- Done! Verify with:  SELECT id, cameras_enabled FROM games LIMIT 5;
-- -------------------------------------------------------
