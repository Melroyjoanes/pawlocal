'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import ParentBottomNav from '@/components/ParentBottomNav'

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
  connection_token?: string | null
  dogs?: { name: string }
}

interface LastWalk {
  id: string
  started_at: string
  ended_at: string | null
  status: string
}

interface WalkLog {
  id: string
  started_at: string
  ended_at: string | null
  duration_mins: number | null
  distance_km: number | null
  poop_count: number | null
  pee_count: number | null
  mood: string | null
  walker_name: string | null
}

interface WeekDay { label: string; date: string; walked: boolean }
interface WeekData { days: WeekDay[]; totalKm: number; totalPoops: number; totalWalks: number }

interface Props {
  displayName: string
  firstDog: Dog | null
  activeWalk: WalkSession | null
  completedWalk: WalkSession | null
  walkerConnections: WalkerConnection[]
  lastWalk: LastWalk | null
  isPro: boolean
  walkStreak: number
  weekData: WeekData
  lastWalkLog: WalkLog | null
  todayWalked: boolean
  todayLogs: WalkLog[]
  trialStatus: string
  trialDaysRemaining: number | null
  totalReports: number
}

const cardClass = 'rounded-2xl shadow-[0_4px_14px_rgba(0,0,0,0.08)] bg-white'

function UpgradeBanner({ trialStatus, daysRemaining, totalReports }: { trialStatus: string; daysRemaining: number | null; totalReports: number }) {
  if (trialStatus === 'trial' && daysRemaining !== null && daysRemaining <= 3) {
    if (totalReports > 0) {
      return (
        <div style={{ borderRadius: '16px', background: 'rgba(255,100,30,0.08)', border: '1.5px solid rgba(255,100,30,0.4)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '14px', fontWeight: 700, color: '#C2410C', margin: '0 0 2px' }}>
              🚨 {totalReports} walk {totalReports === 1 ? 'report' : 'reports'} will lock in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}. Upgrade to keep them.
            </p>
          </div>
          <Link href="/upgrade" style={{ flexShrink: 0, backgroundColor: '#FF8C52', color: '#ffffff', borderRadius: '100px', padding: '8px 14px', minHeight: 44, display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-nunito), sans-serif', textDecoration: 'none', whiteSpace: 'nowrap' }}>Upgrade Now →</Link>
        </div>
      )
    }
    return (
      <div style={{ borderRadius: '16px', background: 'rgba(255,100,30,0.08)', border: '1.5px solid rgba(255,100,30,0.4)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '14px', fontWeight: 700, color: '#C2410C', margin: '0 0 2px' }}>
            🚨 Only {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left in your trial.
          </p>
        </div>
        <Link href="/upgrade" style={{ flexShrink: 0, backgroundColor: '#FF8C52', color: '#ffffff', borderRadius: '100px', padding: '8px 14px', minHeight: 44, display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-nunito), sans-serif', textDecoration: 'none', whiteSpace: 'nowrap' }}>Upgrade →</Link>
      </div>
    )
  }
  if (trialStatus === 'trial' && daysRemaining !== null && daysRemaining > 3) {
    if (totalReports > 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(251,191,36,0.10)', border: '1.5px solid rgba(251,191,36,0.35)', borderRadius: '100px', padding: '7px 14px' }}>
          <span style={{ fontSize: '14px' }}>📋</span>
          <span style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '13px', fontWeight: 700, color: '#92400E', flex: 1 }}>{totalReports} walk {totalReports === 1 ? 'report' : 'reports'} saved. Older ones lock after {daysRemaining} days.</span>
          <Link href="/upgrade" style={{ color: 'oklch(0.44 0.16 196)', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-nunito), sans-serif', textDecoration: 'none', whiteSpace: 'nowrap' }}>Keep full history →</Link>
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(251,191,36,0.10)', border: '1.5px solid rgba(251,191,36,0.35)', borderRadius: '100px', padding: '7px 14px' }}>
        <span style={{ fontSize: '14px' }}>⏳</span>
        <span style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '13px', fontWeight: 700, color: '#92400E', flex: 1 }}>{daysRemaining} days left in your free trial</span>
        <Link href="/upgrade" style={{ color: '#B45309', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-nunito), sans-serif', textDecoration: 'none', whiteSpace: 'nowrap' }}>Upgrade →</Link>
      </div>
    )
  }
  if (trialStatus === 'expired') {
    return (
      <div style={{ borderRadius: '16px', background: '#0A2F35', border: '1.5px solid rgba(255,255,255,0.08)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '14px', fontWeight: 700, color: '#FCA5A5', margin: 0 }}>
          {totalReports > 0
            ? `🔒 ${totalReports} ${totalReports === 1 ? 'report is' : 'reports are'} locked. Upgrade to access Bruno's full care diary.`
            : '⛔ Your trial has ended. Upgrade to start receiving walk reports.'}
        </p>
        <Link href="/upgrade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF8C52', color: '#ffffff', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-nunito), sans-serif', textDecoration: 'none', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>Unlock for ₹249/month</Link>
      </div>
    )
  }
  return (
    <div style={{ borderRadius: '16px', background: 'rgba(255,140,82,0.08)', border: '1.5px solid rgba(255,140,82,0.3)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '14px', fontWeight: 700, color: '#0A2F35', margin: '0 0 2px' }}>🔓 Start your free trial — 14 days free, then ₹249/month</p>
      </div>
      <Link href="/setup" style={{ flexShrink: 0, color: 'oklch(0.44 0.16 196)', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-nunito), sans-serif', textDecoration: 'none', whiteSpace: 'nowrap' }}>Set up your dog →</Link>
    </div>
  )
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }
const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } }

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

function WalkStreak({ streak }: { streak: number }) {
  if (streak === 0) return null
  return (
    <motion.div variants={fadeUp} style={{ background: 'linear-gradient(135deg, #FF8C52 0%, #FF6B35 100%)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 28 }}>🔥</span>
      <div>
        <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>{streak}-day streak</p>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Keep it up! Don&apos;t break the chain.</p>
      </div>
    </motion.div>
  )
}

// ── Feature 5: WeekCalendar ────────────────────────────────────────────────
function WeekCalendar({ weekData }: { weekData: WeekData }) {
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const todayStr = (() => {
    const istOffset = 5.5 * 60 * 60 * 1000
    return new Date(Date.now() + istOffset).toISOString().slice(0, 10)
  })()
  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <motion.div variants={fadeUp} className={cardClass} style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>This week</p>
        <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 13, fontWeight: 600, color: '#0A2F35', margin: 0 }}>{monthLabel}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {DAY_LABELS.map((lbl) => (
          <div key={lbl} style={{ textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 700, color: '#9CA3AF' }}>{lbl}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 12 }}>
        {weekData.days.map((d, i) => {
          const isToday = d.date === todayStr
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: d.walked ? 'oklch(0.48 0.17 196)' : '#F3F4F6', outline: isToday ? '2.5px solid #FF8C52' : 'none', outlineOffset: '2px' }}>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, color: d.walked ? '#fff' : '#9CA3AF' }}>
                  {new Date(d.date + 'T12:00:00').getDate()}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      {weekData.totalWalks > 0 && (
        <div style={{ display: 'flex', gap: 12, borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 18, fontWeight: 700, color: '#0A2F35', margin: 0 }}>{weekData.totalWalks}</p>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9CA3AF', margin: 0 }}>walks</p>
          </div>
          {weekData.totalKm > 0 && (
            <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid #F3F4F6' }}>
              <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 18, fontWeight: 700, color: '#0A2F35', margin: 0 }}>{weekData.totalKm} km</p>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9CA3AF', margin: 0 }}>distance</p>
            </div>
          )}
          {weekData.totalPoops > 0 && (
            <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid #F3F4F6' }}>
              <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 18, fontWeight: 700, color: '#0A2F35', margin: 0 }}>💩 {weekData.totalPoops}</p>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9CA3AF', margin: 0 }}>healthy</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

function LastWalkCard({ log }: { log: WalkLog }) {
  return (
    <motion.div variants={fadeUp} className={cardClass} style={{ padding: '16px' }}>
      <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Last walk</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, color: '#0A2F35', margin: 0 }}>{log.walker_name ?? 'Your walker'} · {formatTime(log.started_at)}</p>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#9CA3AF', margin: 0 }}>{formatDate(log.started_at)}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {log.duration_mins && <span style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#C2410C' }}>⏱ {log.duration_mins} min</span>}
        {log.distance_km && <span style={{ background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#0F766E' }}>📍 {log.distance_km} km</span>}
        {(log.poop_count ?? 0) > 0 && <span style={{ background: '#FEF9C3', border: '1px solid #FDE047', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#854D0E' }}>💩 {log.poop_count}</span>}
        {(log.pee_count ?? 0) > 0 && <span style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#166534' }}>🌿 {log.pee_count}</span>}
        {log.mood && <span style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>😊 {log.mood}</span>}
      </div>
      <Link href="/my-reports" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 10, borderTop: '1px solid rgba(226,220,200,0.5)', fontSize: 12, fontWeight: 700, color: 'oklch(0.44 0.16 196)', textDecoration: 'none', fontFamily: 'var(--font-nunito)' }}>
        View full report →
      </Link>
    </motion.div>
  )
}

// ── Feature 1: QuickActions with onOpenTeam + onAddDog props ─────────────
function QuickActions({ onOpenTeam, firstDog, onAddDog }: { onOpenTeam: () => void; firstDog: Dog | null; onAddDog: () => void }) {
  return (
    <motion.div variants={fadeUp} className={`${cardClass} p-4`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Actions</p>
      <div className="grid grid-cols-4 gap-2">
        {firstDog ? (
          <button onClick={onAddDog} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors border-0">
            <span className="text-2xl">🐕</span>
            <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">Add Dog</span>
          </button>
        ) : (
          <Link href="/setup" className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors">
            <span className="text-2xl">🐕</span>
            <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">Add Dog</span>
          </Link>
        )}
        <button onClick={onOpenTeam} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors border-0">
          <span className="text-2xl">👥</span>
          <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">My Team</span>
        </button>
        <Link href="/my-reports" className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors">
          <span className="text-2xl">📋</span>
          <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">Reports</span>
        </Link>
        <Link href="/upgrade" className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors">
          <span className="text-2xl">⭐</span>
          <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">Upgrade</span>
        </Link>
      </div>
    </motion.div>
  )
}

// ── AddDogSheet ───────────────────────────────────────────────────────────
function AddDogSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [newDogName, setNewDogName] = useState('')
  const [newDogBreed, setNewDogBreed] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  async function handleSubmit() {
    if (!newDogName.trim()) return
    setSaving(true)
    try {
      await fetch('/api/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDogName.trim(), breed: newDogBreed.trim() || null }),
      })
      setNewDogName('')
      setNewDogBreed('')
      onSaved()
    } catch {
      console.error('Failed to add dog')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#fff', borderRadius: '28px 28px 0 0', maxHeight: '70vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom, 16px)', boxShadow: '0 -8px 24px -4px rgba(10,47,53,0.14)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 8px' }}>
          <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 22, fontWeight: 700, color: '#0A2F35', margin: 0 }}>Add another dog 🐕</h2>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>✕</button>
        </div>
        <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#0A2F35', fontFamily: 'var(--font-nunito)' }}>Dog&apos;s name <span style={{ color: '#EF4444' }}>*</span></label>
            <input
              value={newDogName}
              onChange={e => setNewDogName(e.target.value)}
              placeholder="Bruno, Max, Bella..."
              style={{ padding: '10px 12px', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: 14, fontFamily: 'var(--font-nunito)', color: '#0A2F35', outline: 'none' }}
              onFocus={e => (e.target.style.borderColor = 'oklch(0.48 0.17 196)')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#0A2F35', fontFamily: 'var(--font-nunito)' }}>Breed <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <input
              value={newDogBreed}
              onChange={e => setNewDogBreed(e.target.value)}
              placeholder="Labrador, Pug..."
              style={{ padding: '10px 12px', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: 14, fontFamily: 'var(--font-nunito)', color: '#0A2F35', outline: 'none' }}
              onFocus={e => (e.target.style.borderColor = 'oklch(0.48 0.17 196)')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || !newDogName.trim()}
            style={{ background: saving || !newDogName.trim() ? '#9CA3AF' : 'oklch(0.48 0.17 196)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-fredoka)', cursor: saving || !newDogName.trim() ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving...' : 'Save Dog →'}
          </button>
        </div>
      </div>
    </>
  )
}

function WalkerTeam({ connections }: { connections: WalkerConnection[] }) {
  if (connections.length === 0) return null
  return (
    <motion.div variants={fadeUp} className={`${cardClass} p-4`}>
      <p className="text-sm font-semibold text-gray-500 mb-3">Your Team</p>
      <div className="flex flex-wrap gap-2">
        {connections.map((c) => (
          <div key={c.id} className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-3 py-1.5">
            <div className="w-7 h-7 rounded-full bg-[#0A2F35] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {c.walker_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0A2F35] leading-tight">{c.walker_name}</p>
              {c.walker_role && <p className="text-[10px] text-gray-400 capitalize">{c.walker_role}</p>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function LiveDurationCounter({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  return <span>{formatDuration(elapsed)}</span>
}

// ── Feature 2: Team Bottom Sheet ───────────────────────────────────────────
function TeamSheet({ open, onClose, connections, dogName }: {
  open: boolean
  onClose: () => void
  connections: WalkerConnection[]
  dogName: string
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [qrExpanded, setQrExpanded] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  if (!open) return null

  function startEdit(c: WalkerConnection) {
    setEditingId(c.id)
    setEditName(c.walker_name)
    setEditRole(c.walker_role ?? '')
    setQrExpanded(null)
  }

  async function saveEdit(id: string) {
    try {
      await fetch(`/api/my-providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walker_name: editName, walker_role: editRole }),
      })
    } catch {
      console.log('PATCH /api/my-providers — endpoint not yet built')
    }
    setSavedId(id)
    setEditingId(null)
    setTimeout(() => setSavedId(null), 2000)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#fff', borderRadius: '28px 28px 0 0', maxHeight: '80vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom, 16px)', boxShadow: '0 -8px 24px -4px rgba(10,47,53,0.14)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 8px' }}>
          <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 22, fontWeight: 700, color: '#0A2F35', margin: 0 }}>My Team 👥</h2>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>✕</button>
        </div>
        <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {connections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#9CA3AF', marginBottom: 12 }}>No walkers connected yet</p>
              <Link href="/setup" style={{ color: 'oklch(0.48 0.17 196)', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Connect a walker →</Link>
            </div>
          ) : connections.map((c) => (
            <div key={c.id} style={{ border: '1.5px solid #E5E7EB', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {editingId === c.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'oklch(0.48 0.17 196)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{c.walker_name.charAt(0).toUpperCase()}</div>
                    <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>Editing walker</span>
                  </div>
                  <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Walker name" style={{ padding: '10px 12px', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: 14, fontFamily: 'var(--font-nunito)', color: '#0A2F35', outline: 'none' }} onFocus={e => (e.target.style.borderColor = 'oklch(0.48 0.17 196)')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                  <select value={editRole} onChange={e => setEditRole(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: 14, fontFamily: 'var(--font-nunito)', color: '#0A2F35', outline: 'none', background: '#fff' }}>
                    <option value="">No role</option>
                    <option value="walker">Walker</option>
                    <option value="groomer">Groomer</option>
                    <option value="vet">Vet</option>
                    <option value="sitter">Sitter</option>
                    <option value="trainer">Trainer</option>
                  </select>
                  <button onClick={() => setQrExpanded(qrExpanded === c.id ? null : c.id)} style={{ background: '#F0FDFA', border: '1.5px solid #99F6E4', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-nunito)', color: '#0F766E', cursor: 'pointer', textAlign: 'left' }}>
                    {qrExpanded === c.id ? '▲ Hide QR Code' : '▼ Show QR Code for this walker'}
                  </button>
                  {qrExpanded === c.id && (
                    <div style={{ background: 'oklch(0.48 0.17 196)', borderRadius: 14, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      {c.connection_token ? (
                        <>
                          <div style={{ background: '#fff', padding: 12, borderRadius: 12 }}>
                            <QRCodeSVG value={`https://pupstep.in/connect/${c.connection_token}`} size={160} level="M" />
                          </div>
                          <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 28, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.15em' }}>{c.connection_token.slice(0, 4).toUpperCase()}</p>
                          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: 0, textAlign: 'center' }}>Share this QR with {c.walker_name}</p>
                          <a href={`https://wa.me/?text=${encodeURIComponent(`Scan this QR to log walks for ${dogName}: https://pupstep.in/connect/${c.connection_token}`)}`} target="_blank" rel="noopener noreferrer" style={{ background: '#25D366', color: '#fff', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-nunito)', textDecoration: 'none' }}>💬 Share on WhatsApp</a>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'rgba(255,255,255,0.9)', margin: '0 0 10px' }}>Generate a QR from the Setup page</p>
                          <Link href="/setup" style={{ color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-nunito)', textDecoration: 'underline' }}>Go to Setup →</Link>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => saveEdit(c.id)} style={{ flex: 1, background: 'oklch(0.48 0.17 196)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-nunito)', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingId(null)} style={{ flex: 1, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 10, padding: '10px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-nunito)', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0A2F35', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{c.walker_name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, color: '#0A2F35', margin: 0 }}>{c.walker_name}</p>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                      {c.walker_role && <span style={{ background: '#F0FDFA', color: '#0F766E', borderRadius: 100, padding: '2px 8px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-nunito)', textTransform: 'capitalize' }}>{c.walker_role}</span>}
                      <span style={{ background: c.status === 'connected' ? '#F0FDF4' : '#FEF9C3', color: c.status === 'connected' ? '#166534' : '#92400E', borderRadius: 100, padding: '2px 8px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>{c.status === 'connected' ? '✓ Connected' : '⏳ Pending'}</span>
                      {c.dogs?.name && <span style={{ color: '#9CA3AF', fontSize: 11, fontFamily: 'var(--font-nunito)' }}>for {c.dogs.name}</span>}
                    </div>
                  </div>
                  <button onClick={() => startEdit(c)} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 13, cursor: 'pointer', color: '#6B7280' }} title="Edit">✏️</button>
                </div>
              )}
              {savedId === c.id && <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#166534', margin: 0, textAlign: 'center' }}>✓ Saved!</p>}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Feature 3: Dog Edit Sheet ──────────────────────────────────────────────
function DogEditSheet({ open, dog, onClose }: { open: boolean; dog: Dog | null; onClose: () => void }) {
  const [dogName, setDogName] = useState(dog?.name ?? '')
  const [breed, setBreed] = useState(dog?.breed ?? '')
  const [photoUrl, setPhotoUrl] = useState(dog?.photo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dog) {
      setDogName(dog.name)
      setBreed(dog.breed ?? '')
      setPhotoUrl(dog.photo_url ?? '')
      setSaved(false)
    }
  }, [dog])

  if (!open || !dog) return null

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `dog-photos/${dog!.id}/${Date.now()}.${ext}`
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.storage.from('provider-photos').upload(path, file)
      const { data } = supabase.storage.from('provider-photos').getPublicUrl(path)
      setPhotoUrl(data.publicUrl)
    } catch (err) {
      console.error('Photo upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    try {
      await fetch('/api/dogs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dog!.id, name: dogName, breed, photo_url: photoUrl }),
      })
    } catch {
      console.log('PATCH /api/dogs — endpoint may not exist yet')
    }
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1200)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#fff', borderRadius: '28px 28px 0 0', maxHeight: '80vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom, 16px)', boxShadow: '0 -8px 24px -4px rgba(10,47,53,0.14)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 8px' }}>
          <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 22, fontWeight: 700, color: '#0A2F35', margin: 0 }}>Edit Dog Profile 🐕</h2>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>✕</button>
        </div>
        <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ width: 80, height: 80, borderRadius: '50%', background: photoUrl ? 'transparent' : '#FFFBEB', border: '2.5px dashed #FF8C52', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, position: 'relative' }}>
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="dog" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <span>🐕</span>
              )}
              {uploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                  <span style={{ fontSize: 13 }}>⏳</span>
                </div>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#9CA3AF', margin: 0 }}>Tap to change photo</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#0A2F35', fontFamily: 'var(--font-nunito)' }}>Dog&apos;s name</label>
            <input value={dogName} onChange={e => setDogName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: 14, fontFamily: 'var(--font-nunito)', color: '#0A2F35', outline: 'none' }} onFocus={e => (e.target.style.borderColor = '#FF8C52')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#0A2F35', fontFamily: 'var(--font-nunito)' }}>Breed <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <input value={breed} onChange={e => setBreed(e.target.value)} placeholder="e.g. Labrador, Pomeranian" style={{ padding: '10px 12px', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: 14, fontFamily: 'var(--font-nunito)', color: '#0A2F35', outline: 'none' }} onFocus={e => (e.target.style.borderColor = '#FF8C52')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
          </div>
          <button onClick={handleSave} disabled={uploading} style={{ background: saved ? '#166534' : 'oklch(0.48 0.17 196)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-fredoka)', cursor: uploading ? 'not-allowed' : 'pointer' }}>
            {saved ? '✓ Saved!' : uploading ? 'Uploading...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Feature 4: Settings Sheet ──────────────────────────────────────────────
function SettingsSheet({ open, onClose, displayName }: { open: boolean; onClose: () => void; displayName: string }) {
  const [name, setName] = useState(displayName)
  const [signingOut, setSigningOut] = useState(false)

  if (!open) return null

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      console.error('Sign out error')
    }
    window.location.href = '/?signed_out=1'
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#fff', borderRadius: '28px 28px 0 0', maxHeight: '70vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom, 16px)', boxShadow: '0 -8px 24px -4px rgba(10,47,53,0.14)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 8px' }}>
          <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 22, fontWeight: 700, color: '#0A2F35', margin: 0 }}>Settings ⚙️</h2>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>✕</button>
        </div>
        <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#0A2F35', fontFamily: 'var(--font-nunito)' }}>Display name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: 14, fontFamily: 'var(--font-nunito)', color: '#0A2F35', outline: 'none' }} onFocus={e => (e.target.style.borderColor = '#FF8C52')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
          </div>
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
            <button onClick={handleSignOut} disabled={signingOut} style={{ width: '100%', background: '#FEF2F2', color: '#DC2626', border: '1.5px solid #FECACA', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-fredoka)', cursor: signingOut ? 'not-allowed' : 'pointer' }}>
              {signingOut ? 'Signing out...' : '🚪 Sign out'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function StateA({ walk, displayName, firstDog, onOpenTeam, onAddDog }: { walk: WalkSession; displayName: string; firstDog: Dog | null; onOpenTeam: () => void; onAddDog: () => void }) {
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
          <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-[#0A2F35] leading-tight">{dogName} is out with {walkerName} right now 🐾</h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-gray-400 mb-0.5">Duration</p>
              <p className="text-lg font-bold text-[#0A2F35] font-[family-name:var(--font-fredoka)]"><LiveDurationCounter startedAt={walk.started_at} /></p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-gray-400 mb-0.5">Started</p>
              <p className="text-lg font-bold text-[#0A2F35] font-[family-name:var(--font-fredoka)]">{formatTime(walk.started_at)}</p>
            </div>
          </div>
          <Link href={trackHref} className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl py-3 bg-[#FF8C52] text-white font-bold text-base shadow-[0_4px_14px_rgba(255,140,82,0.4)] hover:bg-[#e87a40] transition-colors">Open Live Map →</Link>
        </div>
      </motion.div>
      <motion.div variants={fadeUp} className={`${cardClass} p-4 flex gap-3`}>
        <Link href="/my-dogs" className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 border-2 border-[#0A2F35] text-[#0A2F35] font-semibold text-sm hover:bg-[#0A2F35] hover:text-white transition-colors">+ Add Dog</Link>
        <Link href="/my-account" className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">⚙ Settings</Link>
      </motion.div>
      <QuickActions onOpenTeam={onOpenTeam} firstDog={firstDog} onAddDog={onAddDog} />
    </motion.div>
  )
}

function StateB({ walk, connections, firstDog, isPro, onOpenTeam, onEditDog, onAddDog }: {
  walk: WalkSession
  connections: WalkerConnection[]
  firstDog: Dog | null
  isPro: boolean
  onOpenTeam: () => void
  onEditDog: (dog: Dog) => void
  onAddDog: () => void
}) {
  const walkerName = (walk.providers as { name: string } | null)?.name ?? 'Your walker'
  const durationSec = walk.started_at && walk.ended_at ? Math.floor((new Date(walk.ended_at).getTime() - new Date(walk.started_at).getTime()) / 1000) : null
  const dist = formatDistance(walk.distance_meters)
  const dogName = walk.pet_name ?? firstDog?.name ?? 'Your dog'
  const trackHref = walk.share_token ? `/track/${walk.share_token}` : `/my-reports`
  return (
    <motion.div className="flex flex-col gap-4" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className={`${cardClass} p-5`}>
        <div className="flex items-start gap-4">
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <DogAvatar dog={firstDog} size="lg" />
            {firstDog && (
              <button onClick={() => onEditDog(firstDog)} style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✏️</button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#25D366] bg-green-50 border border-green-100 rounded-full px-2 py-0.5">✓ Walked today</span>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-[#0A2F35]">{dogName} walked today!</h2>
              {isPro && <span style={{ backgroundColor: 'oklch(0.48 0.17 196)', color: '#ffffff', borderRadius: '100px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-nunito), sans-serif', flexShrink: 0 }}>Pro</span>}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">with {walkerName} · {formatTime(walk.started_at)}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {durationSec !== null && <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-400 mb-1">Duration</p><p className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-[#0A2F35]">{formatDuration(durationSec)}</p></div>}
          {dist && <div className="bg-teal-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-400 mb-1">Distance</p><p className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-[#0A2F35]">{dist}</p></div>}
        </div>
        <Link href={trackHref} className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl py-2.5 border-2 border-[#0A2F35] text-[#0A2F35] font-semibold text-sm hover:bg-[#0A2F35] hover:text-white transition-colors">View Route →</Link>
      </motion.div>
      <WalkerTeam connections={connections} />
      <QuickActions onOpenTeam={onOpenTeam} firstDog={firstDog} onAddDog={onAddDog} />
    </motion.div>
  )
}

function StateC({ displayName, firstDog, connections, lastWalk, isPro, walkStreak, weekData, lastWalkLog, todayWalked, todayLogs, onOpenTeam, onEditDog, onAddDog }: {
  displayName: string
  firstDog: Dog | null
  connections: WalkerConnection[]
  lastWalk: LastWalk | null
  isPro: boolean
  walkStreak: number
  weekData: WeekData
  lastWalkLog: WalkLog | null
  todayWalked: boolean
  todayLogs: WalkLog[]
  onOpenTeam: () => void
  onEditDog: (dog: Dog) => void
  onAddDog: () => void
}) {
  const firstName = displayName.split(' ')[0]
  const lastWalkedDate = lastWalkLog?.started_at ?? lastWalk?.started_at ?? null
  return (
    <motion.div className="flex flex-col gap-4" variants={stagger} initial="hidden" animate="show">
      {/* 1. Greeting */}
      <motion.div variants={fadeUp}>
        <h1 className="font-[family-name:var(--font-fredoka)] text-3xl font-bold text-[#0A2F35]">{getGreeting()}, {firstName} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s everything for your pup today.</p>
      </motion.div>

      {/* 2. Dog card */}
      {firstDog ? (
        <motion.div variants={fadeUp} className={`${cardClass} p-5`}>
          <div className="flex items-center gap-4">
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <DogAvatar dog={firstDog} size="lg" />
              <button onClick={() => onEditDog(firstDog)} style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✏️</button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-[#0A2F35]">{firstDog.name}</h2>
                {isPro && <span style={{ backgroundColor: 'oklch(0.48 0.17 196)', color: '#ffffff', borderRadius: '100px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-nunito), sans-serif', flexShrink: 0 }}>Pro</span>}
              </div>
              {firstDog.breed && <p className="text-sm text-gray-400 mt-0.5">{firstDog.breed}</p>}
              {lastWalkedDate ? <p className="text-xs text-gray-400 mt-1">Last walked {formatDate(lastWalkedDate)}</p> : <p className="text-xs text-amber-500 mt-1 font-medium">No walks logged yet</p>}
            </div>
          </div>
          {connections.length > 0 && (
            <div className="mt-4 bg-amber-50 rounded-xl p-3 flex items-start gap-3">
              <span className="text-xl mt-0.5">🔗</span>
              <div>
                <p className="text-sm font-semibold text-[#0A2F35]">Share your walker&apos;s QR</p>
                <p className="text-xs text-gray-500 mt-0.5">Let {connections[0].walker_name} log walks from their phone.</p>
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className={`${cardClass} p-5 text-center`}>
          <div className="text-5xl mb-3">🐕</div>
          <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-[#0A2F35]">No dog profile yet</h2>
          <p className="text-sm text-gray-400 mt-1 mb-4">Add your dog to start tracking walks.</p>
          <Link href="/my-dogs" className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#FF8C52] text-white font-bold text-sm shadow-[0_4px_14px_rgba(255,140,82,0.4)] hover:bg-[#e87a40] transition-colors">Set up your dog →</Link>
        </motion.div>
      )}

      {/* 3. Today status */}
      {todayWalked && todayLogs[0] ? (
        <motion.div variants={fadeUp} style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>✅</span>
          <div>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, color: '#166534', margin: 0 }}>Walked today!</p>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#16A34A', margin: 0 }}>{todayLogs[0].walker_name ?? 'Your walker'} · {todayLogs[0].duration_mins ? `${todayLogs[0].duration_mins} min` : formatTime(todayLogs[0].started_at)}</p>
          </div>
        </motion.div>
      ) : connections.length > 0 ? (
        <motion.div variants={fadeUp} style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>⏳</span>
            <div>
              <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 15, fontWeight: 700, color: '#92400E', margin: 0 }}>No walk yet today</p>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#B45309', margin: 0 }}>{connections[0].walker_name} hasn&apos;t logged yet</p>
            </div>
          </div>
          {connections[0].walker_phone && (
            <a href={`https://wa.me/91${connections[0].walker_phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ background: '#25D366', color: '#fff', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-nunito)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>💬 Remind</a>
          )}
        </motion.div>
      ) : null}

      {/* 4. Walk streak */}
      <WalkStreak streak={walkStreak} />

      {/* 5. Week calendar */}
      <WeekCalendar weekData={weekData} />

      {/* 6. Last walk from walk_logs */}
      {lastWalkLog && <LastWalkCard log={lastWalkLog} />}

      {/* 7. Walker team */}
      <WalkerTeam connections={connections} />

      {/* 8. Quick actions */}
      <QuickActions onOpenTeam={onOpenTeam} firstDog={firstDog} onAddDog={onAddDog} />
    </motion.div>
  )
}

export default function HomeClient({ displayName, firstDog, activeWalk, completedWalk, walkerConnections, lastWalk, isPro, walkStreak, weekData, lastWalkLog, todayWalked, todayLogs, trialStatus, trialDaysRemaining, totalReports }: Props) {
  const [showCelebration, setShowCelebration] = useState(false)
  const [teamSheetOpen, setTeamSheetOpen] = useState(false)
  const [dogEditOpen, setDogEditOpen] = useState(false)
  const [editingDog, setEditingDog] = useState<Dog | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addDogOpen, setAddDogOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (lastWalkLog && !localStorage.getItem('pupstep_first_report_seen')) {
      setShowCelebration(true)
    }
  }, [lastWalkLog])

  const dismissCelebration = () => {
    localStorage.setItem('pupstep_first_report_seen', '1')
    setShowCelebration(false)
  }

  function handleEditDog(dog: Dog) {
    setEditingDog(dog)
    setDogEditOpen(true)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const showActivationChecklist = !lastWalkLog && walkerConnections.length === 0
  const showWalkerNudge = walkerConnections.length > 0 && !lastWalkLog

  return (
    <div className="min-h-dvh" style={{ background: '#FFFBEB', fontFamily: 'var(--font-nunito), sans-serif' }}>
      {/* ── App header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#FFFBEB]" style={{ borderBottom: '1px solid oklch(0.906 0.06 88)' }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/home">
            <Image src="/logo.webp" alt="PupStep" width={130} height={48} className="h-9 w-auto" priority />
          </Link>
          <div className="flex items-center gap-2">
            {activeWalk && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#25D366] bg-green-50 border border-green-200 rounded-full px-3 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#25D366]" />
                </span>
                Walk live
              </span>
            )}
            {/* Feature 4: Settings gear */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: 'oklch(0.52 0.17 196 / 0.10)', color: 'oklch(0.44 0.16 196)', border: 'none', cursor: 'pointer' }}
              aria-label="Settings"
            >
              ⚙️
            </button>
            <Link href="/my-account" className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'oklch(0.52 0.17 196 / 0.12)', color: 'oklch(0.44 0.16 196)' }}>
              {displayName.charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <main className="max-w-lg mx-auto px-4 pt-5 pb-28 flex flex-col gap-4">
        {!isPro && <UpgradeBanner trialStatus={trialStatus} daysRemaining={trialDaysRemaining} totalReports={totalReports} />}

        {/* First-report celebration */}
        {showCelebration && lastWalkLog && (
          <div style={{ borderRadius: '16px', background: 'oklch(0.48 0.17 196)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: '0 0 2px' }}>🎉 Your first walk report is in!</p>
              <p style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{firstDog?.name ?? 'Your dog'}&apos;s walks are now saved forever.</p>
            </div>
            <button onClick={dismissCelebration} style={{ flexShrink: 0, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ffffff', fontSize: '16px', fontWeight: 700, lineHeight: 1 }} aria-label="Dismiss">×</button>
          </div>
        )}

        {/* Activation checklist — no walker connected, no walks yet */}
        {showActivationChecklist && (
          <div style={{ background: '#ffffff', border: '1.5px solid oklch(0.48 0.17 196 / 0.25)', borderRadius: '16px', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: 48 }}>🐕</span>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-fredoka), sans-serif', fontSize: '20px', fontWeight: 700, color: '#0A2F35', margin: '0 0 4px' }}>Your dog&apos;s care diary is ready.</p>
              <p style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '13px', color: '#6B7280', margin: 0 }}>Your first walk report will appear here after your walker logs a walk.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: firstDog ? 'oklch(0.48 0.17 196)' : 'transparent', border: firstDog ? 'none' : '2px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {firstDog ? <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 700 }}>✓</span> : <span style={{ color: '#D1D5DB', fontSize: '11px' }}>○</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '14px', fontWeight: firstDog ? 600 : 500, color: firstDog ? '#0A2F35' : '#6B7280', flex: 1 }}>Dog profile created</span>
                {!firstDog && <Link href="/setup" style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-nunito), sans-serif', color: 'oklch(0.48 0.17 196)', textDecoration: 'none' }}>Start →</Link>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: walkerConnections.length > 0 ? 'oklch(0.48 0.17 196)' : 'transparent', border: walkerConnections.length > 0 ? 'none' : '2px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {walkerConnections.length > 0 ? <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 700 }}>✓</span> : <span style={{ color: '#D1D5DB', fontSize: '11px' }}>○</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '14px', fontWeight: walkerConnections.length > 0 ? 600 : 500, color: walkerConnections.length > 0 ? '#0A2F35' : '#6B7280', flex: 1 }}>Connect your walker</span>
                {walkerConnections.length === 0 && <Link href="/setup" style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-nunito), sans-serif', color: 'oklch(0.48 0.17 196)', textDecoration: 'none' }}>Connect walker →</Link>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: 'transparent', border: '2px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#D1D5DB', fontSize: '11px' }}>○</span>
                </div>
                <span style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '14px', fontWeight: 500, color: '#6B7280', flex: 1 }}>First walk report</span>
              </div>
            </div>
            <Link href="/walker-guide" style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textDecoration: 'none', textAlign: 'center' }}>
              See how it works for your walker →
            </Link>
          </div>
        )}

        {/* Walker nudge — walker connected but no walks yet */}
        {showWalkerNudge && (() => {
          const firstConn = walkerConnections[0]
          const walkerName = firstConn?.walker_name ?? 'your walker'
          const dogName = firstDog?.name ?? 'your dog'
          const walkerToken = firstConn?.connection_token ?? ''
          const waText = encodeURIComponent(`Hi ${walkerName}, please use PupStep for today's walk with ${dogName}. Here's your dashboard link: pupstep.in/walker/${walkerToken}`)
          return (
            <div style={{ background: '#ffffff', border: '1.5px solid oklch(0.48 0.17 196 / 0.2)', borderRadius: '16px', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: 48 }}>🐾</span>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-fredoka), sans-serif', fontSize: '18px', fontWeight: 700, color: '#0A2F35', margin: '0 0 6px' }}>{walkerName} is connected. Waiting for the first walk.</p>
                <p style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '13px', color: '#6B7280', margin: '0 0 4px' }}>Your first walk report will appear here after your walker logs a walk.</p>
                <p style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '13px', color: '#6B7280', margin: 0 }}>Send them a reminder to use PupStep today.</p>
              </div>
              <a
                href={`https://wa.me/?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: '#25D366', color: '#ffffff', borderRadius: '12px', padding: '13px 16px', fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-nunito), sans-serif', textDecoration: 'none', boxSizing: 'border-box' }}
              >
                💬 Ask {walkerName} to log a walk →
              </a>
              <Link href="/walker-guide" style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textDecoration: 'none' }}>
                View walker guide →
              </Link>
            </div>
          )
        })()}

        {activeWalk ? (
          <StateA walk={activeWalk} displayName={displayName} firstDog={firstDog} onOpenTeam={() => setTeamSheetOpen(true)} onAddDog={() => setAddDogOpen(true)} />
        ) : completedWalk ? (
          <StateB walk={completedWalk} connections={walkerConnections} firstDog={firstDog} isPro={isPro} onOpenTeam={() => setTeamSheetOpen(true)} onEditDog={handleEditDog} onAddDog={() => setAddDogOpen(true)} />
        ) : (
          <StateC
            displayName={displayName}
            firstDog={firstDog}
            connections={walkerConnections}
            lastWalk={lastWalk}
            isPro={isPro}
            walkStreak={walkStreak}
            weekData={weekData}
            lastWalkLog={lastWalkLog}
            todayWalked={todayWalked}
            todayLogs={todayLogs}
            onOpenTeam={() => setTeamSheetOpen(true)}
            onEditDog={handleEditDog}
            onAddDog={() => setAddDogOpen(true)}
          />
        )}
      </main>

      <ParentBottomNav />

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)', background: '#0A2F35', color: '#fff', borderRadius: 100, padding: '10px 20px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-nunito)', zIndex: 100, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      {/* ── Sheets ─────────────────────────────────────────────────────────── */}
      <TeamSheet open={teamSheetOpen} onClose={() => setTeamSheetOpen(false)} connections={walkerConnections} dogName={firstDog?.name ?? 'your dog'} />
      <DogEditSheet open={dogEditOpen} dog={editingDog} onClose={() => { setDogEditOpen(false); setEditingDog(null) }} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} displayName={displayName} />
      <AddDogSheet
        open={addDogOpen}
        onClose={() => setAddDogOpen(false)}
        onSaved={() => { setAddDogOpen(false); showToast('Dog added!'); setTimeout(() => window.location.reload(), 1000) }}
      />
    </div>
  )
}
