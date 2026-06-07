import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { provider_id } = await req.json()

    if (!provider_id) {
      return NextResponse.json({ error: 'provider_id required' }, { status: 400 })
    }

    // Get current user session — may be null for anonymous visitors
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Use admin client for the INSERT — the anon/authenticated role cannot
    // validate the customer_id FK against auth.users (permission denied).
    // Service role bypasses RLS and has full auth schema access.
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin.from('provider_contacts') as any)
      .insert({
        provider_id,
        customer_id: user?.id ?? null,
        session_token: randomUUID(),
      })
      .select('id')
      .single()

    if (error) {
      console.error('provider_contacts insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contact_id: data.id })
  } catch (err) {
    console.error('contact route error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
