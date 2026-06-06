import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()

  // Auth check — get session user
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find provider by session email (security: can only toggle OWN provider)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider, error: fetchError } = await (admin.from('providers') as any)
    .select('id, is_available')
    .eq('email', user.email)
    .eq('status', 'approved')
    .single()

  if (fetchError || !provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }

  // Accept explicit value from body, or flip current value
  let newValue: boolean
  try {
    const body = await req.json()
    newValue = typeof body.is_available === 'boolean' ? body.is_available : !provider.is_available
  } catch {
    newValue = !provider.is_available
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (admin.from('providers') as any)
    .update({ is_available: newValue })
    .eq('id', provider.id)

  if (updateError) {
    console.error('[availability/toggle] update failed:', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, is_available: newValue })
}
