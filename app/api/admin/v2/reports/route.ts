import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type QualityLabel = 'good' | 'weak' | 'broken'

function qualityLabel(score: number | null): QualityLabel {
  if (score === null || score < 40) return 'broken'
  if (score < 70) return 'weak'
  return 'good'
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const client = db()

  // Use only guaranteed columns (those in original migration 026 + migration 043)
  const { data: reports, error } = await (client.from('walk_reports') as any)
    .select('id, token, dog_name, walker_name, walk_date, created_at, duration_mins, distance_meters, poop_count, pee_count, photo_url, route_points, notes, customer_id')
    .not('connection_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = reports ?? []

  const result = rows.map((r) => ({
    id: r.id,
    token: r.token,
    dogName: r.dog_name ?? '',
    walkerName: r.walker_name ?? null,
    walkDate: r.walk_date,
    createdAt: r.created_at,
    durationMins: r.duration_mins ?? null,
    distanceMeters: r.distance_meters ?? null,
    poopCount: r.poop_count ?? 0,
    peeCount: r.pee_count ?? 0,
    hasPhoto: !!(r.photo_url),
    hasGps: !!(r.route_points && Array.isArray(r.route_points) && r.route_points.length > 0),
    hasNotes: !!(r.notes),
    qualityScore: r.quality_score ?? null,   // null until migration 045 is run
    qualityLabel: qualityLabel(r.quality_score ?? null),
    parentOpened: r.customer_id !== null,
    emailSentAt: r.email_sent_at ?? null,   // null until migration 049 is run
  }))

  return NextResponse.json(result)
}
