-- ============================================================
-- WhoSmarter — Migration v8: MULTIPLAYER (up to 6 players)
-- Run this in your Supabase SQL Editor on an EXISTING project.
-- (Fresh projects can just run schema.sql, which already includes this.)
-- ============================================================
--
-- WHAT THIS CHANGES
--   The original game was strictly 2-player (one fixed "host" column
--   and one fixed "player" column for every piece of state). To support
--   up to SIX players we move all per-player state into its OWN table:
--   `players`, one row per participant. Each client only ever writes its
--   OWN row, so six people can answer at the same time with no clobbering.
--
--   The `games` row keeps only SHARED state (the question, the phase, the
--   deadline). The old host_*/player_* columns are left in place but are
--   no longer used by the app — you can drop them later if you like.
-- ============================================================

-- -------------------------------------------------------
-- 1. PLAYERS TABLE — one row per participant (host + guests)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  -- Stable per-browser id (kept in localStorage) so a reload re-attaches
  -- to the SAME row instead of taking a new slot.
  client_id   TEXT NOT NULL,

  -- Display name the player typed when joining.
  name        TEXT NOT NULL,

  -- 'host'  → the creator (slot 0); can start the game / rematch.
  -- 'player'→ everyone else (slots 1..5).
  role        TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('host', 'player')),

  -- Seat number 0..5. Slot 0 is always the host.
  slot        INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 5),

  -- Running score across the match.
  score       INTEGER NOT NULL DEFAULT 0,

  -- ---- Per-round state (reset at the start of every question) ----
  -- Multiple-choice pick this round: 0-3 index, or NULL = not answered.
  mc_index    INTEGER DEFAULT NULL,
  -- Voice transcript this round (each player talks into their own column).
  transcript  TEXT NOT NULL DEFAULT '',
  -- Was THIS player correct this round? TRUE/FALSE once judged, NULL before.
  correct     BOOLEAN DEFAULT NULL,
  -- Voice "Done" lock-in. When EVERY player is done the round advances early.
  done        BOOLEAN NOT NULL DEFAULT FALSE,

  -- Rematch vote (reset when a new match begins).
  rematch     BOOLEAN NOT NULL DEFAULT FALSE,

  -- One row per seat, and one row per browser, within a game.
  UNIQUE (game_id, slot),
  UNIQUE (game_id, client_id)
);

-- -------------------------------------------------------
-- 2. ROW LEVEL SECURITY — fully open (link-based private game)
-- -------------------------------------------------------
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full anonymous access to players" ON players;
CREATE POLICY "Allow full anonymous access to players"
  ON players FOR ALL
  USING (true)
  WITH CHECK (true);

-- -------------------------------------------------------
-- 3. REAL-TIME — stream player changes to every client
-- -------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- -------------------------------------------------------
-- 4. INDEX — fast lookup of all players in a game
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS players_game_id_idx ON players (game_id);

-- -------------------------------------------------------
-- Done! Verify with:  SELECT * FROM players LIMIT 5;
-- -------------------------------------------------------
