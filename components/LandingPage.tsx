'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  motion, useScroll, useTransform, useInView,
} from 'framer-motion'
import {
  MapPin, Check, Timer, Ruler, Navigation,
  ArrowRight, ChevronDown, QrCode, Camera,
  FileText, Share2, MessageCircle, Zap, Shield,
  PawPrint as LucidePaw,
} from 'lucide-react'

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

// ─── Scroll reveal ───────────────────────────────────────────────────────────
function Reveal({
  children, delay = 0, className = '', style = {},
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px 0px' })
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(26px)',
        transition: `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── Walk report mock ────────────────────────────────────────────────────────
function WalkReportMock() {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 24,
      boxShadow: '0 8px 0 rgba(0,0,0,0.09), 0 24px 64px rgba(10,47,53,0.16), inset 0 2px 0 rgba(255,255,255,0.9)',
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
          alt="Bruno the dog on his walk"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(10,47,53,0.82)', borderRadius: 8, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Camera size={10} color="rgba(255,255,255,0.7)" />
          <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Walk photo</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderBottom: '1px solid #f3f4f6' }}>
        {[
          { icon: <Timer size={13} />, label: 'Duration', value: '32 min' },
          { icon: <Ruler size={13} />, label: 'Distance', value: '2.1 km' },
          { icon: <Navigation size={13} />, label: 'Poop + Pee', value: '2 + 3' },
        ].map(({ icon, label, value }, i) => (
          <div key={label} style={{ padding: '10px 8px', textAlign: 'center', borderRight: i < 2 ? '1px solid #f3f4f6' : 'none' }}>
            <div style={{ color: C.teal, display: 'flex', justifyContent: 'center', marginBottom: 3 }}>{icon}</div>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: C.dark, margin: 0 }}>{value}</p>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 9, color: '#9CA3AF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* GPS map preview */}
      <div style={{ height: 76, background: 'linear-gradient(135deg, #e8f5f8, #d0ebf1)', position: 'relative', overflow: 'hidden' }}>
        <svg viewBox="0 0 340 76" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <polyline points="16,58 55,44 100,48 145,32 190,38 230,22 275,28 324,16"
            fill="none" stroke="oklch(0.48 0.17 196)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="58" r="4" fill={C.orange} />
          <circle cx="324" cy="16" r="4" fill="oklch(0.48 0.17 196)" />
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

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'Does my walker need to download an app?', a: 'No. They open a link from WhatsApp. No App Store, no signup, no account.' },
  { q: 'How does the QR code work?', a: 'You show the QR on your phone. Your walker scans it and enters a 4-digit code to connect. One-time setup, takes under a minute.' },
  { q: 'What is in the walk report?', a: 'GPS route, pee and poop count with map markers, a dog photo, walk duration and distance, and walker notes — delivered on WhatsApp.' },
  { q: 'How much does it cost?', a: '3-day free trial with no credit card needed. After that, ₹199/month for full walk history and unlimited walkers.' },
  { q: 'Can I share the report with my vet?', a: 'Yes. Every report has a shareable link you can forward to anyone — family, vets, or groomers.' },
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
  const cardRotate = useTransform(scrollY, [0, 600], [0, rm ? 0 :  2])

  return (
    <div style={{ background: C.pageBg }} className="-mt-8">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        style={{ ...BLEED, background: C.pageBg, position: 'relative', overflow: 'hidden' }}
        className="min-h-[100svh] flex flex-col justify-center"
      >
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden
          style={{ backgroundImage: 'radial-gradient(circle,rgba(180,83,9,0.04) 1px,transparent 1px)', backgroundSize: '30px 30px' }} />

        {/* Teal glow blob */}
        <motion.div className="absolute pointer-events-none" aria-hidden
          style={{ top: -120, right: -100, width: 480, height: 480, borderRadius: '50%', background: 'oklch(0.48 0.17 196 / 0.07)', filter: 'blur(70px)' }}
          animate={rm ? {} : { y: [0, -22, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Orange glow blob */}
        <motion.div className="absolute pointer-events-none" aria-hidden
          style={{ bottom: -80, left: -60, width: 320, height: 320, borderRadius: '50%', background: C.orange, opacity: 0.055, filter: 'blur(55px)' }}
          animate={rm ? {} : { y: [0, -15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.8 }} />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-16 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-20">

            {/* Text */}
            <div className="flex-1 text-center lg:text-left w-full">

              {/* Badge */}
              <motion.div initial={rm ? {} : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_EXP }}>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase px-4 py-1.5 mb-7"
                  style={{ background: 'linear-gradient(155deg,#FEF3C7,#FDE68A)', boxShadow: '0 4px 0 rgba(180,83,9,0.14),0 10px 28px rgba(253,230,138,0.48),inset 0 1.5px 0 rgba(255,255,255,0.95)', border: '1px solid rgba(253,230,138,0.6)', borderRadius: 100, color: '#78350F', display: 'inline-flex' }}>
                  <MapPin size={11} strokeWidth={2.5} />
                  Mumbai · For dog parents
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={rm ? {} : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE_EXP, delay: 0.07 }}
                style={{ fontFamily: 'var(--font-fredoka)', fontSize: 'clamp(2.6rem,6.5vw,5rem)', lineHeight: 1.04, letterSpacing: '-0.02em', color: C.dark, marginBottom: 20 }}>
                Your dog gets walked.<br />
                <span style={{ color: C.orange }}>Now prove it.</span>
              </motion.h1>

              {/* Sub */}
              <motion.p
                initial={rm ? {} : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE_EXP, delay: 0.16 }}
                style={{ fontFamily: 'var(--font-nunito)', fontSize: 'clamp(1rem,2vw,1.15rem)', lineHeight: 1.7, color: '#64748B', maxWidth: 460, marginBottom: 32, marginLeft: 'auto', marginRight: 'auto' }}
                className="lg:mx-0">
                GPS route, pee and poop map, dog photo — delivered to your WhatsApp after every single walk.
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
                {['3-day free trial', 'No app download', 'Walker uses WhatsApp'].map(t => (
                  <span key={t} className="flex items-center gap-1.5"
                    style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>
                    <Check size={12} style={{ color: C.teal }} strokeWidth={3} /> {t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Report card with parallax */}
            <div className="flex-shrink-0 w-full max-w-[340px] lg:max-w-[380px] flex justify-center lg:justify-end">
              <motion.div
                initial={rm ? {} : { opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE_EXP, delay: 0.2 }}
                style={{ y: cardY, rotate: cardRotate, width: '100%' }}>
                <WalkReportMock />
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
              { icon: <LucidePaw size={14} />, text: 'Mumbai dog parents trust PupStep' },
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

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works"
        style={{ ...BLEED, background: 'linear-gradient(120deg,#FEF9ED,#FEF3C7 50%,#FEF9ED)', borderTop: '1.5px solid rgba(253,230,138,0.8)', borderBottom: '1.5px solid rgba(253,230,138,0.8)' }}
        className="py-16 sm:py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">

          <Reveal className="text-center mb-16">
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.orange, marginBottom: 12 }}>3 steps, zero friction</p>
            <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 'clamp(1.9rem,4vw,3rem)', color: C.dark, marginBottom: 10 }}>How it works</h2>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, color: '#64748B', maxWidth: 340, margin: '0 auto' }}>Set it up once. Reports arrive automatically after every walk.</p>
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
              <Reveal key={title} delay={delay} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 18px', position: 'relative', zIndex: 1 }}>
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
              { num: 4, icon: <MessageCircle size={18} strokeWidth={1.5} />, title: 'Report on WhatsApp', body: 'GPS proof, photos, and health markers delivered to your phone automatically.', delay: 0.24, last: true },
            ].map(({ num, icon, title, body, delay, last }) => (
              <div key={title} className="flex gap-4">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 0 rgba(0,0,0,0.05),0 8px 20px rgba(0,0,0,0.07)', border: '1.5px solid rgba(226,232,240,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.teal, position: 'relative' }}>
                    {icon}
                    <span style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fredoka)', fontSize: 10, fontWeight: 700, color: '#fff' }}>{num}</span>
                  </div>
                  {!last && <div style={{ width: 2, flex: 1, minHeight: 28, background: 'linear-gradient(180deg,rgba(255,140,82,0.35),rgba(255,140,82,0.1))', margin: '6px 0' }} />}
                </div>
                <Reveal delay={delay} style={{ paddingBottom: last ? 0 : 28 }}>
                  <h3 style={{ fontFamily: 'var(--font-fredoka)', fontSize: '1.1rem', fontWeight: 700, color: C.dark, marginBottom: 4, marginTop: 10 }}>{title}</h3>
                  <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 }}>{body}</p>
                </Reveal>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── WHAT'S IN THE REPORT ──────────────────────────────────────────── */}
      <section style={{ ...BLEED, background: C.pageBg }} className="py-16 sm:py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-20">

            {/* Card */}
            <Reveal className="w-full flex justify-center lg:flex-shrink-0 lg:w-auto">
              <WalkReportMock />
            </Reveal>

            {/* Features */}
            <div className="flex-1 w-full">
              <Reveal>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.orange, marginBottom: 12 }}>Every walk, every time</p>
                <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 'clamp(1.9rem,4vw,2.8rem)', color: C.dark, marginBottom: 8 }}>What&apos;s in the report</h2>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, color: '#64748B', marginBottom: 28, lineHeight: 1.65, maxWidth: 380 }}>Everything you need to know, delivered to WhatsApp in seconds after every walk.</p>
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
                  <Reveal key={title} delay={i * 0.055}>
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
          <Reveal className="text-center mb-10 px-5 sm:px-8">
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.orange, marginBottom: 10 }}>Mumbai dog parents</p>
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
              <div key={name} style={{ flexShrink: 0, width: 300, scrollSnapAlign: 'start', background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 0 rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.05)', border: '1px solid rgba(226,232,240,0.7)' }}>
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

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing"
        style={{ ...BLEED, background: `linear-gradient(135deg,${C.dark} 0%,#0D3D45 50%,${C.dark} 100%)`, position: 'relative', overflow: 'hidden' }}
        className="py-16 sm:py-20 lg:py-28">
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 70% 40%,rgba(255,140,82,0.07) 0%,transparent 60%)' }} />

        <div className="relative max-w-4xl mx-auto px-5 sm:px-8">
          <Reveal className="text-center mb-14">
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.orange, marginBottom: 12 }}>Simple pricing</p>
            <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 'clamp(1.9rem,4vw,3rem)', color: '#FFFBEB', marginBottom: 10 }}>Start free. Upgrade when ready.</h2>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, color: 'rgba(255,255,255,0.45)', maxWidth: 320, margin: '0 auto' }}>Your walker is always free. Pro is for parents who want the full history.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {/* Free */}
            <Reveal delay={0.06}>
              <div style={{ borderRadius: 24, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', padding: 32, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'oklch(0.75 0.12 196)', marginBottom: 8 }}>Free trial</p>
                <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 28, fontWeight: 700, color: '#FFFBEB', marginBottom: 4 }}>3 days free</p>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 20 }}>No credit card needed</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginBottom: 24, listStyle: 'none', padding: 0 }}>
                  {['Unlimited walks', 'GPS reports', 'Dog photo', 'WhatsApp delivery'].map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                      <Check size={13} style={{ color: 'oklch(0.75 0.12 196)', flexShrink: 0 }} strokeWidth={2.5} /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/setup?go=1"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 100, padding: '12px 24px', background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.18)', color: '#FFFBEB', fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  Start free <ArrowRight size={14} />
                </Link>
              </div>
            </Reveal>

            {/* Pro */}
            <Reveal delay={0.14}>
              <div style={{ borderRadius: 24, background: `linear-gradient(155deg,${C.orange},${C.orangeDeep})`, boxShadow: '0 8px 0 rgba(175,65,10,0.28),0 24px 60px rgba(245,107,34,0.32)', border: '1.5px solid rgba(255,255,255,0.18)', padding: 32, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                <span style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)', borderRadius: 100, padding: '3px 10px', fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 700, color: '#451A03' }}>Most popular</span>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(45,10,0,0.55)', marginBottom: 8 }}>Pro plan</p>
                <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 36, fontWeight: 700, color: '#2D0A00', marginBottom: 2 }}>
                  ₹199<span style={{ fontSize: 16, fontWeight: 600 }}>/month</span>
                </p>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'rgba(45,10,0,0.52)', marginBottom: 20 }}>Full walk history, unlimited walkers</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginBottom: 24, listStyle: 'none', padding: 0 }}>
                  {['Everything in free', 'Full report history', 'Multiple walkers', 'Vet-ready health PDFs'].map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#2D0A00' }}>
                      <Check size={13} style={{ color: '#2D0A00', flexShrink: 0 }} strokeWidth={2.5} /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/upgrade"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 100, padding: '12px 24px', background: C.dark, color: '#FFFBEB', fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  Get reports delivered <ArrowRight size={14} />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section style={{ ...BLEED, background: C.pageBg }} className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-2xl mx-auto px-5 sm:px-8">
          <Reveal className="text-center mb-10">
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.orange, marginBottom: 12 }}>Questions</p>
            <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 'clamp(1.9rem,4vw,2.8rem)', color: C.dark }}>Common questions</h2>
          </Reveal>
          <Reveal delay={0.06}>
            <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 4px 0 rgba(0,0,0,0.04),0 12px 36px rgba(0,0,0,0.05)', border: '1px solid rgba(226,232,240,0.7)', padding: '4px 24px' }}>
              {FAQ_ITEMS.map(item => <AccordionItem key={item.q} q={item.q} a={item.a} />)}
            </div>
          </Reveal>
          <Reveal delay={0.1} className="text-center mt-6">
            <Link href="/faq" style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: C.teal, textDecoration: 'none' }}>See all FAQs →</Link>
          </Reveal>
        </div>
      </section>

      {/* ── CLOSING CTA ───────────────────────────────────────────────────── */}
      <section style={{ ...BLEED, background: C.orange, position: 'relative', overflow: 'hidden' }} className="py-16 sm:py-20">
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative max-w-2xl mx-auto px-5 sm:px-8 text-center">
          <Reveal>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(69,26,3,0.55)', marginBottom: 14 }}>Ready to try?</p>
            <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 'clamp(2rem,5vw,3.2rem)', color: '#451A03', marginBottom: 12, lineHeight: 1.1 }}>
              Your dog&apos;s first report,<br />in under 10 minutes.
            </h2>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, color: 'rgba(69,26,3,0.6)', marginBottom: 28, lineHeight: 1.65 }}>
              Add your dog, share a QR with your walker, and wait for the first report on WhatsApp.
            </p>
            <motion.div whileHover={rm ? {} : { y: -3, scale: 1.03 }} whileTap={rm ? {} : { scale: 0.97 }} transition={SPRING} style={{ display: 'inline-block' }}>
              <Link href="/setup?go=1"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 100, padding: '16px 36px', background: C.dark, color: '#FFFBEB', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 0 rgba(0,0,0,0.18),0 16px 40px rgba(10,47,53,0.32)' }}>
                Set up your dog <ArrowRight size={16} />
              </Link>
            </motion.div>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: 'rgba(69,26,3,0.42)', marginTop: 14 }}>3-day free trial · No app download · Cancel anytime</p>
          </Reveal>
        </div>
      </section>

      {/* ── MOBILE STICKY BAR ─────────────────────────────────────────────── */}
      <motion.div
        initial={rm ? {} : { y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE_EXP, delay: 1.6 }}
        className="lg:hidden fixed bottom-0 inset-x-0 z-50"
        style={{ background: 'rgba(255,251,235,0.97)', borderTop: '1px solid #FDE68A', backdropFilter: 'blur(10px)', paddingBottom: 'env(safe-area-inset-bottom,12px)' }}>
        <div style={{ display: 'flex', gap: 10, padding: '10px 16px' }}>
          <Link href="/setup?go=1"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 16, background: `linear-gradient(155deg,${C.orange},${C.orangeDeep})`, boxShadow: '0 4px 0 rgba(175,65,10,0.26),0 8px 20px rgba(245,107,34,0.28)', color: '#451A03', fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Set up your dog
          </Link>
          <Link href="/upgrade"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 16, background: 'rgba(10,47,53,0.08)', color: C.dark, fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            See pricing
          </Link>
        </div>
      </motion.div>

    </div>
  )
}
