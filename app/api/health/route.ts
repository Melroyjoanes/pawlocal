import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/health — for an external uptime monitor (UptimeRobot or similar)
// to ping every few minutes. Checks the two things that actually matter for
// the product to function: the database is reachable, and Resend is
// configured (a missing key silently no-ops every email in this app).
export async function GET() {
  const checks: Record<string, boolean> = {}

  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { error } = await db.from('profiles').select('id', { count: 'exact', head: true }).limit(1)
    checks.database = !error
  } catch {
    checks.database = false
  }

  checks.email_configured = !!process.env.RESEND_API_KEY

  const healthy = Object.values(checks).every(Boolean)
  return NextResponse.json({ healthy, checks }, { status: healthy ? 200 : 503 })
}
