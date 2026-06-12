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

                  {/* CTA */}
                  {sent ? (
                    <div className="flex flex-col">
                      <div className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50">
                        ✓ Interest noted
                      </div>
                      <a
                        href={`https://wa.me/${b.poster_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! I'm ${providerName} from PupStep. I saw your request for ${formatSlug(b.service_slug)} in ${b.area} and I'd love to help. When would you like to connect?`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-bold text-white transition-all active:opacity-90"
                        style={{ background: '#25D366' }}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.528 5.845L.057 23.428a.5.5 0 00.609.61l5.64-1.476A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.91 0-3.698-.5-5.244-1.373l-.375-.217-3.888 1.018 1.034-3.774-.237-.389A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                        </svg>
                        Chat with {b.poster_name} on WhatsApp
                      </a>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleInterest(b.id, b.service_slug, b.area)}
                      className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-bold text-white transition-all active:opacity-90"
                      style={{
                        background: 'linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)',
                      }}
                    >
                      🙋 I&apos;m Interested
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
