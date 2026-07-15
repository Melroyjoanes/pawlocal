import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CLAY_SHADOW_CREAM, CLAY_SHADOW_ORANGE } from '@/lib/clayShadows'

type Area = {
  slug: string
  name: string
  metroLabel: string
  landmark: string
  blurb: string
  icon: string
}

const AREAS: Area[] = [
  {
    slug: 'juhu',
    name: 'Juhu',
    metroLabel: 'Juhu, Mumbai',
    landmark: 'Juhu Beach',
    blurb:
      'Juhu is one of Mumbai’s most dog-dense neighbourhoods, with a steady stream of morning walkers along Juhu Beach and the surrounding lanes. Whether your dog is walked by your maid, a watchman, or a regular walker, PupStep turns that daily walk into a GPS-verified report you can actually see.',
    icon: '🏖️',
  },
  {
    slug: 'versova',
    name: 'Versova',
    metroLabel: 'Versova, Mumbai',
    landmark: 'Versova Beach',
    blurb:
      'Versova’s beachside lanes and the streets around Yari Road are walked by dogs every morning and evening. If your dog’s walker is a family friend, maid, or watchman rather than a hired professional, PupStep adds GPS-tracked proof to the walk that’s already happening — no new person, no marketplace.',
    icon: '🌊',
  },
  {
    slug: 'andheri-west',
    name: 'Andheri West',
    metroLabel: 'Andheri West, Mumbai',
    landmark: 'the western suburbs',
    blurb:
      'Andheri West is home to some of Mumbai’s busiest residential pockets, with building societies, compound gardens, and a large population of dog parents relying on someone else for the daily walk. PupStep gives you a real GPS route and photo after every walk, sent straight to WhatsApp.',
    icon: '🏢',
  },
  {
    slug: 'santacruz-west',
    name: 'Santacruz West',
    metroLabel: 'Santacruz West, Mumbai',
    landmark: 'the western suburbs',
    blurb:
      'Santacruz West’s residential lanes and building societies see a steady flow of dog walks every day. If you’re trusting a maid, watchman, or family friend to walk your dog while you’re at work, PupStep gives you GPS-verified proof of that walk — route, photo, and notes — without replacing anyone.',
    icon: '🌳',
  },
]

export function generateStaticParams() {
  return AREAS.map(area => ({ area: area.slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ area: string }> }
): Promise<Metadata> {
  const { area: areaSlug } = await params
  const area = AREAS.find(a => a.slug === areaSlug)
  if (!area) return { title: 'Area not found | PupStep' }

  const title = `GPS Dog Walking Proof in ${area.name}, Mumbai | PupStep`
  const description = `Get GPS-verified walk reports for your dog in ${area.name}, Mumbai. Works with the walker you already trust — maid, watchman, or family friend. No marketplace, no supplied walker. Free for walkers, 3-day free trial for parents.`

  return {
    title,
    description,
    keywords: [`dog walker ${area.name}`, `GPS dog walking ${area.name}`, `pet care ${area.name} Mumbai`, 'PupStep', 'dog walk report Mumbai'],
    alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/areas/${area.slug}` },
    openGraph: { title, description, type: 'website', siteName: 'PupStep' },
  }
}

export default async function AreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area: areaSlug } = await params
  const area = AREAS.find(a => a.slug === areaSlug)
  if (!area) notFound()

  return (
    <div className="min-h-screen" style={{ background: '#FFFBEB' }}>
      <div className="max-w-2xl mx-auto px-5 py-14 sm:py-20">

        {/* Back link */}
        <Link href="/faq" className="inline-flex items-center gap-1.5 text-sm font-medium mb-8 transition-colors"
          style={{ color: '#0A8A96' }}>
          ← Back
        </Link>

        {/* Hero */}
        <div className="mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
            style={{ background: '#FEF3C7', boxShadow: CLAY_SHADOW_CREAM }}
          >
            {area.icon}
          </div>
          <h1
            className="font-display text-slate-900 mb-4"
            style={{ fontSize: 'clamp(1.9rem, 5vw, 3rem)', lineHeight: 1.1, letterSpacing: '-0.02em' }}
          >
            GPS Dog Walking Proof in {area.name}
          </h1>
          <p className="text-slate-600" style={{ lineHeight: 1.7, fontSize: '1.0625rem' }}>
            {area.blurb}
          </p>
        </div>

        {/* Value prop cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <div
            className="rounded-2xl p-5"
            style={{ background: '#FFFFFF', boxShadow: CLAY_SHADOW_CREAM }}
          >
            <div className="text-2xl mb-2">📍</div>
            <p className="font-bold text-slate-800 text-sm mb-1">Real GPS route</p>
            <p className="text-xs text-slate-500" style={{ lineHeight: 1.5 }}>
              See exactly where your dog walked in {area.name}, every single time.
            </p>
          </div>
          <div
            className="rounded-2xl p-5"
            style={{ background: '#FFFFFF', boxShadow: CLAY_SHADOW_CREAM }}
          >
            <div className="text-2xl mb-2">📲</div>
            <p className="font-bold text-slate-800 text-sm mb-1">Sent to WhatsApp</p>
            <p className="text-xs text-slate-500" style={{ lineHeight: 1.5 }}>
              A photo, route, and health notes land on your phone after every walk.
            </p>
          </div>
          <div
            className="rounded-2xl p-5"
            style={{ background: '#FFFFFF', boxShadow: CLAY_SHADOW_CREAM }}
          >
            <div className="text-2xl mb-2">🤝</div>
            <p className="font-bold text-slate-800 text-sm mb-1">Keep your own walker</p>
            <p className="text-xs text-slate-500" style={{ lineHeight: 1.5 }}>
              No marketplace, no new person. Your maid, watchman, or friend logs the walk.
            </p>
          </div>
        </div>

        {/* CTA block */}
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{ background: 'linear-gradient(135deg, #0A2F35, #0D3D45)' }}
        >
          <p className="font-bold text-white text-lg mb-1">
            Get GPS-verified proof of every walk in {area.name}
          </p>
          <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Share a QR code with your own walker — no app for them to download. 3-day free trial.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/setup"
              className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full font-bold text-sm"
              style={{ background: '#FF8C52', color: '#451A03', boxShadow: CLAY_SHADOW_ORANGE }}
            >
              Set up your dog →
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full font-bold text-sm"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
            >
              See FAQs
            </Link>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-8 text-center">
          PupStep also covers Juhu, Versova, Andheri West, and Santacruz West across Mumbai.
        </p>
      </div>
    </div>
  )
}
