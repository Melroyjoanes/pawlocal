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
    return NextResponse.json({ error: 'Missing whatsapp' }, { status: 400 })
  }

  const normalized = whatsapp.replace(/\D/g, '').replace(/^91/, '')
  if (normalized.length < 10) {
    return NextResponse.json({ error: 'Invalid number' }, { status: 400 })
  }

  const supabase = adminClient()

  // Try both formats stored in DB: with and without country code
  const { data, error } = await supabase
    .from('providers')
    .select('id, name, status, category_slug')
    .or(`whatsapp.ilike.%${normalized}%`)
    .eq('status', 'approved')
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'No listing found for this WhatsApp number' }, { status: 404 })
  }

  return NextResponse.json({ id: data.id, name: data.name, category_slug: data.category_slug })
}
