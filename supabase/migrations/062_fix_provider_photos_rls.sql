-- ============================================================
-- 062_fix_provider_photos_rls.sql
-- Closes a gap migration 024 left open. 024 tightened
-- provider_photos INSERT to require auth.role() = 'authenticated'
-- but never scoped it to the provider being edited, and never
-- touched DELETE at all — it was still "FOR DELETE USING (true)"
-- from 001_initial.sql, open to every role including anon.
--
-- Net effect before this migration: any authenticated user (not
-- just the provider who owns the profile) could insert a photo row
-- against ANY provider_id, and literally anyone — no auth required —
-- could delete ANY provider's photo row by id. Confirmed exploitable
-- directly via the anon key from the browser, no UI required:
-- app/provider/[id]/edit/EditProviderClient.tsx calls
-- supabase.from('provider_photos').insert/delete directly, with no
-- ownership check in client code — the DB policy was the only guard.
--
-- Fix: scope both INSERT and DELETE to "the row's provider_id belongs
-- to a providers row owned by the currently authenticated user" —
-- same ownership pattern already used for provider_contacts (see
-- migration 013). SELECT stays public on purpose — provider photos
-- are meant to be publicly visible on their profile page.
-- ============================================================

DROP POLICY IF EXISTS "authenticated can insert photos" ON provider_photos;
CREATE POLICY "provider owner can insert own photos" ON provider_photos
  FOR INSERT
  WITH CHECK (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin can delete photos" ON provider_photos;
CREATE POLICY "provider owner can delete own photos" ON provider_photos
  FOR DELETE
  USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

-- "provider photos are public" (SELECT, USING (true)) is left
-- untouched — intentional, these photos are shown on public
-- provider listing pages.
