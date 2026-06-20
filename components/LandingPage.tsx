'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  motion, useMotionValue, useSpring, useInView,
} from 'framer-motion'
import {
  MapPin, Search, ClipboardList, ShieldCheck, MessageCircle,
  IndianRupee, Check, Timer, Ruler, Megaphone, Bell, Star,
  Droplets, Sparkles, ArrowRight, Users, Navigation,
  PawPrint as LucidePaw,
} from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'

// ─── Design tokens ────────────────────────────────────────────────────────────
const EASE_EXP  = [0.16, 1, 0.3, 1] as const
const SPRING    = { type: 'spring', duration: 0.45, bounce: 0 } as const

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useHasHover() {
  const [v, setV] = useState(false)
  useEffect(() => setV(window.matchMedia('(hover:hover) and (pointer:fine)').matches), [])
  return v
}
function useReducedMotion() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion:reduce)')
    setV(mq.matches)
    const h = (e: MediaQueryListEvent) => setV(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return v
}

// ─── Unsplash image helper (lazy, webp, sized) ───────────────────────────────
const img = (id: string, w = 640, h = 460) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`

const CAT_PHOTO: Record<string, string> = {
  'dog-walking': img('photo-1648304887391-a6c2cf2228e4'),
  'grooming':    img('photo-1611173622933-91942d394b04'),
  'vet':         img('photo-1588950538967-ca7f8599c669'),
  'dog-training':img('photo-1640652663796-764e4eb5bc59'),
  'pet-store':   img('photo-1601758228041-f3b2795255f1'),
}
const CAT_POS: Record<string, string> = {
  'dog-walking': 'center 20%',
  'grooming':    'center 40%',
  'vet':         'center 30%',
  'dog-training':'center 30%',
  'pet-store':   'center 50%',
}

// Hero dog photo strip
const HERO_DOG_PHOTOS = [
  { id: 'photo-1552053831-71594a27632d', alt: 'Golden retriever', rotate: -5 },
  { id: 'photo-1587300003388-59208cc962cb', alt: 'Puppy portrait',   rotate: 3  },
  { id: 'photo-1548681528-6a5c45dbe30',  alt: 'Dog on a walk',     rotate: -2 },
]

// ─── Clay color system ────────────────────────────────────────────────────────
const C = {
  pageBg: '#FFFBEB',
  white: {
    bg: 'linear-gradient(155deg,#FFFFFF 0%,#FFFDF6 100%)',
    shadow: '0 4px 0 rgba(0,0,0,0.06),0 12px 36px rgba(0,0,0,0.05),inset 0 1.5px 0 rgba(255,255,255,1)',
    border: '1px solid rgba(226,232,240,0.7)', text: '#0F172A',
  },
  amber: {
    bg: 'linear-gradient(155deg,#FEF3C7 0%,#FDE68A 100%)',
    shadow: '0 4px 0 rgba(180,83,9,0.18),0 12px 36px rgba(253,230,138,0.55),inset 0 1.5px 0 rgba(255,255,255,0.95)',
    border: '1px solid rgba(253,230,138,0.7)', text: '#78350F',
  },
  peach: {
    bg: 'linear-gradient(155deg,#FFEDD5 0%,#FED7AA 100%)',
    shadow: '0 4px 0 rgba(194,65,12,0.14),0 12px 36px rgba(254,215,170,0.5),inset 0 1.5px 0 rgba(255,255,255,0.9)',
    border: '1px solid rgba(254,215,170,0.6)', text: '#7C2D12',
  },
  mint: {
    bg: 'linear-gradient(155deg,#F0FDF4 0%,#BBF7D0 100%)',
    shadow: '0 4px 0 rgba(5,150,105,0.12),0 12px 36px rgba(187,247,208,0.5),inset 0 1.5px 0 rgba(255,255,255,0.9)',
    border: '1px solid rgba(187,247,208,0.55)', text: '#064E3B',
  },
  sky: {
    bg: 'linear-gradient(155deg,#E0F2FE 0%,#BAE6FD 100%)',
    shadow: '0 4px 0 rgba(8,145,178,0.15),0 12px 36px rgba(186,230,253,0.45),inset 0 1.5px 0 rgba(255,255,255,0.9)',
    border: '1px solid rgba(186,230,253,0.55)', text: '#0C4A6E',
  },
  lavender: {
    bg: 'linear-gradient(155deg,#F5F3FF 0%,#E9D5FF 100%)',
    shadow: '0 4px 0 rgba(109,40,217,0.12),0 12px 36px rgba(233,213,255,0.5),inset 0 1.5px 0 rgba(255,255,255,0.9)',
    border: '1px solid rgba(233,213,255,0.55)', text: '#4C1D95',
  },
  teal: {
    bg: 'linear-gradient(155deg,#0A2F35 0%,#0D3D45 100%)',
    shadow: '0 6px 0 rgba(5,40,48,0.42),0 20px 60px rgba(10,47,53,0.38),inset 0 1.5px 0 rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.07)', text: '#F0FDFA',
  },
  amberCTA: {
    bg: 'linear-gradient(155deg,#FF8C52 0%,#F56B22 100%)',
    shadow: '0 4px 0 rgba(175,65,10,0.30),0 10px 24px rgba(245,107,34,0.42),inset 0 1.5px 0 rgba(255,255,255,0.38)',
    border: '1px solid rgba(255,255,255,0.18)', text: '#451A03',
  },
  tealCTA: {
    bg: 'linear-gradient(155deg,#17C8CC 0%,#0A8A96 100%)',
    shadow: '0 4px 0 rgba(5,80,90,0.42),0 10px 24px rgba(12,180,188,0.38),inset 0 1.5px 0 rgba(255,255,255,0.20)',
    border: '1px solid rgba(255,255,255,0.12)', text: '#F0FDFA',
  },
} as const
type CKey = keyof typeof C

function cs(k: CKey) {
  const t = C[k] as { bg: string; shadow: string; border: string }
  return { background: t.bg, boxShadow: t.shadow, border: t.border }
}

const BLEED: React.CSSProperties = {
  width: '100vw',
  marginLeft: 'calc(50% - 50vw)',
  marginRight: 'calc(50% - 50vw)',
}

const CAT_CLAY: Record<string, CKey> = {
  'dog-walking': 'amber',
  'grooming':    'lavender',
  'vet':         'mint',
  'dog-training':'sky',
}

// ─── Decorative: PawPrint SVG ─────────────────────────────────────────────────
function Paw({ size = 28, color = '#F07030', opacity = 0.35 }: {
  size?: number; color?: string; opacity?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill={color} style={{ opacity }} aria-hidden>
      <ellipse cx="20" cy="28" rx="9" ry="7.5" />
      <ellipse cx="10" cy="19" rx="4.5" ry="5.5" />
      <ellipse cx="20" cy="15" rx="4.5" ry="5.5" />
      <ellipse cx="30" cy="19" rx="4.5" ry="5.5" />
    </svg>
  )
}

function Bone({ size = 64, color = '#F59E0B', opacity = 0.55 }: {
  size?: number; color?: string; opacity?: number
}) {
  return (
    <svg width={size} height={size * 0.46} viewBox="0 0 100 46" fill="none"
      style={{ opacity }} aria-hidden>
      <circle cx="14" cy="12" r="11" fill={color} />
      <circle cx="14" cy="34" r="11" fill={color} />
      <circle cx="86" cy="12" r="11" fill={color} />
      <circle cx="86" cy="34" r="11" fill={color} />
      <rect x="14" y="16" width="72" height="14" rx="7" fill={color} />
      <circle cx="14" cy="10" r="4" fill="rgba(255,255,255,0.45)" />
      <circle cx="86" cy="10" r="4" fill="rgba(255,255,255,0.45)" />
    </svg>
  )
}

// ─── Hero dog photo strip ─────────────────────────────────────────────────────
function DogPhotoStrip({ rm }: { rm: boolean }) {
  return (
    <div className="flex gap-2.5 justify-center lg:justify-end mb-4">
      {HERO_DOG_PHOTOS.map((p, i) => (
        <motion.div
          key={p.id}
          initial={rm ? {} : { opacity: 0, y: 18, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: p.rotate }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.2 + i * 0.08 }}
          style={{
            width: 84, height: 104, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
            boxShadow: '0 4px 0 rgba(0,0,0,0.10), 0 14px 28px rgba(10,47,53,0.14), inset 0 1.5px 0 rgba(255,255,255,0.85)',
            border: '3px solid rgba(255,255,255,0.95)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://images.unsplash.com/${p.id}?w=200&h=250&fit=crop&auto=format&q=80`}
            alt={p.alt}
            loading="eager"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </motion.div>
      ))}
    </div>
  )
}

// ─── Teal sphere ──────────────────────────────────────────────────────────────
function TealSphere({ size = 120, style = {} }: { size?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'radial-gradient(circle at 30% 28%,#B2F5F8,#17C8CC 52%,#0A8A96)',
      boxShadow: `0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.28)}px rgba(10,138,150,0.30)`,
      overflow: 'hidden', position: 'relative', flexShrink: 0, ...style,
    }}>
      <div style={{ position: 'absolute', top: '16%', left: '20%', width: '40%', height: '28%', borderRadius: '50%', background: 'rgba(255,255,255,0.42)' }} />
    </div>
  )
}

// ─── Custom paw cursor with footstep trail (desktop only) ────────────────────
const PAW_BROWN = '#78350F'
interface TrailStep { id: number; x: number; y: number; rot: number; side: number }

function PawCursor() {
  const hasHover  = useHasHover()
  const reduced   = useReducedMotion()
  const x         = useMotionValue(-120)
  const y         = useMotionValue(-120)
  const springX   = useSpring(x, { stiffness: 180, damping: 22 })
  const springY   = useSpring(y, { stiffness: 180, damping: 22 })
  const [on, setOn]       = useState(false)
  const [trail, setTrail] = useState<TrailStep[]>([])
  const lastPos = useRef({ x: -999, y: -999 })
  const idRef   = useRef(0)
  const sideRef = useRef(0)

  useEffect(() => {
    if (!hasHover) return
    const el = document.createElement('style')
    el.id = '__paw'
    el.textContent = '*{cursor:none!important}'
    document.head.appendChild(el)
    return () => document.getElementById('__paw')?.remove()
  }, [hasHover])

  useEffect(() => {
    if (!hasHover || reduced) return
    const mv = (e: MouseEvent) => {
      const cx = e.clientX - 16
      const cy = e.clientY - 16
      x.set(cx); y.set(cy); setOn(true)

      const dx = cx - lastPos.current.x
      const dy = cy - lastPos.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 56) {
        lastPos.current = { x: cx, y: cy }
        const side = sideRef.current % 2 === 0 ? -1 : 1
        sideRef.current++
        const angle = Math.atan2(dy, dx) * (180 / Math.PI)
        const step: TrailStep = {
          id: ++idRef.current,
          x: cx + side * 10,
          y: cy + 4,
          rot: angle - 90 + side * 18,
          side,
        }
        setTrail(t => [...t.slice(-8), step])
        // auto-remove after 900ms
        setTimeout(() => setTrail(t => t.filter(s => s.id !== step.id)), 900)
      }
    }
    const ml = () => setOn(false)
    window.addEventListener('mousemove', mv, { passive: true })
    document.addEventListener('mouseleave', ml)
    return () => { window.removeEventListener('mousemove', mv); document.removeEventListener('mouseleave', ml) }
  }, [hasHover, reduced, x, y])

  if (!hasHover || reduced) return null

  return (
    <>
      {/* Footstep trail */}
      {trail.map((step, i) => (
        <motion.div
          key={step.id}
          className="pointer-events-none fixed top-0 left-0 z-[9998]"
          initial={{ opacity: 0.65, scale: 0.85 }}
          animate={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.85, ease: 'easeOut' }}
          style={{
            x: step.x, y: step.y,
            rotate: step.rot,
            filter: `drop-shadow(0 2px 6px rgba(120,53,15,${0.55 - i * 0.04}))`,
          }}
        >
          <Paw size={20} color={PAW_BROWN} opacity={1} />
        </motion.div>
      ))}
      {/* Main cursor paw */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9999]"
        style={{
          x: springX, y: springY,
          opacity: on ? 1 : 0,
          filter: 'drop-shadow(0 3px 10px rgba(120,53,15,0.65)) drop-shadow(0 0 18px rgba(120,53,15,0.25))',
        }}
      >
        <Paw size={32} color={PAW_BROWN} opacity={1} />
      </motion.div>
    </>
  )
}

// ─── Walking dog GPS map ──────────────────────────────────────────────────────
// Route waypoints in SVG viewBox "0 0 294 100"
const ROUTE: Array<[number, number]> = [
  [14,74],[36,66],[58,56],[80,46],[104,38],[126,34],
  [150,38],[174,30],[198,26],[222,32],[246,40],[272,46],[280,48],
]
const ROUTE_PATH = ROUTE.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')

function WalkingDogMap({ dark = false }: { dark?: boolean }) {
  const reduced = useReducedMotion()
  const dogX = useMotionValue(ROUTE[0][0] - 10)
  const dogY = useMotionValue(ROUTE[0][1] - 10)
  const sDX  = useSpring(dogX, { stiffness: 40, damping: 10 })
  const sDY  = useSpring(dogY, { stiffness: 40, damping: 10 })
  const [dir, setDir] = useState<1 | -1>(1)
  const idx  = useRef(0)

  const tick = useCallback(() => {
    idx.current += dir
    if (idx.current >= ROUTE.length - 1) setDir(-1)
    if (idx.current <= 0) setDir(1)
    dogX.set(ROUTE[idx.current][0] - 10)
    dogY.set(ROUTE[idx.current][1] - 10)
  }, [dir, dogX, dogY])

  useEffect(() => {
    if (reduced) return
    const id = setInterval(tick, 620)
    return () => clearInterval(id)
  }, [reduced, tick])

  const bg        = dark ? 'rgba(255,255,255,0.03)' : '#E6F7F8'
  const border    = dark ? '1px solid rgba(255,255,255,0.09)' : '1.5px solid rgba(10,138,150,0.18)'
  const routeClr  = dark ? 'rgba(23,200,204,0.85)' : '#0A8A96'
  const grid      = dark ? 'rgba(255,255,255,0.05)' : 'rgba(10,138,150,0.07)'

  return (
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: bg, border }}>
      <svg viewBox="0 0 294 100" xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 100, display: 'block' }} aria-hidden>
        {/* grid */}
        <line x1="0" y1="50" x2="294" y2="50" stroke={grid} strokeWidth="10" />
        {[75, 150, 225].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="100" stroke={grid} strokeWidth="8" />
        ))}
        {/* ghost dashed */}
        <path d={ROUTE_PATH} stroke={routeClr} strokeWidth="2" strokeDasharray="5 3" opacity="0.25" strokeLinecap="round" fill="none" />
        {/* solid route */}
        <path d={ROUTE_PATH} stroke={routeClr} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* start dot */}
        <circle cx={ROUTE[0][0]} cy={ROUTE[0][1]} r="5.5" fill={routeClr} />
        {/* events */}
        <circle cx="150" cy="38" r="8.5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
        <text x="150" y="41.5" textAnchor="middle" fontSize="9">💩</text>
        <circle cx="108" cy="38" r="7" fill="#EFF6FF" stroke="#BAE6FD" strokeWidth="1.5" />
        <text x="108" y="41.5" textAnchor="middle" fontSize="8">💧</text>
        {/* end flag */}
        <circle cx={ROUTE[ROUTE.length-1][0]} cy={ROUTE[ROUTE.length-1][1]} r="5.5" fill="#F07030" />
      </svg>

      {/* Dog emoji walks along route */}
      {!reduced && (
        <motion.span
          aria-hidden
          style={{
            position: 'absolute', top: 0, left: 0,
            x: sDX, y: sDY,
            fontSize: 18, lineHeight: 1,
            filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.22))',
            pointerEvents: 'none',
            scaleX: dir, // flips 🐕 when reversing
            transformOrigin: 'center',
          }}
        >
          🐕
        </motion.span>
      )}
    </div>
  )
}

// ─── Fade-up scroll reveal ────────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-48px' })
  const rm     = useReducedMotion()
  return (
    <motion.div ref={ref} className={className}
      initial={rm ? {} : { opacity: 0, y: 10, filter: 'blur(4px)' }}
      animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ ...SPRING, delay }}>
      {children}
    </motion.div>
  )
}

// ─── Clay card with 3-D tilt (mouse only) ────────────────────────────────────
function ClayCard({ ckey = 'white' as CKey, children, className = '', style = {}, href, radius = 24 }: {
  ckey?: CKey; children: React.ReactNode; className?: string
  style?: React.CSSProperties; href?: string; radius?: number
}) {
  const ref     = useRef<HTMLDivElement>(null)
  const hasH    = useHasHover()
  const rm      = useReducedMotion()
  const rx      = useMotionValue(0)
  const ry      = useMotionValue(0)
  const srx     = useSpring(rx, { stiffness: 280, damping: 28 })
  const sry     = useSpring(ry, { stiffness: 280, damping: 28 })

  const onMove = (e: React.MouseEvent) => {
    if (!hasH || rm || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    rx.set(((e.clientY - r.top) / r.height - 0.5) * -6)
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 6)
  }
  const onLeave = () => { rx.set(0); ry.set(0) }

  const inner = (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={rm ? {} : { y: -4, scale: 1.01 }}
      whileTap={rm ? {} : { y: 1, scale: 0.99 }}
      transition={SPRING}
      style={{
        ...(hasH && !rm ? { rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d' as const } : {}),
        borderRadius: radius,
        willChange: 'transform',
        ...cs(ckey), ...style,
      }}
      className={`overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  )
  return href ? <Link href={href} className="block">{inner}</Link> : inner
}

// ─── CTA button ───────────────────────────────────────────────────────────────
function Btn({ href, children, ckey = 'amberCTA' as CKey, size = 'md', className = '' }: {
  href: string; children: React.ReactNode; ckey?: CKey; size?: 'sm' | 'md' | 'lg'; className?: string
}) {
  const t  = C[ckey] as { bg: string; shadow: string; border: string; text: string }
  const rm = useReducedMotion()
  const pad = size === 'lg' ? 'px-8 py-4 text-base' : size === 'sm' ? 'px-4 py-2.5 text-xs' : 'px-6 py-3.5 text-sm'
  return (
    <motion.div whileHover={rm ? {} : { y: -3, scale: 1.03 }} whileTap={rm ? {} : { y: 3, scale: 0.98 }}
      transition={SPRING} className="inline-block">
      <Link href={href}
        className={`inline-flex items-center gap-2 rounded-full font-bold ${pad} ${className}`}
        style={{ background: t.bg, boxShadow: t.shadow, border: t.border, color: t.text }}>
        {children}
      </Link>
    </motion.div>
  )
}

// ─── Walk report card (hero right) ───────────────────────────────────────────
function WalkReportCard() {
  const rm = useReducedMotion()
  return (
    <motion.div
      initial={rm ? {} : { opacity: 0, y: 24, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.65, ease: EASE_EXP, delay: 0.2 }}
      style={{
        borderRadius: 28, width: '100%', maxWidth: 360,
        background: 'linear-gradient(155deg,#FFFDF5 0%,#FFF8E1 100%)',
        boxShadow: '0 8px 0 rgba(120,53,15,0.14),0 28px 72px rgba(0,0,0,0.18),inset 0 1.5px 0 rgba(255,255,255,0.95)',
        border: '1.5px solid rgba(253,230,138,0.7)',
        padding: 20,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#FF8C52,#F56B22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 3px 8px rgba(175,65,10,0.28)' }}>
            🐕
          </div>
          <div>
            <p className="font-bold text-base text-slate-900 leading-tight" style={{ fontFamily: 'var(--font-fredoka,sans-serif)' }}>
              Bruno&apos;s Walk
            </p>
            <p className="text-xs" style={{ color: '#92400E' }}>logged by Bruno's walker</p>
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg,#0A8A96,#087585)', borderRadius: 100, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#F0FDFA', display: 'flex', alignItems: 'center', gap: 3 }}>
          <Check size={9} strokeWidth={3} /> GPS verified
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {([
          { icon: <Timer size={12} strokeWidth={2} />, v: '32', s: 'MINS', bg: '#BBF7D0', fg: '#065F46' },
          { icon: <Ruler size={12} strokeWidth={2} />, v: '2.1', s: 'KM',   bg: '#BAE6FD', fg: '#075985' },
          { icon: <span style={{ fontSize: 12 }}>💩</span>, v: '1', s: 'POOP', bg: '#FED7AA', fg: '#9A3412' },
          { icon: <Droplets size={12} strokeWidth={2} />, v: '2', s: 'PEES',  bg: '#BAE6FD', fg: '#075985' },
        ] as const).map(({ icon, v, s, bg, fg }) => (
          <div key={s} style={{ background: bg, borderRadius: 13, padding: '7px 4px', textAlign: 'center', border: '1.5px solid rgba(255,255,255,0.9)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2, color: fg }}>{icon}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: fg, lineHeight: 1.1 }}>{v}</div>
            <div style={{ fontSize: 7.5, color: `${fg}99`, fontWeight: 700, letterSpacing: '0.05em' }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Animated GPS map */}
      <div className="mb-3">
        <p style={{ fontSize: 9, fontWeight: 700, color: '#0A8A96', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>
          Route · Juhu Beach Road
        </p>
        <WalkingDogMap />
        <div className="flex justify-between mt-1.5 px-0.5">
          <span style={{ fontSize: 9, color: '#0A8A96', fontWeight: 600 }}>Start: Home</span>
          <span style={{ fontSize: 9, color: '#F07030', fontWeight: 600 }}>End: Beach Rd</span>
        </div>
      </div>

      {/* Quote */}
      <div style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', borderRadius: 15, padding: '9px 12px', border: '1px solid rgba(253,230,138,0.8)' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#78350F', lineHeight: 1.45 }}>&ldquo;Now I actually know Bruno gets walked every single day.&rdquo;</p>
        <p style={{ fontSize: 10.5, color: '#92400E', marginTop: 2, opacity: 0.8 }}>— Bruno&apos;s mom, Juhu</p>
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-2.5">
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#25D366' }} />
        <span style={{ fontSize: 9.5, fontWeight: 700, color: '#064E3B' }}>Sent to WhatsApp</span>
      </div>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  countMap: Record<string, number>
  totalProviders: number
  neighbourhood?: string
}

export default function LandingPage({ countMap, neighbourhood = 'Juhu' }: Props) {
  const rm        = useReducedMotion()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (rm) return
    const id = setInterval(() => setStep(s => (s + 1) % 3), 2400)
    return () => clearInterval(id)
  }, [rm])

  // Only show dog-walking + grooming from directory
  const DISPLAY_CATS = CATEGORIES.filter(c => ['dog-walking', 'grooming', 'vet', 'dog-training'].includes(c.slug))

  const STEPS = [
    { Icon: Megaphone, title: 'Post your request', sub: '"Need a groomer this Sunday in Juhu, ₹500 budget"', ckey: 'amber' as CKey },
    { Icon: Bell,      title: 'Verified providers see it', sub: '3 nearby providers notified instantly',          ckey: 'peach' as CKey },
    { Icon: MessageCircle, title: 'They WhatsApp you', sub: 'Pick the best fit. Zero fees.',                    ckey: 'mint'  as CKey },
  ]

  return (
    <div style={{ background: C.pageBg }} className="-mt-8">
      <PawCursor />

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section style={{ ...BLEED, background: '#FFFBEB', position: 'relative', overflow: 'hidden' }}
        className="min-h-[100svh] flex flex-col justify-center">
        {/* Dot grid bg */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden
          style={{ backgroundImage: 'radial-gradient(circle,rgba(180,83,9,0.045) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
        {/* Spheres */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <motion.div style={{ position: 'absolute', top: -70, right: -55 }}
            animate={rm ? {} : { y: [0, -18, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
            <TealSphere size={300} />
          </motion.div>
          <motion.div style={{ position: 'absolute', bottom: -30, left: 80 }}
            animate={rm ? {} : { y: [0, -12, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}>
            <TealSphere size={160} />
          </motion.div>
          <motion.div style={{ position: 'absolute', top: '34%', left: '5%' }}
            animate={rm ? {} : { y: [0, -10, 0], rotate: [-18, -14, -18] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}>
            <Bone size={72} color="#F59E0B" opacity={0.5} />
          </motion.div>
          {/* Floating paw prints */}
          {([
            { top: '19%', left: '14%' as string | undefined, right: undefined as string | undefined, size: 22, rotate: -15, d: 0 },
            { top: '27%', left: '22%', right: undefined, size: 17, rotate: -10, d: 0.15 },
            { top: '23%', left: '30%', right: undefined, size: 20, rotate: -18, d: 0.3 },
            { top: '68%', left: undefined, right: '6%', size: 20, rotate: 20,  d: 0 },
            { top: '76%', left: undefined, right: '13%', size: 16, rotate: 15, d: 0.2 },
          ]).map(({ top, left, right, size, rotate, d }, i) => (
            <motion.div key={i} style={{ position: 'absolute', top, left, right, transform: `rotate(${rotate}deg)` }}
              animate={rm ? {} : { opacity: [0.28, 0.5, 0.28] }}
              transition={{ duration: 3.2 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: d }}>
              <Paw size={size} color="#F07030" opacity={1} />
            </motion.div>
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-20 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Text */}
            <div className="flex-1 text-center lg:text-left w-full">
              <motion.div
                initial={rm ? {} : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, ease: EASE_EXP }}>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase px-4 py-1.5 mb-6"
                  style={{ ...cs('amber'), borderRadius: 100, color: C.amber.text }}>
                  <MapPin size={11} strokeWidth={2.5} /> {neighbourhood}, Mumbai · For pet parents
                </span>
              </motion.div>

              <motion.h1
                initial={rm ? {} : { opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: EASE_EXP, delay: 0.07 }}
                className="font-display text-slate-900 mb-5"
                style={{ fontSize: 'clamp(2.4rem,6vw,4.8rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                Your dog gets walked.<br />
                <span style={{ color: '#F07030' }}>Now prove it.</span>
              </motion.h1>

              <motion.p
                initial={rm ? {} : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE_EXP, delay: 0.16 }}
                className="text-lg sm:text-xl text-slate-500 mb-8 max-w-lg mx-auto lg:mx-0"
                style={{ lineHeight: 1.65 }}>
                Share PupStep with whoever walks your dog. After every walk, they log it in 60 seconds — GPS, photos, poop count. A care report lands in your WhatsApp.
              </motion.p>

              <motion.div
                initial={rm ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_EXP, delay: 0.24 }}
                className="flex flex-wrap gap-3 justify-center lg:justify-start mb-6">
                <Btn href="/setup" size="lg">Set up your dog <ArrowRight size={15} /></Btn>
                <motion.div whileHover={rm ? {} : { y: -3, scale: 1.03 }} whileTap={rm ? {} : { y: 3, scale: 0.98 }}
                  transition={SPRING} className="inline-block">
                  <Link href="/dog-walking"
                    className="inline-flex items-center gap-2 rounded-full font-bold px-6 py-3.5 text-sm"
                    style={{ background: 'transparent', border: '2px solid rgba(180,83,9,0.22)', color: '#78350F' }}>
                    Find a verified walker <Navigation size={13} />
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div
                initial={rm ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.38 }}
                className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {([
                  { Icon: Check,      label: 'Setup in 2 minutes', ckey: 'white' as CKey },
                  { Icon: Navigation, label: 'Every walk GPS tracked', ckey: 'amber' as CKey },
                  { Icon: IndianRupee, label: 'Zero fees forever', ckey: 'mint' as CKey },
                ] as const).map(({ Icon, label, ckey }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2"
                    style={{ ...cs(ckey), borderRadius: 100, color: (C[ckey] as { text: string }).text }}>
                    <Icon size={11} strokeWidth={2.5} /> {label}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Dog photos + Walk report card */}
            <div className="flex-shrink-0 w-full max-w-sm flex flex-col">
              <DogPhotoStrip rm={rm} />
              <div className="flex justify-center lg:justify-end">
                <WalkReportCard />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2" aria-hidden>
          <motion.div animate={rm ? {} : { y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-6 h-9 rounded-full flex justify-center pt-2"
            style={{ border: '2px solid rgba(180,83,9,0.2)', background: 'rgba(253,230,138,0.32)' }}>
            <div className="w-1 h-2 rounded-full bg-amber-400" />
          </motion.div>
        </div>
      </section>

      {/* ══ HOW IT WORKS — zigzag editorial (no identical cards) ═══════════════ */}
      <section style={{ ...BLEED, background: 'linear-gradient(120deg,#FEF9ED 0%,#FEF3C7 55%,#FEF9ED 100%)', borderTop: '1.5px solid rgba(253,230,138,0.9)', borderBottom: '1.5px solid rgba(253,230,138,0.9)' }}
        className="py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <FadeUp className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#F07030' }}>3 steps, 60 seconds</p>
            <h2 className="font-display text-slate-900 mb-3" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)' }}>How PupStep works</h2>
            <p className="text-slate-500 text-base max-w-xs mx-auto">Give it to whoever walks your dog. They log. You know.</p>
          </FadeUp>

          <div className="flex flex-col gap-5 sm:gap-6">
            {/* Step 01 — white, icon left, large watermark */}
            <FadeUp delay={0.04}>
              <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-10 p-7 sm:p-10 overflow-hidden"
                style={{ borderRadius: 28, ...cs('white') }}>
                <div className="absolute -left-3 -top-3 font-display font-black select-none pointer-events-none"
                  style={{ fontSize: 'clamp(70px,14vw,140px)', color: '#0F172A', opacity: 0.03, lineHeight: 1 }}>01</div>
                <div className="flex-shrink-0 relative z-10 flex flex-col items-center gap-3 sm:gap-4">
                  <div style={{ width: 68, height: 68, borderRadius: 20, background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', boxShadow: '0 4px 16px rgba(180,83,9,0.15)', border: '2px solid rgba(253,230,138,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Search size={30} style={{ color: '#78350F' }} strokeWidth={1.8} />
                  </div>
                </div>
                <div className="relative z-10 text-center sm:text-left flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#F07030' }}>Step 01</p>
                  <h3 className="font-bold text-xl sm:text-2xl text-slate-900 mb-2 font-display">Share the app with your walker</h3>
                  <p className="text-slate-500 text-base max-w-lg leading-relaxed">
                    Send your dog walker a PupStep link. They scan the QR, enter the 4-digit code, and they&apos;re linked to your dog in under 2 minutes. No app download needed.
                  </p>
                </div>
              </div>
            </FadeUp>

            {/* Step 02 — amber, icon RIGHT (reversed), tags inside */}
            <FadeUp delay={0.08}>
              <div className="relative flex flex-col sm:flex-row-reverse items-center gap-6 sm:gap-10 p-7 sm:p-10 overflow-hidden"
                style={{ borderRadius: 28, ...cs('amber') }}>
                <div className="absolute -right-3 -top-3 font-display font-black select-none pointer-events-none"
                  style={{ fontSize: 'clamp(70px,14vw,140px)', color: '#78350F', opacity: 0.04, lineHeight: 1 }}>02</div>
                <div className="flex-shrink-0 relative z-10">
                  <div style={{ width: 68, height: 68, borderRadius: 20, background: 'rgba(255,255,255,0.55)', boxShadow: '0 4px 16px rgba(180,83,9,0.12)', border: '1.5px solid rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ClipboardList size={30} style={{ color: '#78350F' }} strokeWidth={1.8} />
                  </div>
                </div>
                <div className="flex-1 relative z-10 text-center sm:text-left">
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#92400E', opacity: 0.75 }}>Step 02</p>
                  <h3 className="font-bold text-xl sm:text-2xl text-amber-950 mb-2 font-display">They log every walk in 60 sec</h3>
                  <p className="text-amber-900 text-base max-w-lg leading-relaxed mb-4" style={{ opacity: 0.8 }}>
                    After the walk, your walker taps a few things. All GPS verified. No faking it.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {['📍 GPS route', '📸 Photo', '💩 Count', '😊 Mood'].map(t => (
                      <span key={t} style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 100, padding: '4px 11px', fontSize: 11.5, fontWeight: 600, color: '#78350F', border: '1px solid rgba(255,255,255,0.8)' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* Step 03 — dark teal, icon left, WhatsApp bubble */}
            <FadeUp delay={0.12}>
              <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-10 p-7 sm:p-10 overflow-hidden"
                style={{ borderRadius: 28, ...cs('teal') }}>
                <div className="absolute -left-3 -top-3 font-display font-black select-none pointer-events-none"
                  style={{ fontSize: 'clamp(70px,14vw,140px)', color: 'white', opacity: 0.03, lineHeight: 1 }}>03</div>
                <div className="flex-shrink-0 relative z-10 flex flex-col items-center gap-3">
                  <div style={{ width: 68, height: 68, borderRadius: 20, background: 'rgba(255,255,255,0.09)', border: '1.5px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageCircle size={30} style={{ color: '#17C8CC' }} strokeWidth={1.8} />
                  </div>
                  {/* WhatsApp bubble */}
                  <div style={{ background: '#25D366', borderRadius: '11px 11px 3px 11px', padding: '6px 10px', maxWidth: 130 }}>
                    <p style={{ fontSize: 10, color: 'white', fontWeight: 700, lineHeight: 1.4 }}>Bruno&apos;s Walk Report</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>2.1km · 32 mins · 1💩</p>
                  </div>
                </div>
                <div className="flex-1 relative z-10 text-center sm:text-left">
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#17C8CC', opacity: 0.85 }}>Step 03</p>
                  <h3 className="font-bold text-xl sm:text-2xl text-white mb-2 font-display">Report lands in your WhatsApp</h3>
                  <p className="text-stone-400 text-base max-w-lg leading-relaxed">
                    GPS map, stats, photos — straight to your WhatsApp the moment the walk ends. Saved forever to Bruno&apos;s health history.
                  </p>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══ GPS SECTION (dark teal, walking dog) ═══════════════════════════════ */}
      <section style={{ ...BLEED, background: 'linear-gradient(135deg,#0A2F35 0%,#0D3D45 50%,#0A2F35 100%)', position: 'relative', overflow: 'hidden' }}
        className="py-14 sm:py-20">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <motion.div style={{ position: 'absolute', top: -40, right: -30, opacity: 0.07 }}
            animate={rm ? {} : { y: [0,-15,0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}>
            <TealSphere size={300} />
          </motion.div>
        </div>
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <FadeUp className="flex-1 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 mb-6 uppercase tracking-wider"
                style={{ ...cs('amber'), borderRadius: 100, color: C.amber.text }}>
                <Sparkles size={11} /> GPS Tracking
              </span>
              <h2 className="font-display text-white leading-tight mb-5" style={{ fontSize: 'clamp(1.9rem,4.5vw,3.4rem)', lineHeight: 1.1 }}>
                See exactly<br /><span style={{ color: '#FF8C52' }}>where they went.</span>
              </h2>
              <p className="text-stone-400 text-base sm:text-lg mb-8 max-w-md mx-auto lg:mx-0" style={{ lineHeight: 1.7 }}>
                Every walk is GPS tracked. You see the exact route your dog walker took — right in the care report.
              </p>
              {[
                { Icon: Navigation,    text: 'Full GPS route, saved to your account' },
                { Icon: Timer,         text: 'Duration, distance, pace — all tracked' },
                { Icon: ClipboardList, text: 'Health history your vet will actually use' },
              ].map(({ Icon, text }) => (
                <div key={text} className="flex items-center gap-3 mb-3 justify-center lg:justify-start">
                  <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(253,230,138,0.1)', border: '1px solid rgba(253,230,138,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} style={{ color: '#FDE68A' }} strokeWidth={1.8} />
                  </span>
                  <span className="text-sm text-stone-300 font-medium">{text}</span>
                </div>
              ))}
              <div className="mt-7">
                <Btn href="/setup" ckey="amberCTA" size="lg">Set up my dog <ArrowRight size={15} /></Btn>
              </div>
            </FadeUp>

            {/* GPS card with animated dog */}
            <FadeUp delay={0.14} className="flex-shrink-0 w-full max-w-sm flex justify-center lg:justify-end">
              <div style={{ borderRadius: 28, background: 'linear-gradient(155deg,#0D3D45 0%,#0A2F35 100%)', boxShadow: '0 8px 0 rgba(5,40,48,0.5),0 24px 64px rgba(0,0,0,0.32),inset 0 1.5px 0 rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.1)', padding: 20, width: '100%', maxWidth: 340 }}>
                <p style={{ fontSize: 9.5, fontWeight: 700, color: '#17C8CC', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Live walk · Juhu Beach Road
                </p>
                <WalkingDogMap dark />
                <div className="flex items-center justify-between mt-3 px-0.5">
                  {[
                    { Icon: Timer,      v: '32 mins', fg: '#BBF7D0' },
                    { Icon: Ruler,      v: '2.1 km',  fg: '#BAE6FD' },
                    { Icon: Navigation, v: 'GPS on',  fg: '#FDE68A' },
                  ].map(({ Icon, v, fg }) => (
                    <div key={v} className="flex items-center gap-1">
                      <Icon size={10} style={{ color: fg }} />
                      <span style={{ fontSize: 10, color: fg, fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
                {/* Live pulse */}
                <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <motion.div
                    animate={rm ? {} : { opacity: [1, 0.3, 1], scale: [1, 1.25, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ width: 7, height: 7, borderRadius: '50%', background: '#25D366', flexShrink: 0 }} />
                  <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Bruno is out right now · 18 mins in</span>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══ CATEGORIES — bento with varied heights ══════════════════════════════ */}
      <section style={{ ...BLEED, background: 'white' }} className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <FadeUp className="mb-9">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#F07030' }}>What does your pup need?</p>
                <h2 className="font-display text-slate-900" style={{ fontSize: 'clamp(1.7rem,4vw,2.6rem)', lineHeight: 1.12 }}>Find the right care near {neighbourhood}</h2>
              </div>
            </div>
          </FadeUp>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Directory cards — 4 photo categories */}
            {DISPLAY_CATS.map((cat, i) => {
              const ck      = (CAT_CLAY[cat.slug] ?? 'white') as CKey
              const photo   = CAT_PHOTO[cat.slug]
              const pos     = CAT_POS[cat.slug] ?? 'center 30%'
              const count   = countMap[cat.slug]
              const t       = C[ck] as { bg: string; shadow: string; border: string; text: string }
              const heights = ['clamp(185px,26vw,260px)', 'clamp(165px,22vw,230px)', 'clamp(175px,24vw,245px)', 'clamp(155px,20vw,215px)']
              return (
                <FadeUp key={cat.slug} delay={i * 0.06} className="lg:col-span-2 md:col-span-1">
                  <Link href={`/${cat.slug}`} className="block group">
                    <motion.div
                      whileHover={rm ? {} : { y: -5, scale: 1.01 }}
                      whileTap={rm ? {} : { y: 2, scale: 0.99 }}
                      transition={SPRING}
                      style={{ borderRadius: 20, overflow: 'hidden', boxShadow: t.shadow, border: t.border, height: heights[i] ?? heights[0] }}
                      className="flex flex-col">
                      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt={`${cat.name} in ${neighbourhood}`} loading="lazy" decoding="async"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, transition: 'transform 0.5s ease', display: 'block' }}
                          className="group-hover:scale-105" />
                        <div style={{ position: 'absolute', inset: 0, background: t.bg, opacity: 0.12, mixBlendMode: 'multiply', pointerEvents: 'none' }} aria-hidden />
                        {count ? (
                          <div style={{ position: 'absolute', top: 9, right: 9, background: 'rgba(255,255,255,0.95)', borderRadius: 100, padding: '3px 9px', fontSize: 10, fontWeight: 700, color: t.text, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                            {count} nearby
                          </div>
                        ) : null}
                      </div>
                      <div style={{ background: t.bg, padding: '11px 14px 14px' }}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg leading-none">{cat.icon}</span>
                            <p className="font-bold text-sm leading-tight" style={{ color: t.text }}>{cat.name}</p>
                          </div>
                          <motion.span className="font-bold text-base flex-shrink-0" style={{ color: t.text }}
                            animate={rm ? {} : { x: [0, 3, 0] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}>
                            →
                          </motion.span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </FadeUp>
              )
            })}

            {/* Feature card 1 — Care Reports (QR walker system) */}
            <FadeUp delay={0.12} className="lg:col-span-3 md:col-span-1">
              <Link href="/setup" className="block group">
                <motion.div
                  whileHover={rm ? {} : { y: -5, scale: 1.01 }}
                  whileTap={rm ? {} : { y: 2, scale: 0.99 }}
                  transition={SPRING}
                  className="flex flex-col justify-between"
                  style={{ borderRadius: 20, overflow: 'hidden', height: 'clamp(195px,30vw,275px)', ...cs('teal') }}>
                  <div className="p-5 flex flex-col justify-between h-full">
                    <div>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(23,200,204,0.12)', border: '1.5px solid rgba(23,200,204,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <ClipboardList size={20} style={{ color: '#17C8CC' }} strokeWidth={1.6} />
                      </div>
                      <p className="font-bold text-sm text-white leading-snug mb-1">Daily Care Reports</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Your walker logs every walk. You see it all.
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="text-xs font-bold" style={{ color: '#17C8CC' }}>Set up free →</span>
                      <span style={{ fontSize: 20 }}>📋</span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </FadeUp>

            {/* Feature card 2 — Post a broadcast request */}
            <FadeUp delay={0.18} className="lg:col-span-3 md:col-span-2">
              <Link href="/broadcast" className="block group">
                <motion.div
                  whileHover={rm ? {} : { y: -5, scale: 1.01 }}
                  whileTap={rm ? {} : { y: 2, scale: 0.99 }}
                  transition={SPRING}
                  className="flex flex-col justify-between"
                  style={{ borderRadius: 20, overflow: 'hidden', height: 'clamp(165px,26vw,235px)', ...cs('peach') }}>
                  <div className="p-5 flex flex-col justify-between h-full">
                    <div>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.5)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <Megaphone size={20} style={{ color: '#7C2D12' }} strokeWidth={1.6} />
                      </div>
                      <p className="font-bold text-sm leading-snug mb-1" style={{ color: '#7C2D12' }}>Post a Request</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(124,45,18,0.65)' }}>
                        Need a groomer this Sunday? Tell the neighbourhood.
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.4)' }}>
                      <span className="text-xs font-bold" style={{ color: '#C2410C' }}>Post now →</span>
                      <span style={{ fontSize: 20 }}>📢</span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </FadeUp>
          </div>

          <FadeUp delay={0.26} className="mt-9 flex items-center justify-center gap-3 flex-wrap">
            <p className="text-sm text-slate-400">Can&apos;t find what you need?</p>
            <Btn href="/broadcast" ckey="amber"><Megaphone size={13} /> Post a request</Btn>
          </FadeUp>
        </div>
      </section>

      {/* ══ TESTIMONIALS — 3 genuinely different cards ══════════════════════════ */}
      <section style={{ ...BLEED, background: C.pageBg }} className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <FadeUp className="text-center mb-9">
            <h2 className="font-display text-slate-900" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)' }}>Pet parents love it</h2>
            <p className="text-slate-400 text-sm mt-2">Real pet parents using PupStep in {neighbourhood}</p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 items-start">
            {/* Card 1 — large portrait, huge quote mark, prominent */}
            <FadeUp delay={0}>
              <div className="p-7 sm:p-8 flex flex-col" style={{ borderRadius: 28, ...cs('white') }}>
                <div className="mb-3" style={{ fontSize: 60, lineHeight: 0.8, color: '#F07030', opacity: 0.16, fontFamily: 'Georgia,serif', fontWeight: 900 }}>&ldquo;</div>
                <p className="text-base sm:text-lg font-medium text-slate-700 flex-1 leading-relaxed mb-5">
                  Finally know Bruno is actually getting walked every morning. The GPS map shows exactly which streets they took.
                </p>
                <div className="flex mb-3">{Array(5).fill(0).map((_,j) => <Star key={j} size={13} fill="#F59E0B" color="#F59E0B" />)}</div>
                <div className="flex items-center gap-3 pt-3.5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 2px 6px rgba(180,83,9,0.12)' }}>🐕</div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">Bruno&apos;s mom</p>
                    <p className="text-xs text-slate-400">Juhu, Mumbai</p>
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* Cards 2a + 2b — stacked compact, different colors */}
            <FadeUp delay={0.07} className="flex flex-col gap-4">
              {/* 2a amber */}
              <div className="p-5" style={{ borderRadius: 22, ...cs('amber') }}>
                <div className="flex mb-2">{Array(5).fill(0).map((_,j) => <Star key={j} size={11} fill="#92400E" color="#92400E" />)}</div>
                <p className="text-sm font-medium text-amber-900 leading-relaxed mb-4" style={{ opacity: 0.88 }}>
                  &ldquo;GPS tracking is incredible. And zero booking fees! Can&apos;t believe this is actually free.&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🐶</div>
                  <div>
                    <p className="font-bold text-xs text-amber-950">Kairo&apos;s dad</p>
                    <p className="text-xs text-amber-700 opacity-70">Versova, Mumbai</p>
                  </div>
                </div>
              </div>
              {/* 2b mint */}
              <div className="p-5" style={{ borderRadius: 22, ...cs('mint') }}>
                <p className="text-sm font-medium text-emerald-800 leading-relaxed mb-3" style={{ opacity: 0.9 }}>
                  &ldquo;My vet asked me to keep sending the poop logs. The health history feature is a game-changer.&rdquo;
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-emerald-900">Bella&apos;s mom</p>
                    <p className="text-xs text-emerald-700 opacity-65">Santacruz West</p>
                  </div>
                  <div className="flex">{Array(5).fill(0).map((_,j) => <Star key={j} size={10} fill="#065F46" color="#065F46" />)}</div>
                </div>
              </div>
            </FadeUp>

            {/* Card 3 — sky, centered, big dog emoji, different energy */}
            <FadeUp delay={0.13}>
              <div className="p-6 flex flex-col items-center text-center" style={{ borderRadius: 28, ...cs('sky') }}>
                <div className="text-5xl mb-4" style={{ filter: 'drop-shadow(0 4px 12px rgba(8,145,178,0.22))' }}>🐕‍🦺</div>
                <div className="flex mb-3">{Array(5).fill(0).map((_,j) => <Star key={j} size={12} fill="#075985" color="#075985" />)}</div>
                <p className="text-sm font-medium text-sky-900 leading-relaxed mb-4" style={{ opacity: 0.87 }}>
                  &ldquo;Simba&apos;s walker logs every walk now. The photo every day is proof enough for me.&rdquo;
                </p>
                <p className="font-bold text-xs text-sky-900">Simba&apos;s family</p>
                <p className="text-xs text-sky-700 mt-0.5 opacity-65">Andheri West</p>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══ WHY PUPSTEP — asymmetric bento, NOT identical cards ═════════════════ */}
      <section style={{ ...BLEED, background: 'white' }} className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <FadeUp className="text-center mb-9">
            <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: '#F07030' }}>Why pet parents choose us</p>
            <h2 className="font-display text-slate-900" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)' }}>What makes PupStep different</h2>
          </FadeUp>

          {/* Bento: 3+2 / 2+3 rows — never identical */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Featured — dark teal, 3 cols, tall */}
            <FadeUp className="lg:col-span-3">
              <div className="p-7 sm:p-9 flex flex-col justify-between min-h-[240px]"
                style={{ borderRadius: 28, ...cs('teal') }}>
                <div>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(23,200,204,0.12)', border: '1.5px solid rgba(23,200,204,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                    <ClipboardList size={24} style={{ color: '#17C8CC' }} strokeWidth={1.6} />
                  </div>
                  <h3 className="font-display text-white text-2xl sm:text-3xl mb-3">Care reports after every walk</h3>
                  <p className="text-stone-400 text-base leading-relaxed max-w-sm">
                    GPS map, time, distance, poop and pee count, a photo, mood — all in one WhatsApp message. Your vet will want to see this.
                  </p>
                </div>
                <div className="mt-6">
                  <Btn href="/setup" ckey="tealCTA">Get started free <ArrowRight size={14} /></Btn>
                </div>
              </div>
            </FadeUp>

            {/* Verified — amber, 2 cols */}
            <FadeUp delay={0.06} className="lg:col-span-2">
              <div className="p-6 flex flex-col justify-between min-h-[200px]" style={{ borderRadius: 28, ...cs('amber') }}>
                <div style={{ width: 48, height: 48, borderRadius: 15, background: 'rgba(255,255,255,0.55)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <ShieldCheck size={21} style={{ color: '#78350F' }} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="font-bold text-amber-950 text-lg mb-2">Manually verified</h3>
                  <p className="text-amber-900 text-sm leading-relaxed opacity-80">Every provider listing reviewed by our team. If they&apos;re listed, we&apos;d trust them with our own dog.</p>
                </div>
              </div>
            </FadeUp>

            {/* WhatsApp — mint, 2 cols */}
            <FadeUp delay={0.08} className="lg:col-span-2">
              <div className="p-6 flex flex-col justify-between min-h-[200px]" style={{ borderRadius: 28, ...cs('mint') }}>
                <div style={{ width: 48, height: 48, borderRadius: 15, background: 'rgba(255,255,255,0.55)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <MessageCircle size={21} style={{ color: '#064E3B' }} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-950 text-lg mb-2">WhatsApp native</h3>
                  <p className="text-emerald-900 text-sm leading-relaxed opacity-80">Mumbai runs on WhatsApp. Care reports land there directly. No extra app to check.</p>
                </div>
              </div>
            </FadeUp>

            {/* Zero fees — lavender, 3 cols, wide horizontal */}
            <FadeUp delay={0.1} className="lg:col-span-3">
              <div className="p-6 sm:p-7 flex items-center gap-6" style={{ borderRadius: 28, ...cs('lavender') }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.55)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IndianRupee size={24} style={{ color: '#4C1D95' }} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="font-bold text-violet-950 text-lg mb-1.5">Zero fees, always</h3>
                  <p className="text-violet-900 text-sm leading-relaxed opacity-80 max-w-sm">No subscription, no booking fee, no commission. PupStep is free forever for pet parents.</p>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══ BROADCAST ═══════════════════════════════════════════════════════════ */}
      <section style={{ ...BLEED, background: 'linear-gradient(135deg,#0D3528 0%,#1A5C42 50%,#0D3528 100%)', position: 'relative', overflow: 'hidden' }}
        className="py-12 sm:py-16">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div style={{ position: 'absolute', top: -80, right: -60, width: 420, height: 420, borderRadius: '50%', background: '#F07030', opacity: 0.055 }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            <FadeUp className="flex-1 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 mb-6 uppercase tracking-wider"
                style={{ ...cs('amber'), borderRadius: 100, color: C.amber.text }}>
                <Sparkles size={11} /> Pet Broadcast · bonus feature
              </span>
              <h2 className="font-display text-white leading-tight mb-4" style={{ fontSize: 'clamp(1.9rem,4.5vw,3.4rem)' }}>
                Need a new walker or groomer?<br /><span style={{ color: '#FF8C52' }}>Just post it.</span>
              </h2>
              <p className="text-stone-400 text-base sm:text-lg mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed">
                Post your request once. Verified providers nearby reply directly on WhatsApp. No middleman, no fees.
              </p>
              <Btn href="/broadcast" size="lg"><Megaphone size={15} /> Post a Request — Free</Btn>
            </FadeUp>

            {/* Animated step cards */}
            <div className="flex-shrink-0 w-full max-w-sm space-y-3">
              {STEPS.map((s, i) => (
                <motion.div key={i}
                  animate={rm ? {} : { scale: step === i ? 1.03 : 1, opacity: step === i ? 1 : 0.42 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{ ...cs(s.ckey), outline: !rm && step === i ? '2px solid rgba(255,255,255,0.16)' : 'none' }}
                  className="flex items-start gap-4 p-4 rounded-[20px]"
                >
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <s.Icon size={17} style={{ color: (C[s.ckey] as { text: string }).text }} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: (C[s.ckey] as { text: string }).text }}>{s.title}</p>
                    <p className="text-xs mt-0.5 opacity-70" style={{ color: (C[s.ckey] as { text: string }).text }}>{s.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ PROVIDER CTA ════════════════════════════════════════════════════════ */}
      <section style={{ ...BLEED, background: 'linear-gradient(135deg,#0A2F35 0%,#0D3D45 100%)', position: 'relative', overflow: 'hidden' }}
        className="py-14 sm:py-20">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <motion.div style={{ position: 'absolute', top: -60, left: -60, opacity: 0.07 }}
            animate={rm ? {} : { y: [0,-12,0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
            <TealSphere size={240} />
          </motion.div>
        </div>
        <FadeUp className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 mb-6 uppercase tracking-wider"
            style={{ ...cs('amber'), borderRadius: 100, color: C.amber.text }}>
            <Users size={11} /> For walkers and groomers
          </span>
          <h2 className="font-display text-white leading-tight mb-5" style={{ fontSize: 'clamp(1.9rem,4.5vw,3.4rem)' }}>
            Are you a walker or groomer<br /><span style={{ color: '#FF8C52' }}>in {neighbourhood}?</span>
          </h2>
          <p className="text-stone-400 text-base sm:text-lg mb-8 max-w-lg mx-auto leading-relaxed">
            Get listed free. Send care reports after every session. Build trust with clients, get more work — no fees, ever.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Btn href="/join" ckey="amberCTA" size="lg">Get listed free <ArrowRight size={15} /></Btn>
            <motion.div whileHover={rm ? {} : { y: -3, scale: 1.03 }} whileTap={rm ? {} : { y: 3, scale: 0.98 }}
              transition={SPRING} className="inline-block">
              <Link href="/broadcast"
                className="inline-flex items-center gap-2 rounded-full font-bold px-8 py-4 text-base"
                style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.82)' }}>
                <Megaphone size={15} /> Browse requests
              </Link>
            </motion.div>
          </div>
        </FadeUp>
      </section>

      {/* ══ MAP TEASER ═══════════════════════════════════════════════════════════ */}
      <section style={{ ...BLEED, background: 'white' }} className="py-5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <ClayCard ckey="white" href="/map" className="p-5 sm:p-7">
            <div className="flex items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <motion.div animate={rm ? {} : { rotate: [0, 8, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ width: 46, height: 46, borderRadius: 14, background: '#E0F2FE', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Navigation size={20} style={{ color: '#075985' }} strokeWidth={1.8} />
                </motion.div>
                <div>
                  <p className="font-bold text-slate-800 text-sm sm:text-base">See everything on one map</p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">All vets, groomers, and walkers near you</p>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-300 hidden sm:flex items-center gap-1 flex-shrink-0">
                Open map <ArrowRight size={13} />
              </span>
            </div>
          </ClayCard>
        </div>
      </section>

      {/* ══ FOOTER TRUST LINE ════════════════════════════════════════════════════ */}
      <section style={{ ...BLEED, background: 'white', borderTop: '1px solid #FDE68A' }}
        className="py-5 pb-28 lg:pb-5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
          <LucidePaw size={16} style={{ color: '#F07030', opacity: 0.45 }} />
          <p className="text-xs sm:text-sm text-slate-400">
            Mumbai&apos;s most trusted hyperlocal pet services directory. Every listing manually verified by our team.
          </p>
        </div>
      </section>

      {/* ══ MOBILE STICKY BAR ════════════════════════════════════════════════════ */}
      <motion.div
        initial={rm ? {} : { y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE_EXP, delay: 1.6 }}
        className="lg:hidden fixed bottom-0 inset-x-0 z-50"
        style={{ background: 'rgba(255,251,235,0.97)', borderTop: '1px solid #FDE68A', paddingBottom: 'env(safe-area-inset-bottom,12px)' }}>
        <div className="flex gap-3 px-4 pt-3 pb-3">
          <Link href="/setup"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold"
            style={{ background: 'linear-gradient(155deg,#FF8C52 0%,#F56B22 100%)', boxShadow: '0 4px 0 rgba(175,65,10,0.30),0 8px 20px rgba(245,107,34,0.32)', color: '#451A03' }}>
            Set up my dog
          </Link>
          <Link href="/broadcast"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold"
            style={{ background: 'linear-gradient(155deg,#FFEDD5 0%,#FED7AA 100%)', boxShadow: '0 4px 0 rgba(194,65,12,0.12)', color: '#7C2D12' }}>
            <Megaphone size={14} /> Post Request
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
