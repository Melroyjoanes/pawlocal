-- ============================================================
-- 066_admin_actions.sql
-- Audit log for privileged admin actions taken from the admin UI.
--
-- WHY THIS EXISTS
-- Until now, an admin could grant free Pro access, cancel a
-- renewal, or revoke access outright from a single button in
-- app/admin/(protected)/AdminV2Client.tsx, and the only trace left
-- behind was the mutated row in `subscriptions`. That row does not
-- say WHO changed it, WHEN, or WHY — an admin grant and a real
-- Razorpay payment are distinguishable only by amount_paise = 0,
-- and a revoke is indistinguishable from a normal cancellation.
--
-- That is survivable while exactly one person (ADMIN_EMAIL) has
-- access. It stops being survivable the moment a second admin or an
-- agency helper is added: there would be no way to answer "who gave
-- this account free access?" or "who cut this paying customer off?"
-- This table is the record that makes that answerable, and it needs
-- to exist BEFORE the second admin, not after the first incident.
--
-- WHAT WRITES TO IT
-- app/api/admin/v2/parents/[userId]/action/route.ts, on every
-- grant / cancel / revoke — including failed attempts, so a botched
-- action is visible too. The write is wrapped in try/catch there:
-- logging must never be able to break the admin action itself. That
-- means this log is best-effort, not a guarantee — it is an audit
-- trail, not a transactional ledger.
--
-- COLUMNS
--   admin_email    — the authenticated admin's email at action time.
--                    Stored as plain text, NOT a FK to auth.users, so
--                    the trail survives the account being deleted.
--   action         — 'grant' | 'cancel' | 'revoke' today. Left as free
--                    text rather than an enum so new admin actions can
--                    start logging without a migration.
--   target_user_id — the parent being acted on. Also deliberately not a
--                    FK: if the user is deleted, the record of what was
--                    done to them must remain.
--   metadata       — free-form context (e.g. grant length, resulting
--                    expiry, subscription row id, error message on a
--                    failed action). Shape is intentionally not fixed.
--   created_at     — when it happened.
--
-- APPEND-ONLY BY CONVENTION: nothing in the app updates or deletes
-- rows here, and nothing should. There is no cleanup job — this table
-- grows slowly (a handful of rows a month) and its whole value is that
-- old entries are still there.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_actions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email    text NOT NULL,
  action         text NOT NULL,
  target_user_id uuid,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Two read patterns this is for: "what happened recently?" (the whole
-- log, newest first) and "what was ever done to this parent?".
CREATE INDEX IF NOT EXISTS admin_actions_created_at_idx ON admin_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_actions_target_user_idx ON admin_actions (target_user_id, created_at DESC);

-- RLS on with NO policies — the same deliberate pattern as
-- 063_rate_limit_hits.sql. No policies means anon and authenticated
-- roles get zero access (not even read); service_role bypasses RLS
-- regardless, so the server-side admin client can still write. For an
-- audit log this is the important half: an admin signed in through the
-- normal client-side Supabase session cannot read, alter, or erase the
-- record of their own actions from the browser.
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
