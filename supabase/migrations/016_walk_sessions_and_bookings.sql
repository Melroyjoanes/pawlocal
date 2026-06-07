-- Create walk_sessions table (for live dog walk tracking)
CREATE TABLE IF NOT EXISTS walk_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  share_token      text NOT NULL UNIQUE,
  pet_name         text,
  customer_name    text,
  status           text NOT NULL DEFAULT 'active',  -- 'active' | 'completed'
  walk_events      jsonb NOT NULL DEFAULT '[]',
  current_lat      numeric(10, 7),
  current_lng      numeric(10, 7),
  last_location_at timestamptz,
  distance_km      numeric(6, 2) NOT NULL DEFAULT 0,
  step_count       integer NOT NULL DEFAULT 0,
  started_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS walk_sessions_provider_id_idx ON walk_sessions(provider_id);
CREATE INDEX IF NOT EXISTS walk_sessions_share_token_idx ON walk_sessions(share_token);
CREATE INDEX IF NOT EXISTS walk_sessions_status_idx ON walk_sessions(status) WHERE status = 'active';

-- RLS: providers manage their own sessions via service role key (API routes only)
-- No direct client-side access — handled at application layer
ALTER TABLE walk_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "walk_sessions_service_role_all" ON walk_sessions;
CREATE POLICY "walk_sessions_service_role_all" ON walk_sessions
  FOR ALL USING (true);

-- Provider bookings table (provider-side calendar/scheduling)
CREATE TABLE IF NOT EXISTS provider_bookings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  date         date NOT NULL,
  service      text NOT NULL,
  owner_name   text NOT NULL DEFAULT '',
  pet_name     text NOT NULL DEFAULT '',
  duration_min integer NOT NULL DEFAULT 0,
  amount_inr   numeric(10,2) NOT NULL DEFAULT 0,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE provider_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_bookings" ON provider_bookings;
CREATE POLICY "admin_all_bookings" ON provider_bookings
  FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS provider_bookings_provider_id_idx ON provider_bookings(provider_id);
CREATE INDEX IF NOT EXISTS provider_bookings_date_idx ON provider_bookings(date DESC);

-- Realtime already enabled for walk_sessions in a prior run — no action needed
