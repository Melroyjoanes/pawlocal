import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const whatsapp = req.nextUrl.searchParams.get('whatsapp') ?? ''
  if (!whatsapp) {
    return NextResponse.json({ broadcasts: [], reviews: [] })
  }

  const normalized = whatsapp.replace(/\D/g, '').replace(/^91/, '')
  if (normalized.length < 10) {
    return NextResponse.json({ broadcasts: [], reviews: [] })
  }

  const supabase = adminClient()

  // Fetch broadcasts posted by this number
  const { data: broadcasts } = await supabase
    .from('broadcasts')
    .select('id, service_slug, pet_description, area, date_needed, budget, status, created_at')
    .ilike('poster_whatsapp', `%${normalized}%`)
    .order('created_at', { ascending: false })

  // Fetch reviews written by this number
  const { data: reviews } = await supabase
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
