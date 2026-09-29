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

// Landing paths are stored in a cookie and copied into analytics_events at
// signup, so no opaque id may survive into them. /walk-report/<token> and
// /walker/<token> tokens ARE the access credential for those pages; a blog
// slug or an area name is not. Segments with no hyphen and 12+ characters are
// the id-shaped ones ("cc8a4946929e57d5766a4e808834573f", "jDhTQAjdHcWbcj25");
// real slugs ("dog-walking-charges-mumbai") and route names ("walk-report",
// "juhu") keep their meaning and are left alone.
export function redactPath(pathname: string): string {
  return pathname
    .split('/')
    .map((seg) => (seg.length >= 12 && /^[A-Za-z0-9_]+$/.test(seg) ? ':id' : seg))
    .join('/')
    .slice(0, 200)
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
