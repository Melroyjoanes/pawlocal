ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS experience_years   integer,
  ADD COLUMN IF NOT EXISTS languages          text[],
  ADD COLUMN IF NOT EXISTS pet_types_handled  text[],
  ADD COLUMN IF NOT EXISTS neighbourhood_tags text[],
  ADD COLUMN IF NOT EXISTS intro_note         text;
