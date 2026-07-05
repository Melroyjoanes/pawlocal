-- Referral loop: each user gets a shareable code, and we record which code
-- (if any) a new user signed up under so we can grant both sides a reward.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by_code text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_rewards_granted boolean NOT NULL DEFAULT false;
