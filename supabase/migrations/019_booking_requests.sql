CREATE TABLE IF NOT EXISTS booking_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_slug text NOT NULL,
  pet_name     text NOT NULL DEFAULT '',
  pet_type     text NOT NULL DEFAULT '',
  date_needed  text NOT NULL,
  time_needed  text NOT NULL DEFAULT '',
  notes        text,
  status       text NOT NULL DEFAULT 'sent',  -- sent, accepted, completed, cancelled
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_requests_provider_idx ON booking_requests(provider_id);
CREATE INDEX IF NOT EXISTS booking_requests_customer_idx ON booking_requests(customer_id);

-- Enable RLS
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- Customer can see and create their own booking requests
DROP POLICY IF EXISTS "booking_select_own" ON booking_requests;
CREATE POLICY "booking_select_own" ON booking_requests
  FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "booking_insert_own" ON booking_requests;
CREATE POLICY "booking_insert_own" ON booking_requests
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Provider can see booking requests sent to them
-- Providers are matched by email (providers.email = auth.users.email)
DROP POLICY IF EXISTS "booking_provider_select" ON booking_requests;
CREATE POLICY "booking_provider_select" ON booking_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = booking_requests.provider_id
        AND providers.email = (
          SELECT email FROM auth.users WHERE id = auth.uid()
        )
    )
  );
