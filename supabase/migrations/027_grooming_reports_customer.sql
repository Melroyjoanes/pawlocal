-- Add customer_id to grooming_reports so users can claim and view their reports
ALTER TABLE grooming_reports
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_grooming_reports_customer_id ON grooming_reports(customer_id);
