-- Allow QR-connected walkers (from walker_connections) to create walk reports
-- without needing a row in the providers table.

-- Make provider_id nullable so QR walker reports can omit it
ALTER TABLE walk_reports ALTER COLUMN provider_id DROP NOT NULL;

-- Store the walker's display name directly on the report row
-- (used when provider_id is null — QR / WhatsApp walker flow)
ALTER TABLE walk_reports ADD COLUMN IF NOT EXISTS walker_name text;

-- Link back to the walker_connections row so the parent can claim the report
ALTER TABLE walk_reports ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES walker_connections(id) ON DELETE SET NULL;
