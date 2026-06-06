import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find the contact record to verify ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contact } = await (admin.from('provider_contacts') as any)
      .select('id, provider_id')
      .eq('id', id)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Verify the requesting user owns this provider record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: provider } = await (admin.from('providers') as any)
      .select('id')
      .eq('id', contact.provider_id)
      .eq('email', user.email)
      .eq('status', 'approved')
      .single()

    if (!provider) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    type ContactUpdate = { responded?: boolean; booked?: boolean }
    const updates: ContactUpdate = {}
    if (responded !== undefined) updates.responded = responded
    if (booked !== undefined) updates.booked = booked

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.from('provider_contacts') as any)
      .update(updates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('contact patch error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
