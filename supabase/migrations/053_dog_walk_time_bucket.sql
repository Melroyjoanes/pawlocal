-- Optional daypart the parent expects their dog to usually be walked at.
-- Captured during setup for future use once automated WhatsApp reminders are
-- built (not built yet) — purely data-capture for now.
-- Nullable, no default: absence means "not specified".
-- Valid values: 'morning' | 'afternoon' | 'evening'
ALTER TABLE dogs ADD COLUMN IF NOT EXISTS walk_time_bucket text;

COMMENT ON COLUMN dogs.walk_time_bucket IS
  'Optional parent-set daypart for usual walk time. Valid values: morning | afternoon | evening. Null = not specified.';

ALTER TABLE dogs DROP CONSTRAINT IF EXISTS dogs_walk_time_bucket_check;
ALTER TABLE dogs ADD CONSTRAINT dogs_walk_time_bucket_check
  CHECK (walk_time_bucket IS NULL OR walk_time_bucket IN ('morning', 'afternoon', 'evening'));
