'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface Dog {
  id: string
  name: string
  breed: string | null
  photo_url: string | null
}

interface WalkSession {
  id: string
  share_token: string | null
  pet_name: string | null
  started_at: string
  ended_at?: string | null
  distance_meters?: number | null
  providers?: { name: string } | null
}

interface WalkerConnection {
  id: string
  walker_name: string
  walker_phone: string | null
  walker_role: string | null
  status: string
  dog_id: string
  dogs?: { name: string }
}

interface LastWalk {
  id: string
  started_at: string
  ended_at: string | null
  status: string
}

interface Props {
  displayName: string
  firstDog: Dog | null
  activeWalk: WalkSession | null
  completedWalk: WalkSession | null
  walkerConnections: WalkerConnection[]
  lastWalk: LastWalk | null
  isPro: boolean
}

const cardClass = 'rounded-2xl shadow-[0_4px_14px_rgba(0,0,0,0.08)] bg-white'

function UpgradeBanner() {
  return (
    <div
      style={{
        borderRadius: '16px',
        background: 'rgba(255,140,82,0.08)',
        border: '1.5px solid rgba(255,140,82,0.3)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontFamily: 'var(--font-nunito), sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            color: '#0A2F35',
            margin: '0 0 2px',
          }}
        >
          🔓 Unlock walk reports for ₹199/month
        </p>
        <p
          style={{
            fontFamily: 'var(--font-nunito), sans-serif',
            fontSize: '12px',
            color: '#6B7280',
            margin: 0,
          }}
        >
          Get WhatsApp reports after every walk.
        </p>
      </div>
      <Link
        href="/upgrade"
        style={{
          flexShrink: 0,
          backgroundColor: '#FF8C52',
          color: '#ffffff',
          borderRadius: '100px',
          padding: '6px 14px',
          fontSize: '12px',
          fontWeight: 700,
          fontFamily: 'var(--font-nunito), sans-serif',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Upgrade →
      </Link>
    </div>
  )
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${m}m ${s}s`
}

function formatDistance(meters: number | null | undefined): string | null {
  if (!meters) return null
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function DogAvatar({ dog, size = 'md' }: { dog: Dog | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-10 h-10 text-xl', md: 'w-16 h-16 text-3xl', lg: 'w-24 h-24 text-5xl' }
  const cls = `${sizes[size]} rounded-full object-cover flex-shrink-0`
  if (dog?.photo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={dog.photo_url} alt={dog.name} className={`${cls} object-cover`} />
  }
  return (
    <div className={`${cls} bg-amber-100 flex items-center justify-center`}>
      <span>🐾</span>
    </div>
  )
}

function QuickActions() {
  const actions = [
    { label: 'My Dog', emoji: '🐕', href: '/my-dogs' },
    { label: 'My Team', emoji: '👥', href: '/my-account' },
    { label: 'Reports', emoji: '📋', href: '/my-reports' },
    { label: 'Settings', emoji: '⚙', href: '/my-account' },
  ]
  return (
    <motion.div variants={fadeUp} className={`${cardClass} p-4`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Actions</p>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <span className="text-2xl">{a.emoji}</span>
            <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>
    </motion.div>
  )
}

function WalkerTeam({ connections }: { connections: WalkerConnection[] }) {
  if (connections.length === 0) return null
  return (
    <motion.div variants={fadeUp} className={`${cardClass} p-4`}>
      <p className="text-sm font-semibold text-gray-500 mb-3">Your Team</p>
      <div className="flex flex-wrap gap-2">
        {connections.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-3 py-1.5"
          >
            <div className="w-7 h-7 rounded-full bg-[#0A2F35] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {c.walker_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0A2F35] leading-tight">{c.walker_name}</p>
              {c.walker_role && (
                <p className="text-[10px] text-gray-400 capitalize">{c.walker_role}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function LiveDurationCounter({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  )

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return <span>{formatDuration(elapsed)}</span>
}

function StateA({ walk, displayName }: { walk: WalkSession; displayName: string }) {
  const dogName = walk.pet_name ?? displayName
  const walkerName = (walk.providers as { name: string } | null)?.name ?? 'your walker'
  const trackHref = walk.share_token ? `/track/${walk.share_token}` : `/my-reports`

  return (
    <motion.div className="flex flex-col gap-4" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className={`${cardClass} overflow-hidden`}>
        <div className="bg-[#0A2F35] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#25D366]" />
            </span>
            <span className="text-xs font-bold tracking-widest text-[#25D366]">LIVE</span>
          </div>
          <span className="text-xs text-white/60">Walk in progress</span>
        </div>
        <div className="p-5">
          <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-[#0A2F35] leading-tight">
            {dogName} is out with {walkerName} right now 🐾
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-gray-400 mb-0.5">Duration</p>
              <p className="text-lg font-bold text-[#0A2F35] font-[family-name:var(--font-fredoka)]">
                <LiveDurationCounter startedAt={walk.started_at} />
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-gray-400 mb-0.5">Started</p>
              <p className="text-lg font-bold text-[#0A2F35] font-[family-name:var(--font-fredoka)]">
                {formatTime(walk.started_at)}
              </p>
            </div>
          </div>
          <Link
            href={trackHref}
            className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl py-3 bg-[#FF8C52] text-white font-bold text-base shadow-[0_4px_14px_rgba(255,140,82,0.4)] hover:bg-[#e87a40] transition-colors"
          >
            Open Live Map →
          </Link>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className={`${cardClass} p-4 flex gap-3`}>
        <Link
          href="/my-dogs"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 border-2 border-[#0A2F35] text-[#0A2F35] font-semibold text-sm hover:bg-[#0A2F35] hover:text-white transition-colors"
        >
          + Add Dog
        </Link>
        <Link
          href="/my-account"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
        >
          ⚙ Settings
        </Link>
      </motion.div>

      <QuickActions />
    </motion.div>
  )
}

function StateB({
  walk,
  connections,
  firstDog,
  isPro,
}: {
  walk: WalkSession
  connections: WalkerConnection[]
  firstDog: Dog | null
  isPro: boolean
}) {
  const walkerName = (walk.providers as { name: string } | null)?.name ?? 'Your walker'
  const durationSec = walk.started_at && walk.ended_at
    ? Math.floor((new Date(walk.ended_at).getTime() - new Date(walk.started_at).getTime()) / 1000)
    : null
  const dist = formatDistance(walk.distance_meters)
  const dogName = walk.pet_name ?? firstDog?.name ?? 'Your dog'
  const trackHref = walk.share_token ? `/track/${walk.share_token}` : `/my-reports`

  return (
    <motion.div className="flex flex-col gap-4" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className={`${cardClass} p-5`}>
        <div className="flex items-start gap-4">
          <DogAvatar dog={firstDog} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#25D366] bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
                ✓ Walked today
              </span>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-[#0A2F35]">
                {dogName} walked today!
              </h2>
              {isPro && (
                <span
                  style={{
                    backgroundColor: 'oklch(0.48 0.17 196)',
                    color: '#ffffff',
                    borderRadius: '100px',
                    padding: '2px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-nunito), sans-serif',
                    flexShrink: 0,
                  }}
                >
                  Pro
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              with {walkerName} · {formatTime(walk.started_at)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {durationSec !== null && (
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Duration</p>
              <p className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-[#0A2F35]">
                {formatDuration(durationSec)}
              </p>
            </div>
          )}
          {dist && (
            <div className="bg-teal-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Distance</p>
              <p className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-[#0A2F35]">{dist}</p>
            </div>
          )}
        </div>

        <Link
          href={trackHref}
          className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl py-2.5 border-2 border-[#0A2F35] text-[#0A2F35] font-semibold text-sm hover:bg-[#0A2F35] hover:text-white transition-colors"
        >
          View Route →
        </Link>
      </motion.div>

      <WalkerTeam connections={connections} />
      <QuickActions />
    </motion.div>
  )
}

function StateC({
  displayName,
  firstDog,
  connections,
  lastWalk,
  isPro,
}: {
  displayName: string
  firstDog: Dog | null
  connections: WalkerConnection[]
  lastWalk: LastWalk | null
  isPro: boolean
}) {
  const firstName = displayName.split(' ')[0]

  return (
    <motion.div className="flex flex-col gap-4" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp}>
        <h1 className="font-[family-name:var(--font-fredoka)] text-3xl font-bold text-[#0A2F35]">
          {getGreeting()}, {firstName} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here's everything for your pup today.</p>
      </motion.div>

      {firstDog ? (
        <motion.div variants={fadeUp} className={`${cardClass} p-5`}>
          <div className="flex items-center gap-4">
            <DogAvatar dog={firstDog} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-[#0A2F35]">
                  {firstDog.name}
                </h2>
                {isPro && (
                  <span
                    style={{
                      backgroundColor: 'oklch(0.48 0.17 196)',
                      color: '#ffffff',
                      borderRadius: '100px',
                      padding: '2px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-nunito), sans-serif',
                      flexShrink: 0,
                    }}
                  >
                    Pro
                  </span>
                )}
              </div>
              {firstDog.breed && (
                <p className="text-sm text-gray-400 mt-0.5">{firstDog.breed}</p>
              )}
              {lastWalk ? (
                <p className="text-xs text-gray-400 mt-1">
                  Last walked {formatDate(lastWalk.started_at)}
                </p>
              ) : (
                <p className="text-xs text-amber-500 mt-1 font-medium">No walks logged yet</p>
              )}
            </div>
          </div>
          {connections.length > 0 && (
            <div className="mt-4 bg-amber-50 rounded-xl p-3 flex items-start gap-3">
              <span className="text-xl mt-0.5">🔗</span>
              <div>
                <p className="text-sm font-semibold text-[#0A2F35]">Share your walker's QR</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Let {connections[0].walker_name} log walks from their phone.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className={`${cardClass} p-5 text-center`}>
          <div className="text-5xl mb-3">🐕</div>
          <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-[#0A2F35]">
            No dog profile yet
          </h2>
          <p className="text-sm text-gray-400 mt-1 mb-4">Add your dog to start tracking walks.</p>
          <Link
            href="/my-dogs"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#FF8C52] text-white font-bold text-sm shadow-[0_4px_14px_rgba(255,140,82,0.4)] hover:bg-[#e87a40] transition-colors"
          >
            Set up your dog →
          </Link>
        </motion.div>
      )}

      <WalkerTeam connections={connections} />
      <QuickActions />
    </motion.div>
  )
}

export default function HomeClient({
  displayName,
  firstDog,
  activeWalk,
  completedWalk,
  walkerConnections,
  lastWalk,
  isPro,
}: Props) {
  return (
    <div
      className="min-h-screen bg-[#FFFBEB] px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
    >
      <div className="max-w-lg mx-auto flex flex-col gap-4">
        {!isPro && <UpgradeBanner />}
        {activeWalk ? (
          <StateA walk={activeWalk} displayName={displayName} />
        ) : completedWalk ? (
          <StateB walk={completedWalk} connections={walkerConnections} firstDog={firstDog} isPro={isPro} />
        ) : (
          <StateC
            displayName={displayName}
            firstDog={firstDog}
            connections={walkerConnections}
            lastWalk={lastWalk}
            isPro={isPro}
          />
        )}
      </div>
    </div>
  )
}
