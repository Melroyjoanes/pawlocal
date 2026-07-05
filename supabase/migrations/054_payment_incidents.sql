-- Safety net for payment reconciliation gaps: if a Razorpay payment succeeds
-- but both the client-side verify call and the server-side webhook fail to
-- activate a subscription (network blip, webhook misconfigured, etc.), we
-- still want a record that something needs human review.
--
-- Rows are written by:
--   - app/api/payments/log-incident/route.ts (kind: 'verify_failed') — from the
--     logged-in user's browser when /api/payments/verify throws.
--   - app/api/cron/payment-reconciliation/route.ts (kind: 'reconciliation_mismatch') —
--     periodic sweep comparing Razorpay orders against the subscriptions table.
--
-- Service-role only, same as subscriptions — no public policies needed.

CREATE TABLE IF NOT EXISTS payment_incidents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id),
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
  kind                  TEXT NOT NULL,
  details               JSONB,
  resolved              BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_incidents_user_id_idx ON payment_incidents(user_id);
CREATE INDEX IF NOT EXISTS payment_incidents_resolved_idx ON payment_incidents(resolved) WHERE resolved = false;

ALTER TABLE payment_incidents ENABLE ROW LEVEL SECURITY;

-- No public policies — writes/reads go through service role only (payment
-- verification + reconciliation cron), same as subscriptions.
