import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/connect/[token] — public, returns connection info for the QR landing page
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const db = admin()

  const { data: connection, error } = await (db.from('walker_connections') as any)
    .select(`
      id,
      token,
      status,
      walker_name,
      owner_phone,
      claimed_at,
      dogs!walker_connections_dog_id_fkey (
        name,
        breed,
        photo_url,
        health_notes,
        owner_id
      )
    `)
    .eq('token', token)
    .single()

  if (error || !connection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Look up owner first name
  let ownerFirstName = 'Your owner'
  if (connection.dogs?.owner_id) {
    const { data: profile } = await (db.from('profiles') as any)
      .select('name, full_name')
      .eq('id', connection.dogs.owner_id)
      .single()
    const fullName = profile?.name ?? profile?.full_name ?? null
    if (fullName) ownerFirstName = fullName.split(' ')[0]
  }

  return NextResponse.json({
    token: connection.token,
    status: connection.status,
    dogName: connection.dogs?.name ?? 'Dog',
    dogBreed: connection.dogs?.breed ?? null,
    dogPhoto: connection.dogs?.photo_url ?? null,
    healthNotes: connection.dogs?.health_notes ?? null,
    ownerFirstName,
    walkerName: connection.walker_name ?? null,
    ownerPhone: connection.owner_phone ?? null,
  })
}
