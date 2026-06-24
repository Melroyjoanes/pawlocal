import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await (admin().from('profiles') as any)
    .select('notification_preferences')
    .eq('id', user.id)
    .single()

  const prefs = data?.notification_preferences ?? { report_email: true, weekly_summary: true }
  return NextResponse.json(prefs)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const updates = await req.json() as { report_email?: boolean; weekly_summary?: boolean }

  // Fetch existing prefs and merge
  const { data: existing } = await (admin().from('profiles') as any)
    .select('notification_preferences')
    .eq('id', user.id)
    .single()

  const merged = { ...(existing?.notification_preferences ?? { report_email: true, weekly_summary: true }), ...updates }

  const { error } = await (admin().from('profiles') as any)
    .update({ notification_preferences: merged })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, preferences: merged })
}
