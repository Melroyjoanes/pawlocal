import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/walk-reports/[token] — public, fetch report by share token
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: report, error } = await (admin().from('walk_reports') as any)
    .select('*')
    .eq('token', token)
    .single()

  if (error || !report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  // Fetch provider name + verification_tier in a separate query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin().from('providers') as any)
    .select('name, verification_tier')
    .eq('id', report.provider_id)
    .single()

  return NextResponse.json({
    ...report,
    provider_name: provider?.name ?? null,
    is_verified: provider?.verification_tier != null && provider.verification_tier !== 'none',
  })
}

// DELETE /api/walk-reports/[token] — provider deletes their own report (auth required)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await params

  // Find provider by email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin().from('providers') as any)
    .select('id')
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  // Fetch the report and verify ownership before deleting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: report } = await (admin().from('walk_reports') as any)
    .select('id, provider_id')
    .eq('token', token)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (report.provider_id !== provider.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin().from('walk_reports') as any)
    .delete()
    .eq('id', report.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
