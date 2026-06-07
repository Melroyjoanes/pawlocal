'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Provider } from '@/lib/supabase/types'

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

export default function ProDashboardClient({ provider, stats, broadcasts, firstName }: Props) {
  const router = useRouter()
  const [isAvailable, setIsAvailable] = useState<boolean>(
    (provider as unknown as { is_available?: boolean }).is_available !== false
  )
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
          <span className="text-base font-bold text-stone-900">🐾 PawLocal Pro</span>
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

                  {/* WhatsApp CTA — big and green */}
                  <a
                    href={`https://wa.me/${broadcast.poster_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hi ${broadcast.poster_name}! I saw your post on PawLocal for ${formatServiceSlug(broadcast.service_slug)}. I can help — when are you free to chat?`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-80"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Reply on WhatsApp
                  </a>
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
            <a
              href={`/provider/${provider.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:border-teal-300 transition-colors group text-center active:scale-95 transition-transform"
            >
              <div className="text-2xl mb-1.5">🔗</div>
              <p className="text-sm font-semibold text-stone-800 group-hover:text-[var(--pl-teal)] transition-colors">
                View profile
              </p>
            </a>
          </div>
        </motion.div>

      </main>
    </div>
  )
}
