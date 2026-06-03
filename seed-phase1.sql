-- ============================================================
-- PawLocal — Phase 1 seed data (5 approved providers)
-- Run this in Supabase SQL editor → paste & execute
-- Coordinates are real Juhu / Andheri West locations
-- ============================================================

INSERT INTO providers (
  name, business_name, category_slug, category_slugs,
  whatsapp, phone, address,
  lat, lng,
  price_min, price_max, price_unit,
  hours_from, hours_to, working_days,
  bio, status, is_verified, verification_tier,
  is_available
) VALUES

-- 1. Dog walker — Juhu
(
  'Rahul Shetty',
  'Rahul''s Dog Walks',
  'dog-walking',
  ARRAY['dog-walking'],
  '9820012345',
  '9820012345',
  'JVPD Scheme, Juhu, Mumbai 400049',
  19.1075, 72.8263,
  300, 500, 'per session',
  '06:00', '10:00',
  ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  'I have been walking dogs in Juhu for 5 years. Trained in basic pet first aid. Currently walking 12 dogs daily. Your dog''s safety and happiness is my priority.',
  'approved', true, 'verified', true
),

-- 2. Groomer — Andheri West
(
  'Priya Nair',
  'Pawfect Grooms',
  'grooming',
  ARRAY['grooming'],
  '9867543210',
  '9867543210',
  'Versova, Andheri West, Mumbai 400061',
  19.1301, 72.8174,
  400, 800, 'per grooming',
  '09:00', '19:00',
  ARRAY['Mon','Tue','Wed','Thu','Fri','Sat'],
  'Mobile grooming specialist serving Juhu and Andheri. Full bath, haircut, nail trim, ear cleaning. All breeds. Home visits available. 8+ years experience.',
  'approved', true, 'verified', true
),

-- 3. Vet — Juhu
(
  'Dr. Suresh Patel',
  'Juhu Pet Clinic',
  'vet',
  ARRAY['vet'],
  '9821098765',
  '9821098765',
  'Gulmohar Road, Juhu, Mumbai 400049',
  19.1065, 72.8270,
  400, 900, 'per consultation',
  '09:00', '13:00',
  ARRAY['Mon','Tue','Wed','Thu','Fri','Sat'],
  'BVSc & AH with 12 years of practice. Specialising in small animals — dogs, cats, rabbits. Vaccinations, health checkups, surgery. Saturday morning clinics available.',
  'approved', true, 'certified', true
),

-- 4. Dog trainer — Lokhandwala
(
  'Anil Desai',
  'Pawsome Trainers',
  'dog-training',
  ARRAY['dog-training'],
  '9819876543',
  NULL,
  'Lokhandwala Complex, Andheri West, Mumbai 400053',
  19.1380, 72.8278,
  600, 1200, 'per session',
  '07:00', '20:00',
  ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  'Certified dog trainer (CPDT-KA). Positive reinforcement methods only. Specialising in puppy training, basic obedience and aggression rehabilitation. Home visits and group classes available.',
  'approved', false, 'contacted', true
),

-- 5. Pet store — Santacruz West
(
  'Deepa Menon',
  'Paws & Claws Pet Shop',
  'pet-store',
  ARRAY['pet-store'],
  '9833456789',
  '9833456789',
  'Santacruz West, Mumbai 400054',
  19.0887, 72.8349,
  NULL, NULL, 'per session',
  '10:00', '21:00',
  ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  'Full-service pet store with premium food, accessories, toys and supplements. We stock Royal Canin, Drools, Himalaya Pet and more. Free home delivery above ₹500 in Santacruz–Juhu.',
  'approved', false, 'contacted', true
)
ON CONFLICT DO NOTHING;
