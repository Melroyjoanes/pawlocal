-- Add quality score to walk_reports.
-- Score 0-100: GPS route (30) + dog photo (25) + pee/poop events (20) + duration ≥5min (15) + notes (10)
ALTER TABLE walk_reports ADD COLUMN IF NOT EXISTS quality_score integer DEFAULT NULL;
CREATE INDEX IF NOT EXISTS walk_reports_quality_score_idx ON walk_reports(quality_score);
