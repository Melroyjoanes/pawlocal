import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'melroy@verfolia.com'

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/admin/walk-reports — admin sees all walk reports with provider + customer info
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await adminDb()
    .from('walk_reports')
    .select(`
      id,
      token,
      dog_name,
      walk_date,
      duration_mins,
      distance_meters,
      poop_count,
      pee_count,
      photo_url,
      customer_id,
      created_at,
      provider_id,
      providers!walk_reports_provider_id_fkey (
        id,
        name,
        whatsapp,
        category_slug
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
