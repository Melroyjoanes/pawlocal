-- Add user_id to broadcasts so My Account can look up by user (not just phone)
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS broadcasts_user_id_idx ON broadcasts(user_id) WHERE user_id IS NOT NULL;
