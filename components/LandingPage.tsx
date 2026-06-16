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
  <Sphere size={size} gradient="radial-gradient(circle at 32% 30%, #FFE8D6, #FFB380 44%, #F07030 72%, #E05818)" glow={`0 ${Math.round(size * 0.13)}px ${Math.round(size * 0.33)}px rgba(180,83,9,0.22)`} specW="38%" specH="27%" specTop="17%" specLeft="22%" style={style} />
)
const TealSphere = ({ size = 120, style = {} }: { size?: number; style?: React.CSSProperties }) => (
  <Sphere size={size} gradient="radial-gradient(circle at 30% 28%, #B2F5F8, #17C8CC 52%, #0A8A96)" glow={`0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.28)}px rgba(10,138,150,0.30)`} specW="40%" specH="28%" specTop="16%" specLeft="20%" style={style} />
)
const LavenderSphere = ({ size = 80, style = {} }: { size?: number; style?: React.CSSProperties }) => (
  <Sphere size={size} gradient="radial-gradient(circle at 30% 28%, #EDE9FE, #C4B5FD 50%, #7C3AED)" glow={`0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.28)}px rgba(124,58,237,0.22)`} specW="42%" specH="28%" specTop="16%" specLeft="20%" style={style} />
)

// ─── Cute bone SVG ─────────────────────────────────────────────────────────────
function CuteBone({ size = 64, color = '#F59E0B', opacity = 0.55 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <svg width={size} height={size * 0.46} viewBox="0 0 100 46" fill="none" style={{ opacity, filter: `drop-shadow(0 4px 10px ${color}55)` }} aria-hidden>
      {/* Left knob-pair */}
      <circle cx="14" cy="12" r="11" fill={color} />
      <circle cx="14" cy="34" r="11" fill={color} />
      {/* Right knob-pair */}
      <circle cx="86" cy="12" r="11" fill={color} />
      <circle cx="86" cy="34" r="11" fill={color} />
      {/* Shaft */}
      <rect x="14" y="16" width="72" height="14" rx="7" fill={color} />
      {/* Specular shine */}
      <circle cx="14" cy="10" r="4" fill="rgba(255,255,255,0.45)" />
      <circle cx="86" cy="10" r="4" fill="rgba(255,255,255,0.45)" />
    </svg>
  )
}

// ─── Single paw print SVG ─────────────────────────────────────────────────────
function PawPrint({ size = 28, color = '#F07030', opacity = 0.35 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill={color} style={{ opacity }} aria-hidden>
      {/* Main pad */}
      <ellipse cx="20" cy="28" rx="9" ry="7.5" />
      {/* Toe pads */}
      <ellipse cx="10" cy="19" rx="4.5" ry="5.5" />
      <ellipse cx="20" cy="15" rx="4.5" ry="5.5" />
      <ellipse cx="30" cy="19" rx="4.5" ry="5.5" />
    </svg>
  )
}

// Detect mouse/desktop once on mount — skip 3D tilt on touch devices
function useHasHover() {
  const [hasHover, setHasHover] = useState(false)
  useEffect(() => {
    setHasHover(window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  }, [])
  return hasHover
}

// ─── ClayCard ─────────────────────────────────────────────────────────────────
function ClayCard({ ckey = 'white', children, className = '', style = {}, href }: {
  ckey?: CKey; children: React.ReactNode; className?: string; style?: React.CSSProperties; href?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const hasHover = useHasHover()
  const rx = useMotionValue(0); const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 300, damping: 30 })
  const sry = useSpring(ry, { stiffness: 300, damping: 30 })
  function onMove(e: React.MouseEvent) {
    if (!hasHover || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    rx.set(((e.clientY - r.top) / r.height - 0.5) * -8)
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 8)
  }
  const inner = (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={hasHover ? () => { rx.set(0); ry.set(0) } : undefined}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ y: 1, scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      style={{
        // Only enable 3D tilt context on mouse devices — it costs a composite layer on mobile
        ...(hasHover ? { rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d' as const } : {}),
        borderRadius: 24,
        willChange: 'transform',
        ...cs(ckey),
        ...style,
      }}
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
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #FF8C52, #F56B22)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 8px rgba(175,65,10,0.28)', fontSize: 22 }}>🐕</div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#1C0A00', lineHeight: 1.1, fontFamily: 'var(--font-fredoka, sans-serif)' }}>Kairo&apos;s Walk</p>
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

      {/* Mini route map */}
      <div style={{ background: 'linear-gradient(160deg, #E0F7FA 0%, #E8F5E9 100%)', borderRadius: 16, padding: '10px 12px', border: '1.5px solid rgba(10,138,150,0.18)', marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: '#0A8A96', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Walk route · Juhu Beach Road</p>
        <svg viewBox="0 0 292 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 80 }}>
          {/* Map background streets — subtle grid */}
          <line x1="0" y1="40" x2="292" y2="40" stroke="rgba(10,138,150,0.08)" strokeWidth="12" />
          <line x1="60" y1="0" x2="60" y2="80" stroke="rgba(10,138,150,0.06)" strokeWidth="8" />
          <line x1="160" y1="0" x2="160" y2="80" stroke="rgba(10,138,150,0.06)" strokeWidth="8" />
          <line x1="240" y1="0" x2="240" y2="80" stroke="rgba(10,138,150,0.06)" strokeWidth="8" />
          {/* Route path */}
          <path
            d="M 18 60 C 30 60, 38 48, 55 44 C 72 40, 80 28, 100 26 C 120 24, 130 38, 150 36 C 170 34, 180 20, 200 22 C 218 24, 226 42, 246 44 C 262 46, 272 40, 280 36"
            stroke="#0A8A96"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 3"
            opacity="0.35"
          />
          <path
            d="M 18 60 C 30 60, 38 48, 55 44 C 72 40, 80 28, 100 26 C 120 24, 130 38, 150 36 C 170 34, 180 20, 200 22 C 218 24, 226 42, 246 44 C 262 46, 272 40, 280 36"
            stroke="#0A8A96"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Start pin */}
          <circle cx="18" cy="60" r="7" fill="#0A8A96" />
          <text x="18" y="63.5" textAnchor="middle" fontSize="8" fill="white">🐕</text>
          {/* Poop marker */}
          <circle cx="148" cy="36" r="9" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
          <text x="148" y="39.5" textAnchor="middle" fontSize="9">💩</text>
          {/* Pee markers */}
          <circle cx="100" cy="26" r="7" fill="#EFF6FF" stroke="#BAE6FD" strokeWidth="1.5" />
          <text x="100" y="29.5" textAnchor="middle" fontSize="7">💧</text>
          <circle cx="220" cy="22" r="7" fill="#EFF6FF" stroke="#BAE6FD" strokeWidth="1.5" />
          <text x="220" y="25.5" textAnchor="middle" fontSize="7">💧</text>
          {/* End pin */}
          <circle cx="280" cy="36" r="7" fill="#F07030" />
          <text x="280" y="39.5" textAnchor="middle" fontSize="7" fill="white">🏁</text>
        </svg>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 9, color: '#0A8A96', fontWeight: 600 }}>🟢 Start: Kairo&apos;s home</span>
          <span style={{ fontSize: 9, color: '#F07030', fontWeight: 600 }}>🔴 End: Juhu Beach Rd</span>
        </div>
      </div>

      {/* Testimonial */}
      <div style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', borderRadius: 16, padding: '12px 14px', border: '1px solid rgba(253,230,138,0.8)' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#78350F', lineHeight: 1.4 }}>&ldquo;Love this so much, keep sending me reports everyday 🥰&rdquo;</p>
        <p style={{ fontSize: 11, color: '#92400E', marginTop: 4, opacity: 0.8 }}>— Kairo&apos;s mom</p>
      </div>
    </motion.div>
  )
}

// ─── How it works steps ───────────────────────────────────────────────────────
const HOW_STEPS = [
  { emoji: '🔍', n: '01', title: 'Find a verified provider', desc: 'Browse verified walkers, groomers, vets and more near you. Every listing manually reviewed by our team.', ck: 'amber' as CKey },
  { emoji: '🐾', n: '02', title: 'They log every session', desc: 'After each walk or groom, your provider logs the session — distance, photos, poop count, notes.', ck: 'mint' as CKey },
  { emoji: '📋', n: '03', title: 'You get a care report', desc: 'A photo care report lands in your account. Save it, share it with your vet, see your dog\'s health history build over time.', ck: 'lavender' as CKey },
]

const SAMPLE_REPORT_PATH = '/walk-report/ff63f8d7cf983eb9940535a1a5408777'

// ─── Main ─────────────────────────────────────────────────────────────────────
export type FeaturedProvider = { id: string; name: string; whatsapp: string | null; category_slug: string; reportCount: number }
interface Props { countMap: Record<string, number>; totalProviders: number; neighbourhood?: string; featuredProviders?: FeaturedProvider[] }

export default function LandingPage({ countMap, totalProviders, neighbourhood = 'Juhu', featuredProviders = [] }: Props) {
  const pStat = useCountUp(totalProviders)
  const [step, setStep] = useState(0)
  useEffect(() => { const id = setInterval(() => setStep(s => (s + 1) % 3), 2400); return () => clearInterval(id) }, [])

  return (
    <div style={{ background: C.pageBg }} className="-mt-8">

      {/* ═══════════ HERO ═══════════ */}
      <section style={{ ...BLEED, background: '#FFFBEB', position: 'relative', overflow: 'hidden' }} className="min-h-[100svh] flex flex-col justify-center">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(10,138,150,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} aria-hidden />

        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <motion.div style={{ position: 'absolute', top: -60, right: -50, willChange: 'transform' }} animate={{ y: [0, -18, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
            <TealSphere size={280} />
          </motion.div>
          <motion.div style={{ position: 'absolute', bottom: -30, left: 60, willChange: 'transform' }} animate={{ y: [0, -12, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}>
            <TealSphere size={140} />
          </motion.div>
          <motion.div style={{ position: 'absolute', top: '38%', left: '3%', willChange: 'transform' }} animate={{ y: [0, -10, 0], rotate: [-18, -14, -18] }} transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}>
            <CuteBone size={64} color="#0A8A96" opacity={0.28} />
          </motion.div>
          {[
            { top: '15%', left: '8%',  size: 20, rotate: -15, delay: 0 },
            { top: '24%', left: '16%', size: 16, rotate: -10, delay: 0.18 },
            { top: '62%', right: '6%', size: 18, rotate:  20, delay: 0 },
            { top: '72%', right: '13%',size: 14, rotate:  15, delay: 0.22 },
          ].map(({ top, left, right, size, rotate, delay }, i) => (
            <motion.div key={i} style={{ position: 'absolute', top, left, right, transform: `rotate(${rotate}deg)` }}
              animate={{ opacity: [0.22, 0.42, 0.22] }} transition={{ duration: 3.2 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay }}>
              <PawPrint size={size} color="#0A8A96" opacity={1} />
            </motion.div>
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-20 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-20">

            {/* Text column */}
            <div className="flex-1 text-center lg:text-left w-full">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_EXP }}>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase px-4 py-1.5 mb-6" style={{ ...cs('sky'), borderRadius: 100, color: C.sky.text }}>
                  🐾 {neighbourhood}, Mumbai
                </span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_EXP, delay: 0.08 }}
                className="font-display text-slate-900 mb-5" style={{ fontSize: 'clamp(2.4rem, 6vw, 4.8rem)', lineHeight: 1.06, letterSpacing: '-0.02em' }}>
                Your walker<br />shows their work.<br />
                <span style={{ color: '#0A8A96' }}>Every time.</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_EXP, delay: 0.18 }}
                className="text-lg sm:text-xl text-slate-500 mb-8 max-w-lg mx-auto lg:mx-0" style={{ lineHeight: 1.65 }}>
                Photo care reports after every walk and groom. Trusted, verified providers in {neighbourhood}, Mumbai.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_EXP, delay: 0.28 }}
                className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-7">
                <ClayBtn href="/dog-walking" ckey="tealCTA" size="lg">Find a walker in {neighbourhood} →</ClayBtn>
                <ClayBtn href={SAMPLE_REPORT_PATH} ckey="white" size="lg">See a care report →</ClayBtn>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.44 }}
                className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {[
                  { label: '📋 Report after every walk', ckey: 'mint' as CKey },
                  { label: '💬 WhatsApp direct', ckey: 'sky' as CKey },
                  { label: '₹0 booking fee', ckey: 'peach' as CKey },
                ].map(({ label, ckey }) => (
                  <span key={label} className="text-xs font-semibold px-3.5 py-1.5" style={{ ...cs(ckey), borderRadius: 100, color: C[ckey].text as string }}>{label}</span>
                ))}
              </motion.div>
            </div>

            {/* Right column — the walk report IS the product */}
            <motion.div initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: EASE_EXP, delay: 0.22 }}
              className="flex-shrink-0 w-full flex justify-center lg:justify-end relative">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="relative">
                <WalkReportMiniCard />
                {/* Floating "sent via WhatsApp" badge */}
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                  style={{ position: 'absolute', top: -14, right: -8, background: 'linear-gradient(135deg, #25D366, #128C7E)', borderRadius: 100, padding: '7px 14px', boxShadow: '0 4px 0px rgba(14,100,55,0.30), 0 10px 24px rgba(37,211,102,0.32)', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 13 }}>💬</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Sent via WhatsApp</span>
                </motion.div>
                {/* Floating "saved to account" badge */}
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                  style={{ position: 'absolute', bottom: -10, left: -8, background: 'linear-gradient(160deg, #FFF 0%, #FFFDF5 100%)', borderRadius: 100, padding: '7px 12px', boxShadow: '0 4px 0px rgba(10,138,150,0.12), 0 10px 20px rgba(0,0,0,0.08)', border: '1.5px solid rgba(10,138,150,0.18)', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 13 }}>💾</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0A8A96' }}>Saved to your account</span>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" aria-hidden>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-6 h-9 rounded-full flex justify-center pt-2" style={{ border: '2px solid rgba(10,138,150,0.22)', background: 'rgba(10,138,150,0.07)' }}>
            <div className="w-1 h-1.5 rounded-full" style={{ background: '#0A8A96' }} />
          </motion.div>
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section style={{ ...BLEED, background: 'linear-gradient(120deg, #F0FDFA 0%, #CCFBF1 55%, #F0FDFA 100%)', borderTop: '1.5px solid rgba(10,138,150,0.18)', borderBottom: '1.5px solid rgba(10,138,150,0.18)', position: 'relative', overflow: 'hidden' }} className="py-8 sm:py-10">
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-3 gap-2 sm:gap-8">
            {[
              {
                icon: '🐾',
                iconBg: '#0A8A96',
                node: <><span ref={pStat.ref} className="font-display" style={{ fontSize: 'clamp(1.85rem, 5vw, 3rem)', color: '#065A67', lineHeight: 1, fontWeight: 700 }}>{pStat.val}</span><span className="font-display" style={{ fontSize: 'clamp(1.2rem, 3vw, 2rem)', color: '#0A8A96' }}>+</span></>,
                label: 'Verified providers',
                sub: 'Manually reviewed',
              },
              {
                icon: '📋',
                iconBg: '#6EE7B7',
                node: <span className="font-display" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.6rem)', color: '#065A67', lineHeight: 1, fontWeight: 700 }}>Every</span>,
                label: 'Walk gets a report',
                sub: 'Photo + stats + route',
              },
              {
                icon: '₹',
                iconBg: '#C4B5FD',
                node: <span className="font-display" style={{ fontSize: 'clamp(1.85rem, 5vw, 3rem)', color: '#065A67', lineHeight: 1, fontWeight: 700 }}>₹0</span>,
                label: 'Booking fees',
                sub: 'Free, always',
              },
            ].map(({ icon, iconBg, node, label, sub }) => (
              <div key={label} className="flex flex-col items-center text-center">
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 3px 8px rgba(10,138,150,0.2)', border: '2px solid rgba(255,255,255,0.9)', marginBottom: 10 }}>{icon}</div>
                <div className="flex items-end justify-center gap-0.5 mb-1.5">{node}</div>
                <p className="font-semibold" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.875rem)', color: '#065A67', lineHeight: 1.3 }}>{label}</p>
                <p className="hidden sm:block" style={{ fontSize: '0.7rem', color: '#0A8A96', opacity: 0.65, marginTop: 2 }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section style={{ ...BLEED, background: C.pageBg }} className="py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE_EXP }} className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: '#0A8A96' }}>Three steps. That&apos;s it.</p>
            <h2 className="font-display text-slate-900" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>How PupStep works</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {HOW_STEPS.map(({ emoji, n, title, desc, ck }, i) => (
              <motion.div key={n} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.42, ease: EASE_EXP, delay: i * 0.1 }}>
                <ClayCard ckey={ck} className="p-7 sm:p-8 h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-3xl drop-shadow-sm">{emoji}</span>
                    <span className="text-xs font-bold tracking-widest uppercase" style={{ color: (C[ck].text as string) + '88' }}>Step {n}</span>
                  </div>
                  <h3 className="font-bold mb-3 leading-tight" style={{ fontSize: '1.1rem', color: C[ck].text as string }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: (C[ck].text as string) + 'BB' }}>{desc}</p>
                </ClayCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ THE CARE REPORT MOMENT ═══════════ */}
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
                📋 Care reports — only on PupStep
              </span>
              <h2 className="font-display text-white leading-tight mb-5" style={{ fontSize: 'clamp(1.9rem, 4.5vw, 3.4rem)', lineHeight: 1.1 }}>
                After every walk,<br /><span style={{ color: '#17C8CC' }}>you get this.</span>
              </h2>
              <p className="text-stone-400 text-base sm:text-lg mb-8 max-w-md mx-auto lg:mx-0" style={{ lineHeight: 1.7 }}>
                GPS route, photo of your dog, poop count, duration. Every session logged, every report saved to your account. Your vet will thank you.
              </p>
              <div className="flex flex-col gap-3 mb-8 items-center lg:items-start">
                {[
                  { icon: '📍', text: 'GPS walk route — see exactly where they went' },
                  { icon: '📸', text: 'A photo of your dog, every single walk' },
                  { icon: '💩', text: 'Poop and pee log — your vet will actually use this' },
                  { icon: '📂', text: 'All reports saved — health history over time' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(23,200,204,0.12)', border: '1px solid rgba(23,200,204,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{icon}</span>
                    <span className="text-sm text-stone-300 font-medium">{text}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <ClayBtn href="/dog-walking" ckey="tealCTA" size="lg">Find a walker →</ClayBtn>
                <ClayBtn href={SAMPLE_REPORT_PATH} ckey="white" size="md">See a real report ↗</ClayBtn>
              </div>
            </motion.div>
            <div className="flex-shrink-0 w-full max-w-sm flex justify-center lg:justify-end">
              <WalkReportMiniCard />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PROVIDER TRUST STRIP ═══════════ */}
      {featuredProviders.length > 0 && (
        <section style={{ ...BLEED, background: 'white' }} className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE_EXP }} className="mb-10 text-center">
              <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: '#0A8A96' }}>The people behind the reports</p>
              <h2 className="font-display text-slate-900" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>Meet your {neighbourhood} providers</h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredProviders.map(({ id, name, whatsapp, category_slug, reportCount }, i) => {
                const ck = (catClay[category_slug] ?? 'white') as CKey
                const catIcon = CATEGORIES.find(c => c.slug === category_slug)?.icon ?? '🐾'
                const catName = CATEGORIES.find(c => c.slug === category_slug)?.name ?? category_slug
                return (
                  <motion.div key={id} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.42, ease: EASE_EXP, delay: i * 0.1 }}>
                    <ClayCard ckey={ck} className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div style={{ width: 48, height: 48, borderRadius: 16, background: (C[ck].bg as string), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.8)' }}>{catIcon}</div>
                          <div>
                            <p className="font-bold text-sm leading-tight" style={{ color: C[ck].text as string }}>{name}</p>
                            <p className="text-xs mt-0.5" style={{ color: (C[ck].text as string) + '80' }}>{catName} · {neighbourhood}</p>
                          </div>
                        </div>
                        <span className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(10,138,150,0.12)', color: '#0A8A96' }}>✓ Verified</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span style={{ fontSize: 13 }}>📋</span>
                          <span className="text-xs font-semibold" style={{ color: (C[ck].text as string) + 'CC' }}>
                            <strong style={{ color: C[ck].text as string }}>{reportCount}</strong> care reports sent
                          </span>
                        </div>
                        {whatsapp && (
                          <a href={`https://wa.me/91${whatsapp.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full"
                            style={{ background: 'rgba(37,211,102,0.12)', color: '#15803d' }}>
                            💬 WhatsApp
                          </a>
                        )}
                      </div>
                    </ClayCard>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ CATEGORIES ═══════════ */}
      <section style={{ ...BLEED, background: C.pageBg }} className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE_EXP }} className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: '#0A8A96' }}>Find the right care</p>
                <h2 className="font-display text-slate-900" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.12 }}>What does your pet need?</h2>
              </div>
              <p className="text-sm text-slate-400 max-w-xs sm:text-right">Verified providers near {neighbourhood}</p>
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
                      className="flex flex-col h-full" style={{ borderRadius: 22, overflow: 'hidden', boxShadow: t.shadow, border: t.border }}>
                      <div style={{ height: 'clamp(120px, 22vw, 200px)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt={`${cat.name} in ${neighbourhood}, Mumbai`} loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: photoPos, transition: 'transform 0.5s ease', display: 'block' }}
                          className="group-hover:scale-105" />
                        <div style={{ position: 'absolute', inset: 0, background: t.bg, opacity: 0.16, mixBlendMode: 'multiply', pointerEvents: 'none' }} aria-hidden />
                        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.96)', borderRadius: 100, padding: '4px 11px', fontSize: 11, fontWeight: 700, color: count ? t.text : '#94A3B8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
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

      {/* ═══════════ WHY PUPSTEP ═══════════ */}
      <section style={{ ...BLEED, background: 'white' }} className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE_EXP }} className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: '#0A8A96' }}>Why pet parents choose us</p>
            <h2 className="font-display text-slate-900" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>What makes PupStep different</h2>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { emoji: '📋', title: 'Care reports', desc: 'Every walk and groom is logged. GPS route, photo, poop count — every time, automatically.', ck: 'mint' as CKey },
              { emoji: '🔒', title: 'Manually verified', desc: 'Every provider reviewed by our team. If they\'re listed, we\'d trust them with our own dog.', ck: 'amber' as CKey },
              { emoji: '💬', title: 'WhatsApp native', desc: 'Mumbai runs on WhatsApp. We use it — no extra apps, no platform in the middle.', ck: 'sky' as CKey },
              { emoji: '₹0', title: 'Zero fees, always', desc: 'Contact providers directly. No booking fee, no commission. The provider keeps 100%.', ck: 'lavender' as CKey },
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

      {/* ═══════════ FOR PROVIDERS ═══════════ */}
      <section style={{ ...BLEED, background: 'linear-gradient(135deg, #0D3528 0%, #1A5C42 50%, #0D3528 100%)', position: 'relative', overflow: 'hidden' }} className="py-12 sm:py-14">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div style={{ position: 'absolute', top: -80, right: -60, width: 360, height: 360, borderRadius: '50%', background: '#17C8CC', opacity: 0.05 }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 280, height: 280, borderRadius: '50%', background: '#6EE7B7', opacity: 0.06 }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, ease: EASE_EXP }} className="flex-1 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 mb-5 uppercase tracking-wider" style={{ ...cs('mint'), borderRadius: 100, color: C.mint.text }}>
                🦮 For dog walkers and groomers
              </span>
              <h2 className="font-display text-white leading-tight mb-4" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3rem)' }}>
                Are you a walker or<br />groomer in {neighbourhood}?
              </h2>
              <p className="text-stone-400 text-base mb-6 max-w-md mx-auto lg:mx-0" style={{ lineHeight: 1.7 }}>
                Get listed free. Send care reports to your clients after every session. Build trust, get more clients.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, ease: EASE_EXP, delay: 0.1 }}
              className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
              <ClayBtn href="/join" ckey="tealCTA" size="lg">Get listed free →</ClayBtn>
              <ClayBtn href="/broadcast" ckey="white" size="lg">📣 Browse requests</ClayBtn>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ MAP TEASER ═══════════ */}
      <section style={{ ...BLEED, background: C.pageBg }} className="py-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <ClayCard ckey="white" href="/map" className="p-5 sm:p-8 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <motion.span animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="text-3xl sm:text-4xl drop-shadow-sm flex-shrink-0" aria-hidden>🗺</motion.span>
              <div>
                <p className="font-bold text-slate-800 text-sm sm:text-base">See everything on one map</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">All vets, groomers, stores and walkers near {neighbourhood}</p>
              </div>
            </div>
            <span className="text-sm font-bold text-slate-300 hidden sm:block flex-shrink-0">Open map →</span>
          </ClayCard>
        </div>
      </section>

      {/* ═══════════ SEO FOOTER LINKS ═══════════ */}
      <section style={{ ...BLEED, background: 'white', borderTop: '1px solid rgba(10,138,150,0.12)' }} className="py-10 pb-28 lg:pb-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Dog Walking</p>
              {['Juhu', 'Versova', 'Andheri West', 'Santacruz West'].map(a => (
                <Link key={a} href={`/dog-walking?area=${a}`} className="block text-xs text-slate-500 hover:text-teal-700 mb-1.5 font-medium">
                  Dog walkers in {a}
                </Link>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Grooming</p>
              {['Juhu', 'Versova', 'Andheri West', 'Bandra West'].map(a => (
                <Link key={a} href={`/grooming?area=${a}`} className="block text-xs text-slate-500 hover:text-teal-700 mb-1.5 font-medium">
                  Pet groomers in {a}
                </Link>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Vets</p>
              {['Juhu', 'Andheri West', 'Santacruz West', 'Versova'].map(a => (
                <Link key={a} href={`/vet?area=${a}`} className="block text-xs text-slate-500 hover:text-teal-700 mb-1.5 font-medium">
                  Vets in {a}
                </Link>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">More services</p>
              <Link href="/dog-training" className="block text-xs text-slate-500 hover:text-teal-700 mb-1.5 font-medium">Dog training in Juhu</Link>
              <Link href="/pet-store" className="block text-xs text-slate-500 hover:text-teal-700 mb-1.5 font-medium">Pet stores in Juhu</Link>
              <Link href="/insurance" className="block text-xs text-slate-500 hover:text-teal-700 mb-1.5 font-medium">Pet insurance Mumbai</Link>
              <Link href="/map" className="block text-xs text-slate-500 hover:text-teal-700 mb-1.5 font-medium">Pet services map Mumbai</Link>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="text-xs text-slate-400">
              PupStep — verified pet services in Juhu, Versova, Andheri West, Santacruz West and Mumbai.
            </p>
            <p className="text-xs text-slate-300">Every listing manually reviewed by our team.</p>
          </div>
        </div>
      </section>

      {/* ═══════════ MOBILE STICKY BAR ═══════════ */}
      <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.55, ease: EASE_EXP, delay: 1.8 }}
        className="lg:hidden fixed bottom-0 inset-x-0 z-50"
        style={{ background: 'rgba(255,251,235,0.98)', borderTop: '1px solid rgba(10,138,150,0.18)', paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
        <div className="flex gap-3 px-4 pt-3 pb-3">
          <Link href="/dog-walking" className="flex-1 flex items-center justify-center py-3.5 rounded-2xl text-sm font-bold"
            style={{ background: 'linear-gradient(160deg, #17C8CC 0%, #0A8A96 100%)', boxShadow: '0 4px 0px rgba(5,80,90,0.30), 0 8px 20px rgba(12,180,188,0.35)', color: '#F0FDFA' }}>
            Find a walker →
          </Link>
          <Link href={SAMPLE_REPORT_PATH} className="flex-1 flex items-center justify-center py-3.5 rounded-2xl text-sm font-bold"
            style={{ background: 'linear-gradient(160deg, #CCFBF1 0%, #99F6E4 100%)', boxShadow: '0 4px 0px rgba(10,138,150,0.14)', color: '#065A67' }}>
            📋 See a report
          </Link>
        </div>
      </motion.div>

    </div>
  )
}
