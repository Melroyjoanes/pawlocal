-- One-off: reset melroy@gradienteye.com back to a fresh parent account for testing.
-- Deletes all app data tied to this user (dogs, walker connections, walk logs,
-- walk reports, subscription, trial state) but keeps the auth.users row itself,
-- so the same email can still log in and will land on the "no dog yet" flow.
--
-- Safe to run more than once — everything is scoped to this one user_id.

DO $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'melroy@gradienteye.com';

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'No user found with that email — nothing to clean.';
    RETURN;
  END IF;

  -- Children first (FK dependencies), then parents
  DELETE FROM walk_logs WHERE owner_id = target_user_id;
  DELETE FROM walk_reports WHERE owner_id = target_user_id OR customer_id = target_user_id;
  DELETE FROM walker_connections WHERE owner_id = target_user_id;
  DELETE FROM dogs WHERE owner_id = target_user_id;
  DELETE FROM subscriptions WHERE user_id = target_user_id;

  -- Reset trial state so the account behaves like a brand-new signup
  UPDATE profiles
  SET trial_started_at = NULL
  WHERE id = target_user_id;

  RAISE NOTICE 'Reset complete for user_id %', target_user_id;
END $$;
