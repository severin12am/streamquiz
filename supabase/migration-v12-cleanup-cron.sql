-- ============================================================
-- WhoSmarter — Migration v12: scheduled cleanup of old games
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor. Safe to re-run.
--
-- WHY: game rows are ephemeral quiz sessions but never get deleted, so the
--   `games` table (and `players`, via ON DELETE CASCADE) grows forever. That
--   bloats the table, slows queries, and adds load to Realtime. This sets up
--   a pg_cron job that prunes old games automatically — no external trigger,
--   no serverless cold starts.
--
-- RETENTION:
--   • Any game older than 24h is removed.
--   • Finished games (status='ended') older than 3h are removed sooner.
--   Deleting a game cascades to its players rows automatically.
--
-- NOTE: pg_cron must be available. On Supabase it usually is; if
--   `create extension` fails due to permissions, enable "pg_cron" first via
--   Dashboard → Database → Extensions, then re-run this file.
-- ============================================================

-- 1. Enable the scheduler extension (no-op if already enabled).
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. The cleanup routine. SECURITY DEFINER so the cron job (which runs as the
--    job owner) can delete regardless of RLS.
CREATE OR REPLACE FUNCTION cleanup_old_games()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  DELETE FROM games
  WHERE created_at < NOW() - INTERVAL '24 hours'
     OR (status = 'ended' AND created_at < NOW() - INTERVAL '3 hours');
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

-- 3. (Re)schedule the job to run every hour, on the hour.
--    Unschedule any prior version first so re-running this file is idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-games') THEN
    PERFORM cron.unschedule('cleanup-old-games');
  END IF;
END $$;

SELECT cron.schedule(
  'cleanup-old-games',
  '0 * * * *',                 -- every hour at minute 0
  $$ SELECT cleanup_old_games(); $$
);

-- -------------------------------------------------------
-- Verify / inspect:
--   SELECT * FROM cron.job WHERE jobname = 'cleanup-old-games';
--   SELECT * FROM cron.job_run_details
--     WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname='cleanup-old-games')
--     ORDER BY start_time DESC LIMIT 10;
--
-- Run it manually right now (returns rows deleted):
--   SELECT cleanup_old_games();
--
-- Change retention: edit the INTERVALs in cleanup_old_games() and re-run.
-- Remove the job entirely:
--   SELECT cron.unschedule('cleanup-old-games');
-- -------------------------------------------------------
