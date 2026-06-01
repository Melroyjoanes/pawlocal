import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { provider_id, rating, comment, reviewer_name, reviewer_phone } = await req.json()

  if (!provider_id || !rating || !reviewer_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
  }

  // Verify the provider exists and is approved
  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('id', provider_id)
    .eq('status', 'approved')
    .single()

  if (!provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }

  const { error } = await supabase.from('reviews').insert({
    provider_id,
    rating: Number(rating),
    comment: comment?.trim() || null,
    reviewer_name: reviewer_name.trim(),
    reviewer_phone: reviewer_phone?.trim() || null,
  } as never)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
