-- Track when walk report emails were sent to parents
ALTER TABLE walk_reports ADD COLUMN IF NOT EXISTS email_sent_at timestamptz DEFAULT NULL;
