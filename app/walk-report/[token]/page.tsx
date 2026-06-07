import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import WalkReportCard from './WalkReportCard'

type WalkReport = {
  id: string
  token: string
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
}

async function getReport(token: string): Promise<WalkReport | null> {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from('walk_reports') as any)
    .select('*, providers(name, is_verified, verification_tier)')
    .eq('token', token)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    token: data.token,
    dog_name: data.dog_name,
    walk_date: data.walk_date,
    duration_mins: data.duration_mins,
    poop_count: data.poop_count,
    pee_count: data.pee_count,
    notes: data.notes ?? null,
    photo_url: data.photo_url ?? null,
    provider_name: data.providers?.name ?? 'Your Walker',
    is_verified: data.providers?.is_verified ?? false,
    verification_tier: data.providers?.verification_tier ?? 'contacted',
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const report = await getReport(token)

  if (!report) {
    return { title: 'Walk Report · PawLocal' }
  }

  const title = `${report.dog_name}'s Walk Report · PawLocal`
  const description = `${report.provider_name} walked ${report.dog_name} for ${report.duration_mins} mins. Shared via PawLocal.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'PawLocal',
      locale: 'en_IN',
      type: 'website',
      ...(report.photo_url ? { images: [{ url: report.photo_url, alt: `${report.dog_name}'s walk` }] } : {}),
    },
    twitter: {
      card: report.photo_url ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(report.photo_url ? { images: [report.photo_url] } : {}),
    },
  }
}

export default async function WalkReportPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const report = await getReport(token)

  if (!report) notFound()

  return <WalkReportCard report={report} />
}
