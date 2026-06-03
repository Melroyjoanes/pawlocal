import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // Try session-based auth first
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let normalized = ''

  if (user?.phone) {
    normalized = user.phone.replace(/\D/g, '').replace(/^91/, '')
  }

  // Fall back to ?whatsapp= param for backward compatibility
  if (!normalized) {
    const whatsapp = req.nextUrl.searchParams.get('whatsapp') ?? ''
    normalized = whatsapp.replace(/\D/g, '').replace(/^91/, '')
  }

  if (!normalized || normalized.length < 10) {
    return NextResponse.json({ broadcasts: [], reviews: [] })
  }

  const db = adminClient()

  // Fetch broadcasts posted by this number
  const { data: broadcasts } = await db
    .from('broadcasts')
    .select('id, service_slug, pet_description, area, date_needed, budget, status, created_at')
    .ilike('poster_whatsapp', `%${normalized}%`)
    .order('created_at', { ascending: false })

  // Fetch reviews written by this number
  const { data: reviews } = await db
    .from('reviews')
    .select('id, provider_id, rating, comment, created_at, providers(name)')
    .ilike('reviewer_phone', `%${normalized}%`)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  return NextResponse.json({
    broadcasts: broadcasts ?? [],
    reviews: reviews ?? [],
  })
}
