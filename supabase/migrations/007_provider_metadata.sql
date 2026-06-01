-- Flexible category-specific data per provider
-- Trainers: training_method, specialisations, session_format, certifications, breeds
-- Vets (future): degree, years_experience, animal_types
-- Groomers (future): services_offered, home_visits
ALTER TABLE providers ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
