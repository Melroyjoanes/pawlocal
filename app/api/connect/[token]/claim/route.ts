import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST /api/connect/[token]/claim — public, walker claims a QR connection
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const body = await req.json()
  const { walker_name, walker_phone, walker_role, otp } = body

  if (!walker_name?.trim()) {
    return NextResponse.json({ error: 'walker_name is required' }, { status: 400 })
  }

  const db = admin()

  // Check current status
  const { data: connection, error: fetchError } = await (db.from('walker_connections') as any)
    .select('id, status, otp')
    .eq('token', token)
    .single()

  if (fetchError || !connection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (connection.status === 'active') {
    return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
  }

  // Verify OTP if one exists on the connection
  if (connection.otp && otp?.toString() !== connection.otp) {
    return NextResponse.json({ error: 'Incorrect code. Please ask the owner to show you their code again.' }, { status: 401 })
  }

  const phone = walker_phone?.trim() ?? null
  const now = new Date().toISOString()

  // Upsert walker profile — phone is the unique key.
  // This creates a permanent record of every walker who has ever connected,
  // even if they connect to multiple dogs or multiple families.
  let walkerId: string | null = null
  if (phone) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: walkerRow, error: walkerErr } = await (db.from('walkers') as any)
      .upsert(
        {
          phone,
          name: walker_name.trim(),
          role: walker_role ?? null,
          last_seen_at: now,
        },
        { onConflict: 'phone', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (!walkerErr && walkerRow) {
      walkerId = walkerRow.id as string
    }
  }

  const { error: updateError } = await (db.from('walker_connections') as any)
    .update({
      status: 'active',
      walker_name: walker_name.trim(),
      walker_phone: phone,
      walker_role: walker_role ?? null,
      claimed_at: now,
      ...(walkerId ? { walker_id: walkerId } : {}),
    })
    .eq('id', connection.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
