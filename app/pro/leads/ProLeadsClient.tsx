'use client'

import Link from 'next/link'

type Broadcast = {
  id: string
  service_slug: string
  pet_description: string
  area: string
  date_needed: string
  budget: string | null
  poster_name: string
  poster_whatsapp: string
  notes: string | null
  created_at: string
}

type Props = {
  broadcasts: Broadcast[]
  providerName: string
  providerCategories: string[]
}

function formatSlug(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export default function ProLeadsClient({ broadcasts, providerName, providerCategories }: Props) {
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-stone-900"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Leads
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pet owners looking for services in your area.{' '}
          {broadcasts.length > 0 && (
            <span className="font-semibold text-[var(--pl-teal)]">{broadcasts.length} active</span>
          )}
        </p>
      </div>

      {/* Empty state */}
      {broadcasts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="text-base font-semibold text-stone-900 mb-1">No leads right now</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When pet owners post requests matching your services, they&apos;ll appear here. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => {
            const waText = encodeURIComponent(
              `Hi ${b.poster_name}, I saw your request on PawLocal for ${formatSlug(b.service_slug)}. I'd love to help! I'm ${providerName}. Could we discuss the details?`
            )
            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-border p-5 shadow-sm"
              >
                {/* Top row: category + time */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-[var(--pl-teal)] border border-teal-100">
                    {formatSlug(b.service_slug)}
                  </span>
                  <span className="text-xs text-muted-foreground">{timeAgo(b.created_at)}</span>
                </div>

                {/* Pet description */}
                <p className="text-sm font-semibold text-stone-900 leading-snug mb-3">
                  {b.pet_description}
                </p>

                {/* Details */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-1">
                  <span>📍 {b.area}</span>
                  <span>📅 {formatDate(b.date_needed)}</span>
                  {b.budget && <span>💰 {b.budget}</span>}
                </div>

                {b.notes && (
                  <p className="text-xs text-muted-foreground italic mt-2 leading-relaxed">
                    &ldquo;{b.notes}&rdquo;
                  </p>
                )}

                {/* Reply button */}
                <a
                  href={`https://wa.me/${b.poster_whatsapp.replace(/\D/g, '')}?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#25D366' }}
                >
                  💬 Reply on WhatsApp
                </a>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom spacing for nav */}
      <div className="pb-24" />
    </div>
  )
}
