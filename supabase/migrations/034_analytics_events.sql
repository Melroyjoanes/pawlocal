-- Full analytics tracking: who came from where, whose link, every key event
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  -- 'report_viewed' | 'viral_hook_tapped' | 'user_signed_up' | 'user_signed_in'
  -- | 'invite_link_clicked' | 'invite_accepted' | 'onboarding_completed'
  -- | 'invite_sent' | 'report_filed'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Referral chain
  invite_token TEXT,
  report_token TEXT,
  referrer_url TEXT,
  -- User identity at event time (stored even if they sign out later)
  user_email TEXT,
  user_name TEXT,
  is_new_user BOOLEAN,
  -- Device
  user_agent TEXT,
  ip_address TEXT,
  -- Extra structured data
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only service_role can read (analytics is private)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON analytics_events USING (false);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_analytics_event_type_created ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_invite_token ON analytics_events(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
