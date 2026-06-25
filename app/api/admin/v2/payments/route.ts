import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const client = db()

  const { data: subs, error } = await (client.from('subscriptions') as any)
    .select('user_id, plan, status, amount_paise, expires_at, created_at, razorpay_payment_id')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows: Array<{
    user_id: string
    plan: string
    status: string
    amount_paise: number | null
    expires_at: string | null
    created_at: string
    razorpay_payment_id: string | null
  }> = subs ?? []

  // Get all user emails from auth
  const { data: authData } = await client.auth.admin.listUsers({ perPage: 1000 })
  const authUsers = authData?.users ?? []

  const emailMap: Record<string, string> = {}
  const nameMap: Record<string, string> = {}
  for (const u of authUsers) {
    emailMap[u.id] = u.email ?? ''
    nameMap[u.id] = u.user_metadata?.full_name ?? u.user_metadata?.name ?? ''
  }

  const now = Date.now()

  const result = rows.map((s) => {
    let daysLeft: number | null = null
    if (s.expires_at) {
      daysLeft = Math.ceil((new Date(s.expires_at).getTime() - now) / 86400000)
    }

    return {
      userId: s.user_id,
      userEmail: emailMap[s.user_id] ?? null,
      userName: nameMap[s.user_id] ?? null,
      plan: s.plan,
      status: s.status,
      amountPaise: s.amount_paise ?? 0,
      expiresAt: s.expires_at ?? null,
      daysLeft,
      createdAt: s.created_at,
      razorpayPaymentId: s.razorpay_payment_id ?? null,
    }
  })

  return NextResponse.json(result)
}
