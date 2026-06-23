import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/dogs/[dogId]/qr — returns (or creates) a walker_connection for the dog
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ dogId: string }> }
) {
  const { dogId } = await params

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()

  // Verify dog belongs to user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dog, error: dogError } = await (db.from('dogs') as any)
    .select('id, name')
    .eq('id', dogId)
    .eq('owner_id', user.id)
    .single()

  if (dogError || !dog) {
    return NextResponse.json({ error: 'Dog not found' }, { status: 404 })
  }

  // Get the most recent connection for this dog (any status).
  // Logic:
  //   active  → walker already connected, return as-is so parent sees "connected"
  //   pending → walker hasn't scanned yet, return QR + OTP
  //   none    → first time, create a pending connection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: connection } = await (db.from('walker_connections') as any)
    .select('id, token, walker_name, walker_phone, status, otp')
    .eq('dog_id', dogId)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!connection) {
    // No connection at all — create the first pending one
    const token = generateToken()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newConn, error: createError } = await (db.from('walker_connections') as any)
      .insert({
        dog_id: dogId,
        owner_id: user.id,
        token,
        status: 'pending',
        otp: generateOTP(),
      })
      .select('id, token, walker_name, walker_phone, status, otp')
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }
    connection = newConn
  }

  // If the most recent connection is active and parent explicitly wants a new
  // walker (e.g. navigated back to /setup/qr), they can use the Team sheet
  // in /home which generates fresh QRs per connection. This endpoint is
  // used only for setup polling — returning active is the correct behaviour.

  return NextResponse.json({
    token: connection.token,
    walker_name: connection.walker_name ?? null,
    walker_phone: connection.walker_phone ?? null,
    status: connection.status,
    otp: connection.otp ?? null,
  })
}

function generateToken(): string {
  return crypto.randomBytes(16).toString('hex') // 32-char hex
}

function generateOTP(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}
