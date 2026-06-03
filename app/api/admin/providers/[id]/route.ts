import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  type ProviderUpdate = { status?: 'approved' | 'rejected'; is_verified?: boolean; verification_tier?: string }
  const update: ProviderUpdate = {}

  if ('status' in body) {
    if (!['approved', 'rejected'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status as 'approved' | 'rejected'
  }

  if ('is_verified' in body) {
    update.is_verified = Boolean(body.is_verified)
  }

  if ('verification_tier' in body) {
    if (!['contacted', 'verified', 'certified'].includes(body.verification_tier)) {
      return NextResponse.json({ error: 'Invalid verification_tier' }, { status: 400 })
    }
    update.verification_tier = body.verification_tier as string
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('providers')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
