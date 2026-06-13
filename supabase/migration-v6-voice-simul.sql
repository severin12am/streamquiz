-- ============================================================
-- WhoSmarter — Migration v6: Buzz-free voice mode (both talk)
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor. Safe to re-run.
--
-- Voice mode no longer uses a buzzer. After the question both players
-- simply start talking; each player's spoken answer is transcribed
-- into their OWN column and judged independently, so both can score.
-- ============================================================

ALTER TABLE games ADD COLUMN IF NOT EXISTS host_transcript   TEXT    DEFAULT '';
ALTER TABLE games ADD COLUMN IF NOT EXISTS player_transcript TEXT    DEFAULT '';
ALTER TABLE games ADD COLUMN IF NOT EXISTS host_correct      BOOLEAN DEFAULT NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS player_correct    BOOLEAN DEFAULT NULL;
