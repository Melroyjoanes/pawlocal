-- Provider → Pet Parent relationship table
-- Replaces the manual share-token claim flow.
-- Provider adds a client once; every future report auto-delivers to them.

CREATE TABLE IF NOT EXISTS provider_clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  pet_name        TEXT NOT NULL,
  owner_name      TEXT,
  owner_whatsapp  TEXT NOT NULL,
  owner_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_token    TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  linked_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_clients_provider_id_idx ON provider_clients(provider_id);
CREATE INDEX IF NOT EXISTS provider_clients_owner_user_id_idx ON provider_clients(owner_user_id);
CREATE INDEX IF NOT EXISTS provider_clients_owner_whatsapp_idx ON provider_clients(owner_whatsapp);

ALTER TABLE provider_clients ENABLE ROW LEVEL SECURITY;

-- Providers can read/write their own clients (via service role in API — no direct client RLS needed)
-- Pet parents can read client records they're linked to (to confirm linkage)
CREATE POLICY "Service role full access"
  ON provider_clients FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add client_id foreign key to walk_reports so reports are permanently linked to a client
ALTER TABLE walk_reports
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES provider_clients(id) ON DELETE SET NULL;

-- Add client_id to grooming_reports too
ALTER TABLE grooming_reports
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES provider_clients(id) ON DELETE SET NULL;
