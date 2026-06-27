import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { otp } = await req.json()

  if (!otp || otp.toString().length !== 4) {
    return NextResponse.json({ error: 'Enter the 4-digit code' }, { status: 400 })
  }

  const db = admin()

  // Get this walker's info from their existing connection
  const { data: thisConn } = await (db.from('walker_connections') as any)
    .select('walker_name, walker_phone, walker_role, walker_id')
    .eq('token', token)
    .eq('status', 'active')
    .single()

  if (!thisConn) return NextResponse.json({ error: 'Invalid walker token' }, { status: 404 })

  // Find pending connection by OTP (must be less than 24 hours old)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: pending } = await (db.from('walker_connections') as any)
    .select('id, token, dogs!walker_connections_dog_id_fkey(name)')
    .eq('otp', otp.toString())
    .eq('status', 'pending')
    .gte('created_at', cutoff)
    .single()

  if (!pending) {
    return NextResponse.json({ error: 'Code not found or expired. Ask your client to show you a fresh code.' }, { status: 404 })
  }

  // Connect immediately — no confirmation needed
  const { error } = await (db.from('walker_connections') as any)
    .update({
      status: 'active',
      walker_name: thisConn.walker_name,
      walker_phone: thisConn.walker_phone,
      walker_role: thisConn.walker_role,
      walker_id: thisConn.walker_id ?? null,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', pending.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const dogName = (pending as any).dogs?.name ?? 'the dog'

  return NextResponse.json({
    ok: true,
    newToken: pending.token,
    dogName,
    message: `Connected to ${dogName}!`
  })
}
