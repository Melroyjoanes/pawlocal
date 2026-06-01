-- Reviews left by pet owners for providers
CREATE TABLE IF NOT EXISTS reviews (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id   uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  rating        int  NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       text CHECK (char_length(comment) <= 300),
  reviewer_name text NOT NULL,
  reviewer_phone text,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Pet owners can read approved reviews for any provider
CREATE POLICY "approved reviews are public"
  ON reviews FOR SELECT
  USING (status = 'approved');

-- Anyone can submit a review (no auth required — low friction)
CREATE POLICY "anyone can submit a review"
  ON reviews FOR INSERT
  WITH CHECK (true);
