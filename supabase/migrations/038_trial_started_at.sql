-- Add trial tracking to profiles
-- trial_started_at is set the first time a pet parent claims a walk or grooming report.
-- The free trial lasts 14 days from this date. After that, a subscription is required.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NULL;
