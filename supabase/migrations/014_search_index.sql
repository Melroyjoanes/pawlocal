-- Full-text search index on providers
ALTER TABLE providers ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(business_name, '') || ' ' ||
      coalesce(bio, '') || ' ' ||
      coalesce(address, '') || ' ' ||
      coalesce(category_slug, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS providers_fts_idx ON providers USING gin(fts);
