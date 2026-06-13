-- Web push subscriptions — one row per browser/device per provider
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  endpoint    text        UNIQUE NOT NULL,
  p256dh      text,
  auth        text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_provider_id_idx ON push_subscriptions(provider_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_service_role_all" ON push_subscriptions
  FOR ALL TO service_role USING (true);
