export const CAMPAIGN_COOKIE = 'pupstep_campaign'

export const CAMPAIGN_QUERY_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const

export type CampaignAttribution = Partial<
  Record<(typeof CAMPAIGN_QUERY_KEYS)[number], string>
> & {
  landing_path: string
  captured_at: string
}

export function campaignFromSearchParams(
  searchParams: Pick<URLSearchParams, 'get'>,
  landingPath: string
): CampaignAttribution | null {
  const campaign: Partial<Record<(typeof CAMPAIGN_QUERY_KEYS)[number], string>> = {}

  for (const key of CAMPAIGN_QUERY_KEYS) {
    const value = searchParams.get(key)?.trim().slice(0, 200)
    if (value) campaign[key] = value
  }

  if (Object.keys(campaign).length === 0) return null

  return {
    ...campaign,
    landing_path: landingPath.slice(0, 500),
    captured_at: new Date().toISOString(),
  }
}

export function parseCampaignCookie(value?: string): CampaignAttribution | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as CampaignAttribution
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}
