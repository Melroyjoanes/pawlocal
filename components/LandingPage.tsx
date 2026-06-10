'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useMotionValue, useSpring, useInView } from 'framer-motion'
import { CATEGORIES } from '@/lib/categories'

// ─── Ease tokens ──────────────────────────────────────────────────────────────
const EASE     = [0.25, 0.46, 0.45, 0.94] as const
const EASE_EXP = [0.16, 1, 0.3, 1] as const

// ─── Images ───────────────────────────────────────────────────────────────────
const U  = (id: string) => `https://images.unsplash.com/${id}?w=640&h=460&fit=crop&auto=format&q=82`
const UH = (id: string) => `https://images.unsplash.com/${id}?w=720&h=720&fit=crop&crop=faces,center&auto=format&q=88`

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
const HERO_DOG = UH('photo-1587300003388-59208cc962cb')

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  pageBg: '#FFFBEB',
  white: {
    bg: 'linear-gradient(160deg, #FFFFFF 0%, #FFFDF5 100%)',
    shadow: '0 4px 0px rgba(0,0,0,0.06), 0 10px 32px rgba(0,0,0,0.05), inset 0 1.5px 0 rgba(255,255,255,1)',
    border: '1px solid rgba(226,232,240,0.7)', text: '#0F172A',
  },
  amber: {
    bg: 'linear-gradient(160deg, #FEF3C7 0%, #FDE68A 100%)',
    shadow: '0 4px 0px rgba(180,83,9,0.18), 0 10px 32px rgba(253,230,138,0.55), inset 0 1.5px 0 rgba(255,255,255,0.95)',
    border: '1px solid rgba(253,230,138,0.7)', text: '#78350F',
  },
  peach: {
    bg: 'linear-gradient(160deg, #FFEDD5 0%, #FED7AA 100%)',
    shadow: '0 4px 0px rgba(194,65,12,0.14), 0 10px 32px rgba(254,215,170,0.5), inset 0 1.5px 0 rgba(255,255,255,0.9)',
    border: '1px solid rgba(254,215,170,0.6)', text: '#7C2D12',
  },
  lavender: {
    bg: 'linear-gradient(160deg, #F5F3FF 0%, #E9D5FF 100%)',
    shadow: '0 4px 0px rgba(109,40,217,0.12), 0 10px 32px rgba(233,213,255,0.5), inset 0 1.5px 0 rgba(255,255,255,0.9)',
    border: '1px solid rgba(233,213,255,0.55)', text: '#4C1D95',
  },
  mint: {
    bg: 'linear-gradient(160deg, #F0FDF4 0%, #BBF7D0 100%)',
    shadow: '0 4px 0px rgba(5,150,105,0.12), 0 10px 32px rgba(187,247,208,0.5), inset 0 1.5px 0 rgba(255,255,255,0.9)',
    border: '1px solid rgba(187,247,208,0.55)', text: '#064E3B',
  },
  lemon: {
    bg: 'linear-gradient(160deg, #FEFCE8 0%, #FEF9C3 100%)',
    shadow: '0 4px 0px rgba(161,98,7,0.1), 0 10px 32px rgba(254,249,195,0.5), inset 0 1.5px 0 rgba(255,255,255,0.9)',
    border: '1px solid rgba(254,249,195,0.55)', text: '#713F12',
  },
  rose: {
    bg: 'linear-gradient(160deg, #FFF1F2 0%, #FECDD3 100%)',
    shadow: '0 4px 0px rgba(159,18,57,0.12), 0 10px 32px rgba(254,205,211,0.5), inset 0 1.5px 0 rgba(255,255,255,0.9)',
    border: '1px solid rgba(254,205,211,0.55)', text: '#9F1239',
  },
  sky: {
    bg: 'linear-gradient(160deg, #E0F2FE 0%, #BAE6FD 100%)',
    shadow: '0 4px 0px rgba(8,145,178,0.15), 0 10px 32px rgba(186,230,253,0.45), inset 0 1.5px 0 rgba(255,255,255,0.9)',
    border: '1px solid rgba(186,230,253,0.55)', text: '#0C4A6E',
  },
  amberCTA: {
    // Logo "Step" orange — replaces amber-gold
    bg: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)',
    shadow: '0 4px 0px rgba(175,65,10,0.30), 0 10px 24px rgba(245,107,34,0.42), inset 0 1.5px 0 rgba(255,255,255,0.38)',
    border: '1px solid rgba(255,255,255,0.18)', text: '#451A03',
  },
  tealCTA: {
    // Logo map-pin teal — brighter, more cyan
    bg: 'linear-gradient(160deg, #17C8CC 0%, #0A8A96 100%)',
    shadow: '0 4px 0px rgba(5,80,90,0.42), 0 10px 24px rgba(12,180,188,0.38), inset 0 1.5px 0 rgba(255,255,255,0.20)',
    border: '1px solid rgba(255,255,255,0.12)', text: '#F0FDFA',
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

// ─── 3D Clay Sphere ───────────────────────────────────────────────────────────
function Sphere({ size, gradient, glow, specW, specH, specTop, specLeft, style = {} }: {
  size: number; gradient: string; glow: string
  specW: string; specH: string; specTop: string; specLeft: string
  style?: React.CSSProperties
}) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: gradient, boxShadow: glow, overflow: 'hidden', position: 'relative', flexShrink: 0, ...style }}>
      <div style={{ position: 'absolute', top: specTop, left: specLeft, width: specW, height: specH, borderRadius: '50%', background: 'rgba(255,255,255,0.42)', pointerEvents: 'none' }} />
    </div>
  )
}

const AmberSphere = ({ size = 220, style = {} }: { size?: number; style?: React.CSSProperties }) => (
  <Sphere size={size} gradient="radial-gradient(circle at 32% 30%, #FEF9C3, #FDE68A 44%, #F59E0B 72%, #F07030)" glow={`0 ${Math.round(size * 0.13)}px ${Math.round(size * 0.33)}px rgba(180,83,9,0.22)`} specW="38%" specH="27%" specTop="17%" specLeft="22%" style={style} />
)
const TealSphere = ({ size = 120, style = {} }: { size?: number; style?: React.CSSProperties }) => (
  <Sphere size={size} gradient="radial-gradient(circle at 30% 28%, #B2F5F8, #17C8CC 52%, #0A8A96)" glow={`0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.28)}px rgba(10,138,150,0.30)`} specW="40%" specH="28%" specTop="16%" specLeft="20%" style={style} />
)
const LavenderSphere = ({ size = 80, style = {} }: { size?: number; style?: React.CSSProperties }) => (
  <Sphere size={size} gradient="radial-gradient(circle at 30% 28%, #EDE9FE, #C4B5FD 50%, #7C3AED)" glow={`0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.28)}px rgba(124,58,237,0.22)`} specW="42%" specH="28%" specTop="16%" specLeft="20%" style={style} />
)

// ─── ClayCard ─────────────────────────────────────────────────────────────────
function ClayCard({ ckey = 'white', children, className = '', style = {}, href }: {
  ckey?: CKey; children: React.ReactNode; className?: string; style?: React.CSSProperties; href?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const rx = useMotionValue(0); const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 300, damping: 30 })
  const sry = useSpring(ry, { stiffness: 300, damping: 30 })
  function onMove(e: React.MouseEvent) {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    rx.set(((e.clientY - r.top) / r.height - 0.5) * -8)
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 8)
  }
  const inner = (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={() => { rx.set(0); ry.set(0) }}
      whileHover={{ y: -4, scale: 1.01 }} whileTap={{ y: 1, scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d', borderRadius: 24, ...cs(ckey), ...style }}
      className={`overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  )
  return href ? <Link href={href} className="block">{inner}</Link> : inner
}

// ─── ClayBtn ──────────────────────────────────────────────────────────────────
function ClayBtn({ href, children, ckey = 'amberCTA', className = '', size = 'md' }: {
  href: string; children: React.ReactNode; ckey?: CKey; className?: string; size?: 'sm' | 'md' | 'lg'
}) {
  const t = C[ckey] as { bg: string; shadow: string; border: string; text: string }
  const pad = size === 'lg' ? 'px-8 py-4 text-base' : size === 'sm' ? 'px-4 py-2.5 text-xs' : 'px-6 py-3.5 text-sm'
  return (
    <motion.div whileHover={{ y: -3, scale: 1.03 }} whileTap={{ y: 4, scale: 0.98 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }} className="inline-block">
      <Link href={href} className={`inline-flex items-center gap-2 rounded-full font-bold ${pad} ${className}`} style={{ background: t.bg, boxShadow: t.shadow, border: t.border, color: t.text }}>
        {children}
      </Link>
    </motion.div>
  )
}

// ─── Provider mini-cards ──────────────────────────────────────────────────────
function ProviderMiniCard({ emoji, name, area, rating, badge, badgeColor, z, rotate, y, float }: {
  emoji: string; name: string; area: string; rating: string; badge: string
  badgeColor: string; z: number; rotate: number; y: number; float?: boolean
}) {
  return (
    <motion.div className="absolute inset-x-0 px-4 py-3.5"
      style={{ zIndex: z, borderRadius: 20, ...cs('white'), transform: `rotate(${rotate}deg) translateY(${y}px)` }}
      animate={float ? { y: [y, y - 10, y] } : undefined}
      transition={float ? { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#FFFBEB', boxShadow: '0 2px 6px rgba(180,83,9,0.12)' }}>{emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-800 truncate leading-tight">{name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{area}</p>
        </div>
        <span className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: badgeColor + '18', color: badgeColor }}>{badge}</span>
      </div>
      <div className="flex items-center gap-1 mt-2.5">
        {'★★★★★'.split('').map((s, i) => <span key={i} className="text-amber-400 text-xs">{s}</span>)}
        <span className="text-[10px] text-slate-400 ml-1">{rating}</span>
        <span className="ml-auto text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full">✓ Verified</span>
      </div>
    </motion.div>
  )
}

function CardStack() {
  return (
    <div className="relative h-44 w-[300px] mx-auto">
      <ProviderMiniCard emoji="✂️" name="Bella's Grooming Studio" area="Versova · 0.8 km" rating="4.9 (38)" badge="Grooming" badgeColor="#7C3AED" z={1} rotate={-7} y={-28} />
      <ProviderMiniCard emoji="🦮" name="Rahul's Dog Walks" area="Andheri W · 0.4 km" rating="5.0 (22)" badge="Walking" badgeColor="#F07030" z={2} rotate={-2} y={-10} />
      <ProviderMiniCard emoji="🐕" name="Sohail's Dog Walks" area="Juhu · 0.6 km" rating="4.8 (54)" badge="Walking" badgeColor="#F07030" z={3} rotate={0} y={0} float />
    </div>
  )
}

// ─── Walk Report mini-card ────────────────────────────────────────────────────
function WalkReportMiniCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: -1 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, ease: EASE_EXP, delay: 0.2 }}
      style={{
        borderRadius: 28,
        background: 'linear-gradient(160deg, #FFFDF5 0%, #FFF8E1 100%)',
        boxShadow: '0 8px 0px rgba(120,53,15,0.14), 0 20px 56px rgba(0,0,0,0.18), inset 0 1.5px 0 rgba(255,255,255,0.95)',
        border: '1.5px solid rgba(253,230,138,0.7)',
        padding: '24px',
        width: '100%',
        maxWidth: 340,
        position: 'relative' as const,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #FCD34D, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 8px rgba(180,83,9,0.25)', fontSize: 22 }}>🐕</div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#1C0A00', lineHeight: 1.1, fontFamily: 'var(--font-dm-serif, serif)' }}>Kairo&apos;s Walk</p>
            <p style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>with Shahrukh</p>
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #0A8A96, #087585)', borderRadius: 100, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#F0FDFA' }}>✓ Verified</div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { emoji: '⏱', val: '45', sub: 'mins', bg: '#BBF7D0', fg: '#065F46' },
          { emoji: '📏', val: '2.3', sub: 'km', bg: '#BAE6FD', fg: '#075985' },
          { emoji: '💩', val: '1', sub: 'poop', bg: '#FED7AA', fg: '#9A3412' },
          { emoji: '💧', val: '2', sub: 'pees', bg: '#BAE6FD', fg: '#075985' },
        ].map(({ emoji, val, sub, bg, fg }) => (
          <div key={sub} style={{ background: bg, borderRadius: 14, padding: '8px 6px', textAlign: 'center', border: '1.5px solid rgba(255,255,255,0.9)' }}>
            <div style={{ fontSize: 16 }}>{emoji}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: fg, lineHeight: 1.1 }}>{val}</div>
            <div style={{ fontSize: 9, color: fg + '99', fontWeight: 600 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Testimonial */}
      <div style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', borderRadius: 16, padding: '12px 14px', border: '1px solid rgba(253,230,138,0.8)' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#78350F', lineHeight: 1.4 }}>&ldquo;Love this so much, keep sending me reports everyday 🥰&rdquo;</p>
        <p style={{ fontSize: 11, color: '#92400E', marginTop: 4, opacity: 0.8 }}>— Kairo&apos;s mom</p>
      </div>

      {/* WhatsApp floating pill */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: 16, right: -8, background: 'linear-gradient(135deg, #DCFCE7, #BBF7D0)', borderRadius: 100, padding: '6px 12px', boxShadow: '0 3px 0px rgba(5,150,105,0.18), 0 6px 16px rgba(187,247,208,0.5)', border: '1px solid rgba(187,247,208,0.7)', display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <span style={{ fontSize: 13 }}>💬</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#064E3B', whiteSpace: 'nowrap' }}>Sent via WhatsApp</span>
      </motion.div>
    </motion.div>
  )
}

// ─── Broadcast steps ──────────────────────────────────────────────────────────
const STEPS = [
  { emoji: '📣', title: 'Post your request', sub: '"Need a groomer this Sunday in Juhu, around ₹500"', ckey: 'amber' as CKey },
  { emoji: '🔔', title: 'Verified providers see it', sub: '3 verified providers nearby are notified instantly', ckey: 'peach' as CKey },
  { emoji: '💬', title: 'They WhatsApp you', sub: 'Pick the best fit. Direct contact, zero fees.', ckey: 'mint' as CKey },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props { countMap: Record<string, number>; totalProviders: number; neighbourhood?: string }

export default function LandingPage({ countMap, totalProviders, neighbourhood = 'Juhu' }: Props) {
  const pStat = useCountUp(totalProviders)
  const [step, setStep] = useState(0)
  useEffect(() => { const id = setInterval(() => setStep(s => (s + 1) % 3), 2400); return () => clearInterval(id) }, [])

  return (
    <div style={{ background: C.pageBg }} className="-mt-8">

      {/* ═══════════ HERO ═══════════ */}
      <section style={{ ...BLEED, background: '#FFFBEB', position: 'relative', overflow: 'hidden' }} className="min-h-[100svh] flex flex-col justify-center">
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(180,83,9,0.055) 1px, transparent 1px)', backgroundSize: '28px 28px' }} aria-hidden />

        {/* 3D Spheres */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <motion.div style={{ position: 'absolute', top: -60, right: -50 }} animate={{ y: [0, -18, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
            <AmberSphere size={280} />
          </motion.div>
          <motion.div style={{ position: 'absolute', bottom: -30, left: 80 }} animate={{ y: [0, -12, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}>
            <TealSphere size={160} />
          </motion.div>
          <motion.div style={{ position: 'absolute', top: '35%', left: '6%' }} animate={{ y: [0, -8, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}>
            <LavenderSphere size={72} />
          </motion.div>
          <motion.div style={{ position: 'absolute', top: '55%', right: '3%' }} animate={{ y: [0, -6, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}>
            <AmberSphere size={44} />
          </motion.div>
          <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: '#FDE68A', opacity: 0.18, filter: 'blur(100px)' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-20 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

            {/* Text column */}
            <div className="flex-1 text-center lg:text-left w-full">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_EXP }}>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase px-4 py-1.5 mb-6" style={{ ...cs('amber'), borderRadius: 100, color: C.amber.text }}>
                  🐾 {neighbourhood}, Mumbai
                </span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_EXP, delay: 0.08 }}
                className="font-display text-slate-900 mb-5" style={{ fontSize: 'clamp(2.6rem, 6.5vw, 5rem)', lineHeight: 1.04, letterSpacing: '-0.02em' }}>
                Mumbai&apos;s verified<br />
                <span style={{ color: '#F07030' }}>pet people.</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_EXP, delay: 0.18 }}
                className="text-lg sm:text-xl text-slate-500 mb-8 max-w-lg mx-auto lg:mx-0" style={{ lineHeight: 1.65 }}>
                Trusted walkers, vets, groomers and more — right where you live. WhatsApp direct. Zero fees.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_EXP, delay: 0.28 }}
                className="flex flex-wrap gap-3 justify-center lg:justify-start mb-7">
                <ClayBtn href="/dog-walking" size="lg">Browse services →</ClayBtn>
                <ClayBtn href="/broadcast" ckey="white" size="lg">📣 Post a request</ClayBtn>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.44 }}
                className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {[
                  { label: '✓ Manually verified', ckey: 'amber' as CKey },
                  { label: '💬 WhatsApp direct', ckey: 'mint' as CKey },
                  { label: '₹0 booking fee', ckey: 'peach' as CKey },
                ].map(({ label, ckey }) => (
                  <span key={label} className="text-xs font-semibold px-3.5 py-1.5" style={{ ...cs(ckey), borderRadius: 100, color: C[ckey].text as string }}>{label}</span>
                ))}
              </motion.div>
            </div>

            {/* Right column */}
            <motion.div initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: EASE_EXP, delay: 0.22 }}
              className="flex-shrink-0 w-full sm:w-auto flex flex-col items-center gap-8">
              {/* Dog photo */}
              <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="relative" style={{ width: 'clamp(220px, 28vw, 360px)', height: 'clamp(220px, 28vw, 360px)' }}>
                <div style={{ position: 'absolute', inset: -16, borderRadius: '50%', background: 'radial-gradient(ellipse, #FDE68A 0%, #FED7AA 45%, transparent 72%)', opacity: 0.85, filter: 'blur(22px)' }} aria-hidden />
                <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '7px solid #FEF3C7', boxShadow: '0 10px 0px rgba(180,83,9,0.18), 0 28px 64px rgba(253,230,138,0.5)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={HERO_DOG} alt="Happy dog in Juhu" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%' }} />
                </div>
                <motion.div animate={{ scale: [1, 1.07, 1] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  style={{ position: 'absolute', bottom: '12%', left: '-8%', background: 'linear-gradient(160deg, #FFFFFF 0%, #FFFDF5 100%)', borderRadius: 14, padding: '8px 12px', boxShadow: '0 3px 0px rgba(180,83,9,0.1), 0 8px 24px rgba(0,0,0,0.1)', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15 }}>✅</span>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#78350F', lineHeight: 1 }}>Verified</p>
                    <p style={{ fontSize: 9, color: '#92400E', opacity: 0.7, lineHeight: 1.2 }}>providers only</p>
                  </div>
                </motion.div>
                <div style={{ position: 'absolute', bottom: '6%', right: '-4%', background: 'linear-gradient(135deg, #FCD34D, #F59E0B)', borderRadius: '50%', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 0px rgba(120,53,15,0.24), 0 10px 20px rgba(252,211,77,0.42)', border: '3px solid #FFFBEB', fontSize: 24 }} aria-hidden>🐾</div>
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  style={{ position: 'absolute', top: '10%', right: '-14%', background: 'linear-gradient(135deg, #DCFCE7, #BBF7D0)', borderRadius: 100, padding: '7px 14px', boxShadow: '0 3px 0px rgba(5,150,105,0.18), 0 8px 20px rgba(187,247,208,0.5)', border: '1px solid rgba(187,247,208,0.65)', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 14 }}>💬</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#064E3B' }}>WhatsApp direct</span>
                </motion.div>
              </motion.div>

              {/* Card stack */}
              <div className="relative w-full flex justify-center">
                <div className="absolute inset-0 scale-110 rounded-3xl pointer-events-none" style={{ background: 'linear-gradient(135deg, #FDE68A, #FECDD3)', opacity: 0.3, filter: 'blur(40px)' }} aria-hidden />
                <CardStack />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" aria-hidden>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-6 h-9 rounded-full flex justify-center pt-2" style={{ border: '2px solid rgba(180,83,9,0.22)', background: 'rgba(253,230,138,0.35)' }}>
            <div className="w-1 h-1.5 rounded-full bg-amber-400" />
          </motion.div>
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section style={{ ...BLEED, background: 'linear-gradient(120deg, #FEF9ED 0%, #FEF3C7 55%, #FEF9ED 100%)', borderTop: '1.5px solid rgba(253,230,138,0.9)', borderBottom: '1.5px solid rgba(253,230,138,0.9)', position: 'relative', overflow: 'hidden' }} className="py-8 sm:py-10">
        {/* Subtle amber glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden style={{ backgroundImage: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(245,158,11,0.07) 0%, transparent 70%)' }} />
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-3 gap-2 sm:gap-8">
            {[
              {
                icon: '🐾',
                iconBg: '#FCD34D',
                node: <><span ref={pStat.ref} className="font-display" style={{ fontSize: 'clamp(1.85rem, 5vw, 3rem)', color: '#92400E', lineHeight: 1, fontWeight: 700 }}>{pStat.val}</span><span className="font-display" style={{ fontSize: 'clamp(1.2rem, 3vw, 2rem)', color: '#B45309' }}>+</span></>,
                label: 'Verified providers',
                sub: 'Manually reviewed',
              },
              {
                icon: '💬',
                iconBg: '#6EE7B7',
                node: <span className="font-display" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.6rem)', color: '#92400E', lineHeight: 1, fontWeight: 700 }}>Direct</span>,
                label: 'WhatsApp contact',
                sub: 'No middleman',
              },
              {
                icon: '✓',
                iconBg: '#C4B5FD',
                node: <span className="font-display" style={{ fontSize: 'clamp(1.85rem, 5vw, 3rem)', color: '#92400E', lineHeight: 1, fontWeight: 700 }}>₹0</span>,
                label: 'Booking fees',
                sub: 'Free, always',
              },
            ].map(({ icon, iconBg, node, label, sub }) => (
              <div key={label} className="flex flex-col items-center text-center">
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 3px 8px rgba(120,53,15,0.14)', border: '2px solid rgba(255,255,255,0.85)', marginBottom: 10 }}>{icon}</div>
                <div className="flex items-end justify-center gap-0.5 mb-1.5">{node}</div>
                <p className="font-semibold" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.875rem)', color: '#78350F', lineHeight: 1.3 }}>{label}</p>
                <p className="hidden sm:block" style={{ fontSize: '0.7rem', color: '#B45309', opacity: 0.65, marginTop: 2 }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CATEGORIES ═══════════ */}
      <section style={{ ...BLEED, background: 'white' }} className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE_EXP }} className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: '#F07030' }}>Every service, one tap away</p>
                <h2 className="font-display text-slate-900" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.12 }}>What does your pet need?</h2>
              </div>
              <p className="text-sm text-slate-400 max-w-xs sm:text-right">All verified providers near {neighbourhood}</p>
            </div>
          </motion.div>

          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 overflow-x-auto pb-3 sm:pb-0 -mx-5 sm:mx-0 px-5 sm:px-0"
            style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            {CATEGORIES.map((cat, i) => {
              const ck = catClay[cat.slug] ?? 'white'
              const photo = CATEGORY_PHOTOS[cat.slug]
              const photoPos = CATEGORY_PHOTO_POS[cat.slug] ?? 'center 30%'
              const count = countMap[cat.slug]
              const t = C[ck] as { bg: string; shadow: string; border: string; text: string }
              return (
                <motion.div key={cat.slug} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.42, ease: EASE_EXP, delay: i * 0.06 }}
                  className="snap-start shrink-0 sm:shrink sm:w-full sm:h-full"
                  style={{ width: 'clamp(155px, 44vw, 268px)' } as React.CSSProperties}>
                  <Link href={`/${cat.slug}`} className="block group h-full">
                    <motion.div whileHover={{ y: -6, scale: 1.01 }} whileTap={{ y: 2, scale: 0.99 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                      className="flex flex-col h-full"
                      style={{ borderRadius: 22, overflow: 'hidden', boxShadow: t.shadow, border: t.border }}>
                      <div style={{ height: 'clamp(120px, 22vw, 200px)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt={`${cat.name} in Mumbai`} loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: photoPos, transition: 'transform 0.5s ease', display: 'block' }}
                          className="group-hover:scale-105" />
                        <div style={{ position: 'absolute', inset: 0, background: t.bg, opacity: 0.16, mixBlendMode: 'multiply', pointerEvents: 'none' }} aria-hidden />
                        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', borderRadius: 100, padding: '4px 11px', fontSize: 11, fontWeight: 700, color: count ? t.text : '#94A3B8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                          {count ? `${count} nearby` : 'Coming soon'}
                        </div>
                      </div>
                      <div style={{ background: t.bg, padding: '14px 18px 18px', flex: 1 }}>
                        <div className="flex items-center justify-between gap-2 h-full">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl leading-none">{cat.icon}</span>
                            <div>
                              <p className="font-bold text-sm leading-tight" style={{ color: t.text }}>{cat.name}</p>
                              <p className="text-xs mt-0.5" style={{ color: t.text + '80' }}>{count ? `${count} verified providers` : 'Coming soon'}</p>
                            </div>
                          </div>
                          <motion.span className="flex-shrink-0 text-base font-bold" style={{ color: t.text }}
                            animate={{ x: [0, 3, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}>→</motion.span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              )
            })}
          </div>

          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, ease: EASE_EXP, delay: 0.28 }}
            className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <p className="text-sm text-slate-400">Can&apos;t find what you need?</p>
            <ClayBtn href="/broadcast" ckey="amber">📣 Post a request →</ClayBtn>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ WALK REPORT STRIP ═══════════ */}
      <section style={{ ...BLEED, background: 'linear-gradient(135deg, #0A2F35 0%, #0D3D45 50%, #0A2F35 100%)', position: 'relative', overflow: 'hidden' }} className="py-14 sm:py-20">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <motion.div style={{ position: 'absolute', top: -40, right: -30, opacity: 0.1 }} animate={{ y: [0, -15, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}>
            <AmberSphere size={300} />
          </motion.div>
          <motion.div style={{ position: 'absolute', bottom: -50, left: -40, opacity: 0.08 }} animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
            <TealSphere size={200} />
          </motion.div>
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE_EXP }} className="flex-1 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 mb-6 uppercase tracking-wider" style={{ ...cs('amber'), borderRadius: 100, color: C.amber.text }}>
                ✨ Walk Reports — only on PupStep
              </span>
              <h2 className="font-display text-white leading-tight mb-5" style={{ fontSize: 'clamp(1.9rem, 4.5vw, 3.4rem)', lineHeight: 1.1 }}>
                Every walk,<br /><span style={{ color: '#FCD34D' }}>beautifully reported.</span>
              </h2>
              <p className="text-stone-400 text-base sm:text-lg mb-8 max-w-md mx-auto lg:mx-0" style={{ lineHeight: 1.7 }}>
                Your walker sends a daily report with photos, GPS route, and stats — straight to WhatsApp. No app needed.
              </p>
              <div className="flex flex-col gap-3 mb-8 items-center lg:items-start">
                {[
                  { icon: '📍', text: 'Live GPS route — see every step of the walk' },
                  { icon: '📸', text: 'Photo of your dog, every single walk' },
                  { icon: '💩', text: 'Potty stats so your vet is never guessing' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(253,230,138,0.12)', border: '1px solid rgba(253,230,138,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{icon}</span>
                    <span className="text-sm text-stone-300 font-medium">{text}</span>
                  </div>
                ))}
              </div>
              <ClayBtn href="/dog-walking" ckey="amberCTA" size="lg">Find a walker →</ClayBtn>
            </motion.div>

            <div className="flex-shrink-0 w-full max-w-sm flex justify-center lg:justify-end">
              <WalkReportMiniCard />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section style={{ ...BLEED, background: C.pageBg }} className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE_EXP }} className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: '#F07030' }}>Three steps. That&apos;s all.</p>
            <h2 className="font-display text-slate-900" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>How PupStep works</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {[
              { emoji: '🔍', n: '01', title: 'Browse', desc: 'Find services by category. Every listing is manually reviewed by our team — if they\'re listed, we\'d trust them with our own dog.', ck: 'amber' as CKey },
              { emoji: '💬', n: '02', title: 'Contact', desc: 'WhatsApp the provider directly. No platform in the middle, no booking fee, no app to download. Your number, their number, done.', ck: 'lavender' as CKey },
              { emoji: '🐾', n: '03', title: 'Done', desc: 'Your pet gets the care they need. Save favourite providers and contact them again — no starting from scratch every time.', ck: 'mint' as CKey },
            ].map(({ emoji, n, title, desc, ck }, i) => (
              <motion.div key={n} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.42, ease: EASE_EXP, delay: i * 0.1 }}>
                <ClayCard ckey={ck} className="p-7 sm:p-8 h-full">
                  <span className="text-3xl drop-shadow-sm block mb-5">{emoji}</span>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: (C[ck].text as string) + 'AA' }}>Step {n}</p>
                  <h3 className="font-bold mb-3 leading-tight" style={{ fontSize: '1.15rem', color: C[ck].text as string }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: (C[ck].text as string) + 'BB' }}>{desc}</p>
                </ClayCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PET BROADCAST ═══════════ */}
      <section style={{ ...BLEED, background: 'linear-gradient(135deg, #0D3528 0%, #1A5C42 50%, #0D3528 100%)', position: 'relative', overflow: 'hidden' }} className="py-12 sm:py-16">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div style={{ position: 'absolute', top: -80, right: -60, width: 420, height: 420, borderRadius: '50%', background: '#FCD34D', opacity: 0.1, filter: 'blur(90px)' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 320, height: 320, borderRadius: '50%', background: '#6EE7B7', opacity: 0.06, filter: 'blur(70px)' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, ease: EASE_EXP }} className="flex-1 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 mb-6 uppercase tracking-wider" style={{ ...cs('amber'), borderRadius: 100, color: C.amber.text }}>
                🆕 Pet Broadcast — only on PupStep
              </span>
              <h2 className="font-display text-white leading-tight mb-4" style={{ fontSize: 'clamp(1.9rem, 4.5vw, 3.4rem)' }}>
                Can&apos;t find what you need?<br /><span style={{ color: '#FCD34D' }}>Just post it.</span>
              </h2>
              <p className="text-stone-400 text-base sm:text-lg mb-8 max-w-md mx-auto lg:mx-0" style={{ lineHeight: 1.7 }}>
                Post your request once. Verified providers nearby see it and reply on WhatsApp directly. Free.
              </p>
              <ClayBtn href="/broadcast" size="lg">📣 Post a Request — Free</ClayBtn>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, ease: EASE_EXP, delay: 0.1 }}
              className="flex-shrink-0 w-full max-w-sm space-y-3">
              {STEPS.map((s, i) => (
                <motion.div key={i} animate={{ scale: step === i ? 1.03 : 1, opacity: step === i ? 1 : 0.42 }} transition={{ duration: 0.3, ease: EASE }}
                  className="flex items-start gap-4 p-4" style={{ ...cs(s.ckey), borderRadius: 20, outline: step === i ? '2px solid rgba(255,255,255,0.18)' : 'none' }}>
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

      {/* ═══════════ WHY PUPSTEP ═══════════ */}
      <section style={{ ...BLEED, background: C.pageBg }} className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE_EXP }} className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: '#F07030' }}>Why pet parents choose us</p>
            <h2 className="font-display text-slate-900" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>What makes PupStep different</h2>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { emoji: '🔒', title: 'Manually verified', desc: 'Every provider reviewed by our team. If they\'re listed, we\'d trust them with our own dog.', ck: 'amber' as CKey },
              { emoji: '💬', title: 'WhatsApp native', desc: 'Mumbai runs on WhatsApp. We use it — no extra apps, no platform in the middle.', ck: 'peach' as CKey },
              { emoji: '₹0', title: 'Zero fees, always', desc: 'The provider keeps 100%. Which means they\'re here because they want to be.', ck: 'mint' as CKey },
              { emoji: '📍', title: 'Hyperlocal-first', desc: 'Built for your neighbourhood. Depth before breadth — so every listing is one we\'d trust with our own dog.', ck: 'lavender' as CKey },
            ].map(({ emoji, title, desc, ck }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.38, ease: EASE_EXP, delay: i * 0.07 }}>
                <ClayCard ckey={ck} className="p-5 sm:p-6 h-full">
                  <span className="text-2xl sm:text-3xl drop-shadow-sm block mb-3">{emoji}</span>
                  <p className="font-bold text-sm mb-2 leading-tight" style={{ color: C[ck].text as string }}>{title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: (C[ck].text as string) + 'AA' }}>{desc}</p>
                </ClayCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ MAP TEASER ═══════════ */}
      <section style={{ ...BLEED, background: 'white' }} className="py-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <ClayCard ckey="white" href="/map" className="p-5 sm:p-8 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <motion.span animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="text-3xl sm:text-4xl drop-shadow-sm flex-shrink-0" aria-hidden>🗺</motion.span>
              <div>
                <p className="font-bold text-slate-800 text-sm sm:text-base">See everything on one map</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">All vets, groomers, stores and walkers near you</p>
              </div>
            </div>
            <span className="text-sm font-bold text-slate-300 hidden sm:block flex-shrink-0">Open map →</span>
          </ClayCard>
        </div>
      </section>

      {/* ═══════════ FOOTER NOTE ═══════════ */}
      <section style={{ ...BLEED, background: 'white', borderTop: '1px solid #FDE68A' }} className="py-5 pb-28 lg:pb-5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
          <span className="text-xl">🐾</span>
          <p className="text-xs sm:text-sm text-slate-400">
            Mumbai&apos;s most trusted hyperlocal pet services directory.
            Every listing manually verified by our team.
          </p>
        </div>
      </section>

      {/* ═══════════ MOBILE STICKY BAR ═══════════ */}
      <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.55, ease: EASE_EXP, delay: 1.8 }}
        className="lg:hidden fixed bottom-0 inset-x-0 z-50"
        style={{ background: 'rgba(255,251,235,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid #FDE68A', paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
        <div className="flex gap-3 px-4 pt-3 pb-3">
          <Link href="/dog-walking" className="flex-1 flex items-center justify-center py-3.5 rounded-2xl text-sm font-bold"
            style={{ background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)', boxShadow: '0 4px 0px rgba(175,65,10,0.30), 0 8px 20px rgba(245,107,34,0.35)', color: '#451A03' }}>
            Browse Services
          </Link>
          <Link href="/broadcast" className="flex-1 flex items-center justify-center py-3.5 rounded-2xl text-sm font-bold"
            style={{ background: 'linear-gradient(160deg, #FFEDD5 0%, #FED7AA 100%)', boxShadow: '0 4px 0px rgba(194,65,12,0.14)', color: '#7C2D12' }}>
            📣 Post Request
          </Link>
        </div>
      </motion.div>

    </div>
  )
}
