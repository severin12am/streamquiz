-- ============================================================
-- WhoSmarter — Migration v14: privacy-safe product telemetry
-- ============================================================
-- Run ONCE in Supabase SQL Editor.
--
-- This file ONLY creates a table + indexes + RLS.
-- It does NOT delete any existing data.
--
-- Stores anonymous game/settings/WebRTC path stats for the operator.
-- NO names, emails, IPs, topics, or account ids.
-- RLS: no policies for anon/authenticated → only service role can read/write.
--
-- Optional 90-day retention: see bottom comment (run separately if you want).
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

-- One game_created row per game id.
CREATE UNIQUE INDEX IF NOT EXISTS telemetry_game_created_uniq
  ON telemetry_events (game_ref)
  WHERE event = 'game_created' AND game_ref IS NOT NULL;

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies for anon/authenticated (service role only).

-- Verify:
--   SELECT * FROM telemetry_events LIMIT 5;

-- -------------------------------------------------------
-- OPTIONAL later (separate query — contains DELETE, so Supabase warns):
--
--   DELETE FROM telemetry_events
--   WHERE created_at < NOW() - INTERVAL '90 days';
--
-- Or fold into cleanup_old_games() from migration-v12 if you already use it.
-- -------------------------------------------------------
