'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  // IST = UTC+5:30
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const istDate = new Date(now.getTime() + istOffset)
  const hour = istDate.getUTCHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatServiceSlug(slug: string) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return dateStr
  }
}

export default function ProDashboardClient({ provider, stats, broadcasts, firstName }: Props) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/pro')
  }

  // Profile completeness checks
  const missingItems: string[] = []
  if (!provider.bio) missingItems.push('Bio')
  if (!provider.provider_photos || provider.provider_photos.length === 0) missingItems.push('Photos')
  if (provider.price_min == null && provider.price_max == null) missingItems.push('Pricing')

  const greeting = getGreeting()

  return (
    <div className="min-h-dvh bg-stone-50">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-base font-semibold text-stone-900">🐾 PawLocal</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{firstName}</span>
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors px-3 py-1.5 rounded-lg border border-border hover:bg-stone-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Hero greeting */}
        <div className="pt-2">
          <h1
            className="text-2xl font-bold text-stone-900"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {greeting}, {firstName}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s how your profile is doing.
          </p>
        </div>

        {/* Stats row */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            This month
          </p>
          <div className="grid grid-cols-3 gap-3">
            {/* Views this month */}
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm text-center">
              <div className="text-lg mb-1">👁️</div>
              <div
                className="text-3xl font-bold text-stone-900"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                {stats.viewsThisMonth}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                Profile views
              </div>
            </div>

            {/* WhatsApp taps */}
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm text-center">
              <div className="text-lg mb-1">💬</div>
              <div
                className="text-3xl font-bold"
                style={{ fontFamily: "'DM Serif Display', serif", color: '#25D366' }}
              >
                {stats.whatsappTapsThisMonth}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                WhatsApp taps
              </div>
            </div>

            {/* Total views */}
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm text-center">
              <div className="text-lg mb-1">📊</div>
              <div
                className="text-3xl font-bold text-[var(--pl-teal)]"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                {stats.totalViews}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                All-time views
              </div>
            </div>
          </div>
        </div>

        {/* Profile completeness card */}
        {missingItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Profile
            </p>
            <h2 className="text-base font-semibold text-stone-900 mb-3">
              Complete your profile to get more leads
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {missingItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                >
                  <span>⚠️</span> {item} missing
                </span>
              ))}
            </div>
            <Link
              href="/pro/profile"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--pl-teal)] hover:opacity-80 transition-opacity"
            >
              Edit profile →
            </Link>
          </div>
        )}

        {/* Matching leads */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            New leads in your area
          </p>
          {broadcasts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm text-muted-foreground">
                No active leads right now. Check back soon.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((broadcast) => (
                <div
                  key={broadcast.id}
                  className="bg-white rounded-2xl border border-border p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900 leading-snug">
                        {broadcast.pet_description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {broadcast.area}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-teal-50 text-[var(--pl-teal)] border border-teal-100">
                      {formatServiceSlug(broadcast.service_slug)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span>📅 {formatDate(broadcast.date_needed)}</span>
                    {broadcast.budget && (
                      <span>💰 {broadcast.budget}</span>
                    )}
                  </div>

                  <a
                    href={`https://wa.me/${broadcast.poster_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hi ${broadcast.poster_name}, I saw your request on PawLocal for ${formatServiceSlug(broadcast.service_slug)}. I'd love to help! Could we discuss the details?`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 w-full justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    💬 Reply on WhatsApp
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Quick actions
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/pro/profile"
              className="bg-white rounded-2xl border border-border p-4 shadow-sm text-center hover:border-[var(--pl-teal)] transition-colors group"
            >
              <div className="text-xl mb-1.5">✏️</div>
              <p className="text-sm font-semibold text-stone-900 group-hover:text-[var(--pl-teal)] transition-colors">
                Edit my profile
              </p>
            </Link>

            <a
              href={`/provider/${provider.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-2xl border border-border p-4 shadow-sm text-center hover:border-[var(--pl-teal)] transition-colors group"
            >
              <div className="text-xl mb-1.5">🔗</div>
              <p className="text-sm font-semibold text-stone-900 group-hover:text-[var(--pl-teal)] transition-colors">
                View public profile
              </p>
            </a>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="pb-6" />
      </main>
    </div>
  )
}
