import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { provider_id, is_available, availability_note } = body as {
      provider_id: string
      is_available: boolean
      availability_note?: string | null
    }

    if (!provider_id || typeof is_available !== 'boolean') {
      return NextResponse.json({ error: 'Missing provider_id or is_available' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    // Auth check — must be a logged-in session user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the provider belongs to this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: providerRaw, error: fetchErr } = await (supabase as any)
      .from('providers')
      .select('id, user_id')
      .eq('id', provider_id)
      .single()

    if (fetchErr || !providerRaw) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    const provider = providerRaw as { id: string; user_id?: string | null }

    // If user_id is null on the provider (unclaimed listing), deny
    if (!provider.user_id) {
      return NextResponse.json({ error: 'This listing has not been claimed yet' }, { status: 403 })
    }

    if (provider.user_id !== user.id) {
      return NextResponse.json({ error: 'You do not own this listing' }, { status: 403 })
    }

    // Apply update
    const update: { is_available: boolean; availability_note?: string | null } = { is_available }
    if (availability_note !== undefined) {
      update.availability_note = availability_note ? String(availability_note).slice(0, 200) : null
    }

    const { error: updateErr } = await supabase
      .from('providers')
      .update(update)
      .eq('id', provider_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
