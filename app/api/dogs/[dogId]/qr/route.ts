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

  // Get existing connection or create one
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: connection } = await (db.from('walker_connections') as any)
    .select('id, token, walker_name, walker_phone, status, otp')
    .eq('dog_id', dogId)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!connection) {
    // Create a new connection with a random token
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

  return NextResponse.json({
    token: connection.token,
    walker_name: connection.walker_name ?? null,
    walker_phone: connection.walker_phone ?? null,
    status: connection.status,
    otp: connection.otp ?? null,
  })
}

function generateToken(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateOTP(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}
