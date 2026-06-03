-- Profiles: one row per Supabase auth user
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'provider', 'admin')),
  display_name text,
  avatar_url   text,
  phone        text,
  created_at   timestamptz DEFAULT now()
);

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Link providers to real auth accounts
ALTER TABLE providers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS claim_token text UNIQUE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS claim_token_expires_at timestamptz;

-- Availability
ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS availability_note text;

-- Verification tiers
ALTER TABLE providers ADD COLUMN IF NOT EXISTS verification_tier text
  NOT NULL DEFAULT 'contacted'
  CHECK (verification_tier IN ('contacted', 'verified', 'certified'));
