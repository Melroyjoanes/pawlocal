import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { token, rating, reviewer_name, reviewer_phone, comment } = await req.json()

  if (!token || !rating || !reviewer_name || !reviewer_phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
  }

  // Validate token — must exist and not be used
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite } = await (admin.from('review_invites') as any)
    .select('id, provider_id, used')
    .eq('token', token)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  }
  if (invite.used) {
    return NextResponse.json({ error: 'This link has already been used' }, { status: 409 })
  }

  // Insert review
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: reviewError } = await (admin.from('reviews') as any).insert({
    provider_id: invite.provider_id,
    rating: Number(rating),
    reviewer_name: reviewer_name.trim(),
    reviewer_phone: reviewer_phone.trim(),
    comment: comment?.trim() || null,
    status: 'pending',
  })

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 })
  }

  // Mark invite as used
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('review_invites') as any)
    .update({ used: true })
    .eq('token', token)

  return NextResponse.json({ success: true })
}
