-- Add verified badge to providers
ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Index for fast filtering of verified providers
CREATE INDEX IF NOT EXISTS idx_providers_is_verified ON providers(is_verified);
