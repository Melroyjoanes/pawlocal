-- Add neighbourhood column to providers for location-based filtering
-- Default: 'Juhu' (all existing providers are in Juhu)
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS neighbourhood text NOT NULL DEFAULT 'Juhu';

-- Index for fast neighbourhood lookups
CREATE INDEX IF NOT EXISTS providers_neighbourhood_idx ON providers (neighbourhood);

-- Comment: Valid values match the MUMBAI_AREAS list in LocationPicker.tsx
-- 'Juhu', 'Andheri West', 'Andheri East', 'Bandra West', 'Bandra East',
-- 'Versova', 'Santacruz', 'Vile Parle', 'Khar', 'Lokhandwala'
