import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// PATCH /api/walker/[token]/profile — update walker name/role (no auth, token is identity)
// Body: { walker_name: string, walker_role: string }
// Updates walker_connections row where token matches
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { walker_name, walker_role } = await req.json()

  const db = admin()
  const { error } = await (db.from('walker_connections') as any)
    .update({
      ...(walker_name?.trim() ? { walker_name: walker_name.trim() } : {}),
      ...(walker_role ? { walker_role } : {}),
    })
    .eq('token', token)
    .eq('status', 'active')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
