import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/walks/start-anonymous
// Unauthenticated — validates token, creates a walk session using service role.
// Rate limiting is implicit: the token must match a valid walker_connection.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { token, walker_name, walker_phone } = body

  if (!token || !walker_name?.trim()) {
    return NextResponse.json({ error: 'token and walker_name are required' }, { status: 400 })
  }

  const db = admin()

  // Validate token — must be an active walker_connection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: connection, error: connErr } = await (db.from('walker_connections') as any)
    .select('id, dog_id, dogs(name, owner_id, profiles:owner_id(name, full_name))')
    .eq('token', token)
    .eq('status', 'active')
    .single()

  if (connErr || !connection) {
    return NextResponse.json({ error: 'Invalid or inactive QR token' }, { status: 404 })
  }

  const dogName: string = connection.dogs?.name ?? 'Dog'
  const ownerUserId: string | null = connection.dogs?.owner_id ?? null
  const dogId: string | null = connection.dogs?.id ?? null

  let ownerPhone: string | null = null
  if (ownerUserId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (db.from('profiles') as any)
      .select('phone')
      .eq('id', ownerUserId)
      .maybeSingle()
    ownerPhone = profile?.phone ?? null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session, error: insertErr } = await (db.from('walk_sessions') as any)
    .insert({
      walker_connection_id: connection.id,
      dog_id: dogId,
      walker_name: walker_name.trim(),
      walker_phone: (walker_phone ?? '').trim(),
      parent_user_id: ownerUserId,
      status: 'active',
    })
    .select('id')
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'
  const trackingUrl = `${siteUrl}/live/${session.id}`

  let waLink: string | null = null
  if (ownerPhone) {
    const walkerFirstName = walker_name.trim().split(' ')[0]
    const msg = `🐾 ${dogName}'s walk just started with ${walkerFirstName}!\n\nTrack live here:\n${trackingUrl}\n\nYou'll get another message when the walk ends.`
    waLink = `https://wa.me/91${ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
  }

  return NextResponse.json({
    session_id: session.id,
    tracking_url: trackingUrl,
    wa_link: waLink,
  })
}
