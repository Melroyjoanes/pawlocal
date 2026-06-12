import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import GroomingReportCard from './GroomingReportCard'

type Props = { params: Promise<{ token: string }> }

async function fetchReport(token: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'
  try {
    const res = await fetch(`${base}/api/grooming-reports/${token}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const report = await fetchReport(token)
  if (!report) return { title: 'Grooming Report | PupStep' }

  const { dog_name, provider_name, services_done = [], ticks_found = 0 } = report

  const serviceCount = services_done.length
  const desc = [
    `${dog_name} just had a grooming session with ${provider_name}.`,
    serviceCount > 0 ? `${serviceCount} service${serviceCount !== 1 ? 's' : ''} done.` : null,
    ticks_found > 0 ? `${ticks_found} tick${ticks_found !== 1 ? 's' : ''} removed.` : null,
  ].filter(Boolean).join(' ')

  const ogParams = new URLSearchParams({ dog: dog_name, groomer: provider_name })
  if (serviceCount > 0) ogParams.set('services', String(serviceCount))
  if (ticks_found > 0) ogParams.set('ticks', String(ticks_found))
  if (report.is_verified) ogParams.set('verified', '1')

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'
  const ogImageUrl = `${base}/api/og/grooming-report/${token}?${ogParams.toString()}`

  return {
    title: `${dog_name}'s Grooming Report | PupStep`,
    description: desc,
    openGraph: {
      title: `${dog_name} just got groomed! ✂️`,
      description: desc,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${dog_name}'s grooming report` }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${dog_name} just got groomed! ✂️`,
      description: desc,
      images: [ogImageUrl],
    },
  }
}

export default async function GroomingReportPage({ params }: Props) {
  const { token } = await params
  const report = await fetchReport(token)
  if (!report) notFound()

  return <GroomingReportCard report={report} />
}
