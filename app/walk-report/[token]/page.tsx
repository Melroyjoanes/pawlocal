import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import WalkReportCard from './WalkReportCard'
import { getEntitlement } from '@/lib/entitlement'

type WalkReport = {
  id: string
  token: string
  customer_id: string | null
  client_id: string | null
  provider_id: string | null
  owner_id: string | null
  connection_id: string | null
  dog_name: string
  walk_date: string
  duration_mins: number
  poop_count: number
  pee_count: number
  notes: string | null
  photo_url: string | null
  provider_name: string
  is_verified: boolean
  verification_tier: string
  start_location: string | null
  end_location: string | null
  route_points: {lat: number, lng: number}[] | null
  distance_meters: number | null
  poop_events: {lat: number, lng: number, time: string}[] | null
  pee_events: {lat: number, lng: number, time: string}[] | null
  logged_by: 'walker' | 'parent'
}

// cache() dedupes this across generateMetadata + the page body within the
// same request — without it, both call sites ran the same 2 DB queries.
const getReport = cache(async (token: string): Promise<WalkReport | null> => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch report first — no JOIN, avoids FK dependency on PostgREST schema cache
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from('walk_reports') as any)
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) return null

  // Separately fetch provider info (same pattern as the public API route)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = data.provider_id ? await (admin.from('providers') as any)
    .select('name, is_verified, verification_tier')
    .eq('id', data.provider_id)
    .single() : { data: null }

  return {
    id: data.id,
    token: data.token,
    customer_id: data.customer_id ?? null,
    client_id: data.client_id ?? null,
    provider_id: data.provider_id ?? null,
    owner_id: data.owner_id ?? null,
    connection_id: data.connection_id ?? null,
    dog_name: data.dog_name,
    walk_date: data.walk_date,
    duration_mins: data.duration_mins,
    poop_count: data.poop_count,
    pee_count: data.pee_count,
    notes: data.notes ?? null,
    photo_url: data.photo_url ?? null,
    // QR-connected walkers have no provider row — use walker_name stored on the report
    provider_name: provider?.name ?? data.walker_name ?? 'Your Walker',
    is_verified: provider?.is_verified ?? false,
    verification_tier: provider?.verification_tier ?? 'contacted',
    start_location: data.start_location ?? null,
    end_location: data.end_location ?? null,
    route_points: data.route_points ?? null,
    distance_meters: data.distance_meters ?? null,
    poop_events: data.poop_events ?? null,
    pee_events: data.pee_events ?? null,
    logged_by: data.logged_by ?? 'walker',
  }
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const report = await getReport(token)

  if (!report) return { title: 'Walk Report · PupStep' }

  const dogName = report.dog_name
  const walkerName = report.provider_name ?? 'Your dog walker'
  const duration = report.duration_mins ? `${report.duration_mins} mins` : ''
  const poop = report.poop_count > 0 ? `💩 ${report.poop_count}` : ''
  const pee = report.pee_count > 0 ? `💧 ${report.pee_count}` : ''
  const stats = [poop, pee, duration].filter(Boolean).join(' · ')
  const distance = report.distance_meters && report.distance_meters > 0
    ? report.distance_meters >= 1000
      ? `${(report.distance_meters / 1000).toFixed(1)} km`
      : `${Math.round(report.distance_meters)} m`
    : null

  // WhatsApp / iMessage preview: emoji-rich, warm, parent-friendly
  const title = `🐾 ${dogName}'s Walk Report`
  const description = [
    `${dogName} just had a great walk with ${walkerName} in Mumbai, India!`,
    stats && `Stats: ${stats}`,
    distance && `📏 ${distance} covered`,
  ].filter(Boolean).join(' ')

  // Use configured site URL, fall back to Vercel's automatic URL, then the known Vercel deployment
  const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/walk-report/${token}`

  // Embed report data as URL params so the OG image route doesn't need a DB query.
  // WhatsApp's scraper times out on cold-start serverless + DB latency (> ~5s).
  // Old links without params fall back to the DB query path.
  const ogParams = new URLSearchParams({ dog: dogName, walker: walkerName })
  if (report.poop_count > 0) ogParams.set('poop', String(report.poop_count))
  if (report.pee_count > 0) ogParams.set('pee', String(report.pee_count))
  if (report.duration_mins > 0) ogParams.set('mins', String(report.duration_mins))
  if (report.distance_meters && report.distance_meters > 0) {
    ogParams.set('dist', String(Math.round(report.distance_meters)))
  }
  if (report.is_verified) ogParams.set('verified', '1')
  const ogImageUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/api/og/walk-report/${token}?${ogParams.toString()}`

  return {
    title,
    description,
    // OG image is auto-generated by opengraph-image.tsx in this route folder
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'PupStep',
      type: 'article',
      // Explicitly set so layout's broken /og-image.png is not inherited
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${dogName}'s Walk Report` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  }
}

// Resolve the parent (owner) this report belongs to, trying the same
// fallback chain used in app/my-reports/page.tsx, in priority order:
//   1. owner_id column directly (migration 047, the modern path)
//   2. customer_id (legacy "claimed report" path)
//   3. connection_id -> walker_connections.owner_id (V2 QR-walker path)
//   4. dog_name matching against the dogs table (last-resort, pre-migration data)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveReportOwnerId(report: WalkReport, admin: any): Promise<string | null> {
  if (report.owner_id) return report.owner_id
  if (report.customer_id) return report.customer_id

  if (report.connection_id) {
    try {
      const { data: conn } = await admin
        .from('walker_connections')
        .select('owner_id')
        .eq('id', report.connection_id)
        .maybeSingle()
      if (conn?.owner_id) return conn.owner_id
    } catch { /* non-critical — fall through to next strategy */ }
  }

  if (report.dog_name) {
    try {
      const { data: dog } = await admin
        .from('dogs')
        .select('owner_id')
        .eq('name', report.dog_name)
        .limit(1)
        .maybeSingle()
      if (dog?.owner_id) return dog.owner_id
    } catch { /* non-critical */ }
  }

  return null
}

// ─── Locked / paywall state ─────────────────────────────────────────────────
// Rendered instead of the full report when the owning parent's entitlement
// has lapsed. Copy is deliberately neutral — this link can be opened by
// anyone (vet, family member, the parent) since there's no login required to
// view a walk report, so we never assume who's reading it.
function LockedReportView({ dogName }: { dogName: string }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#FFFBEB', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,251,235,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(10,47,53,0.08)', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.webp" alt="PupStep" style={{ height: 28, width: 'auto' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        <div style={{
          maxWidth: 420,
          width: '100%',
          background: '#fff',
          borderRadius: 24,
          padding: '32px 24px',
          textAlign: 'center',
          boxShadow: [
            'inset 0 2px 0 rgba(255,255,255,0.92)',
            'inset 0 -3px 0 rgba(0,0,0,0.09)',
            '0 1px 0 rgba(0,0,0,0.05)',
            '0 6px 20px -4px rgba(10,47,53,0.12)',
            '0 24px 48px -8px rgba(10,47,53,0.08)',
          ].join(', '),
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 18px',
            background: 'linear-gradient(135deg, oklch(0.48 0.17 196) 0%, oklch(0.38 0.15 196) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.2), 0 4px 10px oklch(0.48 0.17 196 / 0.3)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h1 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 22, fontWeight: 700, color: '#0A2F35', margin: '0 0 8px' }}>
            {dogName}&apos;s walk report
          </h1>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#6B7280', lineHeight: 1.6, margin: '0 0 4px' }}>
            A walk report exists for {dogName}, but it isn&apos;t currently viewable — the dog&apos;s parent needs an active PupStep subscription to keep report access open.
          </p>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#6B7280', lineHeight: 1.6, margin: '0 0 22px' }}>
            If you&apos;re the parent, resubscribing will restore access to this and all other reports.
          </p>

          <Link
            href="/upgrade"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '13px 28px', borderRadius: 18,
              background: '#FF8C52', color: '#fff',
              fontFamily: 'var(--font-fredoka)', fontSize: 15, fontWeight: 700,
              textDecoration: 'none',
              boxShadow: [
                'inset 0 1.5px 0 rgba(255,200,120,0.6)',
                'inset 0 -3px 0 rgba(180,60,0,0.22)',
                '0 4px 14px rgba(255,140,82,0.42)',
              ].join(', '),
            }}
          >
            Upgrade →
          </Link>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#CBD5E1', margin: 0 }}>
          Real-time GPS check-ins for your furry baby · Mumbai & India
        </p>
      </div>
    </div>
  )
}

export default async function WalkReportPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // getReport() (a DB query) and the auth lookup (a network round-trip to Supabase
  // Auth to validate/refresh the session) are independent — run them concurrently
  // instead of waiting on the report before even starting the auth check.
  const [report, { user }] = await Promise.all([
    getReport(token),
    (async () => {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      return { user }
    })(),
  ])

  if (!report) notFound()

  const isClaimedByMe = !!user && report.customer_id === user.id
  const adminCheck = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if this is the owner's first-ever walk report
  // Wrapped in try-catch — owner_id column requires migration 047
  const firstReportCheck = (async () => {
    try {
      if (!report.customer_id) return false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (adminCheck.from('walk_reports') as any)
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', report.customer_id)  // use customer_id — always exists
      return (count ?? 0) === 1
    } catch { return false /* non-critical — skip if column missing */ }
  })()

  // V2: owner is whoever has this dog via walker_connections
  // Simple check: if logged-in user's customer_id matches OR if they have a
  // walker connection for this report's connection_id
  const linkedOwnerCheck = (async () => {
    try {
      if (!(user && report.provider_id === null)) return false
      // V2 report — check if user owns a dog linked via walker_connections
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: conn } = await (adminCheck.from('walker_connections') as any)
        .select('owner_id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()
      return !!conn
    } catch { return false /* non-critical */ }
  })()

  const [isFirstReport, isLinkedOwner] = await Promise.all([firstReportCheck, linkedOwnerCheck])

  const isOwner = isLinkedOwner || isClaimedByMe

  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/walk-report/${token}`

  // Gate: this page has no login requirement to view, so resolve the report's
  // owning parent and check their entitlement (paid access, not who's currently
  // viewing) before rendering the full report content.
  //
  // Admin override: the admin must be able to open any report for support/QA
  // purposes regardless of whether that report's owning parent currently has
  // paid access — the paywall exists to gate parents from each other's data,
  // not to gate the founder from his own product.
  const isAdminViewer = !!user?.email && user.email === (process.env.ADMIN_EMAIL ?? '')
  // Self-walk reports are always free to view — the parent logged this
  // themselves, there's no walker delivery to pay for. See docs/PRD.md's
  // "payment comes after the parent feels the value" principle: the paid
  // value here is specifically walker-report delivery, not self-logging.
  const isSelfWalk = report.logged_by === 'parent'
  const ownerId = await resolveReportOwnerId(report, adminCheck)
  const isEntitled = isAdminViewer || isSelfWalk || (ownerId ? (await getEntitlement(adminCheck, ownerId)).isEntitled : false)

  if (!isEntitled) {
    return <LockedReportView dogName={report.dog_name} />
  }

  return (
    <WalkReportCard
      report={report}
      shareUrl={shareUrl}
      isFirstReport={isFirstReport}
    />
  )
}
