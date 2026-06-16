import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'

// GET /api/claim-report/[token]
// Called after Google OAuth redirect — claims the walk report and links the
// provider_clients record so all future reports from this walker auto-save.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const reportUrl = `${siteUrl}/walk-report/${token}`

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // No session — send them back to the report, they'll see the sign-in prompt again
  if (!user) return NextResponse.redirect(reportUrl)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: report } = await (admin().from('walk_reports') as any)
    .select('id, token, customer_id, client_id, provider_id')
    .eq('token', token)
    .maybeSingle()

  if (!report) return NextResponse.redirect(reportUrl)

  // Claim the report by customer_id if unclaimed
  if (!report.customer_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin().from('walk_reports') as any)
      .update({ customer_id: user.id })
      .eq('id', report.id)
  }

  // Link to provider_clients so ALL future reports from this walker auto-save.
  // Only link if the record has no owner yet — don't override an existing link.
  if (report.client_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin().from('provider_clients') as any)
      .update({
        owner_user_id: user.id,
        invite_status: 'accepted',
        linked_at: new Date().toISOString(),
      })
      .eq('id', report.client_id)
      .is('owner_user_id', null)
  }

  return NextResponse.redirect(`${reportUrl}?saved=1`)
}
