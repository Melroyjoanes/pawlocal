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
  const { walker_name, walker_phone, walker_role } = body

  if (!walker_name?.trim()) {
    return NextResponse.json({ error: 'walker_name is required' }, { status: 400 })
  }

  const db = admin()

  // Check current status
  const { data: connection, error: fetchError } = await (db.from('walker_connections') as any)
    .select('id, status')
    .eq('token', token)
    .single()

  if (fetchError || !connection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (connection.status === 'active') {
    return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
  }

  const { error: updateError } = await (db.from('walker_connections') as any)
    .update({
      status: 'active',
      walker_name: walker_name.trim(),
      walker_phone: walker_phone?.trim() ?? null,
      walker_role: walker_role ?? null,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', connection.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
