-- Per-service pricing stored as JSONB, e.g.:
-- {"dog-walking": {"min": 200, "max": 400, "unit": "per session"},
--  "grooming":    {"min": 800, "max": 900, "unit": "per session"}}
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS service_prices JSONB DEFAULT '{}';
