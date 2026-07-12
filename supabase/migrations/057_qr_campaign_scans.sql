-- Tracks scans of print/physical QR codes (vet clinic posters, etc). Each QR
-- encodes a URL to /qr/{slug} rather than a raw wa.me link, so every scan can
-- be logged here before redirecting to WhatsApp — otherwise a printed QR
-- gives zero visibility into whether it's actually working.

CREATE TABLE IF NOT EXISTS qr_campaign_scans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL,
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent  TEXT,
  referrer    TEXT
);

CREATE INDEX IF NOT EXISTS qr_campaign_scans_slug_idx ON qr_campaign_scans(slug);
CREATE INDEX IF NOT EXISTS qr_campaign_scans_scanned_at_idx ON qr_campaign_scans(scanned_at);

-- No RLS policies needed for direct client access — all reads/writes go
-- through the service-role key in app/qr/[slug]/route.ts and the admin
-- stats route, same pattern as subscriptions/payment_incidents.
ALTER TABLE qr_campaign_scans ENABLE ROW LEVEL SECURITY;
