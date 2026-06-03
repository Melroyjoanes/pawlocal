import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { provider_id } = await req.json()

    if (!provider_id) {
      return NextResponse.json({ error: 'provider_id required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user session (may be null for anonymous visitors)
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('provider_contacts')
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
