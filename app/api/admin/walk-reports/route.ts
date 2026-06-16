import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/admin/walk-reports — admin sees all walk reports with provider + customer info
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = adminDb()

  const { data, error } = await db
    .from('walk_reports')
    .select(`
      id,
      token,
      dog_name,
      walk_date,
      duration_mins,
      distance_meters,
      poop_count,
      pee_count,
      photo_url,
      customer_id,
      created_at,
      provider_id,
      providers!walk_reports_provider_id_fkey (
        id,
        name,
        whatsapp,
        category_slug
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reports = data ?? []

  // Enrich claimed reports with customer email from auth.users
  const claimedIds = [...new Set(
    reports.filter((r: any) => r.customer_id).map((r: any) => r.customer_id as string)
  )]

  const customerMap: Record<string, { email: string; name: string | null }> = {}

  if (claimedIds.length > 0) {
    // Fetch each user by ID using admin auth API
    await Promise.all(
      claimedIds.map(async (uid) => {
        const { data: userData } = await db.auth.admin.getUserById(uid)
        if (userData?.user) {
          customerMap[uid] = {
            email: userData.user.email ?? 'unknown',
            name: userData.user.user_metadata?.full_name ?? userData.user.user_metadata?.name ?? null,
          }
        }
      })
    )
  }

  // Fetch report_viewed and viral_hook_tapped events for all tokens
  const tokens = reports.map((r: any) => r.token as string)
  const { data: events } = tokens.length > 0
    ? await db.from('analytics_events')
        .select('report_token, event_type')
        .in('report_token', tokens)
        .in('event_type', ['report_viewed', 'viral_hook_tapped'])
    : { data: [] }

  const viewCountMap: Record<string, number> = {}
  const hookTappedSet = new Set<string>()
  for (const ev of (events ?? [])) {
    if (ev.event_type === 'report_viewed') {
      viewCountMap[ev.report_token] = (viewCountMap[ev.report_token] ?? 0) + 1
    }
    if (ev.event_type === 'viral_hook_tapped') {
      hookTappedSet.add(ev.report_token)
    }
  }

  // Attach customer info and event data to each report
  const enriched = reports.map((r: any) => ({
    ...r,
    customer: r.customer_id ? (customerMap[r.customer_id] ?? null) : null,
    view_count: viewCountMap[r.token] ?? 0,
    hook_tapped: hookTappedSet.has(r.token),
  }))

  return NextResponse.json(enriched)
}
