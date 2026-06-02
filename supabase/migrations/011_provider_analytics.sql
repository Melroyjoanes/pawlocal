-- Provider analytics: tracks views and contact events per provider
CREATE TABLE IF NOT EXISTS provider_analytics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  event_type  text NOT NULL CHECK (event_type IN ('view', 'whatsapp_click', 'call_click')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_analytics_provider_id_idx ON provider_analytics (provider_id);
CREATE INDEX IF NOT EXISTS provider_analytics_created_at_idx  ON provider_analytics (created_at);
CREATE INDEX IF NOT EXISTS provider_analytics_event_type_idx  ON provider_analytics (provider_id, event_type);
