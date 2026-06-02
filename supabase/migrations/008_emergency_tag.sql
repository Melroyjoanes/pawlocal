-- Providers (vets primarily) can self-declare 24hr/emergency availability
ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_emergency boolean DEFAULT false;
