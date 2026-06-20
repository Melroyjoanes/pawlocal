-- Add OTP column for Rapido-style walker verification
ALTER TABLE walker_connections ADD COLUMN IF NOT EXISTS otp text;
