-- ============================================================
-- CLEAN OLD V1 DATA — Run in Supabase SQL Editor
-- This removes old V1 provider reports and junk data so the
-- admin dashboard only shows clean V2 data going forward.
--
-- SAFE: does NOT delete user accounts or V2 walk reports.
-- ============================================================

-- 1. Delete old V1 provider walk reports
--    (provider_id set = old professional provider, no V2 connection)
DELETE FROM walk_reports
WHERE provider_id IS NOT NULL
  AND connection_id IS NULL;

-- 2. Delete old V1 grooming reports (if table exists)
TRUNCATE TABLE grooming_reports;

-- 3. Clean up old broadcasts (V1 directory feature)
TRUNCATE TABLE broadcasts;

-- 4. Clean up old provider analytics events
TRUNCATE TABLE provider_analytics;

-- 5. Clean up old walk sessions (V1 live tracking, replaced by walk_logs)
TRUNCATE TABLE walk_sessions;

-- 6. Clean up analytics events (old funnel tracking)
TRUNCATE TABLE analytics_events;

-- 7. Remove old provider_clients links (V1 invite system)
TRUNCATE TABLE provider_clients;

-- 8. Remove old invites
TRUNCATE TABLE pet_parent_invites;

-- ============================================================
-- After running: reload /admin — counts will be clean V2 only.
-- ============================================================
