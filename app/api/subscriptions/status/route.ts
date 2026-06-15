import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/subscriptions/status — returns subscription status for the logged-in user
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ active: false, plan: null, expires_at: null })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin().from('subscriptions') as any)
    .select('plan, status, expires_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!data) return NextResponse.json({ active: false, plan: null, expires_at: null })

  return NextResponse.json({ active: true, plan: data.plan, expires_at: data.expires_at })
}
