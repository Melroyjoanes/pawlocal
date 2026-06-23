-- Permanent walker profile records.
-- Created/upserted each time a walker registers via QR code.
-- Phone number is the unique identifier (walkers have no auth account).
-- This gives a single source of truth for every walker who has ever connected,
-- independent of which dog or connection they came through.

CREATE TABLE IF NOT EXISTS walkers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         text UNIQUE NOT NULL,
  name          text NOT NULL,
  role          text,                          -- most recent role used
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  total_walks   integer NOT NULL DEFAULT 0,    -- incremented on each walk_log insert
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Link walker_connections back to walkers profile
ALTER TABLE walker_connections
  ADD COLUMN IF NOT EXISTS walker_id uuid REFERENCES walkers(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS walkers_phone_idx ON walkers(phone);
CREATE INDEX IF NOT EXISTS walker_connections_walker_id_idx ON walker_connections(walker_id);

-- RLS: service role only
ALTER TABLE walkers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "walkers_service_role_all" ON walkers;
CREATE POLICY "walkers_service_role_all" ON walkers FOR ALL USING (true);
