import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function DELETE() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const db = admin()

  // Delete user data in order (most dependent first)
  // profiles row + cascaded rows are handled by FK ON DELETE CASCADE in schema
  // but we delete subscriptions and broadcasts explicitly to be safe
  await (db.from('subscriptions') as any).delete().eq('user_id', user.id)
  await (db.from('broadcasts') as any).delete().eq('user_id', user.id)
  await (db.from('saved_providers') as any).delete().eq('user_id', user.id)
  await (db.from('reviews') as any).delete().eq('user_id', user.id)
  await (db.from('booking_requests') as any).delete().eq('user_id', user.id)
  await (db.from('profiles') as any).delete().eq('id', user.id)

  // Finally delete the auth user — this is irreversible
  const { error } = await db.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
