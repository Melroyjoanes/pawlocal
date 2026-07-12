// Config for print/physical QR codes (vet clinic posters, pet store counters,
// etc). Each campaign has a unique slug baked into the printed QR as
// /qr/{slug} — app/qr/[slug]/route.ts logs the scan, then redirects to this
// prefilled WhatsApp message. Add a new entry here before printing a new
// poster; the slug is what makes each placement individually trackable.
//
// Message is deliberately short and generic (no clinic name) — the shorter
// and lower-friction the prefilled text, the more likely someone actually
// taps send instead of editing or abandoning it.

export const WHATSAPP_NUMBER = '919892620677'

export interface QrCampaign {
  slug: string
  message: string
}

const DEFAULT_MESSAGE = 'Hi, I saw PupStep and want to try a free walk report for my dog.'

export const QR_CAMPAIGNS: Record<string, QrCampaign> = {
  'juhu-vet-1': {
    slug: 'juhu-vet-1',
    message: DEFAULT_MESSAGE,
  },
}

export const DEFAULT_CAMPAIGN: QrCampaign = {
  slug: 'unknown',
  message: DEFAULT_MESSAGE,
}

export function getCampaign(slug: string): QrCampaign {
  return QR_CAMPAIGNS[slug] ?? { ...DEFAULT_CAMPAIGN, slug }
}

export function buildWhatsAppUrl(campaign: QrCampaign): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(campaign.message)}`
}
