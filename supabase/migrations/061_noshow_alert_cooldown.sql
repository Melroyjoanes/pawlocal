-- 061: Stop the walker-noshow cron from emailing the same parent every single
-- day. Previously it had no memory at all — if a walker never logs a report,
-- the parent got "No walk report from X today" every day, forever, even if
-- the dog was actually being walked and just not logged in the app.
--
-- last_noshow_alert_sent_at tracks whether we've already alerted for the
-- CURRENT unresolved miss-streak. The cron only sends when this is null, and
-- it's reset to null the moment a real walker report comes in for that
-- connection — so a parent gets alerted once when a problem starts, stays
-- quiet while it's ongoing, and can be re-alerted if it happens again later.

alter table walker_connections add column if not exists last_noshow_alert_sent_at timestamptz;

comment on column walker_connections.last_noshow_alert_sent_at is
  'Set when the walker-noshow cron emails the parent about a missing report. Reset to null when a real walk report comes in for this connection, so the next miss can alert again.';
