import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/walker/lookup?phone=9876543210&token=<connection_token>
// Checks if a walker phone exists in the walkers table.
// Requires a valid connection token so this can't be used as a blind
// phone-number → name enumeration oracle.
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')?.replace(/\D/g, '')
  const token = req.nextUrl.searchParams.get('token')

  if (!phone || phone.length !== 10 || !token) {
    return NextResponse.json({ found: false })
  }

  const db = admin()

  // Caller must hold a real connection token (i.e. they scanned a QR)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conn } = await (db.from('walker_connections') as any)
    .select('id')
    .eq('token', token)
    .maybeSingle()

  if (!conn) return NextResponse.json({ found: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db.from('walkers') as any)
    .select('id, name, role')
    .eq('phone', phone)
    .maybeSingle()

  if (!data) return NextResponse.json({ found: false })

  return NextResponse.json({
    found: true,
    name: data.name as string,
    role: data.role as string | null,
  })
}
