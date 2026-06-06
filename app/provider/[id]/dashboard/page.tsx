import { notFound, redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getCategoryBySlug } from '@/lib/categories'
import type { ProviderWithPhotos, Review } from '@/lib/supabase/types'
import DashboardClient from './DashboardClient'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function greeting() {
  // IST = UTC+5:30
  const hour = new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function ProviderDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = adminClient()

  // Fetch provider
  const { data } = await supabase
    .from('providers')
    .select('*, provider_photos(*)')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (!data) notFound()

  const provider = data as unknown as ProviderWithPhotos & { user_id?: string | null }
  const category = getCategoryBySlug(provider.category_slug)
  if (!category) notFound()

  // Check auth
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  const isOwner = !!user && user.id === provider.user_id
  const isClaimed = !!provider.user_id

  // If claimed and no user is signed in → redirect to sign-in
  if (isClaimed && !user) {
    redirect(`/?auth_required=1&next=${encodeURIComponent(`/provider/${id}/dashboard`)}`)
  }

  // If claimed but wrong user → WrongAccount screen
  const wrongAccount = isClaimed && !!user && !isOwner

  // Date helpers
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  // All categories this provider covers (for broadcast matching)
  const providerSlugs = provider.category_slugs?.length
    ? provider.category_slugs
    : [provider.category_slug]

  const [analyticsRes, reviewsRes, contactsRes, broadcastsRes] = await Promise.all([
    supabase
      .from('provider_analytics')
      .select('event_type, created_at')
      .eq('provider_id', id),
    supabase
      .from('reviews')
      .select('id, rating, comment, reviewer_name, created_at, status')
      .eq('provider_id', id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),
    supabase
      .from('provider_contacts')
      .select('responded, booked, created_at')
      .eq('provider_id', id),
    // Active broadcasts matching this provider's categories
    supabase
      .from('broadcasts')
      .select('id, service_slug, pet_description, area, date_needed, budget, poster_name, poster_whatsapp, created_at')
      .eq('status', 'active')
      .gt('expires_at', now.toISOString())
      .in('service_slug', providerSlugs)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const events      = (analyticsRes.data ?? []) as { event_type: string; created_at: string }[]
  const reviews     = (reviewsRes.data ?? []) as (Review & { status: string })[]
  const contactRows = (contactsRes.data ?? []) as { responded: boolean | null; booked: boolean | null; created_at: string }[]
  const broadcasts  = (broadcastsRes.data ?? []) as {
    id: string; service_slug: string; pet_description: string; area: string
    date_needed: string; budget: string | null; poster_name: string
    poster_whatsapp: string; created_at: string
  }[]

  const views             = events.filter(e => e.event_type === 'view').length
  const viewsThisMonth    = events.filter(e => e.event_type === 'view' && e.created_at >= startOfMonth).length
  const viewsToday        = events.filter(e => e.event_type === 'view' && e.created_at >= startOfToday).length
  const contacts          = events.filter(e => e.event_type === 'whatsapp_click').length
  const contactsThisMonth = events.filter(e => e.event_type === 'whatsapp_click' && e.created_at >= startOfMonth).length
  const contactsToday     = events.filter(e => e.event_type === 'whatsapp_click' && e.created_at >= startOfToday).length
  const calls             = events.filter(e => e.event_type === 'call_click').length
  const approvedReviews   = reviews.filter(r => r.status === 'approved')
  const avgRating         = approvedReviews.length
    ? approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length
    : 0
  const fiveStarReviews   = approvedReviews.filter(r => r.rating === 5).length

  const totalContacted = contactRows.length
  const responded      = contactRows.filter(c => c.responded === true).length
  const booked         = contactRows.filter(c => c.booked === true).length
  const responseRate   = totalContacted > 0 ? Math.round((responded / totalContacted) * 100) : null

  const stats = {
    views, viewsThisMonth, viewsToday,
    contacts, contactsThisMonth, contactsToday,
    calls,

    reviews: approvedReviews.length,
    fiveStarReviews,
    avgRating,
    totalContacted, responded, booked, responseRate,
  }

  const isDogWalker = providerSlugs.includes('dog-walking')
  const firstName   = (user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? provider.name)
    .split(' ')[0]

  const latestReview = approvedReviews[0] ?? null

  return (
    <DashboardClient
      provider={provider}
      category={category}
      stats={stats}
      isClaimed={isClaimed}
      isOwner={isOwner}
      wrongAccount={wrongAccount}
      isDogWalker={isDogWalker}
      greeting={greeting()}
      firstName={firstName}
      matchingBroadcasts={broadcasts}
      latestReview={latestReview}
    />
  )
}
