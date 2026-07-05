import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type Action = 'grant' | 'cancel' | 'revoke'

// Admin override actions for a parent's paid access. Deliberately reuses the
// existing `subscriptions` table (rather than a separate "override" flag) so
// every surface that already reads entitlement — lib/entitlement.ts, used by
// app/home, app/upgrade, app/my-reports, app/walk-report/[token] — picks this
// up automatically with no other code changes.
//
// - grant:  give free access for a year, as if paid (amount_paise: 0 marks it
//           as an admin grant rather than a real Razorpay payment).
// - cancel: stop auto-renewal only — access continues until expires_at, same
//           promise made in the customer-facing cancellation email.
// - revoke: immediately end access, even mid-period. For correcting mistakes
//           or granted access no longer wanted.
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await params
  const { action } = await req.json() as { action?: Action }
  if (!userId || !action || !['grant', 'cancel', 'revoke'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const client = db()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = client.from('subscriptions') as any

  if (action === 'grant') {
    const { data: existing } = await table
      .select('id, expires_at, status')
      .eq('user_id', userId)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const oneYearFromNow = new Date(Date.now() + 365 * 86400000).toISOString()

    if (existing) {
      // Extend/reactivate the most recent row rather than inserting a second
      // one — a partial unique index only allows one status='active' row per
      // user_id, so reusing the row avoids a constraint violation.
      const newExpiry = existing.expires_at && new Date(existing.expires_at) > new Date(oneYearFromNow)
        ? existing.expires_at
        : oneYearFromNow
      const { error } = await table
        .update({ status: 'active', expires_at: newExpiry })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await table.insert({
        user_id: userId,
        plan: 'monthly',
        status: 'active',
        amount_paise: 0,
        expires_at: oneYearFromNow,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // cancel / revoke both operate on the most recent subscription row
  const { data: mostRecent } = await table
    .select('id')
    .eq('user_id', userId)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!mostRecent) return NextResponse.json({ error: 'No subscription found for this parent' }, { status: 404 })

  const update = action === 'revoke'
    ? { status: 'cancelled', expires_at: new Date().toISOString() }
    : { status: 'cancelled' }

  const { error } = await table.update(update).eq('id', mostRecent.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
