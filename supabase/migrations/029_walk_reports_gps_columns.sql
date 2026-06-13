-- Add GPS columns to walk_reports if they were created before migration 026.
-- Safe to run multiple times.

ALTER TABLE walk_reports
  ADD COLUMN IF NOT EXISTS route_points    jsonb,
  ADD COLUMN IF NOT EXISTS distance_meters numeric(10, 2),
  ADD COLUMN IF NOT EXISTS poop_events     jsonb,
  ADD COLUMN IF NOT EXISTS pee_events      jsonb,
  ADD COLUMN IF NOT EXISTS start_location  text,
  ADD COLUMN IF NOT EXISTS end_location    text;
