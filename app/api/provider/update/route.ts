import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Service-role client bypasses RLS — safe to use server-side only
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify the caller is authenticated via session cookie
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await req.json()
    const { id, updates } = body as {
      id: string
      updates: {
        price_min?: number | null
        price_max?: number | null
        price_unit?: string
        bio?: string
        hours_from?: string
        hours_to?: string
        working_days?: string[]
        phone?: string
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing provider id' }, { status: 400 })
    }

    const supabase = adminClient()

    // 2. Fetch the provider and verify ownership
    const { data: provider, error: fetchErr } = await supabase
      .from('providers')
      .select('id, user_id, status')
      .eq('id', id)
      .single()

    if (fetchErr || !provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    if (provider.status !== 'approved') {
      return NextResponse.json({ error: 'This listing is not yet approved' }, { status: 403 })
    }

    // Ownership check: must be the linked account
    if (provider.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Sanitise the allowed update fields — never allow status/is_verified/name changes
    const safe: Record<string, unknown> = {}
    if (updates.price_min  !== undefined) safe.price_min  = updates.price_min  === null ? null : Number(updates.price_min)
    if (updates.price_max  !== undefined) safe.price_max  = updates.price_max  === null ? null : Number(updates.price_max)
    if (updates.price_unit !== undefined) safe.price_unit = String(updates.price_unit).slice(0, 60)
    if (updates.bio        !== undefined) safe.bio        = String(updates.bio).slice(0, 800)
    if (updates.hours_from !== undefined) safe.hours_from = updates.hours_from
    if (updates.hours_to   !== undefined) safe.hours_to   = updates.hours_to
    if (updates.working_days !== undefined && Array.isArray(updates.working_days)) {
      safe.working_days = updates.working_days
    }
    if (updates.phone !== undefined) safe.phone = updates.phone ? String(updates.phone).slice(0, 15) : null

    if (Object.keys(safe).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    // 4. Apply the update
    const { error: updateErr } = await supabase
      .from('providers')
      .update(safe)
      .eq('id', id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
