import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — list this provider's walk sessions (most recent 30)
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (db.from('providers') as any)
    .select('id')
    .eq('email', user.email)
    .eq('status', 'approved')
    .single()

  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from('walk_sessions') as any)
    .select('*')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — start a new walk session
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (db.from('providers') as any)
    .select('id')
    .eq('email', user.email)
    .eq('status', 'approved')
    .single()

  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Abort any active walk first (only one at a time)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.from('walk_sessions') as any)
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('provider_id', provider.id)
    .eq('status', 'active')

  const body = await req.json()
  const petName: string = body.pet_name?.trim() || null
  const customerName: string = body.customer_name?.trim() || null

  const shareToken = randomBytes(12).toString('hex') // 24 hex chars — short enough for URL

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session, error } = await (db.from('walk_sessions') as any)
    .insert({
      provider_id: provider.id,
      share_token: shareToken,
      pet_name: petName,
      customer_name: customerName,
      status: 'active',
      walk_events: [],
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pawlocal-ashen.vercel.app'
  return NextResponse.json({
    session,
    trackingUrl: `${siteUrl}/track/${shareToken}`,
  })
}
