-- Parent profile: phone number and notification preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb
  DEFAULT '{"report_email": true, "weekly_summary": true}'::jsonb;
