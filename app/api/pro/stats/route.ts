import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin().from('providers') as any)
    .select('id')
    .eq('email', user.email)
    .eq('status', 'approved')
    .order('created_at', { ascending: true }).limit(1).maybeSingle()

  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: events } = await admin()
    .from('provider_analytics')
    .select('event_type, created_at')
    .eq('provider_id', provider.id)

  const allEvents = (events ?? []) as { event_type: string; created_at: string }[]
  const recentEvents = allEvents.filter((e) => new Date(e.created_at) >= thirtyDaysAgo)

  return NextResponse.json({
    viewsThisMonth: recentEvents.filter((e) => e.event_type === 'view').length,
    whatsappTapsThisMonth: recentEvents.filter((e) => e.event_type === 'whatsapp_click').length,
    totalViews: allEvents.filter((e) => e.event_type === 'view').length,
  })
}
