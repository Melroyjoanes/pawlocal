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

  const { data: reports, error } = await (client.from('walk_reports') as any)
    .select(`
      id,
      token,
      dog_name,
      walker_name,
      owner_id,
      walk_date,
      created_at,
      duration_mins,
      distance_meters,
      poop_count,
      pee_count,
      photo_url,
      gps_path,
      notes,

      customer_id,

    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows: Array<{
    id: string
    token: string
    dog_name: string | null
    walker_name: string | null
    owner_id: string | null
    walk_date: string
    created_at: string
    duration_mins: number | null
    distance_meters: number | null
    poop_count: number | null
    pee_count: number | null
    photo_url: string | null
    gps_path: unknown | null
    notes: string | null
    quality_score: number | null
    customer_id: string | null
    email_sent_at: string | null
  }> = reports ?? []

  // Get emails for top 50 owner_ids
  const top50 = rows.slice(0, 50)
  const ownerIds = [...new Set(top50.map((r) => r.owner_id).filter((id): id is string => id !== null))]

  const emailMap: Record<string, string> = {}
  await Promise.all(
    ownerIds.map(async (uid) => {
      const { data } = await client.auth.admin.getUserById(uid)
      if (data?.user?.email) {
        emailMap[uid] = data.user.email
      }
    })
  )

  const result = rows.map((r) => ({
    id: r.id,
    token: r.token,
    dogName: r.dog_name ?? '',
    walkerName: r.walker_name ?? null,
    ownerId: r.owner_id ?? null,
    ownerEmail: r.owner_id ? (emailMap[r.owner_id] ?? null) : null,
    walkDate: r.walk_date,
    createdAt: r.created_at,
    durationMins: r.duration_mins ?? null,
    distanceMeters: r.distance_meters ?? null,
    poopCount: r.poop_count ?? 0,
    peeCount: r.pee_count ?? 0,
    hasPhoto: r.photo_url !== null && r.photo_url !== '',
    hasGps: r.gps_path !== null,
    hasNotes: r.notes !== null && r.notes !== '',
    qualityScore: r.quality_score ?? null,
    qualityLabel: qualityLabel(r.quality_score),
    parentOpened: r.customer_id !== null,
    emailSentAt: r.email_sent_at ?? null,
  }))

  return NextResponse.json(result)
}
