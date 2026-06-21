-- 041: Drop pg_net webhook triggers (pg_net extension not installed on this project)
-- These triggers were breaking walker_connections, dogs, and other inserts.
-- Manual sync via: node scripts/setup-google-sheets.mjs

DROP TRIGGER IF EXISTS sheets_walker_connections ON walker_connections;
DROP TRIGGER IF EXISTS sheets_dogs ON dogs;
DROP TRIGGER IF EXISTS sheets_subscriptions ON subscriptions;
DROP TRIGGER IF EXISTS sheets_walk_logs ON walk_logs;
DROP TRIGGER IF EXISTS sheets_walk_sessions ON walk_sessions;
DROP TRIGGER IF EXISTS sheets_providers ON providers;
DROP FUNCTION IF EXISTS public.send_sheets_webhook() CASCADE;
