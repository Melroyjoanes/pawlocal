-- Support providers offering multiple service categories
ALTER TABLE providers ADD COLUMN IF NOT EXISTS category_slugs text[] DEFAULT '{}';

-- Backfill from existing category_slug so old providers show up in the right category
UPDATE providers
SET category_slugs = ARRAY[category_slug]
WHERE category_slug IS NOT NULL
  AND (category_slugs IS NULL OR array_length(category_slugs, 1) IS NULL OR array_length(category_slugs, 1) = 0);

-- GIN index for fast array containment queries (@>)
CREATE INDEX IF NOT EXISTS idx_providers_category_slugs ON providers USING GIN(category_slugs);
