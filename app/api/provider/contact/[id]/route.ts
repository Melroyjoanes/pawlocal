import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { responded, booked } = body as { responded?: boolean; booked?: boolean }

    if (responded === undefined && booked === undefined) {
      return NextResponse.json({ error: 'At least one of responded or booked required' }, { status: 400 })
    }

    const supabase = await createClient()

    type ContactUpdate = { responded?: boolean; booked?: boolean }
    const updates: ContactUpdate = {}
    if (responded !== undefined) updates.responded = responded
    if (booked !== undefined) updates.booked = booked

    const { error } = await supabase
      .from('provider_contacts')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('provider_contacts update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('contact patch error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
