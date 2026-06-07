-- ============================================================
-- 025_fix_booking_rls.sql
-- Fix "permission denied for table users" on booking_requests.
--
-- The booking_provider_select policy queries auth.users directly:
--   SELECT email FROM auth.users WHERE id = auth.uid()
-- The authenticated/anon role has no SELECT access to auth.users,
-- so PostgreSQL throws "permission denied for table users" whenever
-- ANY SELECT policy on booking_requests is evaluated — including
-- after a customer INSERT that chains .select().
--
-- Fix: replace auth.users lookup with auth.email() which is a
-- Supabase built-in function that returns the JWT email without
-- requiring direct access to the auth schema.
-- ============================================================

DROP POLICY IF EXISTS "booking_provider_select" ON booking_requests;

CREATE POLICY "booking_provider_select" ON booking_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = booking_requests.provider_id
        AND providers.email = auth.email()
    )
  );
