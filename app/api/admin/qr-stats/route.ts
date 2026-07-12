import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/qr-stats — scan counts per print-QR campaign slug, plus a
// recent-scans feed. Same gating pattern as /api/admin/stats.
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = adminDb()

  const { data: scans, error } = await db
    .from('qr_campaign_scans')
    .select('slug, scanned_at')
    .order('scanned_at', { ascending: false })
    .limit(1000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = scans ?? []
  const bySlug: Record<string, number> = {}
  for (const row of rows) {
    bySlug[row.slug] = (bySlug[row.slug] ?? 0) + 1
  }

  return NextResponse.json({
    totalScans: rows.length,
    bySlug,
    recentScans: rows.slice(0, 50),
  })
}
