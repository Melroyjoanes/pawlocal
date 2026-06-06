-- Add distance and steps columns to walk_sessions
ALTER TABLE walk_sessions
  ADD COLUMN IF NOT EXISTS distance_km numeric(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS step_count  integer      DEFAULT 0;

-- Provider bookings table (replaces localStorage)
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

-- RLS: providers can only see their own bookings
ALTER TABLE provider_bookings ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "admin_all_bookings" ON provider_bookings
  FOR ALL USING (true);

-- Providers use service role key via API routes — RLS handled at application layer
-- (no direct client-side Supabase calls for bookings)

-- Index for fast provider lookups
CREATE INDEX IF NOT EXISTS provider_bookings_provider_id_idx ON provider_bookings(provider_id);
CREATE INDEX IF NOT EXISTS provider_bookings_date_idx ON provider_bookings(date DESC);

-- Enable realtime for walk_sessions (for live tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE walk_sessions;
