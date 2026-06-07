-- Persist saved providers per user account
CREATE TABLE IF NOT EXISTS saved_providers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id  uuid NOT NULL REFERENCES providers(id)  ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider_id)
);

CREATE INDEX IF NOT EXISTS saved_providers_user_idx ON saved_providers(user_id);

-- RLS: users can only see and manage their own saved providers
ALTER TABLE saved_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_providers_select" ON saved_providers;
CREATE POLICY "saved_providers_select" ON saved_providers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_providers_insert" ON saved_providers;
CREATE POLICY "saved_providers_insert" ON saved_providers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_providers_delete" ON saved_providers;
CREATE POLICY "saved_providers_delete" ON saved_providers
  FOR DELETE USING (auth.uid() = user_id);
