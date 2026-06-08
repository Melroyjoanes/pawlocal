import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await params

  // Find the report
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: report } = await (admin().from('walk_reports') as any)
    .select('id, customer_id')
    .eq('token', token)
    .single()

  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Already claimed by this user — idempotent
  if (report.customer_id === user.id) return NextResponse.json({ ok: true })

  // Already claimed by someone else — don't overwrite
  if (report.customer_id && report.customer_id !== user.id) {
    return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin().from('walk_reports') as any)
    .update({ customer_id: user.id })
    .eq('id', report.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
