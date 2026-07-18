-- Dedup tracking for the renewal-reminder cron. Same bug class as trial
-- emails: a 4-day-wide expiry window checked daily, with no memory of who's
-- already been notified, meant the same subscriber got the "renews on X"
-- email up to 5 days in a row. Nullable because it must be CLEARED back to
-- null every time a subscription renews (same row gets its expires_at
-- overwritten in app/api/payments/verify/route.ts, not a new row) so the
-- next billing cycle gets its own fresh reminder.
alter table subscriptions
  add column if not exists renewal_reminder_sent_at timestamptz;
