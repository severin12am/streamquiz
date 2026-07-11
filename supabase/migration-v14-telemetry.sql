-- ============================================================
-- WhoSmarter — Migration v14: privacy-safe product telemetry
-- ============================================================
-- Run ONCE in your Supabase SQL Editor. Safe to re-run.
--
-- WHAT THIS DOES (safe for existing schema):
--   1. CREATE TABLE IF NOT EXISTS telemetry_events  → no overwrite of games/players
--   2. CREATE INDEX IF NOT EXISTS                   → no-op if already present
--   3. ENABLE RLS on telemetry_events only          → does not change games/players RLS
--   4. CREATE OR REPLACE cleanup_old_games()        → same function name as v12;
--      keeps the existing games retention rules and ADDS a 90-day prune of
--      telemetry_events only. Does NOT drop tables. Does NOT run DELETE
--      immediately when you execute this script — DELETE only runs later when
--      the hourly cron job (from migration-v12) calls cleanup_old_games().
--
-- WHAT THIS DOES NOT DO:
--   • Does not alter games / players columns or policies
--   • Does not drop any table
--   • Does not delete rows at migration time
--   • Does not touch pg_cron schedule (v12 already schedules hourly cleanup)
--
-- If you never ran migration-v12, this still creates cleanup_old_games() so you
-- can call SELECT cleanup_old_games(); manually; cron scheduling remains optional.
--
-- Privacy: NO names, emails, IPs, topics, or account ids in telemetry_events.
-- ============================================================

-- 1) New table (independent of games/players)
CREATE TABLE IF NOT EXISTS telemetry_events (
  id           BIGSERIAL PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  event        TEXT NOT NULL,
  -- game_created | game_finished | webrtc_summary | ice_config_served

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

-- One game_created row per game id (rematches may send multiple finish/webrtc rows).
CREATE UNIQUE INDEX IF NOT EXISTS telemetry_game_created_uniq
  ON telemetry_events (game_ref)
  WHERE event = 'game_created' AND game_ref IS NOT NULL;

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies → only service role can read/write.

-- 2) Extend the existing v12 cleanup function (same signature: returns integer).
--    Games retention rules UNCHANGED from migration-v12.
--    NEW: also delete telemetry older than 90 days when the function runs.
CREATE OR REPLACE FUNCTION cleanup_old_games()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
  tel_removed integer;
BEGIN
  -- Same as v12: prune ephemeral quiz sessions
  DELETE FROM games
  WHERE created_at < NOW() - INTERVAL '24 hours'
     OR (status = 'ended' AND created_at < NOW() - INTERVAL '3 hours');
  GET DIAGNOSTICS removed = ROW_COUNT;

  -- New: prune old anonymous metrics (table may be empty; always safe)
  DELETE FROM telemetry_events
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS tel_removed = ROW_COUNT;

  RETURN removed;
END;
$$;

-- -------------------------------------------------------
-- Supabase SQL Editor may warn "destructive operations" because this
-- script CONTAINS the word DELETE inside the function body. That is
-- expected. Running this migration does NOT delete data right now.
--
-- Verify table:
--   SELECT * FROM telemetry_events LIMIT 5;
--
-- Verify cleanup still works (optional, runs deletes for OLD rows only):
--   SELECT cleanup_old_games();
--
-- Useful queries: docs/TELEMETRY_VISUALIZE.md
-- iOS parity:      docs/TELEMETRY_IOS.md
-- -------------------------------------------------------
