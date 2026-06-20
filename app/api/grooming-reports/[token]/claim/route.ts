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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: report } = await (admin().from('grooming_reports') as any)
    .select('id, customer_id, provider_id, providers(user_id)')
    .eq('token', token)
    .single()

  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const providerUserId = report.providers?.user_id
  if (providerUserId && providerUserId === user.id) {
    return NextResponse.json({ error: 'Providers cannot claim their own reports' }, { status: 403 })
  }

  if (report.customer_id === user.id) return NextResponse.json({ ok: true })

  if (report.customer_id && report.customer_id !== user.id) {
    return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin().from('grooming_reports') as any)
    .update({ customer_id: user.id })
    .eq('id', report.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (admin().from('profiles') as any)
      .select('trial_started_at')
      .eq('id', user.id)
      .single()
    if (profile && profile.trial_started_at === null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin().from('profiles') as any)
        .update({ trial_started_at: new Date().toISOString() })
        .eq('id', user.id)
    }
  } catch (trialErr) {
    console.error('Failed to start trial:', trialErr)
  }

  return NextResponse.json({ ok: true })
}
