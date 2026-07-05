import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Grants `days` of free access to a user by extending their most recent
// subscription row's expires_at, or inserting a new zero-amount row if none
// exists. Mirrors the extend-or-insert pattern used by the admin "grant"
// action (app/api/admin/v2/parents/[userId]/action/route.ts) — a partial
// unique index only allows one status='active' row per user_id, so we must
// reuse the existing row rather than inserting a second one.
async function grantFreeDays(userId: string, days: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = admin().from('subscriptions') as any

  const { data: existing } = await table
    .select('id, expires_at, status')
    .eq('user_id', userId)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const bonusExpiry = new Date(Date.now() + days * 86400000).toISOString()

  if (existing) {
    const base = existing.expires_at && new Date(existing.expires_at) > new Date()
      ? new Date(existing.expires_at)
      : new Date()
    const newExpiry = new Date(base.getTime() + days * 86400000).toISOString()
    await table.update({ status: 'active', expires_at: newExpiry }).eq('id', existing.id)
  } else {
    await table.insert({
      user_id: userId,
      plan: 'monthly',
      status: 'active',
      amount_paise: 0,
      expires_at: bonusExpiry,
    })
  }
}

// GET /api/dogs — returns authenticated user's dogs
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await (admin().from('dogs') as any)
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/dogs — create a new dog
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, breed, dob, health_notes, photo_url, walk_time_bucket } = body

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const insertPayload: Record<string, unknown> = {
    owner_id: user.id,
    name,
    breed: breed ?? null,
    dob: dob ?? null,
    health_notes: health_notes ?? null,
    photo_url: photo_url ?? null,
  }
  if (walk_time_bucket) insertPayload.walk_time_bucket = walk_time_bucket

  let { data, error } = await (admin().from('dogs') as any)
    .insert(insertPayload)
    .select()
    .single()

  // walk_time_bucket is a nullable column added in migration 053 — until that
  // migration is run manually against prod, the column won't exist yet. Retry
  // without it rather than failing dog creation entirely.
  if (error && 'walk_time_bucket' in insertPayload && /walk_time_bucket/i.test(error.message ?? '')) {
    delete insertPayload.walk_time_bucket
    ;({ data, error } = await (admin().from('dogs') as any)
      .insert(insertPayload)
      .select()
      .single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Start trial on first dog creation if not already started
  ;(async () => {
    try {
      const { data: profile } = await (admin().from('profiles') as any)
        .select('trial_started_at')
        .eq('id', user.id)
        .single()
      if (profile && profile.trial_started_at === null) {
        await (admin().from('profiles') as any)
          .update({ trial_started_at: new Date().toISOString() })
          .eq('id', user.id)
      }
    } catch { /* non-critical */ }
  })()

  // Referral attribution: first dog created is the clearest signal this is a
  // real new user. Wrapped so failures never block dog creation — this is a
  // bonus, not a blocker.
  try {
    const { data: profile } = await (admin().from('profiles') as any)
      .select('referred_by_code, referral_rewards_granted')
      .eq('id', user.id)
      .single()

    if (profile && !profile.referred_by_code && !profile.referral_rewards_granted) {
      const cookieStore = await cookies()
      const refCode = cookieStore.get('pupstep_ref')?.value

      if (refCode) {
        const { data: referrer } = await (admin().from('profiles') as any)
          .select('id')
          .eq('referral_code', refCode)
          .maybeSingle()

        if (referrer && referrer.id !== user.id) {
          await (admin().from('profiles') as any)
            .update({ referred_by_code: refCode, referral_rewards_granted: true })
            .eq('id', user.id)

          await grantFreeDays(user.id, 7)
          await grantFreeDays(referrer.id, 7)
        }
      }
    }
  } catch { /* non-critical — referral bonus is best-effort */ }

  return NextResponse.json(data, { status: 201 })
}
