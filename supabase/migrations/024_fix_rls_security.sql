-- ============================================================
-- 024_fix_rls_security.sql
-- Critical RLS lockdown — closes open policies that expose
-- GPS coordinates, earnings, review tokens, and allow
-- unauthenticated writes to sensitive tables.
--
-- All routes that need write access use the service_role key
-- via server-side API routes — no client-side direct DB access.
-- ============================================================

-- ── 1. walk_sessions ─────────────────────────────────────────
-- BEFORE: FOR ALL USING (true) — anyone with anon key could read
--         ALL real-time GPS coordinates for every live walk.
-- AFTER:  Blocked for anon/auth; service_role bypasses RLS.
DROP POLICY IF EXISTS "walk_sessions_service_role_all" ON walk_sessions;

-- No SELECT policy = no row returned for anon or authenticated users.
-- service_role (used in /api/pro/walk/*) always bypasses RLS.

-- ── 2. provider_bookings ─────────────────────────────────────
-- BEFORE: FOR ALL USING (true) — anyone could enumerate all
--         bookings including customer names and earnings data.
-- AFTER:  Blocked; only service_role API routes access this table.
DROP POLICY IF EXISTS "admin_all_bookings" ON provider_bookings;

-- ── 3. review_invites ────────────────────────────────────────
-- BEFORE: FOR ALL USING (true) — anyone could list ALL one-time
--         review tokens and replay them to submit fake reviews.
-- AFTER:  Blocked; token lookup happens only via service_role in
--         /api/reviews/submit (validates token before writing review).
DROP POLICY IF EXISTS "review_invites_service_role" ON review_invites;

-- ── 4. reviews — remove open INSERT ──────────────────────────
-- BEFORE: "anyone can submit a review" WITH CHECK (true) —
--         any anon user could POST directly to the reviews table.
-- AFTER:  No direct INSERT. /api/reviews/submit uses service_role
--         after validating the one-time token server-side.
DROP POLICY IF EXISTS "anyone can submit a review" ON reviews;

-- ── 5. providers — remove open INSERT ────────────────────────
-- BEFORE: "anyone can register" — unauthenticated users could
--         insert arbitrary rows directly into the providers table.
-- AFTER:  /api/pro/join uses service_role; no direct client inserts.
DROP POLICY IF EXISTS "anyone can register" ON providers;

-- ── 6. providers — lock down UPDATE ──────────────────────────
-- BEFORE: "admin can update providers" FOR UPDATE USING (true)
--         WITH CHECK (true) — ANY authenticated user could UPDATE
--         ANY provider record (status, phone, verification flags…).
-- AFTER:  Only service_role can update providers (admin routes +
--         pro profile edit route already use service_role).
DROP POLICY IF EXISTS "admin can update providers" ON providers;

-- ── 7. provider_photos — require auth for INSERT ─────────────
-- BEFORE: "anyone can insert photos" WITH CHECK (true) —
--         any anon request could write to provider_photos.
-- AFTER:  Must be authenticated at minimum. Upload goes through
--         /api/pro/photos which validates session before writing.
DROP POLICY IF EXISTS "anyone can insert photos" ON provider_photos;
CREATE POLICY "authenticated can insert photos" ON provider_photos
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ── 8. broadcasts — require auth for INSERT ───────────────────
-- BEFORE: "anyone can post a broadcast" WITH CHECK (true) —
--         spam vectors: unauthenticated flood of broadcast rows.
-- AFTER:  Must be signed-in user; uid must match the row's user_id.
DROP POLICY IF EXISTS "anyone can post a broadcast" ON broadcasts;
CREATE POLICY "authenticated can post broadcast" ON broadcasts
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
  );

-- SELECT policy for broadcasts is fine as-is (active + not expired).

-- ── Storage: provider-photos bucket ──────────────────────────
-- If the bucket policy allows unauthenticated uploads, lock it down.
-- This must be applied in the Supabase dashboard Storage settings
-- OR via the management API — SQL migrations cannot alter storage
-- bucket policies directly. See README note below.
--
-- Action required in Supabase Dashboard > Storage > provider-photos:
--   Change "Who can upload objects?" from "Anyone" → "Authenticated users only"

-- ── /api/provider/track rate limiting note ────────────────────
-- The track endpoint has no auth and an in-memory dedup Map that
-- resets on cold starts. Mitigation (no DB migration needed):
--   1. Add `x-forwarded-for` IP hash + provider_id + 1-minute window
--      to an Edge Config or Upstash Redis for real rate limiting.
--   2. Short term: verify provider_id exists in providers table
--      before doing any work (already uses service_role lookup).
-- This migration cannot fix that — it needs code changes in:
--   /api/provider/track/route.ts
