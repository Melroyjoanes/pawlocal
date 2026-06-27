import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// PATCH — save expected walker phone on the most recent pending connection for this dog
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ dogId: string }> }
) {
  const { dogId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phone } = await req.json()
  if (!phone || phone.replace(/\D/g, '').length !== 10) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
  }

  const db = admin()
  const digits = phone.replace(/\D/g, '')

  // Update the most recent pending connection for this dog
  const { error } = await (db.from('walker_connections') as any)
    .update({ expected_walker_phone: digits })
    .eq('dog_id', dogId)
    .eq('owner_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
