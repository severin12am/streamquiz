-- ============================================================
-- v16 — Geography quizzes: raise question cap for eliminate mode
-- Eliminate runs one question per country in selected region(s)
-- (up to ~194 independent countries). Previous cap was 20.
-- ============================================================

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_num_questions_check;
ALTER TABLE games ADD CONSTRAINT games_num_questions_check
  CHECK (num_questions BETWEEN 3 AND 250);
