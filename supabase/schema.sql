-- ============================================================
-- WhoSmarter — Supabase Database Schema
-- Run this entire file in your Supabase SQL Editor once.
-- ============================================================
-- 
-- HOW TO RUN:
--   1. Open your Supabase project dashboard
--   2. Go to SQL Editor → New Query
--   3. Paste this entire file and click "Run"
-- ============================================================

-- -------------------------------------------------------
-- 1. GAMES TABLE
--    One row per quiz session.
--    All game state lives here and is synced in real-time.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS games (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at             TIMESTAMPTZ DEFAULT NOW(),

  -- Setup (set at creation, never change)
  topic                  TEXT NOT NULL,
  difficulty             TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  num_questions          INTEGER NOT NULL CHECK (num_questions BETWEEN 3 AND 250),
  mc_mode                BOOLEAN DEFAULT FALSE,
  answer_seconds         INTEGER NOT NULL DEFAULT 20 CHECK (answer_seconds BETWEEN 5 AND 30),

  -- Host-chosen on the create screen. FALSE (default) = no cameras
  -- requested; players still get a mic (voice answers + peer audio work).
  cameras_enabled        BOOLEAN DEFAULT FALSE,

  -- Game mode:
  --   'regular'  → UI: "Every answer counts" (default)
  --   'hardcore' → UI: "Only first answer counts"
  --   'think'/'classic' → legacy modes, kept for older rows
  game_mode              TEXT DEFAULT 'regular'
                           CHECK (game_mode IN ('regular', 'hardcore', 'think', 'classic')),

  -- Generated questions array — stored as JSON.
  -- Each item: { question, options (MC only), correct_answer (MC only) }
  questions              JSONB DEFAULT '[]'::JSONB,

  -- Live game state (updated constantly during gameplay)
  status                 TEXT DEFAULT 'waiting'
                           CHECK (status IN ('waiting', 'ready', 'playing', 'ended')),

  -- Which question we're on (0-indexed)
  current_question_index INTEGER DEFAULT 0,

  -- Current phase of one question round:
  --   waiting    → game not started
  --   thinking   → (think mode) locked countdown, no buzz/speak/click yet
  --   question   → question is shown, waiting for BUZZ / MC click
  --   buzzing    → someone buzzed, 2-second window before they speak
  --   answering  → voice recognition active
  --   judging    → host is clicking Correct / Wrong
  --   result     → brief display of correct/wrong before next question
  --   ended      → all questions done
  phase                  TEXT DEFAULT 'waiting'
                           CHECK (phase IN (
                             'waiting','thinking','question','buzzing',
                             'answering','checking','judging','result','ended'
                           )),

  -- Who buzzed: 'host' | 'player' | NULL
  -- BUZZ race: supabase uses server-side timestamp to pick the winner
  buzz_player            TEXT DEFAULT NULL CHECK (buzz_player IN ('host', 'player', NULL)),
  buzz_time              TIMESTAMPTZ DEFAULT NULL,

  -- Scores
  host_score             INTEGER DEFAULT 0,
  player_score           INTEGER DEFAULT 0,

  -- Voice transcript (legacy single-answer field; kept for compat).
  current_transcript     TEXT DEFAULT '',

  -- Per-player voice transcripts + judged correctness. In voice mode
  -- both players talk freely (no buzzer); each answer is transcribed
  -- into their own column and judged independently so both can score.
  host_transcript        TEXT DEFAULT '',
  player_transcript      TEXT DEFAULT '',
  host_correct           BOOLEAN DEFAULT NULL,
  player_correct         BOOLEAN DEFAULT NULL,
  -- "Done" lock-in: when both are true the voice round advances early.
  host_done              BOOLEAN DEFAULT FALSE,
  player_done            BOOLEAN DEFAULT FALSE,

  -- MC answer picked by the winner: 0-3 index, or NULL (legacy single).
  mc_answer_index        INTEGER DEFAULT NULL,

  -- Per-player MC picks (0-3 index, or NULL = not answered). Both can
  -- answer within a short grace window so near-simultaneous correct
  -- answers BOTH score (fair regardless of connection speed).
  host_mc_index          INTEGER DEFAULT NULL,
  player_mc_index        INTEGER DEFAULT NULL,

  -- Result of the most recent answer so BOTH clients show the same
  -- ✓/✗ (TRUE=correct, FALSE=wrong, NULL=not judged yet).
  answer_correct         BOOLEAN DEFAULT NULL,

  -- ---- v2: robust transitions, steal mechanic, streaks ----

  -- When the current timed phase should auto-advance. Both clients
  -- watch this; EITHER can drive the transition (robust to a host
  -- disconnect). NULL = no timed deadline.
  phase_deadline         TIMESTAMPTZ DEFAULT NULL,

  -- Steal/rebound: TRUE while the OTHER player gets a second chance
  -- after the first player answered wrong.
  is_steal               BOOLEAN DEFAULT FALSE,

  -- Who answered first this round (during a steal only the OTHER
  -- player may buzz). 'host' | 'player' | NULL.
  first_answerer         TEXT DEFAULT NULL,

  -- Consecutive-correct streak counters (drive score multipliers).
  streak_host            INTEGER DEFAULT 0,
  streak_player          INTEGER DEFAULT 0,

  -- Points awarded on the most recent correct answer + who scored
  -- (used for the score pop animation). last_scorer: host|player|null.
  last_points            INTEGER DEFAULT 0,
  last_scorer            TEXT DEFAULT NULL,

  -- Rematch voting: a rematch starts when the host AND at least one
  -- other player have accepted. Reset when a new match begins.
  rematch_host           BOOLEAN DEFAULT FALSE,
  rematch_player         BOOLEAN DEFAULT FALSE,

  -- ---- v13: host-only Google auth ----
  -- The Supabase auth user id of the host who created the game (set by the
  -- server in /api/create-game). NULL for legacy rows / anonymous creation.
  host_user_id           UUID DEFAULT NULL,

  -- ---- v15: global rooms ----
  -- Discoverable in Browse while status=waiting. Default false (invite only).
  -- Host Start may only set true → false (cannot re-list).
  is_public              BOOLEAN NOT NULL DEFAULT FALSE
);

-- -------------------------------------------------------
-- 2. ROW LEVEL SECURITY (hardened — see migration-v11-rls-hardening.sql)
--    games:
--      • INSERT/DELETE → DENIED for the anon key. Games are created ONLY by
--        the server (/api/create-game) using the SERVICE ROLE key (which
--        bypasses RLS). Stops spam game creation + griefer deletes.
--      • SELECT/UPDATE → allowed (join-by-link + realtime + client-driven
--        game loop). Immutable setup columns are locked by a trigger below.
--
--    ⚠️ No per-user auth: the anon key is public and client_id is
--       self-asserted, so anyone with a game's UUID (the invite link) can
--       read/write that game's live state. For true per-participant
--       isolation, add Supabase Auth or route all writes through the server.
-- -------------------------------------------------------
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full anonymous access" ON games;
DROP POLICY IF EXISTS "games_select" ON games;
DROP POLICY IF EXISTS "games_update" ON games;

CREATE POLICY "games_select" ON games FOR SELECT USING (true);
CREATE POLICY "games_update" ON games FOR UPDATE USING (true) WITH CHECK (true);
-- (no INSERT/DELETE policy → denied for anon; service role bypasses RLS)

-- Lock immutable setup columns on UPDATE (questions stays mutable for rematch).
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

DROP TRIGGER IF EXISTS games_lock_setup_columns_trg ON games;
CREATE TRIGGER games_lock_setup_columns_trg
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION games_lock_setup_columns();

-- -------------------------------------------------------
-- 3. REAL-TIME
--    Tell Supabase to stream changes on the games table.
--    This powers the live-sync between Host and Player.
-- -------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- -------------------------------------------------------
-- 4. HELPFUL INDEXES
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS games_created_at_idx ON games (created_at DESC);
CREATE INDEX IF NOT EXISTS games_public_waiting_idx
  ON games (created_at DESC)
  WHERE is_public = TRUE AND status = 'waiting';

-- -------------------------------------------------------
-- 5. PLAYERS TABLE — one row per participant (up to 6 players)
--    All PER-PLAYER state lives here so six people can answer at the
--    same time without clobbering each other. The games row above keeps
--    only SHARED state (question, phase, deadline). The host_*/player_*
--    columns on `games` are legacy (2-player era) and unused by the app.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  -- Stable per-browser id (localStorage) → a reload re-attaches to the
  -- SAME row instead of taking a new seat.
  client_id   TEXT NOT NULL,
  name        TEXT NOT NULL,

  -- 'host' (creator, slot 0, can start/rematch) or 'player' (slots 1..5).
  role        TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('host', 'player')),
  slot        INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 5),

  score       INTEGER NOT NULL DEFAULT 0,

  -- Per-round state (reset at the start of every question)
  mc_index    INTEGER DEFAULT NULL,           -- MC pick 0-3, NULL = none
  transcript  TEXT NOT NULL DEFAULT '',        -- voice answer this round
  correct     BOOLEAN DEFAULT NULL,            -- judged correct? NULL before
  done        BOOLEAN NOT NULL DEFAULT FALSE,  -- voice "Done" lock-in

  -- When this player committed their answer this round (server time, stamped
  -- locally via serverNow()). 'hardcore' mode uses it to decide who was first
  -- without rewarding a faster connection. NULL = not answered yet.
  answered_at TIMESTAMPTZ DEFAULT NULL,

  rematch     BOOLEAN NOT NULL DEFAULT FALSE,  -- rematch vote

  UNIQUE (game_id, slot),
  UNIQUE (game_id, client_id)
);

-- RLS (hardened): read/insert/update allowed + validated; DELETE denied for
-- anon (cascades on game delete only). Identity columns locked by a trigger.
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full anonymous access to players" ON players;
DROP POLICY IF EXISTS "players_select" ON players;
DROP POLICY IF EXISTS "players_insert" ON players;
DROP POLICY IF EXISTS "players_update" ON players;

CREATE POLICY "players_select" ON players FOR SELECT USING (true);

CREATE POLICY "players_insert" ON players FOR INSERT
  WITH CHECK (
    slot BETWEEN 0 AND 5
    AND role IN ('host', 'player')
    AND char_length(name) BETWEEN 1 AND 40
    AND score = 0
  );

CREATE POLICY "players_update" ON players FOR UPDATE
  USING (true)
  WITH CHECK (
    slot BETWEEN 0 AND 5
    AND role IN ('host', 'player')
    AND char_length(name) BETWEEN 1 AND 40
  );

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
  FOR EACH ROW EXECUTE FUNCTION players_lock_identity_columns();

ALTER PUBLICATION supabase_realtime ADD TABLE players;

CREATE INDEX IF NOT EXISTS players_game_id_idx ON players (game_id);

-- -------------------------------------------------------
-- 5b. GAME BANS + ban insert trigger (host kick)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_bans (
  game_id              UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  client_id            TEXT NOT NULL,
  banned_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  banned_by_player_id  UUID NULL,
  PRIMARY KEY (game_id, client_id)
);
CREATE INDEX IF NOT EXISTS game_bans_game_id_idx ON game_bans (game_id);
ALTER TABLE game_bans ENABLE ROW LEVEL SECURITY;

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

-- -------------------------------------------------------
-- 6. TELEMETRY — anonymous product metrics (service role only)
--    See docs/ANALYTICS.md and migration-v14-telemetry.sql.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry_events (
  id           BIGSERIAL PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event        TEXT NOT NULL,
  game_ref     TEXT,
  platform     TEXT,
  locale       TEXT,
  difficulty   TEXT,
  game_mode    TEXT,
  mc_mode      BOOLEAN,
  cameras_on   BOOLEAN,
  num_questions SMALLINT,
  player_count  SMALLINT,
  is_public    BOOLEAN,
  status       TEXT,
  webrtc_pairs_total     SMALLINT,
  webrtc_pairs_p2p       SMALLINT,
  webrtc_pairs_relay     SMALLINT,
  webrtc_pairs_failed    SMALLINT,
  relay_provider         TEXT,
  bytes_sent_total       BIGINT,
  bytes_recv_total       BIGINT,
  cameras_enabled_mesh   BOOLEAN,
  meta         JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS telemetry_events_created_at_idx
  ON telemetry_events (created_at DESC);
CREATE INDEX IF NOT EXISTS telemetry_events_event_idx
  ON telemetry_events (event, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS telemetry_game_created_uniq
  ON telemetry_events (game_ref)
  WHERE event = 'game_created' AND game_ref IS NOT NULL;

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies — service role only.

-- -------------------------------------------------------
-- Done! You can verify with:
--   SELECT * FROM games LIMIT 5;
--   SELECT * FROM players LIMIT 5;
-- -------------------------------------------------------
