-- ============================================================
-- RUN ALL PENDING MIGRATIONS IN SUPABASE SQL EDITOR
-- Paste this entire file and click Run
-- Safe to run multiple times (all use IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- Migration 043: Walk reports for QR walkers (walker_name, connection_id)
ALTER TABLE walk_reports ALTER COLUMN provider_id DROP NOT NULL;
ALTER TABLE walk_reports ADD COLUMN IF NOT EXISTS walker_name text;
ALTER TABLE walk_reports ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES walker_connections(id) ON DELETE SET NULL;

-- Migration 044: Walkers table (permanent profile per phone number)
CREATE TABLE IF NOT EXISTS walkers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         text UNIQUE NOT NULL,
  name          text NOT NULL,
  role          text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  total_walks   integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE walker_connections ADD COLUMN IF NOT EXISTS walker_id uuid REFERENCES walkers(id) ON DELETE SET NULL;
ALTER TABLE walkers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "walkers_service_role_all" ON walkers;
CREATE POLICY "walkers_service_role_all" ON walkers FOR ALL USING (true);

-- Migration 045: Walk report quality score (0-100)
ALTER TABLE walk_reports ADD COLUMN IF NOT EXISTS quality_score integer DEFAULT NULL;
CREATE INDEX IF NOT EXISTS walk_reports_quality_score_idx ON walk_reports(quality_score);

-- Migration 046: Dog care focus mode
ALTER TABLE dogs ADD COLUMN IF NOT EXISTS care_focus text DEFAULT 'normal';

-- *** CRITICAL — Migration 047: owner_id on walk_reports ***
-- This is WHY /my-reports shows no data. Run this to fix it.
ALTER TABLE walk_reports ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS walk_reports_owner_id_idx ON walk_reports(owner_id);

-- Backfill owner_id from connection_id for all existing reports
UPDATE walk_reports wr
SET owner_id = wc.owner_id
FROM walker_connections wc
WHERE wr.connection_id = wc.id
  AND wr.owner_id IS NULL;

-- Migration 048: Profile phone + notification preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb
  DEFAULT '{"report_email": true, "weekly_summary": true}'::jsonb;

-- Migration 049: Walk report email tracking
ALTER TABLE walk_reports ADD COLUMN IF NOT EXISTS email_sent_at timestamptz DEFAULT NULL;

-- ============================================================
-- Done. Reload pupstep.in/my-reports — your reports will appear.
-- ============================================================
