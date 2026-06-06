-- Walk tracking feature migration
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS walk_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  share_token   TEXT        UNIQUE NOT NULL,
  pet_name      TEXT,
  customer_name TEXT,
  status        TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'completed')),
  current_lat   FLOAT8,
  current_lng   FLOAT8,
  last_location_at TIMESTAMPTZ,
  walk_events   JSONB       NOT NULL DEFAULT '[]',
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: anyone who knows the token can read the session (token IS the auth)
ALTER TABLE walk_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read walk sessions"
  ON walk_sessions FOR SELECT USING (true);

CREATE POLICY "Service role manages walk sessions"
  ON walk_sessions FOR ALL TO service_role USING (true);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_walk_sessions_token ON walk_sessions (share_token);
CREATE INDEX IF NOT EXISTS idx_walk_sessions_provider ON walk_sessions (provider_id, status);

-- Enable realtime for live location updates
ALTER PUBLICATION supabase_realtime ADD TABLE walk_sessions;
