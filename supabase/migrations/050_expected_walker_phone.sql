-- Stores the walker phone number the parent entered when sharing the QR.
-- Used to pre-identify returning walkers on the connect page.
ALTER TABLE walker_connections ADD COLUMN IF NOT EXISTS expected_walker_phone text DEFAULT NULL;
