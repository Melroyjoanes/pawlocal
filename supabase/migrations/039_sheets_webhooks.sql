-- Create all 6 Google Sheets webhooks as database triggers via pg_net
-- This replaces having to manually create them in the Supabase dashboard

-- pg_net is enabled by default on Supabase; this is a no-op if already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Single trigger function used by all tables
CREATE OR REPLACE FUNCTION public.send_sheets_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://pupstep.in/api/webhooks/sheets',
    body    := jsonb_build_object(
                 'type',   TG_OP,
                 'table',  TG_TABLE_NAME,
                 'record', to_jsonb(NEW)
               )::text,
    headers := jsonb_build_object(
                 'Content-Type',     'application/json',
                 'x-webhook-secret', 'pupstep_webhook_secret_2025'
               )
  );
  RETURN NEW;
END;
$$;

-- profiles — new signups
DROP TRIGGER IF EXISTS sheets_profiles ON profiles;
CREATE TRIGGER sheets_profiles
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.send_sheets_webhook();

-- walk_reports — new reports
DROP TRIGGER IF EXISTS sheets_walk_reports ON walk_reports;
CREATE TRIGGER sheets_walk_reports
  AFTER INSERT ON walk_reports
  FOR EACH ROW EXECUTE FUNCTION public.send_sheets_webhook();

-- grooming_reports — new grooming reports
DROP TRIGGER IF EXISTS sheets_grooming_reports ON grooming_reports;
CREATE TRIGGER sheets_grooming_reports
  AFTER INSERT ON grooming_reports
  FOR EACH ROW EXECUTE FUNCTION public.send_sheets_webhook();

-- subscriptions — new payments
DROP TRIGGER IF EXISTS sheets_subscriptions ON subscriptions;
CREATE TRIGGER sheets_subscriptions
  AFTER INSERT ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.send_sheets_webhook();

-- walker_connections — QR scan + claim updates
DROP TRIGGER IF EXISTS sheets_walker_connections ON walker_connections;
CREATE TRIGGER sheets_walker_connections
  AFTER INSERT OR UPDATE ON walker_connections
  FOR EACH ROW EXECUTE FUNCTION public.send_sheets_webhook();

-- walk_logs — informal walk logs
DROP TRIGGER IF EXISTS sheets_walk_logs ON walk_logs;
CREATE TRIGGER sheets_walk_logs
  AFTER INSERT ON walk_logs
  FOR EACH ROW EXECUTE FUNCTION public.send_sheets_webhook();
