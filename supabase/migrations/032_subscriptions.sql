-- Pet parent subscriptions for unlocking full report history.
-- Free tier: last 3 days. Paid: unlimited history.

CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                      TEXT NOT NULL CHECK (plan IN ('monthly', 'annual')),
  status                    TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  razorpay_order_id         TEXT,
  razorpay_payment_id       TEXT,
  razorpay_signature        TEXT,
  amount_paise              INTEGER NOT NULL,
  expires_at                TIMESTAMPTZ NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_active_idx
  ON subscriptions(user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Writes go through service role only (payment verification)
