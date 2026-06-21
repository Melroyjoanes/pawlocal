'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Provider } from '@/lib/supabase/types'
import StartWalkPanel from './StartWalkPanel'

type DashboardBroadcast = {
  id: string
  service_slug: string
  pet_description: string
  area: string
  date_needed: string
  budget: string | null
  poster_name: string
  poster_whatsapp: string
}

type Props = {
  provider: Provider & { provider_photos?: { url: string; is_primary: boolean }[] }
  stats: { viewsThisMonth: number; whatsappTapsThisMonth: number; totalViews: number }
  broadcasts: DashboardBroadcast[]
  firstName: string
  providerName: string
}

function getGreeting() {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const istDate = new Date(now.getTime() + istOffset)
  const hour = istDate.getUTCHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatServiceSlug(slug: string) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return dateStr
  }
}

const SPRING = { type: 'spring', stiffness: 420, damping: 36 } as const
const EASE_OUT = { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } as const

export default function ProDashboardClient({ provider, stats, broadcasts, firstName, providerName }: Props) {
  const router = useRouter()
  const [interested, setInterested] = useState<Record<string, boolean>>({})
  const [isAvailable, setIsAvailable] = useState<boolean>(
    (provider as unknown as { is_available?: boolean }).is_available !== false
  )

  async function handleInterest(broadcastId: string, serviceSlug: string, area: string) {
    if (interested[broadcastId]) return
    setInterested(prev => ({ ...prev, [broadcastId]: true }))
    fetch('/api/broadcast/interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcast_id: broadcastId, provider_name: providerName, service_slug: serviceSlug, area }),
    }).catch(() => {})
  }
  const [toggling, setToggling] = useState(false)

  const missingItems: string[] = []
  if (!provider.bio) missingItems.push('Bio')
  if (!provider.provider_photos || provider.provider_photos.length === 0) missingItems.push('Photos')
  if (provider.price_min == null && provider.price_max == null) missingItems.push('Pricing')

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/pro')
  }

  async function handleAvailabilityToggle() {
    if (toggling) return
    setToggling(true)
    const next = !isAvailable
    setIsAvailable(next)
    try {
      const res = await fetch('/api/pro/availability/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: next }),
      })
      if (!res.ok) setIsAvailable(!next)
    } catch {
      setIsAvailable(!next)
    } finally {
      setToggling(false)
    }
  }

  const primaryPhoto = provider.provider_photos?.find((p) => p.is_primary) ?? provider.provider_photos?.[0]

  return (
    <div className="min-h-dvh pb-24" style={{ background: 'oklch(0.975 0.006 85)' }}>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-base font-bold text-stone-900">🐾 PupStep Pro</span>
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {primaryPhoto ? (
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-stone-100">
                <img src={primaryPhoto.url} alt={firstName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-700">
                {firstName[0]?.toUpperCase()}
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* ── Start Walk Panel ──────────────────────────────────────── */}
        <StartWalkPanel walkerName={providerName} walkerPhone={provider.whatsapp ?? provider.phone ?? undefined} />

        {/* ── Greeting ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={EASE_OUT}
          className="pt-1"
        >
          <h1 className="text-2xl font-display text-stone-900">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">Here&apos;s how your profile is doing.</p>
        </motion.div>

        {/* ── Availability toggle ───────────────────────────────────── */}
        <motion.button
          onClick={handleAvailabilityToggle}
          disabled={toggling}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...EASE_OUT, delay: 0.05 }}
          className="w-full text-left rounded-2xl p-4 flex items-center justify-between gap-4 transition-all active:scale-[0.98] cursor-pointer"
          style={{
            background: isAvailable
              ? 'linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)'
              : 'linear-gradient(135deg, #F1F5F9 0%, #F8FAFC 100%)',
            border: `1.5px solid ${isAvailable ? '#6EE7B7' : '#E2E8F0'}`,
            transition: 'background 0.4s ease, border-color 0.4s ease',
          }}
        >
          <div className="flex items-center gap-3.5">
            <motion.div
              animate={{ scale: isAvailable ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.35 }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: isAvailable ? '#D1FAE5' : '#F1F5F9' }}
            >
              {isAvailable ? '🟢' : '⚫'}
            </motion.div>
            <div>
              <p className="font-bold text-sm text-stone-900">
                {isAvailable ? 'Taking bookings' : 'Not available'}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {isAvailable ? 'Pet owners can see and contact you' : 'Your profile shows as unavailable'}
              </p>
            </div>
          </div>

          <div className="relative flex-shrink-0">
            <div
              className="w-14 h-7 rounded-full transition-colors duration-300"
              style={{ backgroundColor: isAvailable ? '#10B981' : '#CBD5E1' }}
            />
            <motion.div
              animate={{ x: isAvailable ? 28 : 2 }}
              transition={SPRING}
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
            />
          </div>
        </motion.button>

        {/* ── Stats ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...EASE_OUT, delay: 0.1 }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">This month</p>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: '👁', value: stats.viewsThisMonth, label: 'Profile views', color: 'text-stone-900' },
              { icon: '💬', value: stats.whatsappTapsThisMonth, label: 'WA taps', color: 'text-[#25D366]' },
              { icon: '📊', value: stats.totalViews, label: 'All-time', color: 'text-[var(--pl-teal)]' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...EASE_OUT, delay: 0.12 + i * 0.04 }}
                className="bg-white rounded-2xl border border-border p-4 text-center shadow-sm"
              >
                <div className="text-lg mb-1">{stat.icon}</div>
                <div className={`text-3xl font-display ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-stone-400 mt-1 leading-tight">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Profile completeness ──────────────────────────────────── */}
        <AnimatePresence>
          {missingItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={EASE_OUT}
            >
              <div
                className="rounded-2xl p-5 border"
                style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', borderColor: '#FDE68A' }}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1.5">
                  Profile incomplete
                </p>
                <p className="text-sm text-stone-700 mb-3">
                  Add the missing info to get more leads.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {missingItems.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-amber-700 border border-amber-200"
                    >
                      ⚠️ {item}
                    </span>
                  ))}
                </div>
                <Link
                  href="/pro/profile"
                  className="inline-flex items-center gap-1 text-sm font-bold text-amber-700 hover:text-amber-900 transition-colors"
                >
                  Complete my profile →
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Leads ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...EASE_OUT, delay: 0.18 }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">
            Leads near you
          </p>

          {broadcasts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-7 text-center shadow-sm">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-semibold text-stone-700 mb-1">No active leads right now</p>
              <p className="text-sm text-stone-400">Pet owners post here when they need help. Check back soon.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((broadcast, i) => (
                <motion.div
                  key={broadcast.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...EASE_OUT, delay: 0.2 + i * 0.05 }}
                  className="bg-white rounded-2xl border border-border p-4 shadow-sm"
                >
                  {/* Service + date */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                      {formatServiceSlug(broadcast.service_slug)}
                    </span>
                    <span className="text-xs text-stone-400 flex-shrink-0">📅 {formatDate(broadcast.date_needed)}</span>
                  </div>

                  {/* Description */}
                  <p className="text-sm font-semibold text-stone-900 leading-snug mb-1">
                    {broadcast.pet_description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-stone-400 mb-4">
                    <span>📍 {broadcast.area}</span>
                    {broadcast.budget && <span>💰 {broadcast.budget}</span>}
                  </div>

                  {/* I'm Interested CTA — notifies admin, no direct customer number exposed */}
                  {(() => {
                    const sent = interested[broadcast.id]
                    return (
                      <button
                        onClick={() => handleInterest(broadcast.id, broadcast.service_slug, broadcast.area)}
                        disabled={sent}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all"
                        style={sent ? {
                          background: '#F0FDF4', color: '#15803D',
                        } : {
                          background: 'linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)',
                          color: '#fff',
                        }}
                      >
                        {sent ? "✓ Interest sent — we'll connect you" : "🙋 I'm Interested"}
                      </button>
                    )
                  })()}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Quick actions ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...EASE_OUT, delay: 0.22 }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Quick actions</p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/pro/profile"
              className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:border-teal-300 transition-colors group text-center active:scale-95 transition-transform"
            >
              <div className="text-2xl mb-1.5">✏️</div>
              <p className="text-sm font-semibold text-stone-800 group-hover:text-[var(--pl-teal)] transition-colors">
                Edit profile
              </p>
            </Link>
            <Link
              href="/pro/reports"
              className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:border-teal-300 transition-colors group text-center active:scale-95 transition-transform"
            >
              <div className="text-2xl mb-1.5">🐕</div>
              <p className="text-sm font-semibold text-stone-800 group-hover:text-[var(--pl-teal)] transition-colors">
                Walk reports
              </p>
            </Link>
          </div>
        </motion.div>

      </main>
    </div>
  )
}
