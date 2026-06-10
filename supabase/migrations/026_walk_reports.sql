-- Walk Reports: provider-generated post-walk summaries shared with pet parents
-- Token is a 32-char hex string used as the public share URL identifier

CREATE TABLE IF NOT EXISTS walk_reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  token            text NOT NULL UNIQUE,
  customer_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  dog_name         text NOT NULL,
  walk_date        timestamptz NOT NULL DEFAULT now(),
  duration_mins    integer NOT NULL DEFAULT 0,
  poop_count       integer NOT NULL DEFAULT 0,
  pee_count        integer NOT NULL DEFAULT 0,
  notes            text,
  photo_url        text,
  start_location   text,
  end_location     text,
  route_points     jsonb,
  distance_meters  numeric(10, 2),
  poop_events      jsonb,
  pee_events       jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS walk_reports_provider_id_idx ON walk_reports(provider_id);
CREATE INDEX IF NOT EXISTS walk_reports_token_idx       ON walk_reports(token);
CREATE INDEX IF NOT EXISTS walk_reports_customer_id_idx ON walk_reports(customer_id);
CREATE INDEX IF NOT EXISTS walk_reports_created_at_idx  ON walk_reports(created_at DESC);

-- RLS: all access via service role key in API routes
ALTER TABLE walk_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "walk_reports_service_role_all" ON walk_reports;
CREATE POLICY "walk_reports_service_role_all" ON walk_reports
  FOR ALL USING (true);
