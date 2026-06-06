import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// DELETE — remove a booking (ownership verified)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()

  // Find the booking and verify it belongs to this provider
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (db.from('provider_bookings') as any)
    .select('id, provider_id')
    .eq('id', id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (db.from('providers') as any)
    .select('id')
    .eq('id', booking.provider_id)
    .eq('email', user.email)
    .eq('status', 'approved')
    .single()

  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('provider_bookings') as any)
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
