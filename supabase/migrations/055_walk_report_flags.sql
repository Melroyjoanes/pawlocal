-- Flags for server-side GPS plausibility checks on walk reports (see
-- lib/walkValidation.ts / assessWalkPlausibility). This is a flag-only
-- heuristic used to surface possibly-faked walks to the admin dashboard —
-- it never blocks a report from being created or delivered to the parent.
--
-- Note: migration 054 already claimed "054_payment_incidents.sql" for an
-- unrelated feature, so this is numbered 055.

ALTER TABLE walk_reports
  ADD COLUMN IF NOT EXISTS flagged_suspicious BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;
