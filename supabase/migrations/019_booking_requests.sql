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
