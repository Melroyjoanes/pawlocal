-- Track review invites sent by providers
CREATE TABLE IF NOT EXISTS review_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  used        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_invites_provider_idx ON review_invites(provider_id);
CREATE INDEX IF NOT EXISTS review_invites_token_idx ON review_invites(token);

ALTER TABLE review_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_invites_service_role" ON review_invites;
CREATE POLICY "review_invites_service_role" ON review_invites FOR ALL USING (true);
