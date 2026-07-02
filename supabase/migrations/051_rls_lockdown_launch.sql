-- 051: Pre-launch RLS lockdown
-- Several tables had FOR ALL USING (true) policies. With RLS "enabled" but a
-- permissive policy, anyone holding the public anon key (it ships in the
-- browser bundle) can read AND write every row. All app access to these
-- tables goes through service-role API routes, which bypass RLS entirely —
-- so dropping these policies blocks the public without breaking the app.

-- walk_reports: GPS routes, photos, dog names, notes — was fully public
DROP POLICY IF EXISTS "walk_reports_service_role_all" ON walk_reports;

-- walkers: every walker's name + phone number — was fully public
DROP POLICY IF EXISTS "walkers_service_role_all" ON walkers;

-- provider_clients: client names + WhatsApp numbers — was fully public
DROP POLICY IF EXISTS "Service role full access" ON provider_clients;

-- walk_sessions / walk_locations (recreated in 040 with public select):
-- exposed ALL live GPS sessions to anon. Live-track pages fetch via
-- service-role API routes, so public select is not needed.
DROP POLICY IF EXISTS "walk_sessions_select_all" ON walk_sessions;
DROP POLICY IF EXISTS "walk_locations_select_all" ON walk_locations;

-- provider_contacts: public insert = spam vector on a legacy table
DROP POLICY IF EXISTS "Anyone can insert contacts" ON provider_contacts;

-- OTP brute-force protection: 4-digit OTP = 10,000 combos. The claim API
-- now locks a connection after 5 wrong attempts using this counter.
ALTER TABLE walker_connections ADD COLUMN IF NOT EXISTS otp_attempts integer DEFAULT 0;
