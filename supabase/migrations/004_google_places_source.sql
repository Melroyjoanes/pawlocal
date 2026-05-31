-- Track where listings come from and deduplicate Google Places imports
ALTER TABLE providers ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS google_place_id text;

-- Unique constraint so re-running the import script never creates duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_google_place_id
  ON providers(google_place_id)
  WHERE google_place_id IS NOT NULL;

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_providers_source ON providers(source);
