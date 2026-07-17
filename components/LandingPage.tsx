'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  motion, useScroll, useTransform, useInView, useMotionValue, useSpring,
} from 'framer-motion'
import {
  MapPin, Check, Timer, Ruler, Navigation,
  ArrowRight, ChevronDown, QrCode, Camera,
  FileText, Share2, MessageCircle, Zap, Shield,
  PawPrint as LucidePaw, Sparkles, Bone,
} from 'lucide-react'
import { CLAY_SHADOW_TEAL_OUTLINE } from '@/lib/clayShadows'

// ─── Tokens ──────────────────────────────────────────────────────────────────
const EASE_EXP = [0.16, 1, 0.3, 1] as const
const SPRING   = { type: 'spring', duration: 0.45, bounce: 0 } as const
const C = {
  pageBg:    '#FFFBEB',
  dark:      '#0A2F35',
  teal:      'oklch(0.48 0.17 196)',
  orange:    '#FF8C52',
  orangeDeep:'#F56B22',
}

const BLEED: React.CSSProperties = {
  marginLeft:   'calc(50% - 50vw)',
  marginRight:  'calc(50% - 50vw)',
  paddingLeft:  'calc(50vw - 50%)',
  paddingRight: 'calc(50vw - 50%)',
}

// ─── Hooks ───────────────────────────────────────────────────────────────────
function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useIsTouch(): boolean {
  const [touch, setTouch] = useState(false)
  useEffect(() => { setTouch(window.matchMedia('(hover: none)').matches) }, [])
  return touch
}

// ─── AOS-style scroll reveal — variant: up | zoom | left | right ─────────────
function Reveal({
  children, delay = 0, variant = 'up', className = '', style = {},
}: {
  children: React.ReactNode
  delay?: number
  variant?: 'up' | 'zoom' | 'left' | 'right'
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px 0px' })
  const hidden: Record<string, string> = {
    up:    'translateY(28px) scale(1)',
    zoom:  'translateY(0) scale(0.92)',
    left:  'translateX(-32px) scale(1)',
    right: 'translateX(32px) scale(1)',
  }
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translate(0,0) scale(1)' : hidden[variant],
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── 3D tilt wrapper — pointer-driven perspective on desktop, static on touch ─
function Tilt3D({ children, max = 10 }: { children: React.ReactNode; max?: number }) {
  const rm = useReducedMotion()
  const isTouch = useIsTouch()
  const ref = useRef<HTMLDivElement>(null)
  const rx = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 })
  const ry = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 })

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (rm || isTouch || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    ry.set(px * max)
    rx.set(-py * max)
  }
  function onLeave() { rx.set(0); ry.set(0) }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ perspective: 1200 }}
    >
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}>
        {children}
      </motion.div>
    </motion.div>
  )
}

// ─── Page-level ambient background — teal/orange blobs, subtle scroll parallax ─
function PageBackground({ rm }: { rm: boolean }) {
  const { scrollY } = useScroll()
  const tealY   = useTransform(scrollY, [0, 4000], [0, rm ? 0 : -320])
  const orangeY = useTransform(scrollY, [0, 4000], [0, rm ? 0 : 220])
  const teal2Y  = useTransform(scrollY, [0, 4000], [0, rm ? 0 : -160])

  return (
    <div aria-hidden className="pointer-events-none"
      style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: C.pageBg }}>
      <motion.div className="absolute" aria-hidden
        style={{ top: -120, right: -100, width: 480, height: 480, borderRadius: '50%', background: 'oklch(0.48 0.17 196 / 0.065)', filter: 'blur(70px)', y: tealY }}
        animate={rm ? {} : { x: [0, -16, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute" aria-hidden
        style={{ bottom: -80, left: -60, width: 320, height: 320, borderRadius: '50%', background: C.orange, opacity: 0.05, filter: 'blur(55px)', y: orangeY }}
        animate={rm ? {} : { x: [0, 18, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }} />
      <motion.div className="absolute" aria-hidden
        style={{ top: '58%', left: '46%', width: 380, height: 380, borderRadius: '50%', background: 'oklch(0.48 0.17 196 / 0.04)', filter: 'blur(80px)', y: teal2Y }}
        animate={rm ? {} : { x: [0, -12, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }} />
    </div>
  )
}

// ─── Floating background decor — paw prints, bones, a ball drifting behind
// the hero with per-element scroll parallax (depth) and a slow perspective
// tilt (the closest thing to "3D" a fixed/transform-only layer can do
// without pulling in a WebGL library for a purely decorative background).
// Purely cosmetic: aria-hidden, pointer-events-none, transform/opacity only.
type FloatItem = {
  Icon: typeof LucidePaw
  top: string
  left: string
  size: number
  color: string
  opacity: number
  parallaxRange: number   // how far it drifts across 0–4000px of scroll
  parallaxDir: 1 | -1
  floatDuration: number
  rotateDuration: number
  rotateDir: 1 | -1
  delay: number
}

const FLOAT_ITEMS: FloatItem[] = [
  { Icon: LucidePaw, top: '8%',  left: '10%', size: 34, color: C.teal,   opacity: 0.22, parallaxRange: 260, parallaxDir: -1, floatDuration: 7,  rotateDuration: 22, rotateDir: 1,  delay: 0 },
  { Icon: Bone,       top: '18%', left: '86%', size: 40, color: C.orange, opacity: 0.20, parallaxRange: 200, parallaxDir: 1,  floatDuration: 8.5,rotateDuration: 26, rotateDir: -1, delay: 0.6 },
  { Icon: LucidePaw, top: '68%', left: '92%', size: 26, color: C.teal,   opacity: 0.18, parallaxRange: 340, parallaxDir: 1,  floatDuration: 6.5,rotateDuration: 18, rotateDir: -1, delay: 1.2 },
  { Icon: Bone,       top: '78%', left: '6%',  size: 30, color: C.orange, opacity: 0.18, parallaxRange: 220, parallaxDir: -1, floatDuration: 9,  rotateDuration: 24, rotateDir: 1,  delay: 0.3 },
  { Icon: LucidePaw, top: '40%', left: '4%',  size: 22, color: C.orange, opacity: 0.16, parallaxRange: 180, parallaxDir: 1,  floatDuration: 7.5,rotateDuration: 20, rotateDir: 1,  delay: 0.9 },
]

function FloatingBall({ rm }: { rm: boolean }) {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 4000], [0, rm ? 0 : -300])
  return (
    <motion.div
      className="absolute"
      aria-hidden
      style={{ top: '32%', left: '90%', width: 30, height: 30, y, perspective: 400 }}
      animate={rm ? {} : { rotateX: [0, 360], rotateY: [0, 180, 0], y: [0, -16, 0] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 32 32" width="100%" height="100%" style={{ opacity: 0.20 }}>
        <circle cx="16" cy="16" r="15" fill="none" stroke={C.orange} strokeWidth="2" />
        <path d="M2 16 Q 16 4, 30 16" fill="none" stroke={C.orange} strokeWidth="1.5" />
        <path d="M2 16 Q 16 28, 30 16" fill="none" stroke={C.orange} strokeWidth="1.5" />
      </svg>
    </motion.div>
  )
}

function FloatingIcon({ item, rm }: { item: FloatItem; rm: boolean }) {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 4000], [0, rm ? 0 : item.parallaxRange * item.parallaxDir])
  return (
    <motion.div
      className="absolute"
      aria-hidden
      style={{ top: item.top, left: item.left, y, perspective: 500 }}
      animate={rm ? {} : {
        rotate: [0, 360 * item.rotateDir],
        rotateY: [0, 25, 0, -25, 0],
        y: [0, -14, 0],
      }}
      transition={{
        rotate: { duration: item.rotateDuration, repeat: Infinity, ease: 'linear', delay: item.delay },
        rotateY: { duration: item.floatDuration, repeat: Infinity, ease: 'easeInOut', delay: item.delay },
        y: { duration: item.floatDuration, repeat: Infinity, ease: 'easeInOut', delay: item.delay },
      }}
    >
      <item.Icon size={item.size} color={item.color} strokeWidth={1.5} style={{ opacity: item.opacity }} />
    </motion.div>
  )
}

function FloatingDecor({ rm }: { rm: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none block"
      style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
      {FLOAT_ITEMS.map((item, i) => <FloatingIcon key={i} item={item} rm={rm} />)}
      <FloatingBall rm={rm} />
    </div>
  )
}

// ─── Site-wide paper grain — SVG turbulence overlay, decorative only ──────────
function GrainOverlay() {
  return (
    <div aria-hidden className="pointer-events-none"
      style={{ position: 'fixed', inset: 0, zIndex: 30, opacity: 0.035, mixBlendMode: 'overlay' }}>
      <svg width="100%" height="100%">
        <filter id="pupstepGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#pupstepGrain)" />
      </svg>
    </div>
  )
}

// ─── Mock route geometry — pixel-space polyline behind the animated report card ─
type Pt = { x: number; y: number }
const MOCK_ROUTE: Pt[] = [
  { x: 16, y: 58 }, { x: 55, y: 44 }, { x: 100, y: 48 }, { x: 145, y: 32 },
  { x: 190, y: 38 }, { x: 230, y: 22 }, { x: 275, y: 28 }, { x: 324, y: 16 },
]
const MOCK_EVENTS: { frac: number; kind: 'pee' | 'poop' }[] = [
  { frac: 0.14, kind: 'pee' },
  { frac: 0.34, kind: 'poop' },
  { frac: 0.52, kind: 'pee' },
  { frac: 0.70, kind: 'poop' },
  { frac: 0.88, kind: 'pee' },
]
const MOCK_STATS = { durationMin: 32, distanceKm: 2.1, poop: 2, pee: 3 }

function segLengths(points: Pt[]): { lens: number[]; total: number } {
  const lens: number[] = []
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    lens.push(d)
    total += d
  }
  return { lens, total }
}

// Point along the polyline at 0..1 of its length — places pee/poop pins and
// tells us the instant the drawing line has "reached" each one.
function pointAtFraction(points: Pt[], fraction: number): Pt {
  const { lens, total } = segLengths(points)
  if (fraction <= 0 || total === 0) return points[0]
  if (fraction >= 1) return points[points.length - 1]
  const target = total * fraction
  let covered = 0
  for (let i = 0; i < lens.length; i++) {
    if (covered + lens[i] >= target) {
      const t = lens[i] > 0 ? (target - covered) / lens[i] : 0
      const a = points[i]; const b = points[i + 1]
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    covered += lens[i]
  }
  return points[points.length - 1]
}

// SVG path `d` for the first `fraction` of the route — the drawn portion.
function partialPathD(points: Pt[], fraction: number): string {
  if (fraction <= 0) return `M${points[0].x},${points[0].y}`
  if (fraction >= 1) return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const { lens, total } = segLengths(points)
  const target = total * fraction
  let covered = 0
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < lens.length; i++) {
    if (covered + lens[i] >= target) {
      const t = lens[i] > 0 ? (target - covered) / lens[i] : 0
      const a = points[i]; const b = points[i + 1]
      d += ` L${a.x + (b.x - a.x) * t},${a.y + (b.y - a.y) * t}`
      return d
    }
    covered += lens[i]
    d += ` L${points[i + 1].x},${points[i + 1].y}`
  }
  return d
}

// ─── Reusable count-up — animates a number 0 → value, ease-out-quart ──────────
function useCountUp(value: number, play: boolean, cycleKey: number, duration = 1.3): number {
  const rm = useReducedMotion()
  const [display, setDisplay] = useState(rm ? value : 0)
  useEffect(() => {
    let raf = 0
    if (rm) {
      raf = requestAnimationFrame(() => setDisplay(value))
      return () => cancelAnimationFrame(raf)
    }
    if (!play) return
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - t, 4)
      setDisplay(value * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [play, value, cycleKey, rm, duration])
  return display
}

// ─── Walk report mock — route draws itself in, pins pop in, stats count up ────
function WalkReportMock() {
  const rm = useReducedMotion()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inView = useInView(wrapRef, { margin: '-80px 0px' })
  const [fraction, setFraction] = useState(rm ? 1 : 0)
  const [cycleKey, setCycleKey] = useState(0)

  // Draw the route in, hold at full length, reset, loop — pauses whenever the
  // card is scrolled out of view so visitors who linger see it replay.
  //
  // Capped at MAX_LOOPS instead of looping forever: this drives a setState on
  // every animation frame (~60/s) for ~2.2s of every ~6s cycle. The hero card
  // is above the fold, so `inView` is true for most mobile visitors from the
  // moment the page loads — an uncapped loop meant this kept re-rendering and
  // burning CPU/battery for as long as the tab stayed on the hero, competing
  // with hydration on exactly the slower mobile CPUs this hurts most. A couple
  // of replays is enough to sell the effect; after that it settles fully drawn.
  useEffect(() => {
    if (rm || !inView) return
    const MAX_LOOPS = 2
    let stopped = false
    let rafId = 0
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let loops = 0

    function draw() {
      const DRAW_MS = 2200
      const HOLD_MS = 3800
      const start = performance.now()
      function tick(now: number) {
        if (stopped) return
        const t = Math.min((now - start) / DRAW_MS, 1)
        setFraction(1 - Math.pow(1 - t, 3))
        if (t < 1) { rafId = requestAnimationFrame(tick) }
        else if (loops < MAX_LOOPS) {
          timeoutId = setTimeout(() => {
            if (stopped) return
            loops += 1
            setFraction(0)
            setCycleKey(k => k + 1)
            draw()
          }, HOLD_MS)
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    draw()

    return () => { stopped = true; cancelAnimationFrame(rafId); if (timeoutId) clearTimeout(timeoutId) }
  }, [rm, inView])

  const playStats = rm ? true : fraction > 0.03
  const durationDisplay = useCountUp(MOCK_STATS.durationMin, playStats, cycleKey, 1.3)
  const distanceDisplay = useCountUp(MOCK_STATS.distanceKm, playStats, cycleKey, 1.1)
  const poopDisplay     = useCountUp(MOCK_STATS.poop, playStats, cycleKey, 1.5)
  const peeDisplay      = useCountUp(MOCK_STATS.pee, playStats, cycleKey, 1.5)

  const drawnFraction = rm ? 1 : fraction
  const pathD = partialPathD(MOCK_ROUTE, drawnFraction)
  const head = pointAtFraction(MOCK_ROUTE, drawnFraction)
  const start = MOCK_ROUTE[0]
  const end = MOCK_ROUTE[MOCK_ROUTE.length - 1]

  return (
    <div ref={wrapRef} style={{
      background: '#fff',
      borderRadius: 24,
      boxShadow: '0 8px 0 rgba(0,0,0,0.09), 0 30px 70px rgba(10,47,53,0.20), inset 0 2px 0 rgba(255,255,255,0.9)',
      border: '1px solid rgba(226,232,240,0.5)',
      overflow: 'hidden',
      width: '100%',
      maxWidth: 340,
    }}>
      {/* Header */}
      <div style={{ background: C.dark, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LucidePaw size={16} color={C.orange} />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>Bruno&apos;s Walk</p>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Ramesh · Today 8:24 AM</p>
          </div>
        </div>
        <span style={{ background: '#25D366', color: '#fff', borderRadius: 100, padding: '3px 8px', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>LIVE</span>
      </div>

      {/* Dog photo */}
      <div style={{ position: 'relative', height: 148, overflow: 'hidden', background: '#e5e7eb' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80&auto=format&fit=crop"
          alt="Bruno the dog on his walk in Mumbai"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(10,47,53,0.82)', borderRadius: 8, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Camera size={10} color="rgba(255,255,255,0.7)" />
          <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Walk photo</span>
        </div>
      </div>

      {/* Stats — count up from 0 each time the route redraws */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderBottom: '1px solid #f3f4f6' }}>
        {[
          { icon: <Timer size={13} />, label: 'Duration', value: `${Math.round(durationDisplay)} min` },
          { icon: <Ruler size={13} />, label: 'Distance', value: `${distanceDisplay.toFixed(1)} km` },
          { icon: <Navigation size={13} />, label: 'Poop + Pee', value: `${Math.round(poopDisplay)} + ${Math.round(peeDisplay)}` },
        ].map(({ icon, label, value }, i) => (
          <div key={label} style={{ padding: '10px 8px', textAlign: 'center', borderRight: i < 2 ? '1px solid #f3f4f6' : 'none' }}>
            <div style={{ color: C.teal, display: 'flex', justifyContent: 'center', marginBottom: 3 }}>{icon}</div>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: C.dark, margin: 0 }}>{value}</p>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 9, color: '#9CA3AF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* GPS map preview — route draws itself in, pins pop in as it's reached */}
      <div style={{ height: 76, background: 'linear-gradient(135deg, #e8f5f8, #d0ebf1)', position: 'relative', overflow: 'hidden' }}>
        <svg viewBox="0 0 340 76" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <path d={pathD} fill="none" stroke="oklch(0.48 0.17 196)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={start.x} cy={start.y} r="4" fill={C.orange} />
          <circle cx={end.x} cy={end.y} r="4" fill="oklch(0.48 0.17 196)" />

          {MOCK_EVENTS.map((e, i) => {
            if (!rm && drawnFraction < e.frac) return null
            const p = pointAtFraction(MOCK_ROUTE, e.frac)
            return (
              <motion.text
                key={`${i}-${cycleKey}`}
                x={p.x} y={p.y - 6} fontSize="13" textAnchor="middle" dominantBaseline="middle"
                initial={rm ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={SPRING}
              >
                {e.kind === 'poop' ? '💩' : '💧'}
              </motion.text>
            )
          })}

          {!rm && drawnFraction > 0 && drawnFraction < 1 && (
            <text x={head.x} y={head.y} fontSize="15" textAnchor="middle" dominantBaseline="middle">🐾</text>
          )}
        </svg>
        <span style={{ position: 'absolute', top: 6, left: 8, background: 'rgba(255,255,255,0.88)', borderRadius: 6, padding: '2px 7px', fontFamily: 'var(--font-nunito)', fontSize: 9, fontWeight: 700, color: C.dark }}>GPS Route</span>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 14px', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9CA3AF', margin: 0 }}>Delivered via WhatsApp</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={10} color="#fff" />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#25D366', fontFamily: 'var(--font-nunito)' }}>Sent</span>
        </div>
      </div>
    </div>
  )
}

// ─── Proof strip chips ──────────────────────────────────────────────────────
const PROOF_CHIPS: { stat: string; icon: 'ruler' | 'nav' | 'timer' | 'paw' }[] = [
  { stat: '460m · 12 min · 3 pee marks', icon: 'ruler' },
  { stat: '890m · 18 min · 2 poop logged', icon: 'nav' },
  { stat: '1.2km · 24 min · 4 pee marks', icon: 'timer' },
  { stat: '340m · 9 min · 1 poop logged', icon: 'paw' },
  { stat: '2.1km · 32 min · 3 pee, 2 poop', icon: 'ruler' },
  { stat: '610m · 15 min · 2 pee marks', icon: 'nav' },
  { stat: '980m · 21 min · 1 pee, 1 poop', icon: 'timer' },
]
function proofIcon(kind: 'ruler' | 'nav' | 'timer' | 'paw') {
  switch (kind) {
    case 'ruler': return <Ruler size={12} />
    case 'nav': return <Navigation size={12} />
    case 'timer': return <Timer size={12} />
    case 'paw': return <LucidePaw size={12} />
  }
}

// ─── Closing CTA paw-print pattern ──────────────────────────────────────────
const PAW_PATTERN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='84' height='84'><g fill='rgba(255,255,255,0.09)'><circle cx='30' cy='46' r='4'/><circle cx='38' cy='39' r='3.2'/><circle cx='47' cy='39' r='3.2'/><circle cx='55' cy='46' r='3.2'/><ellipse cx='42' cy='55' rx='9' ry='6.5'/></g></svg>`

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'Is PupStep a directory of dog walkers, vets, or groomers?', a: "No — PupStep isn't a marketplace or directory, and we don't list or book providers. Keep the walker you already trust — a maid, watchman, family friend, or your regular walker — and use PupStep to get a GPS-tracked walk report on WhatsApp after every walk, so you can check in on how it went." },
  { q: 'Does my dog walker need to download an app?', a: 'No. Your walker opens a link from WhatsApp — no App Store, no signup, no account. Built for low-tech-literacy walkers across India.' },
  { q: 'How does GPS tracking work for dog walks?', a: 'Your walker\'s phone tracks the route live during the walk. You get the exact path, pee and poop locations, and timing — all mapped and sent to your WhatsApp.' },
  { q: 'How do I connect my walker?', a: 'Show them a QR code or send a WhatsApp link. They enter a 4-digit code you share. One-time setup, under a minute.' },
  { q: 'What do I get to see after each walk?', a: 'GPS route, pee and poop count with map markers, a dog photo, walk duration and distance, and walker notes — delivered on WhatsApp within seconds of the walk ending.' },
  { q: 'How much does PupStep cost?', a: '3-day free trial, no credit card needed. After that, ₹199/month for full walk history and unlimited walkers.' },
  { q: 'Can I share the walk report with my vet or family?', a: 'Yes. Every report has a shareable link you can forward to anyone — family, vets, or groomers — in one tap.' },
  { q: 'How do I know if my dog walker actually walked my dog?', a: 'Every walk comes with a GPS route map, a photo, and quick notes from your walker — not just a text saying "walk done". It\'s reassurance, not surveillance: you can check in on exactly how the walk went, right there in your report, so you never have to wonder.' },
  { q: 'What if my walker says the walk happened but I\'m not sure?', a: 'A text saying "walk done" is easy to send from the couch. A GPS route on a map is much harder to fake — it shows exactly where your dog went, for how long, and when.' },
  { q: 'Is this different from apps that provide their own dog walker?', a: 'Yes, and it\'s the biggest difference. Apps that supply their own walker fall apart if that walker doesn\'t show up. PupStep works with the walker you already trust, your maid, watchman, family friend, or regular walker, and just adds a GPS-tracked check-in to the walks they already do, so you can see how it went.' },
]

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}
      >
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 600, color: C.dark }}>{q}</span>
        <ChevronDown size={18} style={{ flexShrink: 0, color: C.teal, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }} />
      </button>
      {open && (
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#64748B', lineHeight: 1.7, paddingBottom: 18, margin: 0 }}>{a}</p>
      )}
    </div>
  )
}

// ─── Landing page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const rm = useReducedMotion()
  const { scrollY } = useScroll()
  const cardY      = useTransform(scrollY, [0, 600], [0, rm ? 0 : -38])

  return (
    <div className="-mt-8" style={{ position: 'relative' }}>
      <PageBackground rm={rm} />
      <FloatingDecor rm={rm} />
      <GrainOverlay />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        style={{ ...BLEED, position: 'relative', overflow: 'hidden' }}
        className="min-h-[100svh] flex flex-col justify-center"
      >
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden
          style={{ backgroundImage: 'radial-gradient(circle,rgba(180,83,9,0.04) 1px,transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-16 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-20">

            {/* Text */}
            <div className="flex-1 text-center lg:text-left w-full">

              {/* Badge */}
              <motion.div initial={rm ? {} : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_EXP }}>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase px-4 py-1.5 mb-7"
                  style={{ background: 'linear-gradient(155deg,#FEF3C7,#FDE68A)', boxShadow: '0 4px 0 rgba(180,83,9,0.14),0 10px 28px rgba(253,230,138,0.48),inset 0 1.5px 0 rgba(255,255,255,0.95)', border: '1px solid rgba(253,230,138,0.6)', borderRadius: 100, color: '#78350F', display: 'inline-flex' }}>
                  <Check size={11} strokeWidth={2.5} />
                  Know how every walk went
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={rm ? {} : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE_EXP, delay: 0.07 }}
                style={{ fontFamily: 'var(--font-fredoka)', fontSize: 'clamp(2.6rem,6.5vw,5rem)', lineHeight: 1.04, letterSpacing: '-0.02em', color: C.dark, marginBottom: 20 }}>
                Your dog gets walked.<br />
                <span style={{ color: C.orange }}>Now you'll know how it went.</span>
              </motion.h1>

              {/* Sub */}
              <motion.p
                initial={rm ? {} : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE_EXP, delay: 0.16 }}
                style={{ fontFamily: 'var(--font-nunito)', fontSize: 'clamp(1rem,2vw,1.15rem)', lineHeight: 1.7, color: '#64748B', maxWidth: 460, marginBottom: 32, marginLeft: 'auto', marginRight: 'auto' }}
                className="lg:mx-0">
                No more wondering how the walk went. GPS route, pee and poop map, dog photo — on your WhatsApp within seconds of every walk.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={rm ? {} : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE_EXP, delay: 0.24 }}
                className="flex flex-wrap gap-3 justify-center lg:justify-start mb-6">
                <motion.div whileHover={rm ? {} : { y: -3, scale: 1.02 }} whileTap={rm ? {} : { y: 2, scale: 0.97 }} transition={SPRING}>
                  <Link href="/setup?go=1"
                    className="inline-flex items-center gap-2 rounded-full font-bold px-8 py-4"
                    style={{ background: `linear-gradient(155deg,${C.orange},${C.orangeDeep})`, boxShadow: '0 4px 0 rgba(175,65,10,0.28),0 12px 28px rgba(245,107,34,0.36),inset 0 1.5px 0 rgba(255,255,255,0.36)', color: '#451A03', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
                    Set up your dog <ArrowRight size={16} />
                  </Link>
                </motion.div>
                <a href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-full font-bold px-6 py-4"
                  style={{ background: 'transparent', border: `2px solid ${C.teal}`, color: C.teal, fontFamily: 'var(--font-nunito)', fontSize: 14 }}>
                  How it works <ChevronDown size={15} />
                </a>
              </motion.div>

              {/* Trust chips */}
              <motion.div
                initial={rm ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.38 }}
                className="flex items-center gap-5 justify-center lg:justify-start flex-wrap">
                {['3-day free trial', 'No app download', 'Works with any walker'].map(t => (
                  <span key={t} className="flex items-center gap-1.5"
                    style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>
                    <Check size={12} style={{ color: C.teal }} strokeWidth={3} /> {t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Report card — 3D tilt + parallax */}
            <div className="flex-shrink-0 w-full max-w-[340px] lg:max-w-[380px] flex justify-center lg:justify-end">
              <motion.div
                initial={rm ? {} : { opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE_EXP, delay: 0.2 }}
                style={{ y: cardY, width: '100%' }}>
                <Tilt3D max={9}>
                  <WalkReportMock />
                </Tilt3D>
              </motion.div>
            </div>

          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2" aria-hidden>
          <motion.div
            animate={rm ? {} : { y: [0, 7, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 24, height: 38, borderRadius: 100, border: '2px solid rgba(180,83,9,0.18)', background: 'rgba(253,230,138,0.22)', display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
            <div style={{ width: 4, height: 8, borderRadius: 2, background: C.orange, opacity: 0.5 }} />
          </motion.div>
        </div>
      </section>

      {/* ── TRUST STRIP ───────────────────────────────────────────────────── */}
      <div style={{ ...BLEED, background: C.dark, padding: '13px 0' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {[
              { icon: <Shield size={14} />, text: 'GPS-verified every walk' },
              { icon: <LucidePaw size={14} />, text: 'Trusted by dog parents, Mumbai to India' },
              { icon: <MessageCircle size={14} />, text: 'Reports on WhatsApp in seconds' },
              { icon: <Zap size={14} />, text: 'Walker needs no app download' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <span style={{ color: C.orange }}>{icon}</span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROOF STRIP — auto-scrolling walk-report chips ─────────────────── */}
      <div style={{ ...BLEED, background: 'transparent', borderBottom: '1px solid rgba(10,47,53,0.06)', padding: '14px 0', overflow: 'hidden', position: 'relative' }}>
        <style>{`
          @keyframes pupstepMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          .pupstep-marquee-track { animation: pupstepMarquee 34s linear infinite; }
          .pupstep-marquee-track:hover { animation-play-state: paused; }
          @media (prefers-reduced-motion: reduce) {
            .pupstep-marquee-track { animation: none; }
          }
        `}</style>
        <div className="pupstep-marquee-track" style={{ display: 'flex', gap: 10, width: 'max-content' }}>
          {[...PROOF_CHIPS, ...PROOF_CHIPS].map((c, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0, background: '#fff', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 100, padding: '7px 14px', boxShadow: '0 2px 6px rgba(10,47,53,0.05)' }}>
              <span style={{ color: C.teal, display: 'flex' }}>{proofIcon(c.icon)}</span>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, color: C.dark, whiteSpace: 'nowrap' }}>{c.stat}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works"
        style={{ ...BLEED, background: 'linear-gradient(120deg,#FEF9ED,#FEF3C7 50%,#FEF9ED)', borderTop: '1.5px solid rgba(253,230,138,0.8)', borderBottom: '1.5px solid rgba(253,230,138,0.8)' }}
        className="py-16 sm:py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">

          <Reveal variant="up" className="text-center mb-16">
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.orange, marginBottom: 12 }}>4 steps, zero friction</p>
            <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 'clamp(1.9rem,4vw,3rem)', color: C.dark, marginBottom: 10 }}>How dog walk GPS tracking works</h2>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, color: '#64748B', maxWidth: 380, margin: '0 auto' }}>Set it up once. Get a real-time check-in on your dog after every single walk.</p>
          </Reveal>

          {/* Desktop timeline */}
          <div className="hidden md:grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 0, position: 'relative' }}>
            {/* Connecting line */}
            <div style={{ position: 'absolute', top: 36, left: '12.5%', right: '12.5%', height: 2, background: 'linear-gradient(90deg,rgba(255,140,82,0.2),rgba(255,140,82,0.55),rgba(255,140,82,0.2))', zIndex: 0 }} />

            {[
              { num: 1, icon: <LucidePaw size={24} strokeWidth={1.5} />, title: 'Add your dog', body: 'Create your dog\'s profile with name, breed, and health notes. Takes 2 minutes.', delay: 0 },
              { num: 2, icon: <QrCode size={24} strokeWidth={1.5} />, title: 'Connect your walker', body: 'Share a QR code or WhatsApp link. Walker enters a 4-digit code to connect. No app download.', delay: 0.1 },
              { num: 3, icon: <Navigation size={24} strokeWidth={1.5} />, title: 'Walker logs the walk', body: 'Walker taps Start Walk, marks pee and poop on the live map, takes a photo, then ends the walk.', delay: 0.2 },
              { num: 4, icon: <MessageCircle size={24} strokeWidth={1.5} />, title: 'Report on WhatsApp', body: 'You receive a GPS-tagged walk report with photos and health markers — automatically, every time.', delay: 0.3 },
            ].map(({ num, icon, title, body, delay }) => (
              <Reveal key={title} variant="zoom" delay={delay} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 18px', position: 'relative', zIndex: 1 }}>
                <div style={{ position: 'relative', marginBottom: 20 }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 0 rgba(0,0,0,0.06),0 12px 32px rgba(0,0,0,0.07),inset 0 2px 0 rgba(255,255,255,1)', border: '1.5px solid rgba(226,232,240,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.teal }}>
                    {icon}
                  </div>
                  <span style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fredoka)', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                    {num}
                  </span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-fredoka)', fontSize: '1.15rem', fontWeight: 700, color: C.dark, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', lineHeight: 1.65 }}>{body}</p>
              </Reveal>
            ))}
          </div>

          {/* Mobile vertical steps */}
          <div className="md:hidden flex flex-col">
            {[
              { num: 1, icon: <LucidePaw size={18} strokeWidth={1.5} />, title: 'Add your dog', body: 'Name, breed, and health notes. 2 minutes.', delay: 0, last: false },
              { num: 2, icon: <QrCode size={18} strokeWidth={1.5} />, title: 'Connect your walker', body: 'Share QR or WhatsApp link. Walker enters a 4-digit code. No app download needed.', delay: 0.08, last: false },
              { num: 3, icon: <Navigation size={18} strokeWidth={1.5} />, title: 'Walker logs the walk', body: 'Start Walk, mark pee and poop, take photo, End Walk. GPS tracked throughout.', delay: 0.16, last: false },
              { num: 4, icon: <MessageCircle size={18} strokeWidth={1.5} />, title: 'Report on WhatsApp', body: 'GPS route, photos, and health markers — a real-time check-in delivered automatically.', delay: 0.24, last: true },
            ].map(({ num, icon, title, body, delay, last }) => (
              <div key={title} className="flex gap-4">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 0 rgba(0,0,0,0.05),0 8px 20px rgba(0,0,0,0.07)', border: '1.5px solid rgba(226,232,240,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.teal, position: 'relative' }}>
                    {icon}
                    <span style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fredoka)', fontSize: 10, fontWeight: 700, color: '#fff' }}>{num}</span>
                  </div>
                  {!last && <div style={{ width: 2, flex: 1, minHeight: 28, background: 'linear-gradient(180deg,rgba(255,140,82,0.35),rgba(255,140,82,0.1))', margin: '6px 0' }} />}
                </div>
                <Reveal variant="left" delay={delay} style={{ paddingBottom: last ? 0 : 28 }}>
                  <h3 style={{ fontFamily: 'var(--font-fredoka)', fontSize: '1.1rem', fontWeight: 700, color: C.dark, marginBottom: 4, marginTop: 10 }}>{title}</h3>
                  <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 }}>{body}</p>
                </Reveal>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── WHAT'S IN THE REPORT ──────────────────────────────────────────── */}
      <section style={{ ...BLEED, background: 'transparent' }} className="py-16 sm:py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-20">

            {/* Card with subtle tilt */}
            <Reveal variant="left" className="w-full flex justify-center lg:flex-shrink-0 lg:w-auto">
              <Tilt3D max={6}>
                <WalkReportMock />
              </Tilt3D>
            </Reveal>

            {/* Features */}
            <div className="flex-1 w-full">
              <Reveal variant="right">
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.orange, marginBottom: 12 }}>Every walk, every time</p>
                <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 'clamp(1.9rem,4vw,2.8rem)', color: C.dark, marginBottom: 8 }}>See exactly how your dog&apos;s walk went</h2>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, color: '#64748B', marginBottom: 28, lineHeight: 1.65, maxWidth: 380 }}>Not a screenshot from the walker. Not a guess. A GPS-tagged update on how your furry baby's walk went — delivered to WhatsApp in seconds.</p>
              </Reveal>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { icon: <Navigation size={17} strokeWidth={1.8} />, title: 'GPS Route', body: 'See the exact path your dog walked with start and end points.' },
                  { icon: <MapPin size={17} strokeWidth={1.8} />, title: 'Pee and Poop Log', body: 'Every event marked on the map with GPS coordinates.' },
                  { icon: <Camera size={17} strokeWidth={1.8} />, title: 'Dog Photo', body: 'Walker takes a photo after the walk, saved permanently.' },
                  { icon: <Timer size={17} strokeWidth={1.8} />, title: 'Duration and Distance', body: 'How long the walk lasted and exactly how far your dog went.' },
                  { icon: <FileText size={17} strokeWidth={1.8} />, title: 'Walker Notes', body: 'Mood, behaviour, and anything unusual from the walk.' },
                  { icon: <Share2 size={17} strokeWidth={1.8} />, title: 'Shareable Link', body: 'Forward the full report to family, vets, or groomers in one tap.' },
                ].map(({ icon, title, body }, i) => (
                  <Reveal key={title} variant="right" delay={i * 0.055}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'oklch(0.48 0.17 196 / 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.teal, flexShrink: 0 }}>
                        {icon}
                      </div>
                      <div>
                        <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: '1rem', fontWeight: 700, color: C.dark, margin: '0 0 2px' }}>{title}</p>
                        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6 }}>{body}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS (CSS scroll-snap carousel) ───────────────────────── */}
      <section
        style={{ ...BLEED, background: 'linear-gradient(120deg,#FEF9ED,#FEF3C7 50%,#FEF9ED)', borderTop: '1.5px solid rgba(253,230,138,0.8)', borderBottom: '1.5px solid rgba(253,230,138,0.8)' }}
        className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <Reveal variant="up" className="text-center mb-10 px-5 sm:px-8">
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.orange, marginBottom: 10 }}>From Mumbai to across India</p>
            <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 'clamp(1.9rem,4vw,2.8rem)', color: C.dark }}>Peace of mind, every day</h2>
          </Reveal>

          <div style={{ overflowX: 'auto', scrollSnapType: 'x mandatory', display: 'flex', gap: 16, padding: '8px 20px 20px', WebkitOverflowScrolling: 'touch' as unknown as undefined }}
            className="sm:px-8 hide-scrollbar">
            {[
              { quote: 'I used to call Ramesh three times a day. Now I just check the report — GPS, photo, everything.', name: 'Priya S.', area: 'Juhu', dog: 'Bruno, Labrador', img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=120&q=80&auto=format&fit=crop' },
              { quote: 'The GPS map shows the exact route. I can see they actually go to the garden and not just outside the gate.', name: 'Rahul M.', area: 'Andheri West', dog: 'Coco, Beagle', img: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=120&q=80&auto=format&fit=crop' },
              { quote: 'Our maid has low tech literacy. The QR took under 5 minutes. She sends reports every single day now.', name: 'Sunita K.', area: 'Versova', dog: 'Mango, Indie', img: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=120&q=80&auto=format&fit=crop' },
              { quote: 'My vet asked about bathroom habits. I shared 3 months of poop reports instantly. He was surprised.', name: 'Deepa N.', area: 'Bandra West', dog: 'Bruno, Golden Retriever', img: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=120&q=80&auto=format&fit=crop' },
            ].map(({ quote, name, area, dog, img }) => (
              <div key={name} style={{ flexShrink: 0, width: 300, scrollSnapAlign: 'start', background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 0 rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.05)', border: '1px solid rgba(226,232,240,0.7)', transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 4px 0 rgba(0,0,0,0.04),0 20px 40px rgba(10,47,53,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 0 rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.05)' }}>
                <svg width="22" height="17" viewBox="0 0 22 17" fill="none" style={{ marginBottom: 10, opacity: 0.15 }}>
                  <path d="M0 17V9.93C0 4.43 3.03 1.13 9.17 0l1.38 2.27C7.44 3 5.79 4.73 5.5 7.5H9V17H0zm13 0V9.93C13 4.43 16.03 1.13 22.17 0l1.38 2.27C20.44 3 18.79 4.73 18.5 7.5H22V17H13z" fill={C.dark} />
                </svg>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#374151', lineHeight: 1.72, marginBottom: 16 }}>{quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, borderTop: '1px solid #F3F4F6' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: C.dark, margin: 0 }}>{name} · {area}</p>
                    <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#94A3B8', margin: 0 }}>{dog}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="md:hidden text-center mt-2" style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#CBD5E1' }}>Swipe to read more</p>
        </div>
      </section>

      {/* ── PRICING — single teaser card, full detail lives at /upgrade ────── */}
      <section id="pricing"
        style={{ ...BLEED, background: `linear-gradient(135deg,${C.dark} 0%,#0D3D45 50%,${C.dark} 100%)`, position: 'relative', overflow: 'hidden' }}
        className="py-16 sm:py-20 lg:py-28">
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 70% 40%,rgba(255,140,82,0.07) 0%,transparent 60%)' }} />

        <div className="relative max-w-2xl mx-auto px-5 sm:px-8">
          <Reveal variant="up" className="text-center mb-10">
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.orange, marginBottom: 12 }}>Simple pricing</p>
            <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 'clamp(1.9rem,4vw,3rem)', color: '#FFFBEB', marginBottom: 10 }}>Free to try. ₹199/month after.</h2>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, color: 'rgba(255,255,255,0.5)', maxWidth: 380, margin: '0 auto' }}>Your walker never pays a rupee. One plan for parents, no confusing tiers.</p>
          </Reveal>

          <Reveal variant="zoom" delay={0.08}>
            <div style={{ borderRadius: 28, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.14)', padding: '36px 32px', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-fredoka)', fontSize: 48, fontWeight: 700, color: '#FFFBEB' }}>₹199</span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>/month</span>
              </div>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'oklch(0.75 0.12 196)', fontWeight: 700, marginBottom: 24 }}>3-day free trial · No credit card needed</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px 20px', textAlign: 'left', marginBottom: 28, maxWidth: 380, marginInline: 'auto' }}>
                {['GPS walk reports', 'Full walk history', 'Unlimited walkers', 'Dog health notes', 'WhatsApp delivery', 'Vet-ready sharing'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                    <Check size={13} style={{ color: 'oklch(0.75 0.12 196)', flexShrink: 0 }} strokeWidth={2.5} /> {f}
                  </div>
                ))}
              </div>

              <motion.div whileHover={rm ? {} : { y: -3, scale: 1.02 }} whileTap={rm ? {} : { scale: 0.97 }} transition={SPRING} style={{ display: 'inline-block', width: '100%', maxWidth: 320 }}>
                <Link href="/setup?go=1"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 100, padding: '15px 28px', background: `linear-gradient(155deg,${C.orange},${C.orangeDeep})`, boxShadow: '0 4px 0 rgba(175,65,10,0.28),0 12px 28px rgba(245,107,34,0.32)', color: '#451A03', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 700, textDecoration: 'none', width: '100%' }}>
                  Start free trial <ArrowRight size={16} />
                </Link>
              </motion.div>
              <Link href="/upgrade" style={{ display: 'inline-block', marginTop: 16, fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>
                See full pricing details →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section style={{ ...BLEED, background: 'transparent' }} className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-2xl mx-auto px-5 sm:px-8">
          <Reveal variant="up" className="text-center mb-10">
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.orange, marginBottom: 12 }}>Questions</p>
            <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 'clamp(1.9rem,4vw,2.8rem)', color: C.dark }}>Common questions</h2>
          </Reveal>
          <Reveal variant="up" delay={0.06}>
            <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 4px 0 rgba(0,0,0,0.04),0 12px 36px rgba(0,0,0,0.05)', border: '1px solid rgba(226,232,240,0.7)', padding: '4px 24px' }}>
              {FAQ_ITEMS.map(item => <AccordionItem key={item.q} q={item.q} a={item.a} />)}
            </div>
          </Reveal>
          <Reveal variant="up" delay={0.1} className="text-center mt-6">
            <Link href="/faq" style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: C.teal, textDecoration: 'none' }}>See all FAQs →</Link>
          </Reveal>
        </div>
      </section>

      {/* ── CLOSING CTA ───────────────────────────────────────────────────── */}
      <section style={{ ...BLEED, background: `linear-gradient(160deg, ${C.orangeDeep} 0%, ${C.orange} 45%, ${C.orangeDeep} 100%)`, position: 'relative', overflow: 'hidden' }} className="py-20 sm:py-24 lg:py-32">
        {/* Barely-visible paw print texture — depth without a light show */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(PAW_PATTERN_SVG)}")`, backgroundSize: '84px 84px' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 26% 18%, rgba(255,255,255,0.12) 0%, transparent 55%)' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 80% 90%, rgba(0,0,0,0.10) 0%, transparent 60%)' }} />
        <div className="relative max-w-2xl mx-auto px-5 sm:px-8 text-center">
          <Reveal variant="zoom">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <Sparkles size={13} style={{ color: 'rgba(69,26,3,0.6)' }} />
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(69,26,3,0.6)', margin: 0 }}>Ready to try?</p>
            </div>
            <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 'clamp(2rem,5vw,3.2rem)', color: '#451A03', marginBottom: 12, lineHeight: 1.1 }}>
              Your dog&apos;s first report,<br />in under 10 minutes.
            </h2>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, color: 'rgba(69,26,3,0.65)', marginBottom: 28, lineHeight: 1.65 }}>
              Add your dog, share a QR or WhatsApp link with your walker, and get your first walk update on WhatsApp.
            </p>
            <motion.div whileHover={rm ? {} : { y: -3, scale: 1.03 }} whileTap={rm ? {} : { scale: 0.97 }} transition={SPRING} style={{ display: 'inline-block' }}>
              <Link href="/setup?go=1"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 100, padding: '16px 36px', background: C.dark, color: '#FFFBEB', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 0 rgba(0,0,0,0.18),0 16px 40px rgba(10,47,53,0.32)' }}>
                Set up your dog <ArrowRight size={16} />
              </Link>
            </motion.div>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: 'rgba(69,26,3,0.48)', marginTop: 14 }}>3-day free trial · No app download · Cancel anytime</p>
          </Reveal>
        </div>
      </section>

      {/* ── MOBILE STICKY BAR — floating glass pill, matches ParentBottomNav ── */}
      <motion.div
        initial={rm ? {} : { y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE_EXP, delay: 1.6 }}
        className="lg:hidden fixed left-0 right-0 z-50 flex justify-center px-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <div
          className="max-w-lg w-full flex"
          style={{
            gap: 10,
            padding: '10px',
            borderRadius: 28,
            background: 'oklch(0.995 0.005 85 / 0.72)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid oklch(0.906 0.06 88 / 0.55)',
            boxShadow: [
              'inset 0 1px 0 rgba(255,255,255,0.55)',
              'inset 0 -1px 0 rgba(10,47,53,0.05)',
              '0 8px 24px -6px rgba(10,47,53,0.16)',
              '0 24px 48px -16px rgba(10,47,53,0.18)',
            ].join(', '),
          }}>
          <Link href="/setup?go=1"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 20, background: `linear-gradient(155deg,${C.orange},${C.orangeDeep})`, boxShadow: '0 4px 0 rgba(175,65,10,0.26),0 8px 20px rgba(245,107,34,0.28)', color: '#451A03', fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Set up your dog
          </Link>
          <Link href="/upgrade"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px',
              borderRadius: 20, background: '#fff', color: C.teal, fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 700, textDecoration: 'none',
              border: `1.5px solid ${C.teal}`,
              boxShadow: CLAY_SHADOW_TEAL_OUTLINE,
            }}>
            See pricing
          </Link>
        </div>
      </motion.div>

    </div>
  )
}
