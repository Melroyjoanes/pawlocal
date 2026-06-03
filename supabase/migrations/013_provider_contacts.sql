-- Tracks WhatsApp clicks and follow-up response/booking signals
CREATE TABLE IF NOT EXISTS provider_contacts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  customer_id    uuid REFERENCES auth.users(id),
  session_token  text,          -- anonymous tracking before login
  responded      boolean,       -- null = not yet asked
  booked         boolean,       -- null = not yet asked
  prompt_sent_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_contacts_provider_id_idx ON provider_contacts (provider_id);
CREATE INDEX IF NOT EXISTS provider_contacts_customer_id_idx ON provider_contacts (customer_id);

-- RLS: providers can read their own contacts, customers can update their own
ALTER TABLE provider_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers can read own contacts" ON provider_contacts
  FOR SELECT USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );
CREATE POLICY "Anyone can insert contacts" ON provider_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers can update own contacts" ON provider_contacts
  FOR UPDATE USING (customer_id = auth.uid() OR customer_id IS NULL);
