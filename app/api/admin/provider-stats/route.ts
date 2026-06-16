import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Fetch care_card_view events from provider_analytics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events } = await (adminDb().from('provider_analytics') as any)
    .select('provider_id, event_type, created_at')
    .eq('event_type', 'care_card_view')

  const allEvents = (events ?? []) as { provider_id: string; event_type: string; created_at: string }[]

  // Group by provider_id
  const statsMap: Record<string, { views30d: number }> = {}
  for (const ev of allEvents) {
    if (!statsMap[ev.provider_id]) statsMap[ev.provider_id] = { views30d: 0 }
    if (new Date(ev.created_at) >= thirtyDaysAgo) statsMap[ev.provider_id].views30d++
  }

  // Fetch report counts per provider (last 7 days = streak, last 30 days = sent)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: walkReports } = await (adminDb().from('walk_reports') as any)
    .select('provider_id, created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: groomReports } = await (adminDb().from('grooming_reports') as any)
    .select('provider_id, created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())

  const streakMap: Record<string, number> = {}
  const sentMap: Record<string, number> = {}
  for (const r of [...(walkReports ?? []), ...(groomReports ?? [])]) {
    sentMap[r.provider_id] = (sentMap[r.provider_id] ?? 0) + 1
    if (new Date(r.created_at) >= sevenDaysAgo) {
      streakMap[r.provider_id] = (streakMap[r.provider_id] ?? 0) + 1
    }
  }

  // Merge into final stats per provider
  const allProviderIds = new Set([...Object.keys(statsMap), ...Object.keys(streakMap), ...Object.keys(sentMap)])
  const result: Record<string, { views30d: number; reportsThisWeek: number; reportsSent30d: number }> = {}
  for (const id of allProviderIds) {
    result[id] = {
      views30d: statsMap[id]?.views30d ?? 0,
      reportsThisWeek: streakMap[id] ?? 0,
      reportsSent30d: sentMap[id] ?? 0,
    }
  }

  return NextResponse.json(result)
}
