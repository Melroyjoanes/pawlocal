import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I, etc.)

function randomSuffix(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return out
}

function buildCode(firstName: string | null): string {
  const prefix = (firstName ?? '').replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase()
  const base = prefix.length >= 2 ? prefix : 'DOG'
  return `${base}${randomSuffix(4)}`
}

// GET /api/referral/my-code — returns (creating if needed) the authenticated
// user's referral code + a ready-to-share link.
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()

  const { data: profile, error: profileError } = await (db.from('profiles') as any)
    .select('referral_code, display_name')
    .eq('id', user.id)
    .single()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  if (profile?.referral_code) {
    return NextResponse.json({
      code: profile.referral_code,
      shareUrl: `${SITE_URL}/?ref=${profile.referral_code}`,
    })
  }

  const firstName = (profile?.display_name ?? '').split(' ')[0] || null

  // Generate a code, retrying on the rare unique-constraint collision.
  let lastError: string | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = buildCode(firstName)
    const { error } = await (db.from('profiles') as any)
      .update({ referral_code: code })
      .eq('id', user.id)

    if (!error) {
      return NextResponse.json({ code, shareUrl: `${SITE_URL}/?ref=${code}` })
    }

    // Unique violation — try again with a fresh random suffix.
    if (error.code === '23505' || /duplicate key/i.test(error.message ?? '')) {
      lastError = error.message
      continue
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ error: lastError ?? 'Could not generate a unique referral code' }, { status: 500 })
}
