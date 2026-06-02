import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getCategoryBySlug } from '@/lib/categories'
import type { ProviderWithPhotos, Review } from '@/lib/supabase/types'
import DashboardClient from './DashboardClient'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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

  const provider = data as unknown as ProviderWithPhotos
  const category = getCategoryBySlug(provider.category_slug)
  if (!category) notFound()

  // Fetch analytics — silently skip if table doesn't exist yet
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [analyticsRes, reviewsRes] = await Promise.all([
    supabase
      .from('provider_analytics')
      .select('event_type, created_at')
      .eq('provider_id', id),
    supabase
      .from('reviews')
      .select('rating, status')
      .eq('provider_id', id)
      .eq('status', 'approved'),
  ])

  const events = (analyticsRes.data ?? []) as { event_type: string; created_at: string }[]
  const reviews = (reviewsRes.data ?? []) as { rating: number; status: string }[]

  const views                = events.filter(e => e.event_type === 'view').length
  const viewsThisMonth       = events.filter(e => e.event_type === 'view' && e.created_at >= startOfMonth).length
  const contacts             = events.filter(e => e.event_type === 'whatsapp_click').length
  const contactsThisMonth    = events.filter(e => e.event_type === 'whatsapp_click' && e.created_at >= startOfMonth).length
  const calls                = events.filter(e => e.event_type === 'call_click').length
  const approvedReviews      = reviews.filter(r => r.status === 'approved')
  const avgRating            = approvedReviews.length
    ? approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length
    : 0
  const fiveStarReviews      = approvedReviews.filter(r => r.rating === 5).length

  const stats = {
    views,
    viewsThisMonth,
    contacts,
    contactsThisMonth,
    calls,
    reviews: approvedReviews.length,
    fiveStarReviews,
    avgRating,
  }

  return <DashboardClient provider={provider} category={category} stats={stats} />
}
