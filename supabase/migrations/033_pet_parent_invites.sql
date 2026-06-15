-- Make provider_id nullable: pet parent creates the record BEFORE provider joins
ALTER TABLE provider_clients ALTER COLUMN provider_id DROP NOT NULL;

-- Make owner_whatsapp nullable: pet parent-initiated invites don't need it upfront
ALTER TABLE provider_clients ALTER COLUMN owner_whatsapp DROP NOT NULL;

-- Add invite lifecycle columns
ALTER TABLE provider_clients
  ADD COLUMN IF NOT EXISTS invite_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (invite_status IN ('pending', 'accepted', 'revoked')),
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  ADD COLUMN IF NOT EXISTS unlinked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unlinked_by TEXT CHECK (unlinked_by IN ('owner', 'provider', 'admin'));

-- Add onboarding_completed to profiles so we know when a new owner finishes onboarding
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_provider_clients_invite_token_pending
  ON provider_clients(invite_token) WHERE invite_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_provider_clients_owner_user_id
  ON provider_clients(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_provider_clients_provider_accepted
  ON provider_clients(provider_id) WHERE invite_status = 'accepted' AND provider_id IS NOT NULL;
