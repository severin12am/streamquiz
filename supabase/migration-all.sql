-- ============================================================
-- StreamQuiz — RUN-ALL migration (idempotent)
-- ============================================================
-- If you're unsure which migrations you've run, just run THIS file.
-- It adds every column/constraint the current app needs and is safe
-- to run multiple times.
-- ============================================================

-- v2: steal/streaks + answer flags + single MC pick (legacy)
ALTER TABLE games ADD COLUMN IF NOT EXISTS answer_correct  BOOLEAN     DEFAULT NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS mc_answer_index INTEGER     DEFAULT NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS phase_deadline  TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_steal        BOOLEAN     DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS first_answerer  TEXT        DEFAULT NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS streak_host     INTEGER     DEFAULT 0;
ALTER TABLE games ADD COLUMN IF NOT EXISTS streak_player   INTEGER     DEFAULT 0;
ALTER TABLE games ADD COLUMN IF NOT EXISTS last_points     INTEGER     DEFAULT 0;
ALTER TABLE games ADD COLUMN IF NOT EXISTS last_scorer     TEXT        DEFAULT NULL;

-- v3: game mode + thinking phase
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'think';
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_game_mode_check;
ALTER TABLE games ADD CONSTRAINT games_game_mode_check
  CHECK (game_mode IN ('think', 'classic'));
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_phase_check;
ALTER TABLE games ADD CONSTRAINT games_phase_check
  CHECK (phase IN (
    'waiting','thinking','question','buzzing',
    'answering','checking','judging','result','ended'
  ));

-- v4: per-player MC picks
ALTER TABLE games ADD COLUMN IF NOT EXISTS host_mc_index   INTEGER DEFAULT NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS player_mc_index INTEGER DEFAULT NULL;

-- v5: rematch voting
ALTER TABLE games ADD COLUMN IF NOT EXISTS rematch_host   BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS rematch_player BOOLEAN DEFAULT FALSE;

-- v6: buzz-free voice mode (per-player transcripts + correctness)
ALTER TABLE games ADD COLUMN IF NOT EXISTS host_transcript   TEXT    DEFAULT '';
ALTER TABLE games ADD COLUMN IF NOT EXISTS player_transcript TEXT    DEFAULT '';
ALTER TABLE games ADD COLUMN IF NOT EXISTS host_correct      BOOLEAN DEFAULT NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS player_correct    BOOLEAN DEFAULT NULL;

-- Make sure realtime is on for the table
ALTER PUBLICATION supabase_realtime ADD TABLE games;
