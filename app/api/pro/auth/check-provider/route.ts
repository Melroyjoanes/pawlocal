import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Checks whether an email belongs to an approved provider.
// Called client-side before triggering signInWithOtp so we don't send
// magic links to random emails that aren't providers.
export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: provider } = await admin
    .from('providers')
    .select('id, status')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!provider) {
    return NextResponse.json({ error: 'not_registered' }, { status: 404 })
  }
  if (provider.status === 'pending') {
    return NextResponse.json({ error: 'pending' }, { status: 403 })
  }
  if (provider.status !== 'approved') {
    return NextResponse.json({ error: 'not_registered' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
