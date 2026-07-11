-- ============================================================
-- WhoSmarter — Migration v14: privacy-safe product telemetry
-- ============================================================
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
--
-- Stores anonymous game/settings/WebRTC path stats for the operator.
-- NO names, emails, IPs, topics, or account ids.
-- RLS: no policies for anon/authenticated → only service role can read/write.
-- Retention: 90 days (folded into cleanup_old_games when that function exists).
-- ============================================================

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

-- One game_created per game id (rematches reuse the same game_ref, so
-- finish/webrtc summaries are allowed multiple times).
CREATE UNIQUE INDEX IF NOT EXISTS telemetry_game_created_uniq
  ON telemetry_events (game_ref)
  WHERE event = 'game_created' AND game_ref IS NOT NULL;

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
-- Intentionally no GRANT/policies for anon or authenticated.

-- Extend cleanup if v12 function exists; otherwise define a standalone pruner.
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
  DELETE FROM games
  WHERE created_at < NOW() - INTERVAL '24 hours'
     OR (status = 'ended' AND created_at < NOW() - INTERVAL '3 hours');
  GET DIAGNOSTICS removed = ROW_COUNT;

  DELETE FROM telemetry_events
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS tel_removed = ROW_COUNT;

  RETURN removed;
END;
$$;

-- -------------------------------------------------------
-- Useful queries (Supabase SQL Editor):
--
-- Creates per day, web vs ios:
--   SELECT date_trunc('day', created_at) AS day, platform, COUNT(*)
--   FROM telemetry_events WHERE event = 'game_created'
--   GROUP BY 1, 2 ORDER BY 1 DESC;
--
-- P2P vs TURN:
--   SELECT SUM(webrtc_pairs_p2p), SUM(webrtc_pairs_relay), SUM(webrtc_pairs_failed)
--   FROM telemetry_events WHERE event = 'webrtc_summary';
-- -------------------------------------------------------
