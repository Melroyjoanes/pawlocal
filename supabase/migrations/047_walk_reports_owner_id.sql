-- Add owner_id to walk_reports so parents can see their reports in /my-reports
-- without needing to claim them. This links QR walker reports directly to the parent.
ALTER TABLE walk_reports ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS walk_reports_owner_id_idx ON walk_reports(owner_id);

-- Backfill owner_id from existing connection_id links
-- For reports that have connection_id set, look up the owner from walker_connections
UPDATE walk_reports wr
SET owner_id = wc.owner_id
FROM walker_connections wc
WHERE wr.connection_id = wc.id
  AND wr.owner_id IS NULL;
