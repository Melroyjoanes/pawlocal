-- ============================================================
-- STEP 1: BACKUP V1 DATA FIRST
-- Creates backup_ tables so you can recover email IDs anytime
-- ============================================================

-- Backup old V1 walk reports (with provider emails via join)
CREATE TABLE IF NOT EXISTS backup_v1_walk_reports AS
SELECT
  wr.*,
  p.email AS provider_email,
  p.name  AS provider_name
FROM walk_reports wr
LEFT JOIN providers p ON p.id = wr.provider_id
WHERE wr.provider_id IS NOT NULL
  AND wr.connection_id IS NULL;

-- Backup provider_clients (has owner email IDs you need)
CREATE TABLE IF NOT EXISTS backup_v1_provider_clients AS
SELECT * FROM provider_clients;

-- Backup broadcasts (has poster emails)
CREATE TABLE IF NOT EXISTS backup_v1_broadcasts AS
SELECT * FROM broadcasts;

-- Backup walk sessions (old live tracking)
CREATE TABLE IF NOT EXISTS backup_v1_walk_sessions AS
SELECT * FROM walk_sessions;

-- Backup grooming reports
CREATE TABLE IF NOT EXISTS backup_v1_grooming_reports AS
SELECT * FROM grooming_reports;

-- Backup analytics events
CREATE TABLE IF NOT EXISTS backup_v1_analytics_events AS
SELECT * FROM analytics_events;

-- Backup invites
CREATE TABLE IF NOT EXISTS backup_v1_invites AS
SELECT * FROM pet_parent_invites;

-- ── Quick view: all unique emails from old V1 data ────────────────────────────
-- Run this SELECT to see all email IDs before deleting anything:
/*
SELECT DISTINCT email, 'provider_clients' AS source FROM provider_clients WHERE email IS NOT NULL
UNION ALL
SELECT DISTINCT owner_whatsapp, 'provider_clients whatsapp' FROM provider_clients WHERE owner_whatsapp IS NOT NULL
UNION ALL
SELECT DISTINCT poster_name, 'broadcasts' FROM broadcasts
ORDER BY 1;
*/

-- ============================================================
-- STEP 2: DELETE V1 DATA (only after backup tables are created)
-- ============================================================

-- Delete old V1 provider walk reports
DELETE FROM walk_reports
WHERE provider_id IS NOT NULL
  AND connection_id IS NULL;

-- Clear V1-only tables
TRUNCATE TABLE grooming_reports;
TRUNCATE TABLE broadcasts;
TRUNCATE TABLE provider_analytics;
TRUNCATE TABLE walk_sessions;
TRUNCATE TABLE analytics_events;
TRUNCATE TABLE provider_clients;
TRUNCATE TABLE pet_parent_invites;

-- ============================================================
-- DONE.
-- Your backup tables are preserved as backup_v1_* and can be
-- queried anytime: SELECT * FROM backup_v1_provider_clients;
-- ============================================================
