// After Google OAuth, pet parent lands here to link their account to the invite token
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function resolveBase(req: NextRequest): string {
  const forwardedHost = req.headers.get('x-forwarded-host')
  if (forwardedHost) return `https://${forwardedHost}`
  if (process.env.NODE_ENV === 'development') return new URL(req.url).origin
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const base = resolveBase(req)

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${base}/join-reports/${token}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: clientRow } = await (admin().from('provider_clients') as any)
    .select('id, linked_at, owner_user_id')
    .eq('invite_token', token)
    .single()

  if (!clientRow) return NextResponse.redirect(`${base}/`)

  // Already linked to a different user — don't overwrite
  if (clientRow.linked_at && clientRow.owner_user_id && clientRow.owner_user_id !== user.id) {
    return NextResponse.redirect(`${base}/my-reports`)
  }

  // Link the pet parent's user ID and mark invite as accepted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin().from('provider_clients') as any)
    .update({
      owner_user_id: user.id,
      linked_at: new Date().toISOString(),
      invite_status: 'accepted',
    })
    .eq('id', clientRow.id)

  return NextResponse.redirect(`${base}/my-reports`)
}
