-- Add multi-photo support to grooming_reports
-- before_photo_urls / after_photo_urls store all photos as a JSON array of URLs.
-- The existing before_photo_url / after_photo_url columns remain for backward compat
-- and will be populated with the first photo from the respective array.

ALTER TABLE grooming_reports
  ADD COLUMN IF NOT EXISTS before_photo_urls jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS after_photo_urls  jsonb DEFAULT '[]'::jsonb;
