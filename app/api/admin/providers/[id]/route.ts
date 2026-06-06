import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  type ProviderUpdate = {
    status?: 'approved' | 'rejected'
    is_verified?: boolean
    verification_tier?: string
    lat?: number
    lng?: number
  }
  const update: ProviderUpdate = {}

  if ('status' in body) {
    if (!['approved', 'rejected'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status as 'approved' | 'rejected'
  }

  if ('is_verified' in body) {
    update.is_verified = Boolean(body.is_verified)
  }

  if ('verification_tier' in body) {
    if (!['contacted', 'verified', 'certified'].includes(body.verification_tier)) {
      return NextResponse.json({ error: 'Invalid verification_tier' }, { status: 400 })
    }
    update.verification_tier = body.verification_tier as string
  }

  if ('lat' in body && 'lng' in body) {
    const lat = Number(body.lat)
    const lng = Number(body.lng)
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      update.lat = lat
      update.lng = lng
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data: updatedProvider, error } = await supabase
    .from('providers')
    .update(update)
    .eq('id', id)
    .select('id, name, category_slug, user_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Cast to access user_id (not yet in generated TS types)
  const prov = updatedProvider as unknown as { id: string; name: string; category_slug: string; user_id: string | null } | null

  // When a provider is approved, email them their dashboard link
  if (update.status === 'approved' && prov?.user_id && process.env.RESEND_API_KEY) {
    try {
      // Get their email from auth
      const { createClient: createAdminClient } = await import('@supabase/supabase-js')
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: { user: providerUser } } = await admin.auth.admin.getUserById(prov.user_id)

      if (providerUser?.email) {
        const dashboardUrl = `https://pawlocal.in/dashboard`
        const profileUrl = `https://pawlocal.in/provider/${prov.id}`
        const firstName = prov.name.split(' ')[0]

        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'PawLocal <hello@pawlocal.in>',
            to: providerUser.email,
            subject: `🐾 You're live on PawLocal, ${firstName}!`,
            html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #FFFBEB; padding: 32px 24px; border-radius: 24px;">
  <div style="text-align: center; margin-bottom: 28px;">
    <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
    <h1 style="font-size: 22px; font-weight: 800; color: #451A03; margin: 0 0 8px;">You're live, ${firstName}!</h1>
    <p style="font-size: 14px; color: #78716C; margin: 0;">Your PawLocal profile has been approved and is now visible to pet owners in your area.</p>
  </div>

  <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid #E5E7EB;">
    <p style="font-size: 13px; color: #6B7280; margin: 0 0 4px;">What's next</p>
    <ul style="font-size: 14px; color: #374151; margin: 0; padding-left: 20px; line-height: 2;">
      <li>Visit your dashboard to track views and contacts</li>
      <li>Complete your profile — add pricing, bio, and hours</li>
      <li>Share your profile link on WhatsApp to get your first lead</li>
    </ul>
  </div>

  <a href="${dashboardUrl}" style="display: block; text-align: center; background: linear-gradient(160deg, #FCD34D, #F59E0B); color: #451A03; font-weight: 700; font-size: 15px; padding: 16px; border-radius: 12px; text-decoration: none; margin-bottom: 12px;">
    Go to my dashboard →
  </a>
  <a href="${profileUrl}" style="display: block; text-align: center; background: white; color: #374151; font-weight: 600; font-size: 14px; padding: 14px; border-radius: 12px; text-decoration: none; border: 1px solid #E5E7EB; margin-bottom: 24px;">
    View my public profile
  </a>

  <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 0;">
    PawLocal · Juhu, Mumbai · <a href="${profileUrl}" style="color: #9CA3AF;">Unsubscribe</a>
  </p>
</div>`,
          }),
        }).catch(() => {})
      }
    } catch {}
  }

  return NextResponse.json({ success: true })
}
