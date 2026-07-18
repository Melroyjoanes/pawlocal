-- Dedup tracking for trial lifecycle emails. The trial-expiry cron moves
-- from once-daily to hourly (to hit a 3-4h-before-expiry window on the
-- "ending soon" email) — these columns are what stop that hourly check from
-- sending the same email multiple times, and also cap the "trial has ended"
-- email to fire exactly once instead of every day forever.
alter table profiles
  add column if not exists trial_started_email_sent_at timestamptz,
  add column if not exists trial_ending_email_sent_at timestamptz,
  add column if not exists trial_ended_email_sent_at timestamptz;
