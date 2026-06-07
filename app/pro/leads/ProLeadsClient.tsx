'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

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

const EASE_OUT = { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } as const

export default function ProLeadsClient({ broadcasts, providerName }: Props) {
  const [interested, setInterested] = useState<Record<string, boolean>>({})

  async function handleInterest(broadcastId: string, serviceSlug: string, area: string) {
    if (interested[broadcastId]) return
    setInterested(prev => ({ ...prev, [broadcastId]: true }))
    // Notify admin — fire and forget
    fetch('/api/broadcast/interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcast_id: broadcastId, provider_name: providerName, service_slug: serviceSlug, area }),
    }).catch(() => {})
  }

  return (
    <div className="min-h-dvh pb-24" style={{ background: 'oklch(0.975 0.006 85)' }}>

      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-display text-xl text-stone-900">Leads</h1>
          {broadcasts.length > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
              {broadcasts.length} active
            </span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">

        {broadcasts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={EASE_OUT}
            className="bg-white rounded-2xl border border-border p-10 text-center shadow-sm mt-4"
          >
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-base font-bold text-stone-900 mb-2">No leads right now</h2>
            <p className="text-sm text-stone-400 leading-relaxed">
              When pet owners in your area post requests, they&apos;ll appear here. Check back soon.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b, i) => {
              const sent = interested[b.id]
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...EASE_OUT, delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                        {formatSlug(b.service_slug)}
                      </span>
                      <span className="text-xs text-stone-400">{timeAgo(b.created_at)}</span>
                    </div>
                    <p className="text-sm font-semibold text-stone-900 leading-snug mb-3">
                      {b.pet_description}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-400 mb-3">
                      <span>📍 {b.area}</span>
                      <span>📅 {b.date_needed || 'Flexible'}</span>
                      {b.budget && <span>💰 ₹{b.budget}</span>}
                    </div>
                    {b.notes && (
                      <p className="text-xs text-stone-500 italic leading-relaxed bg-stone-50 rounded-lg px-3 py-2 mb-3">
                        &ldquo;{b.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* CTA — "I'm Interested" instead of direct WhatsApp */}
                  <button
                    onClick={() => handleInterest(b.id, b.service_slug, b.area)}
                    disabled={sent}
                    className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-bold transition-all"
                    style={sent ? {
                      background: '#F0FDF4', color: '#15803D',
                    } : {
                      background: 'linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)',
                      color: '#fff',
                    }}
                  >
                    {sent ? '✓ Interest sent — we\'ll connect you' : '🙋 I\'m Interested'}
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
