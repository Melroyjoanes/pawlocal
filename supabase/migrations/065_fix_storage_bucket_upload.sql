-- ============================================================
-- 065_fix_storage_bucket_upload.sql
-- /cso found this: the storage.objects INSERT policy on
-- provider-photos (set in 001_initial.sql) has no auth check at
-- all — WITH CHECK (bucket_id = 'provider-photos') lets literally
-- anyone with the public anon key upload any file to any path.
-- Since the bucket is public:true, that upload is instantly
-- served on a public URL under pupstep.in's own domain.
--
-- Traced every upload call site in the app before tightening this
-- (8 total): app/home/HomeClient.tsx, app/walk/self/SelfWalkClient.tsx,
-- app/provider/[id]/edit/EditProviderClient.tsx, and app/join/page.tsx
-- are all reachable only from pages/middleware that already require
-- a logged-in user (server-side redirect or admin-gated middleware).
-- app/setup/SetupClient.tsx guards its own upload handler with
-- `if (!file || !user) return` client-side, and `user` there only
-- becomes truthy after a real login. app/pro/grooming|profile|fitness
-- pages currently unconditionally redirect to /home (dead routes,
-- unreachable regardless). app/api/walker/photo/route.ts uses the
-- service-role client, which bypasses RLS entirely either way.
--
-- So every real upload path already runs with a real session by the
-- time it calls .upload() — requiring authenticated role breaks none
-- of them, and closes the anonymous-upload hole entirely.
-- ============================================================

DROP POLICY IF EXISTS "anyone can upload photos" ON storage.objects;
CREATE POLICY "authenticated users can upload photos" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'provider-photos'
    AND auth.role() = 'authenticated'
  );
