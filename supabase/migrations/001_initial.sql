-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Categories (static, seeded below)
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  tagline text
);

-- Providers (all service listings)
CREATE TABLE providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_name text,
  category_slug text NOT NULL REFERENCES categories(slug),
  whatsapp text NOT NULL,
  phone text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  address text NOT NULL,
  price_min integer,
  price_max integer,
  price_unit text DEFAULT 'per session',
  hours_from text DEFAULT '09:00',
  hours_to text DEFAULT '18:00',
  working_days text[] DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  bio text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- Photos per provider (profile photo + gallery)
CREATE TABLE provider_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  url text NOT NULL,
  is_primary boolean DEFAULT false,
  sort_order integer DEFAULT 0
);

-- Seed categories
INSERT INTO categories (name, slug, icon, color, tagline) VALUES
  ('Dog Walking', 'dog-walking', '🦮', '#4F46E5', 'Trusted walkers near Juhu'),
  ('Grooming', 'grooming', '✂️', '#7C3AED', 'Grooming salons near you'),
  ('Vet / Doctor', 'vet', '🏥', '#DC2626', 'Clinics & vets nearby'),
  ('Pet Store', 'pet-store', '🐾', '#059669', 'Stores near Juhu'),
  ('Insurance', 'insurance', '🛡️', '#D97706', 'Compare pet insurance plans');

-- RLS: public can read approved providers
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved providers are public" ON providers
  FOR SELECT USING (status = 'approved');

-- RLS: anyone can insert (registration form)
CREATE POLICY "anyone can register" ON providers
  FOR INSERT WITH CHECK (true);

-- RLS: public can read provider photos
ALTER TABLE provider_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provider photos are public" ON provider_photos
  FOR SELECT USING (true);
CREATE POLICY "anyone can insert photos" ON provider_photos
  FOR INSERT WITH CHECK (true);

-- RLS: categories are public
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories are public" ON categories
  FOR SELECT USING (true);

-- Performance indexes
CREATE INDEX idx_providers_category_slug ON providers(category_slug);
CREATE INDEX idx_providers_status ON providers(status);
CREATE INDEX idx_provider_photos_provider_id ON provider_photos(provider_id);

-- RLS: admin (service role) can update and delete providers
CREATE POLICY "admin can update providers" ON providers
  FOR UPDATE USING (true) WITH CHECK (true);

-- RLS: admin can delete provider photos
CREATE POLICY "admin can delete photos" ON provider_photos
  FOR DELETE USING (true);

-- Storage bucket for provider photos
INSERT INTO storage.buckets (id, name, public) VALUES ('provider-photos', 'provider-photos', true);
CREATE POLICY "public can read photos" ON storage.objects FOR SELECT USING (bucket_id = 'provider-photos');
CREATE POLICY "anyone can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'provider-photos');
