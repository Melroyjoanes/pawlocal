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

  // Delete in dependency order — deepest children first so no FK violation
  // walk_logs → walker_connections → dogs (all reference auth.users without CASCADE)
  await (db.from('walk_logs') as any).delete().eq('owner_id', user.id)
  await (db.from('walker_connections') as any).delete().eq('owner_id', user.id)
  await (db.from('dogs') as any).delete().eq('owner_id', user.id)
  // Null-out provider user_id (provider listing stays, just unlinked)
  await (db.from('providers') as any).update({ user_id: null }).eq('user_id', user.id)
  // Standard user data
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
