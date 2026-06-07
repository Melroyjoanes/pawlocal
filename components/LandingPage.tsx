'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useMotionValue, useSpring, useInView } from 'framer-motion'
import { CATEGORIES } from '@/lib/categories'

// ─── Ease token ───────────────────────────────────────────────────────────────
const EASE = [0.25, 0.46, 0.45, 0.94] as const

// ─── Unsplash helpers ─────────────────────────────────────────────────────────
const U  = (id: string) => `https://images.unsplash.com/${id}?w=600&h=420&fit=crop&auto=format&q=80`
const UH = (id: string) => `https://images.unsplash.com/${id}?w=700&h=700&fit=crop&crop=faces,center&auto=format&q=85`

const CATEGORY_PHOTOS: Record<string, string> = {
  'dog-walking': U('photo-1648304887391-a6c2cf2228e4'),
  'grooming':    U('photo-1611173622933-91942d394b04'),
  'vet':         U('photo-1588950538967-ca7f8599c669'),
  'pet-store':   U('photo-1733451629195-a253141eb37c'),
  'dog-training':U('photo-1640652663796-764e4eb5bc59'),
  'insurance':   U('photo-1760448946826-105667819499'),
}
const CATEGORY_PHOTO_POS: Record<string, string> = {
  'dog-walking': 'center 20%',
  'grooming':    'center 40%',
  'vet':         'center 30%',
  'pet-store':   'center 50%',
  'dog-training':'center 30%',
  'insurance':   'center 25%',
}
const HERO_DOG = UH('photo-1519594774370-0b631f3d527e')

// ─── Claymorphism token map ───────────────────────────────────────────────────
const C = {
  pageBg: '#FFFBEB',
  white: {
    bg: 'linear-gradient(160deg, #FFFFFF 0%, #FFFDF5 100%)',
    shadow: '0 6px 0px rgba(0,0,0,0.07), 0 12px 32px rgba(0,0,0,0.05), inset 0 1px 2px rgba(255,255,255,1)',
    border: '1px solid rgba(226,232,240,0.8)', text: '#0F172A',
  },
  amber: {
    bg: 'linear-gradient(160deg, #FEF3C7 0%, #FDE68A 100%)',
    shadow: '0 6px 0px rgba(180,83,9,0.22), 0 12px 32px rgba(253,230,138,0.65), inset 0 1px 2px rgba(255,255,255,0.95)',
    border: '1px solid rgba(253,230,138,0.8)', text: '#78350F',
  },
  peach: {
    bg: 'linear-gradient(160deg, #FFEDD5 0%, #FED7AA 100%)',
    shadow: '0 6px 0px rgba(194,65,12,0.16), 0 12px 32px rgba(254,215,170,0.6), inset 0 1px 2px rgba(255,255,255,0.9)',
    border: '1px solid rgba(254,215,170,0.7)', text: '#7C2D12',
  },
  lavender: {
    bg: 'linear-gradient(160deg, #F5F3FF 0%, #E9D5FF 100%)',
    shadow: '0 6px 0px rgba(109,40,217,0.14), 0 12px 32px rgba(233,213,255,0.55), inset 0 1px 2px rgba(255,255,255,0.9)',
    border: '1px solid rgba(233,213,255,0.6)', text: '#4C1D95',
  },
  mint: {
    bg: 'linear-gradient(160deg, #F0FDF4 0%, #BBF7D0 100%)',
    shadow: '0 6px 0px rgba(5,150,105,0.14), 0 12px 32px rgba(187,247,208,0.55), inset 0 1px 2px rgba(255,255,255,0.9)',
    border: '1px solid rgba(187,247,208,0.6)', text: '#064E3B',
  },
  lemon: {
    bg: 'linear-gradient(160deg, #FEFCE8 0%, #FEF9C3 100%)',
    shadow: '0 6px 0px rgba(161,98,7,0.12), 0 12px 32px rgba(254,249,195,0.55), inset 0 1px 2px rgba(255,255,255,0.9)',
    border: '1px solid rgba(254,249,195,0.6)', text: '#713F12',
  },
  rose: {
    bg: 'linear-gradient(160deg, #FFF1F2 0%, #FECDD3 100%)',
    shadow: '0 6px 0px rgba(159,18,57,0.14), 0 12px 32px rgba(254,205,211,0.55), inset 0 1px 2px rgba(255,255,255,0.9)',
    border: '1px solid rgba(254,205,211,0.6)', text: '#9F1239',
  },
  sky: {
    bg: 'linear-gradient(160deg, #E0F2FE 0%, #BAE6FD 100%)',
    shadow: '0 6px 0px rgba(8,145,178,0.18), 0 12px 32px rgba(186,230,253,0.5), inset 0 1px 2px rgba(255,255,255,0.9)',
    border: '1px solid rgba(186,230,253,0.6)', text: '#0C4A6E',
  },
  amberCTA: {
    bg: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)',
    shadow: '0 6px 0px rgba(120,53,15,0.32), 0 12px 28px rgba(252,211,77,0.5), inset 0 1px 2px rgba(255,255,255,0.4)',
    border: '1px solid rgba(255,255,255,0.2)', text: '#451A03',
  },
} as const

type CKey = Exclude<keyof typeof C, 'pageBg'>

const catClay: Record<string, CKey> = {
  'dog-walking': 'amber',
  'grooming':    'lavender',
  'vet':         'rose',
  'pet-store':   'mint',
  'dog-training':'sky',
  'insurance':   'lemon',
}

const BLEED: React.CSSProperties = {
  width: '100vw',
  marginLeft: 'calc(50% - 50vw)',
  marginRight: 'calc(50% - 50vw)',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cs(key: CKey): React.CSSProperties {
  const t = C[key] as { bg: string; shadow: string; border: string; text: string }
  return { background: t.bg, boxShadow: t.shadow, border: t.border }
}

function useCountUp(target: number, duration = 1.8) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  useEffect(() => {
    if (!inView || target === 0) return
    const t0 = Date.now()
    const id = setInterval(() => {
      const p = Math.min((Date.now() - t0) / (duration * 1000), 1)
      setVal(Math.round((1 - (1 - p) ** 3) * target))
      if (p >= 1) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [inView, target, duration])
  return { val, ref }
}

// ─── ClayCard ─────────────────────────────────────────────────────────────────
function ClayCard({
  ckey = 'white', children, className = '', style = {}, href,
}: {
  ckey?: CKey; children: React.ReactNode; className?: string; style?: React.CSSProperties; href?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const rx = useMotionValue(0); const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 320, damping: 30 })
  const sry = useSpring(ry, { stiffness: 320, damping: 30 })
  function onMove(e: React.MouseEvent) {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    rx.set(((e.clientY - r.top) / r.height - 0.5) * -10)
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 10)
  }
  const inner = (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => { rx.set(0); ry.set(0) }}
      whileHover={{ y: -5, scale: 1.01 }}
      whileTap={{ y: 2, scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d', borderRadius: 24, ...cs(ckey), ...style }}
      className={`overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  )
  return href ? <Link href={href} className="block">{inner}</Link> : inner
}

// ─── ClayBtn ──────────────────────────────────────────────────────────────────
function ClayBtn({
  href, children, ckey = 'amberCTA', className = '',
}: { href: string; children: React.ReactNode; ckey?: CKey; className?: string }) {
  const t = C[ckey] as { bg: string; shadow: string; border: string; text: string }
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ y: 5 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="inline-block"
    >
      <Link
        href={href}
        className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold ${className}`}
        style={{ background: t.bg, boxShadow: t.shadow, border: t.border, color: t.text }}
      >
        {children}
      </Link>
    </motion.div>
  )
}

// ─── Hero floating mini-cards ─────────────────────────────────────────────────
function ProviderMiniCard({
  emoji, name, area, rating, badge, badgeColor, z, rotate, y, float,
}: {
  emoji: string; name: string; area: string; rating: string; badge: string
  badgeColor: string; z: number; rotate: number; y: number; float?: boolean
}) {
  return (
    <motion.div
      className="absolute inset-x-0 px-4 py-3.5"
      style={{ zIndex: z, borderRadius: 20, ...cs('white'), transform: `rotate(${rotate}deg) translateY(${y}px)` }}
      animate={float ? { y: [y, y - 10, y] } : undefined}
      transition={float ? { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: '#FFFBEB', boxShadow: '0 2px 6px rgba(180,83,9,0.12)' }}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-800 truncate leading-tight">{name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{area}</p>
        </div>
        <span className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: badgeColor + '18', color: badgeColor }}>
          {badge}
        </span>
      </div>
      <div className="flex items-center gap-1 mt-2.5">
        {'★★★★★'.split('').map((s, i) => <span key={i} className="text-amber-400 text-xs">{s}</span>)}
        <span className="text-[10px] text-slate-400 ml-1">{rating}</span>
        <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">✓ Verified</span>
      </div>
    </motion.div>
  )
}

function CardStack() {
  return (
    <div className="relative h-44 w-[300px] mx-auto">
      <ProviderMiniCard emoji="✂️" name="Bella's Grooming Studio" area="Juhu · 0.8 km" rating="4.9 (38)" badge="Grooming" badgeColor="#7C3AED" z={1} rotate={-7} y={-28} />
      <ProviderMiniCard emoji="🦮" name="Rahul's Dog Walks" area="Juhu · 0.4 km" rating="5.0 (22)" badge="Walking" badgeColor="#D97706" z={2} rotate={-2} y={-10} />
      <ProviderMiniCard emoji="🏥" name="Dr. Priya's Clinic" area="Juhu · 1.2 km" rating="4.9 (71)" badge="24hr Vet" badgeColor="#E11D48" z={3} rotate={0} y={0} float />
    </div>
  )
}

// ─── Broadcast step demo ──────────────────────────────────────────────────────
const STEPS = [
  { emoji: '📣', title: 'Post your request', sub: '"Need a groomer this Sunday in Juhu, around ₹500"', ckey: 'amber' as CKey },
  { emoji: '🔔', title: 'Verified providers see it', sub: '3 groomers near Juhu Beach are notified instantly', ckey: 'peach' as CKey },
  { emoji: '💬', title: 'They WhatsApp you', sub: 'Pick the best fit. Direct contact, zero fees.', ckey: 'mint' as CKey },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props { countMap: Record<string, number>; totalProviders: number; neighbourhood?: string }

export default function LandingPage({ countMap, totalProviders, neighbourhood = 'Juhu' }: Props) {
  const pStat = useCountUp(totalProviders)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % 3), 2400)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ background: C.pageBg }} className="-mt-8">

      {/* ══════════════════════════════════════════
          HERO — mobile-first: value prop first,
          dog photo below on mobile, beside on desktop
      ══════════════════════════════════════════ */}
      <section
        style={{ ...BLEED, background: '#FFFBEB', position: 'relative', overflow: 'hidden' }}
        className="min-h-[100svh] flex flex-col justify-center"
      >
        {/* Ambient colour blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div style={{ position: 'absolute', top: -100, right: -80, width: 520, height: 520, borderRadius: '50%', background: '#FDE68A', opacity: 0.55, filter: 'blur(90px)' }} />
          <div style={{ position: 'absolute', bottom: -80, left: -60, width: 400, height: 400, borderRadius: '50%', background: '#FED7AA', opacity: 0.5, filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', top: '40%', right: '25%', width: 280, height: 280, borderRadius: '50%', background: '#FECDD3', opacity: 0.35, filter: 'blur(70px)' }} />
          <div style={{ position: 'absolute', top: '20%', left: '15%', width: 200, height: 200, borderRadius: '50%', background: '#E9D5FF', opacity: 0.3, filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(180,83,9,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-20 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

            {/* ── Text column — shown FIRST on mobile ── */}
            <div className="flex-1 text-center lg:text-left w-full">
              {/* Eyebrow */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 mb-5" style={{ ...cs('amber'), borderRadius: 100, color: C.amber.text }}>
                  🐾 {neighbourhood}, Mumbai
                </span>
              </motion.div>

              {/* H1 */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: EASE, delay: 0.08 }}
                className="font-display text-slate-900 mb-4"
                style={{ fontSize: 'clamp(2.4rem, 6vw, 4.6rem)', lineHeight: 1.06 }}
              >
                Trusted pet care,<br />
                <span style={{ color: '#D97706' }}>right here in Juhu.</span>
              </motion.h1>

              {/* Subtext — Juhu-specific, no booking urgency */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.18 }}
                className="text-base sm:text-lg text-slate-500 leading-relaxed mb-7 max-w-lg mx-auto lg:mx-0"
              >
                Verified vets, groomers, dog walkers and trainers in Juhu, Versova and Andheri West. WhatsApp direct. No booking fees.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE, delay: 0.28 }}
                className="flex flex-wrap gap-3 justify-center lg:justify-start mb-6"
              >
                <ClayBtn href="/dog-walking">Browse services →</ClayBtn>
                <ClayBtn href="/broadcast" ckey="white">📣 Post a request</ClayBtn>
              </motion.div>

              {/* Trust pills */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.42 }}
                className="flex flex-wrap gap-2 justify-center lg:justify-start"
              >
                {[
                  { label: '✓ Manually verified', ckey: 'amber' as CKey },
                  { label: '💬 WhatsApp direct', ckey: 'mint' as CKey },
                  { label: '₹0 booking fee', ckey: 'peach' as CKey },
                ].map(({ label, ckey }) => (
                  <span key={label} className="text-xs font-semibold px-3 py-1.5" style={{ ...cs(ckey), borderRadius: 100, color: C[ckey].text as string }}>
                    {label}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* ── Right column: dog photo + card stack
                Hidden on small mobile, visible from sm: breakpoint ── */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
              className="flex-shrink-0 w-full sm:w-auto flex flex-col items-center gap-8"
            >
              {/* Dog photo circle */}
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="relative"
                style={{ width: 'clamp(220px, 28vw, 360px)', height: 'clamp(220px, 28vw, 360px)' }}
              >
                {/* Glow halo */}
                <div style={{ position: 'absolute', inset: -12, borderRadius: '50%', background: 'radial-gradient(ellipse, #FDE68A 0%, #FED7AA 50%, transparent 75%)', opacity: 0.9, filter: 'blur(20px)' }} aria-hidden />
                {/* Photo */}
                <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '6px solid #FEF3C7', boxShadow: '0 10px 0px rgba(180,83,9,0.2), 0 24px 60px rgba(253,230,138,0.55)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={HERO_DOG} alt="Happy dog" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                </div>
                {/* Verified badge */}
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  style={{ position: 'absolute', bottom: '10%', left: '-8%', background: 'linear-gradient(160deg, #FFFFFF 0%, #FFFDF5 100%)', borderRadius: 14, padding: '8px 12px', boxShadow: '0 4px 0px rgba(180,83,9,0.12), 0 8px 24px rgba(0,0,0,0.1)', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ fontSize: 16 }}>✅</span>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#78350F', lineHeight: 1 }}>Verified</p>
                    <p style={{ fontSize: 9, color: '#92400E', opacity: 0.7, lineHeight: 1.2 }}>providers</p>
                  </div>
                </motion.div>
                {/* Paw badge */}
                <div style={{ position: 'absolute', bottom: '8%', right: '-4%', background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)', borderRadius: '50%', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 0px rgba(120,53,15,0.25), 0 10px 20px rgba(252,211,77,0.45)', border: '3px solid #FFFBEB', fontSize: 24 }} aria-hidden>🐾</div>
                {/* WhatsApp pill */}
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  style={{ position: 'absolute', top: '8%', right: '-12%', background: 'linear-gradient(160deg, #DCFCE7 0%, #BBF7D0 100%)', borderRadius: 100, padding: '7px 14px', boxShadow: '0 3px 0px rgba(5,150,105,0.18), 0 8px 20px rgba(187,247,208,0.5)', border: '1px solid rgba(187,247,208,0.7)', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
                >
                  <span style={{ fontSize: 14 }}>💬</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#064E3B' }}>WhatsApp direct</span>
                </motion.div>
              </motion.div>

              {/* Provider card stack */}
              <div className="relative w-full flex justify-center">
                <div className="absolute inset-0 scale-110 rounded-3xl pointer-events-none" style={{ background: 'linear-gradient(135deg, #FDE68A, #FECDD3)', opacity: 0.35, filter: 'blur(40px)' }} aria-hidden />
                <CardStack />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" aria-hidden>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-6 h-9 rounded-full flex justify-center pt-2"
            style={{ border: '2px solid rgba(180,83,9,0.25)', background: 'rgba(253,230,138,0.4)' }}
          >
            <div className="w-1 h-1.5 rounded-full bg-amber-400" />
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS — real numbers only
      ══════════════════════════════════════════ */}
      <section style={{ ...BLEED, background: 'white', borderTop: '1px solid #FDE68A', borderBottom: '1px solid #FDE68A' }} className="py-6">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-3 divide-x divide-amber-100">
          {[
            { ref: pStat.ref, val: pStat.val, suf: '+', label: 'Verified providers' },
            { ref: null, val: neighbourhood, suf: '', label: 'Mumbai neighbourhood' },
            { ref: null, val: '₹0', suf: '', label: 'Booking fee, always' },
          ].map(({ ref, val, suf, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 px-2 sm:px-4">
              <span className="font-display text-2xl sm:text-4xl font-bold" style={{ color: '#D97706' }}>
                {ref ? <span ref={ref}>{val}{suf}</span> : `${val}${suf}`}
              </span>
              <span className="text-[10px] sm:text-xs font-medium text-slate-400 text-center">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CATEGORIES
      ══════════════════════════════════════════ */}
      <section style={{ ...BLEED, background: 'white' }} className="py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, ease: EASE }} className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#D97706' }}>Every service, one tap away</p>
                <h2 className="font-display text-3xl sm:text-4xl text-slate-900">What does your pet need?</h2>
              </div>
              <p className="text-sm text-slate-400 max-w-xs sm:text-right">Tap a category to see all verified providers near {neighbourhood}</p>
            </div>
          </motion.div>

          {/* Cards: horizontal scroll mobile, 2-col tablet, 3-col desktop */}
          <div
            className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 overflow-x-auto pb-3 sm:pb-0 -mx-5 sm:mx-0 px-5 sm:px-0"
            style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}
          >
            {CATEGORIES.map((cat, i) => {
              const ck = catClay[cat.slug] ?? 'white'
              const photo = CATEGORY_PHOTOS[cat.slug]
              const photoPos = CATEGORY_PHOTO_POS[cat.slug] ?? 'center 30%'
              const count = countMap[cat.slug]
              const t = C[ck] as { bg: string; shadow: string; border: string; text: string }

              return (
                <motion.div
                  key={cat.slug}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, ease: EASE, delay: i * 0.07 }}
                  style={{ scrollSnapAlign: 'start', flexShrink: 0, minWidth: '260px' }}
                >
                  <Link href={`/${cat.slug}`} className="block group">
                    <motion.div
                      whileHover={{ y: -6, scale: 1.01 }}
                      whileTap={{ y: 2, scale: 0.99 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                      style={{ borderRadius: 24, overflow: 'hidden', boxShadow: t.shadow, border: t.border }}
                    >
                      {/* Photo */}
                      <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo}
                          alt={`${cat.name} in Juhu, Mumbai`}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: photoPos, transition: 'transform 0.5s ease', display: 'block' }}
                          className="group-hover:scale-105"
                        />
                        <div style={{ position: 'absolute', inset: 0, background: t.bg, opacity: 0.18, mixBlendMode: 'multiply', pointerEvents: 'none' }} aria-hidden />
                        {/* Count badge */}
                        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: count ? t.text : '#94A3B8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                          {count ? `${count} in Juhu` : 'Coming soon'}
                        </div>
                      </div>
                      {/* Label bar */}
                      <div style={{ background: t.bg, padding: '14px 18px 16px' }}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl leading-none">{cat.icon}</span>
                            <div>
                              <p className="font-bold text-sm leading-tight" style={{ color: t.text }}>{cat.name}</p>
                              <p className="text-xs mt-0.5" style={{ color: t.text + '80' }}>
                                {count ? `${count} verified providers` : 'Coming soon'}
                              </p>
                            </div>
                          </div>
                          <motion.span
                            className="flex-shrink-0 text-base font-bold"
                            style={{ color: t.text }}
                            animate={{ x: [0, 3, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                          >→</motion.span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              )
            })}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.3 }}
            className="mt-8 flex items-center justify-center gap-4 flex-wrap"
          >
            <p className="text-sm text-slate-400">Can&apos;t find what you need?</p>
            <ClayBtn href="/broadcast" ckey="amber">📣 Post a request →</ClayBtn>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS — no food delivery references
      ══════════════════════════════════════════ */}
      <section style={{ ...BLEED, background: C.pageBg }} className="py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, ease: EASE }} className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#D97706' }}>Three steps. That&apos;s all.</p>
            <h2 className="font-display text-3xl sm:text-4xl text-slate-900">How PawLocal works</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {[
              { emoji: '🔍', n: '01', title: 'Browse', desc: 'Find services by category. Every listing is manually reviewed by our team before going live — if they\'re listed, we\'d trust them with our own pet.', ck: 'amber' as CKey },
              { emoji: '💬', n: '02', title: 'Contact', desc: 'WhatsApp the provider directly. No platform in the middle, no booking fee, no app to download. Your number, their number, done.', ck: 'lavender' as CKey },
              { emoji: '🐾', n: '03', title: 'Done', desc: 'Your pet gets the care they need. Sign in to save favourite providers and contact them again — no starting from scratch every time.', ck: 'mint' as CKey },
            ].map(({ emoji, n, title, desc, ck }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: EASE, delay: i * 0.1 }}
              >
                <ClayCard ckey={ck} className="p-6 sm:p-7 h-full">
                  <span className="text-3xl drop-shadow-sm block mb-4">{emoji}</span>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: (C[ck].text as string) + 'AA' }}>Step {n}</p>
                  <h3 className="text-lg font-bold mb-2.5 leading-tight" style={{ color: C[ck].text as string }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: (C[ck].text as string) + 'BB' }}>{desc}</p>
                </ClayCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PET BROADCAST — no competitor name drops
      ══════════════════════════════════════════ */}
      <section
        style={{ ...BLEED, background: 'linear-gradient(135deg, #0D3528 0%, #1A5C42 50%, #0D3528 100%)', position: 'relative', overflow: 'hidden' }}
        className="py-12 sm:py-16"
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div style={{ position: 'absolute', top: -80, right: -60, width: 420, height: 420, borderRadius: '50%', background: '#FCD34D', opacity: 0.12, filter: 'blur(90px)' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 320, height: 320, borderRadius: '50%', background: '#6EE7B7', opacity: 0.07, filter: 'blur(70px)' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Text */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE }} className="flex-1 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 mb-6" style={{ ...cs('amber'), borderRadius: 100, color: C.amber.text }}>
                🆕 Pet Broadcast — only on PawLocal
              </span>
              <h2 className="font-display text-white leading-tight mb-4" style={{ fontSize: 'clamp(1.8rem, 4vw, 3.2rem)' }}>
                Can&apos;t find what you need?<br />
                <span style={{ color: '#FCD34D' }}>Just post it.</span>
              </h2>
              <p className="text-stone-400 text-base sm:text-lg leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
                Post your request once. Verified providers near Juhu see it and reply on WhatsApp directly. Free.
              </p>
              <ClayBtn href="/broadcast">📣 Post a Request — Free</ClayBtn>
            </motion.div>

            {/* Animated step cards */}
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE, delay: 0.1 }} className="flex-shrink-0 w-full max-w-sm space-y-3">
              {STEPS.map((s, i) => (
                <motion.div
                  key={i}
                  animate={{ scale: step === i ? 1.03 : 1, opacity: step === i ? 1 : 0.45 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="flex items-start gap-4 p-4"
                  style={{ ...cs(s.ckey), borderRadius: 20, outline: step === i ? '2px solid rgba(255,255,255,0.2)' : 'none' }}
                >
                  <span className="text-2xl drop-shadow-sm flex-shrink-0">{s.emoji}</span>
                  <div>
                    <p className="font-bold text-sm" style={{ color: C[s.ckey].text as string }}>{s.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: (C[s.ckey].text as string) + '99' }}>{s.sub}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          WHY PAWLOCAL
      ══════════════════════════════════════════ */}
      <section style={{ ...BLEED, background: C.pageBg }} className="py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, ease: EASE }} className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#D97706' }}>Why pet parents choose us</p>
            <h2 className="font-display text-3xl sm:text-4xl text-slate-900">What makes PawLocal different</h2>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { emoji: '🔒', title: 'Manually verified', desc: 'Every provider reviewed by our team. If they\'re listed, we\'d trust them with our own pet.', ck: 'amber' as CKey },
              { emoji: '💬', title: 'WhatsApp native', desc: 'Mumbai runs on WhatsApp. We use it — no extra apps, no platform in the middle.', ck: 'peach' as CKey },
              { emoji: '₹0', title: 'Zero fees, always', desc: 'The provider keeps 100%. Which means they\'re here because they want to be.', ck: 'mint' as CKey },
              { emoji: '📍', title: 'Juhu-first', desc: 'Built for Juhu. Serving Versova, Andheri West, Santacruz West. Depth before breadth.', ck: 'lavender' as CKey },
            ].map(({ emoji, title, desc, ck }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.38, ease: EASE, delay: i * 0.07 }}
              >
                <ClayCard ckey={ck} className="p-4 sm:p-5 h-full">
                  <span className="text-2xl sm:text-3xl drop-shadow-sm block mb-3">{emoji}</span>
                  <p className="font-bold text-xs sm:text-sm mb-1.5 leading-tight" style={{ color: C[ck].text as string }}>{title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: (C[ck].text as string) + 'AA' }}>{desc}</p>
                </ClayCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          MAP TEASER
      ══════════════════════════════════════════ */}
      <section style={{ ...BLEED, background: 'white' }} className="py-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <ClayCard ckey="white" href="/map" className="p-5 sm:p-8 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <motion.span animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="text-3xl sm:text-4xl drop-shadow-sm flex-shrink-0" aria-hidden>🗺</motion.span>
              <div>
                <p className="font-bold text-slate-800 text-sm sm:text-base">See everything on one map</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">All vets, groomers, stores and walkers near Juhu Beach</p>
              </div>
            </div>
            <span className="text-sm font-bold text-slate-300 hidden sm:block flex-shrink-0">Open map →</span>
          </ClayCard>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SEO — neighbourhood service area signal
      ══════════════════════════════════════════ */}
      <section style={{ ...BLEED, background: C.pageBg }} className="py-8 sm:py-12 pb-28 lg:pb-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, ease: EASE }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-5 text-center" style={{ color: '#D97706' }}>Where we serve</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { area: 'Juhu', desc: 'Dog walkers, groomers, vets' },
                { area: 'Versova', desc: 'Pet stores, trainers' },
                { area: 'Andheri West', desc: 'Vets, groomers' },
                { area: 'Santacruz West', desc: 'Dog walkers, vets' },
                { area: 'JVPD Scheme', desc: 'Pet care, grooming' },
                { area: 'Vile Parle West', desc: 'Vets, trainers' },
              ].map(({ area, desc }, i) => (
                <motion.div
                  key={area}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, ease: EASE, delay: i * 0.05 }}
                  className="flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl border border-amber-100 bg-white"
                >
                  <span className="text-xl mb-1.5">📍</span>
                  <p className="font-semibold text-slate-800 text-xs sm:text-sm">{area}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-snug">{desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER NOTE
      ══════════════════════════════════════════ */}
      <section style={{ ...BLEED, background: 'white', borderTop: '1px solid #FDE68A' }} className="py-5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
          <span className="text-xl">🐾</span>
          <p className="text-xs sm:text-sm text-slate-400">
            Juhu&apos;s most trusted pet services directory — serving Juhu, Versova, Andheri West and Santacruz West.
            Every listing manually verified by our team.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          MOBILE STICKY BAR
      ══════════════════════════════════════════ */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 1.8 }}
        className="lg:hidden fixed bottom-0 inset-x-0 z-50"
        style={{
          background: 'rgba(255,251,235,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid #FDE68A',
          paddingBottom: 'env(safe-area-inset-bottom, 12px)',
        }}
      >
        <div className="flex gap-3 px-4 pt-3 pb-3">
          <Link
            href="/dog-walking"
            className="flex-1 flex items-center justify-center py-3.5 rounded-2xl text-sm font-bold"
            style={{ background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)', boxShadow: '0 4px 0px rgba(120,53,15,0.28)', color: '#451A03' }}
          >
            Browse Services
          </Link>
          <Link
            href="/broadcast"
            className="flex-1 flex items-center justify-center py-3.5 rounded-2xl text-sm font-bold"
            style={{ background: 'linear-gradient(160deg, #FFEDD5 0%, #FED7AA 100%)', boxShadow: '0 4px 0px rgba(194,65,12,0.16)', color: '#7C2D12' }}
          >
            📣 Post Request
          </Link>
        </div>
      </motion.div>

    </div>
  )
}
