-- ============================================================
-- 063_rate_limit_hits.sql
-- Generic rate-limit table, backed by Postgres rather than Redis
-- (this project's own convention — see 024_fix_rls_security.sql's
-- note that explicitly steered away from adding Upstash/Redis).
--
-- Used first by app/api/contact/route.ts, the one unauthenticated
-- endpoint that sends real email (Resend) and is linked from live,
-- public pages (FAQ, privacy policy, blog) — no rate limit existed
-- anywhere in this codebase before this.
--
-- Self-pruning by design: lib/rateLimit.ts deletes a key's own
-- expired rows on every check, so this table never grows unbounded
-- even without a separate cleanup job.
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_hits_key_created_idx ON rate_limit_hits (key, created_at);

-- Only ever touched via the service-role admin client server-side —
-- no policies means anon/authenticated get zero access, service_role
-- always bypasses RLS regardless. Same pattern as walk_sessions after
-- migration 024 removed its open policy.
ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;
