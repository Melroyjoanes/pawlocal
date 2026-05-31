-- Run this in Supabase SQL editor to add your first providers
-- Replace the values with real data from your friend's contacts

INSERT INTO providers (
  name, category_slug, whatsapp, lat, lng, address,
  price_min, price_max, price_unit, hours_from, hours_to, bio, status
) VALUES (
  'Ravi Kumar',
  'dog-walking',
  '9876543210',
  19.1082,
  72.8267,
  'Juhu Tara Road, Juhu, Mumbai 400049',
  300,
  500,
  'per walk',
  '07:00',
  '19:00',
  'Professional dog walker with 3+ years experience in Juhu.',
  'approved'
);

-- Add more providers below, copying the pattern above
-- category_slug options: 'dog-walking', 'grooming', 'vet', 'pet-store', 'insurance'
-- status: use 'approved' for manually added contacts, 'pending' for self-registered
