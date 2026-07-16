-- ============================================================
-- WhoSmarter — RUN-ALL migration (idempotent)
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

-- v7: "Done" lock-in for voice mode (advance early when both finished)
ALTER TABLE games ADD COLUMN IF NOT EXISTS host_done   BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS player_done BOOLEAN DEFAULT FALSE;

-- v13: host-only Google auth — record the creator's auth user id.
ALTER TABLE games ADD COLUMN IF NOT EXISTS host_user_id UUID DEFAULT NULL;

-- Make sure realtime is on for the table
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- v11: RLS hardening (anon can't INSERT/DELETE games; setup/identity locked).
-- See migration-v11-rls-hardening.sql for the full commentary.
DROP POLICY IF EXISTS "Allow full anonymous access" ON games;
DROP POLICY IF EXISTS "games_select" ON games;
DROP POLICY IF EXISTS "games_update" ON games;
CREATE POLICY "games_select" ON games FOR SELECT USING (true);
CREATE POLICY "games_update" ON games FOR UPDATE USING (true) WITH CHECK (true);

-- v17: configurable answer window
ALTER TABLE games ADD COLUMN IF NOT EXISTS answer_seconds INTEGER NOT NULL DEFAULT 20;
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_answer_seconds_check;
ALTER TABLE games ADD CONSTRAINT games_answer_seconds_check
  CHECK (answer_seconds BETWEEN 5 AND 30);

CREATE OR REPLACE FUNCTION games_lock_setup_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF  NEW.id IS DISTINCT FROM OLD.id
   OR NEW.created_at IS DISTINCT FROM OLD.created_at
   OR NEW.topic IS DISTINCT FROM OLD.topic
   OR NEW.difficulty IS DISTINCT FROM OLD.difficulty
   OR NEW.num_questions IS DISTINCT FROM OLD.num_questions
   OR NEW.mc_mode IS DISTINCT FROM OLD.mc_mode
   OR NEW.game_mode IS DISTINCT FROM OLD.game_mode
   OR NEW.cameras_enabled IS DISTINCT FROM OLD.cameras_enabled
   OR NEW.host_user_id IS DISTINCT FROM OLD.host_user_id
   OR NEW.answer_seconds IS DISTINCT FROM OLD.answer_seconds
  THEN RAISE EXCEPTION 'Cannot modify immutable game setup columns';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS games_lock_setup_columns_trg ON games;
CREATE TRIGGER games_lock_setup_columns_trg BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION games_lock_setup_columns();

DROP POLICY IF EXISTS "Allow full anonymous access to players" ON players;
DROP POLICY IF EXISTS "players_select" ON players;
DROP POLICY IF EXISTS "players_insert" ON players;
DROP POLICY IF EXISTS "players_update" ON players;
CREATE POLICY "players_select" ON players FOR SELECT USING (true);
CREATE POLICY "players_insert" ON players FOR INSERT
  WITH CHECK (slot BETWEEN 0 AND 5 AND role IN ('host','player')
    AND char_length(name) BETWEEN 1 AND 40 AND score = 0);
CREATE POLICY "players_update" ON players FOR UPDATE USING (true)
  WITH CHECK (slot BETWEEN 0 AND 5 AND role IN ('host','player')
    AND char_length(name) BETWEEN 1 AND 40);

CREATE OR REPLACE FUNCTION players_lock_identity_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF  NEW.id IS DISTINCT FROM OLD.id
   OR NEW.created_at IS DISTINCT FROM OLD.created_at
   OR NEW.game_id IS DISTINCT FROM OLD.game_id
   OR NEW.client_id IS DISTINCT FROM OLD.client_id
   OR NEW.slot IS DISTINCT FROM OLD.slot
   OR NEW.role IS DISTINCT FROM OLD.role
  THEN RAISE EXCEPTION 'Cannot modify immutable player columns';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS players_lock_identity_columns_trg ON players;
CREATE TRIGGER players_lock_identity_columns_trg BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION players_lock_identity_columns();
