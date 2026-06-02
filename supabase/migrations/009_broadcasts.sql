-- Pet Broadcast — pet owners post a need, verified providers respond
CREATE TABLE IF NOT EXISTS broadcasts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_slug    text NOT NULL,           -- which category (dog-walking, grooming, etc.)
  pet_description text NOT NULL,           -- "3yr old lab, friendly"
  area            text NOT NULL,           -- "Juhu" / "Bandra"
  date_needed     text NOT NULL,           -- "This Saturday" / "Weekday mornings"
  budget          text,                    -- "₹400–600" or null if flexible
  poster_name     text NOT NULL,
  poster_whatsapp text NOT NULL,
  notes           text,                    -- any extra info
  status          text DEFAULT 'active'
                    CHECK (status IN ('active', 'filled', 'expired')),
  created_at      timestamptz DEFAULT now(),
  expires_at      timestamptz DEFAULT now() + interval '48 hours'
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_service ON broadcasts(service_slug);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- Anyone can read active broadcasts
CREATE POLICY "active broadcasts are public"
  ON broadcasts FOR SELECT
  USING (status = 'active' AND expires_at > now());

-- Anyone can post a broadcast
CREATE POLICY "anyone can post a broadcast"
  ON broadcasts FOR INSERT
  WITH CHECK (true);
