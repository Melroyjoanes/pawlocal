'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  motion, useMotionValue, useSpring, useInView,
} from 'framer-motion'
import {
  MapPin, Check, Timer, Ruler, Navigation,
  Droplets, ArrowRight, ChevronDown,
  PawPrint as LucidePaw,
} from 'lucide-react'

// ─── Design tokens ────────────────────────────────────────────────────────────
const EASE_EXP  = [0.16, 1, 0.3, 1] as const
const SPRING    = { type: 'spring', duration: 0.45, bounce: 0 } as const

// ─── Hooks ────────────────────────────────────────────────────────────────────
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

function useHasHover() {
  const [v, setV] = useState(false)
  useEffect(() => setV(window.matchMedia('(hover:hover) and (pointer:fine)').matches), [])
  return v
}

// ─── Color system ─────────────────────────────────────────────────────────────
const C = {
  pageBg: '#FFFBEB',
  teal: 'oklch(0.48 0.17 196)',
  orange: '#FF8C52',
  dark: '#0A2F35',
  white: '#FFFFFF',
}

const BLEED: React.CSSProperties = {
  width: '100vw',
  marginLeft: 'calc(50% - 50vw)',
  marginRight: 'calc(50% - 50vw)',
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

// ─── Teal sphere decorative ───────────────────────────────────────────────────
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
const ROUTE: Array<[number, number]> = [
  [14,74],[36,66],[58,56],[80,46],[104,38],[126,34],
  [150,38],[174,30],[198,26],[222,32],[246,40],[272,46],[280,48],
]
const ROUTE_PATH = ROUTE.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')

function WalkingDogMap({ dark = false }: { dark?: boolean }) {
  const reduced = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const inView = useInView(containerRef)
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
    if (reduced || !inView) return
    const id = setInterval(tick, 620)
    return () => clearInterval(id)
  }, [reduced, inView, tick])

  const bg       = dark ? 'rgba(255,255,255,0.03)' : '#E6F7F8'
  const border   = dark ? '1px solid rgba(255,255,255,0.09)' : '1.5px solid rgba(10,138,150,0.18)'
  const routeClr = dark ? 'rgba(23,200,204,0.85)' : '#0A8A96'
  const grid     = dark ? 'rgba(255,255,255,0.05)' : 'rgba(10,138,150,0.07)'

  return (
    <div ref={containerRef} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: bg, border }}>
      <svg viewBox="0 0 294 100" xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 100, display: 'block' }} aria-hidden>
        <line x1="0" y1="50" x2="294" y2="50" stroke={grid} strokeWidth="10" />
        {[75, 150, 225].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="100" stroke={grid} strokeWidth="8" />
        ))}
        <path d={ROUTE_PATH} stroke={routeClr} strokeWidth="2" strokeDasharray="5 3" opacity="0.25" strokeLinecap="round" fill="none" />
        <path d={ROUTE_PATH} stroke={routeClr} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx={ROUTE[0][0]} cy={ROUTE[0][1]} r="5.5" fill={routeClr} />
        <circle cx="150" cy="38" r="8.5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
        <text x="150" y="41.5" textAnchor="middle" fontSize="9">💩</text>
        <circle cx="108" cy="38" r="7" fill="#EFF6FF" stroke="#BAE6FD" strokeWidth="1.5" />
        <text x="108" y="41.5" textAnchor="middle" fontSize="8">💧</text>
        <circle cx={ROUTE[ROUTE.length-1][0]} cy={ROUTE[ROUTE.length-1][1]} r="5.5" fill="#F07030" />
      </svg>
      {!reduced && (
        <motion.span
          aria-hidden
          style={{
            position: 'absolute', top: 0, left: 0,
            x: sDX, y: sDY,
            fontSize: 18, lineHeight: 1,
            filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.22))',
            pointerEvents: 'none',
            scaleX: dir,
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

// ─── Walk report card (hero right) ───────────────────────────────────────────
function WalkReportCard() {
  const rm = useReducedMotion()
  return (
    <motion.div
      initial={rm ? {} : { opacity: 0, y: 24, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.65, ease: EASE_EXP, delay: 0.2 }}
      style={{
        borderRadius: 28, width: '100%', maxWidth: 420,
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
            <p className="text-xs" style={{ color: '#92400E' }}>logged by Bruno&apos;s walker</p>
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

// ─── FAQ Accordion ────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'Does the walker need to download an app?',
    a: 'No. They open a link on WhatsApp. No App Store, no signup.',
  },
  {
    q: 'How does the walker connect?',
    a: 'You share a QR code or WhatsApp link. They enter a 4-digit code you show them. Done.',
  },
  {
    q: 'What happens after my free trial?',
    a: 'Reports from the last 3 days stay visible. Older history is locked until you upgrade for ₹249/month.',
  },
  {
    q: 'Who pays?',
    a: 'You (the dog parent) pay for the subscription. Your walker uses PupStep for free.',
  },
]

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const rm = useReducedMotion()
  return (
    <div style={{ borderBottom: '1px solid rgba(10,47,53,0.08)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-5 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-base" style={{ color: C.dark, fontFamily: 'var(--font-nunito,sans-serif)' }}>{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={rm ? {} : SPRING}
          className="flex-shrink-0 ml-4"
        >
          <ChevronDown size={18} style={{ color: C.teal }} />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={rm ? {} : { ...SPRING }}
        style={{ overflow: 'hidden' }}
      >
        <p className="pb-5 text-sm leading-relaxed" style={{ color: '#4A5568', fontFamily: 'var(--font-nunito,sans-serif)' }}>{a}</p>
      </motion.div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const rm = useReducedMotion()
  const heroRef = useRef<HTMLElement>(null)
  const heroInView = useInView(heroRef)

  return (
    <div style={{ background: C.pageBg }} className="-mt-8">
      <PawCursor />

      {/* ══ SECTION 1: HERO ═══════════════════════════════════════════════════ */}
      <section
        id="hero"
        ref={heroRef}
        style={{ ...BLEED, background: '#FFFBEB', position: 'relative', overflow: 'hidden' }}
        className="min-h-[100svh] flex flex-col justify-center"
      >
        {/* Dot grid bg */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden
          style={{ backgroundImage: 'radial-gradient(circle,rgba(180,83,9,0.045) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />

        {/* Decorative spheres */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <motion.div style={{ position: 'absolute', top: -70, right: -55 }}
            animate={rm || !heroInView ? {} : { y: [0, -18, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
            <TealSphere size={300} />
          </motion.div>
          <motion.div style={{ position: 'absolute', bottom: -30, left: 80 }}
            animate={rm || !heroInView ? {} : { y: [0, -12, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}>
            <TealSphere size={160} />
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
              animate={rm || !heroInView ? {} : { opacity: [0.28, 0.5, 0.28] }}
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
                  style={{ background: 'linear-gradient(155deg,#FEF3C7 0%,#FDE68A 100%)', boxShadow: '0 4px 0 rgba(180,83,9,0.18),0 12px 36px rgba(253,230,138,0.55),inset 0 1.5px 0 rgba(255,255,255,0.95)', border: '1px solid rgba(253,230,138,0.7)', borderRadius: 100, color: '#78350F' }}>
                  <MapPin size={11} strokeWidth={2.5} /> Mumbai · For dog parents
                </span>
              </motion.div>

              <motion.h1
                initial={rm ? {} : { opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: EASE_EXP, delay: 0.07 }}
                className="text-slate-900 mb-5"
                style={{ fontFamily: 'var(--font-fredoka,sans-serif)', fontSize: 'clamp(2.4rem,6vw,4.8rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                Your dog gets walked.<br />
                <span style={{ color: '#F07030' }}>Now prove it.</span>
              </motion.h1>

              <motion.p
                initial={rm ? {} : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE_EXP, delay: 0.16 }}
                className="text-lg sm:text-xl text-slate-500 mb-8 max-w-lg mx-auto lg:mx-0"
                style={{ fontFamily: 'var(--font-nunito,sans-serif)', lineHeight: 1.65 }}>
                GPS route, pee/poop map, dog photo — sent to you on WhatsApp after every walk.
              </motion.p>

              <motion.div
                initial={rm ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_EXP, delay: 0.24 }}
                className="flex flex-wrap gap-3 justify-center lg:justify-start mb-4">
                {/* Primary CTA */}
                <motion.div whileHover={rm ? {} : { y: -3, scale: 1.03 }} whileTap={rm ? {} : { y: 3, scale: 0.98 }} transition={SPRING} className="inline-block">
                  <Link href="/setup"
                    className="inline-flex items-center gap-2 rounded-full font-bold px-8 py-4 text-base"
                    style={{ background: 'linear-gradient(155deg,#FF8C52 0%,#F56B22 100%)', boxShadow: '0 4px 0 rgba(175,65,10,0.30),0 10px 24px rgba(245,107,34,0.42),inset 0 1.5px 0 rgba(255,255,255,0.38)', border: '1px solid rgba(255,255,255,0.18)', color: '#451A03', fontFamily: 'var(--font-nunito,sans-serif)' }}>
                    Set up your dog <ArrowRight size={16} />
                  </Link>
                </motion.div>
                {/* Secondary CTA */}
                <motion.div whileHover={rm ? {} : { y: -3, scale: 1.03 }} whileTap={rm ? {} : { y: 3, scale: 0.98 }} transition={SPRING} className="inline-block">
                  <a href="#how-it-works"
                    className="inline-flex items-center gap-2 rounded-full font-bold px-6 py-3.5 text-sm"
                    style={{ background: 'transparent', border: `2px solid oklch(0.48 0.17 196)`, color: 'oklch(0.48 0.17 196)', fontFamily: 'var(--font-nunito,sans-serif)' }}>
                    See how it works ↓
                  </a>
                </motion.div>
              </motion.div>

              <motion.p
                initial={rm ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.38 }}
                className="text-xs text-slate-400 text-center lg:text-left"
                style={{ fontFamily: 'var(--font-nunito,sans-serif)' }}>
                14-day free trial · No App Store needed
              </motion.p>
            </div>

            {/* Walk report card */}
            <div className="flex-shrink-0 w-full max-w-sm lg:max-w-[460px] flex flex-col">
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

      {/* ══ SECTION 2: HOW IT WORKS ══════════════════════════════════════════ */}
      <section
        id="how-it-works"
        style={{ ...BLEED, background: 'linear-gradient(120deg,#FEF9ED 0%,#FEF3C7 55%,#FEF9ED 100%)', borderTop: '1.5px solid rgba(253,230,138,0.9)', borderBottom: '1.5px solid rgba(253,230,138,0.9)' }}
        className="py-14 sm:py-20 lg:py-28"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <FadeUp className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#F07030', fontFamily: 'var(--font-nunito,sans-serif)' }}>3 steps · zero friction</p>
            <h2 className="text-slate-900 mb-3" style={{ fontFamily: 'var(--font-fredoka,sans-serif)', fontSize: 'clamp(1.8rem,4vw,2.8rem)' }}>How it works</h2>
            <p className="text-slate-500 text-base max-w-xs mx-auto" style={{ fontFamily: 'var(--font-nunito,sans-serif)' }}>Set it up once. Reports arrive automatically after every walk.</p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '🐕',
                step: 'Step 1',
                title: 'Add your dog',
                body: 'Create your dog\'s profile with health notes. Takes 2 minutes.',
                delay: 0,
              },
              {
                icon: '📱',
                step: 'Step 2',
                title: 'Walker scans QR',
                body: 'Share a QR code or WhatsApp link. Your walker connects with a 4-digit code. No app download needed.',
                delay: 0.08,
              },
              {
                icon: '📊',
                step: 'Step 3',
                title: 'Report on WhatsApp',
                body: 'After every walk, you get a GPS route, pee/poop count, dog photo, and walker notes.',
                delay: 0.16,
              },
            ].map(({ icon, step, title, body, delay }) => (
              <FadeUp key={title} delay={delay}>
                <div className="flex flex-col items-center text-center p-8"
                  style={{ borderRadius: 24, background: 'rgba(255,255,255,0.72)', boxShadow: '0 4px 0 rgba(0,0,0,0.06),0 12px 36px rgba(0,0,0,0.05),inset 0 1.5px 0 rgba(255,255,255,1)', border: '1px solid rgba(226,232,240,0.7)' }}>
                  <div className="text-5xl mb-5" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))' }}>{icon}</div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#F07030', fontFamily: 'var(--font-nunito,sans-serif)' }}>{step}</p>
                  <h3 className="text-xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-fredoka,sans-serif)' }}>{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-nunito,sans-serif)' }}>{body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECTION 3: WHAT'S IN THE REPORT ═════════════════════════════════ */}
      <section
        style={{ ...BLEED, background: C.pageBg }}
        className="py-14 sm:py-20 lg:py-28"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <FadeUp className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#F07030', fontFamily: 'var(--font-nunito,sans-serif)' }}>Every walk, every time</p>
            <h2 className="text-slate-900 mb-3" style={{ fontFamily: 'var(--font-fredoka,sans-serif)', fontSize: 'clamp(1.8rem,4vw,2.8rem)' }}>What&apos;s in the report</h2>
            <p className="text-slate-500 text-base max-w-sm mx-auto" style={{ fontFamily: 'var(--font-nunito,sans-serif)' }}>Everything you need to know — delivered to WhatsApp in seconds.</p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '📍', title: 'GPS Route', body: 'See the exact path your dog walked', delay: 0 },
              { icon: '💩', title: 'Pee & Poop Log', body: 'Every event marked on the map with GPS coordinates', delay: 0.05 },
              { icon: '📸', title: 'Dog Photo', body: 'Walker takes a photo after the walk', delay: 0.1 },
              { icon: '⏱', title: 'Duration & Distance', body: 'How long and how far', delay: 0.15 },
              { icon: '📝', title: 'Walker Notes', body: 'Mood, behaviour, anything unusual', delay: 0.2 },
              { icon: '🔗', title: 'Shareable Link', body: 'Forward to family or vet in one tap', delay: 0.25 },
            ].map(({ icon, title, body, delay }) => (
              <FadeUp key={title} delay={delay}>
                <div className="flex items-start gap-4 p-5"
                  style={{ borderRadius: 20, background: 'white', boxShadow: '0 2px 0 rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
                  <div className="text-3xl flex-shrink-0 mt-0.5">{icon}</div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-fredoka,sans-serif)', fontSize: '1.05rem' }}>{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-nunito,sans-serif)' }}>{body}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECTION 4: PRICING ═══════════════════════════════════════════════ */}
      <section
        style={{ ...BLEED, background: 'linear-gradient(135deg,#0A2F35 0%,#0D3D45 50%,#0A2F35 100%)', position: 'relative', overflow: 'hidden' }}
        className="py-14 sm:py-20 lg:py-28"
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <motion.div style={{ position: 'absolute', top: -40, right: -30, opacity: 0.07 }}
            animate={rm ? {} : { y: [0,-15,0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}>
            <TealSphere size={300} />
          </motion.div>
        </div>
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
          <FadeUp className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#FF8C52', fontFamily: 'var(--font-nunito,sans-serif)' }}>Simple pricing</p>
            <h2 className="text-white mb-3" style={{ fontFamily: 'var(--font-fredoka,sans-serif)', fontSize: 'clamp(1.8rem,4vw,2.8rem)' }}>Start free. Upgrade when ready.</h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free card */}
            <FadeUp delay={0.06}>
              <div className="p-8 h-full flex flex-col"
                style={{ borderRadius: 24, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#17C8CC', fontFamily: 'var(--font-nunito,sans-serif)' }}>Free trial</p>
                <h3 className="text-white text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-fredoka,sans-serif)' }}>Free for 14 days</h3>
                <p className="text-stone-400 text-sm mb-6" style={{ fontFamily: 'var(--font-nunito,sans-serif)' }}>Full access. No credit card needed.</p>
                <ul className="space-y-3 mb-8 flex-1">
                  {['Unlimited walks', 'GPS reports', 'Dog photo'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-stone-300" style={{ fontFamily: 'var(--font-nunito,sans-serif)' }}>
                      <Check size={14} style={{ color: '#17C8CC', flexShrink: 0 }} strokeWidth={2.5} /> {item}
                    </li>
                  ))}
                </ul>
                <motion.div whileHover={rm ? {} : { y: -2, scale: 1.02 }} whileTap={rm ? {} : { y: 2, scale: 0.98 }} transition={SPRING}>
                  <Link href="/setup"
                    className="w-full flex items-center justify-center gap-2 rounded-full font-bold py-3.5 text-sm"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', color: 'white', fontFamily: 'var(--font-nunito,sans-serif)' }}>
                    Start free <ArrowRight size={14} />
                  </Link>
                </motion.div>
              </div>
            </FadeUp>

            {/* Pro card */}
            <FadeUp delay={0.12}>
              <div className="p-8 h-full flex flex-col relative overflow-hidden"
                style={{ borderRadius: 24, background: 'linear-gradient(155deg,#FF8C52 0%,#F56B22 40%,#E05A18 100%)', boxShadow: '0 8px 0 rgba(175,65,10,0.32),0 24px 64px rgba(245,107,34,0.38)', border: '1.5px solid rgba(255,255,255,0.18)' }}>
                <div className="absolute top-5 right-5">
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.22)', color: '#451A03', fontFamily: 'var(--font-nunito,sans-serif)' }}>Most popular</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#451A03', opacity: 0.7, fontFamily: 'var(--font-nunito,sans-serif)' }}>Pro</p>
                <h3 className="font-bold mb-1" style={{ fontFamily: 'var(--font-fredoka,sans-serif)', fontSize: '1.7rem', color: '#2D0A00' }}>₹249/month</h3>
                <p className="text-sm mb-6" style={{ color: '#451A03', fontFamily: 'var(--font-nunito,sans-serif)' }}>Full walk history, unlimited walkers.</p>
                <ul className="space-y-3 mb-8 flex-1">
                  {['Everything in free', 'Full report history', 'Multiple walkers', 'Annual plan: ₹1,999/year'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: '#451A03', fontFamily: 'var(--font-nunito,sans-serif)' }}>
                      <Check size={14} style={{ color: '#451A03', flexShrink: 0 }} strokeWidth={2.5} /> {item}
                    </li>
                  ))}
                </ul>
                <motion.div whileHover={rm ? {} : { y: -2, scale: 1.02 }} whileTap={rm ? {} : { y: 2, scale: 0.98 }} transition={SPRING}>
                  <Link href="/upgrade"
                    className="w-full flex items-center justify-center gap-2 rounded-full font-bold py-3.5 text-sm"
                    style={{ background: '#0A2F35', color: '#F0FDFA', fontFamily: 'var(--font-nunito,sans-serif)' }}>
                    See pricing <ArrowRight size={14} />
                  </Link>
                </motion.div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══ SECTION 5: FAQ ═══════════════════════════════════════════════════ */}
      <section
        style={{ ...BLEED, background: C.pageBg }}
        className="py-14 sm:py-20 lg:py-28"
      >
        <div className="max-w-2xl mx-auto px-5 sm:px-8">
          <FadeUp className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#F07030', fontFamily: 'var(--font-nunito,sans-serif)' }}>Questions</p>
            <h2 className="text-slate-900 mb-3" style={{ fontFamily: 'var(--font-fredoka,sans-serif)', fontSize: 'clamp(1.8rem,4vw,2.8rem)' }}>Common questions</h2>
          </FadeUp>

          <FadeUp delay={0.06}>
            <div style={{ borderRadius: 24, background: 'white', boxShadow: '0 4px 0 rgba(0,0,0,0.04),0 12px 36px rgba(0,0,0,0.05)', border: '1px solid rgba(226,232,240,0.8)', padding: '4px 28px' }}>
              {FAQ_ITEMS.map((item) => (
                <AccordionItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </FadeUp>

          <FadeUp delay={0.1} className="text-center mt-7">
            <Link href="/faq"
              className="text-sm font-semibold"
              style={{ color: 'oklch(0.48 0.17 196)', fontFamily: 'var(--font-nunito,sans-serif)' }}>
              See all FAQs →
            </Link>
          </FadeUp>
        </div>
      </section>

      {/* ══ SECTION 6: FOOTER ════════════════════════════════════════════════ */}
      <footer
        style={{ ...BLEED, background: C.dark, borderTop: `2px solid oklch(0.48 0.17 196)` }}
        className="py-12 pb-28 lg:pb-12"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <LucidePaw size={24} style={{ color: '#FF8C52' }} />
                <span className="font-bold text-xl text-white" style={{ fontFamily: 'var(--font-fredoka,sans-serif)' }}>PupStep</span>
              </div>
              <p className="text-stone-400 text-sm max-w-xs" style={{ fontFamily: 'var(--font-nunito,sans-serif)' }}>GPS walk reports for Mumbai dogs</p>
            </div>

            {/* Links */}
            <nav>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {[
                  { label: 'Home', href: '/' },
                  { label: 'Pricing', href: '/upgrade' },
                  { label: 'FAQ', href: '/faq' },
                  { label: 'Walker Guide', href: '/walker-guide' },
                  { label: 'Privacy', href: '/privacy' },
                  { label: 'Terms', href: '/terms' },
                  { label: 'Refund Policy', href: '/refunds' },
                ].map(({ label, href }) => (
                  <Link key={label} href={href}
                    className="text-sm text-stone-400 hover:text-white transition-colors"
                    style={{ fontFamily: 'var(--font-nunito,sans-serif)' }}>
                    {label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 20 }}>
            <p className="text-xs text-stone-500 text-center" style={{ fontFamily: 'var(--font-nunito,sans-serif)' }}>
              © 2026 PupStep · Made in Mumbai 🐶
            </p>
          </div>
        </div>
      </footer>

      {/* ══ MOBILE STICKY BAR ════════════════════════════════════════════════ */}
      <motion.div
        initial={rm ? {} : { y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE_EXP, delay: 1.6 }}
        className="lg:hidden fixed bottom-0 inset-x-0 z-50"
        style={{ background: 'rgba(255,251,235,0.97)', borderTop: '1px solid #FDE68A', paddingBottom: 'env(safe-area-inset-bottom,12px)' }}>
        <div className="flex gap-3 px-4 pt-3 pb-3">
          <Link href="/setup"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold"
            style={{ background: 'linear-gradient(155deg,#FF8C52 0%,#F56B22 100%)', boxShadow: '0 4px 0 rgba(175,65,10,0.30),0 8px 20px rgba(245,107,34,0.32)', color: '#451A03', fontFamily: 'var(--font-nunito,sans-serif)' }}>
            Set up your dog
          </Link>
          <Link href="/upgrade"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold"
            style={{ background: 'linear-gradient(155deg,#FFEDD5 0%,#FED7AA 100%)', boxShadow: '0 4px 0 rgba(194,65,12,0.12)', color: '#7C2D12', fontFamily: 'var(--font-nunito,sans-serif)' }}>
            See pricing
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
