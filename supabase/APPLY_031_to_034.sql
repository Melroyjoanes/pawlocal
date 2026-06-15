-- ============================================================================
-- PupStep — apply migrations 031 → 034 in one shot
-- Safe to run on live DB: additive only. No existing rows are deleted.
-- Paste this whole file into Supabase Dashboard → SQL Editor → Run.
-- ============================================================================

-- ── 031: provider_clients relationship table ────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID REFERENCES providers(id) ON DELETE CASCADE,
  pet_name        TEXT NOT NULL,
  owner_name      TEXT,
  owner_whatsapp  TEXT,
  owner_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_token    TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  linked_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_clients_provider_id_idx ON provider_clients(provider_id);
CREATE INDEX IF NOT EXISTS provider_clients_owner_user_id_idx ON provider_clients(owner_user_id);
CREATE INDEX IF NOT EXISTS provider_clients_owner_whatsapp_idx ON provider_clients(owner_whatsapp);

ALTER TABLE provider_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON provider_clients;
CREATE POLICY "Service role full access"
  ON provider_clients FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE walk_reports
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES provider_clients(id) ON DELETE SET NULL;
ALTER TABLE grooming_reports
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES provider_clients(id) ON DELETE SET NULL;

-- ── 032: subscriptions (Razorpay) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                TEXT NOT NULL CHECK (plan IN ('monthly', 'annual')),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  amount_paise        INTEGER NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_active_idx
  ON subscriptions(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read their own subscription" ON subscriptions;
CREATE POLICY "Users read their own subscription"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- ── 033: pet-parent-initiated invites ───────────────────────────────────────
ALTER TABLE provider_clients ALTER COLUMN provider_id DROP NOT NULL;
ALTER TABLE provider_clients ALTER COLUMN owner_whatsapp DROP NOT NULL;

ALTER TABLE provider_clients
  ADD COLUMN IF NOT EXISTS invite_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (invite_status IN ('pending', 'accepted', 'revoked')),
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  ADD COLUMN IF NOT EXISTS unlinked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unlinked_by TEXT CHECK (unlinked_by IN ('owner', 'provider', 'admin'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_provider_clients_invite_token_pending
  ON provider_clients(invite_token) WHERE invite_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_provider_clients_owner_user_id
  ON provider_clients(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_provider_clients_provider_accepted
  ON provider_clients(provider_id) WHERE invite_status = 'accepted' AND provider_id IS NOT NULL;

-- ── 034: analytics_events ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_token TEXT,
  report_token TEXT,
  referrer_url TEXT,
  user_email   TEXT,
  user_name    TEXT,
  is_new_user  BOOLEAN,
  user_agent   TEXT,
  ip_address   TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON analytics_events;
CREATE POLICY "service_role_only" ON analytics_events USING (false);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type_created ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_invite_token ON analytics_events(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
