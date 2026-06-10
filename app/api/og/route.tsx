import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const revalidate = 2592000 // 30 days — static image never changes

const fontData = readFileSync(
  path.join(process.cwd(), 'public/fonts/DMSerifDisplay-Regular.ttf'),
)

// ── Color tokens ──────────────────────────────────────────────────────────────
const BG1     = '#FFFBEF'
const BG2     = '#FEF3C7'
const AMBER   = '#F59E0B'
const AMBER_D = '#D97706'
const BROWN   = '#1C0A00'
const BROWN_M = '#78350F'
const TEAL    = '#0B7A8A'

// ── Layout constants ──────────────────────────────────────────────────────────
const RIGHT_W = 456            // right photo panel width
const CARD_L  = 36             // card left offset
const CARD_T  = 36             // card top offset
const CARD_W  = 1200 - RIGHT_W - CARD_L - 28  // 680px

// ── Category chips ────────────────────────────────────────────────────────────
const CATS = [
  { emoji: '🦮', label: 'Dog Walking', bg: '#FDE68A', fg: '#78350F' },
  { emoji: '✂️', label: 'Grooming',   bg: '#E9D5FF', fg: '#4C1D95' },
  { emoji: '🏥', label: 'Vet',        bg: '#FECDD3', fg: '#9F1239' },
  { emoji: '🐾', label: 'Pet Store',  bg: '#BBF7D0', fg: '#064E3B' },
]

// ── Trust badges ──────────────────────────────────────────────────────────────
const BADGES = [
  { icon: '✓', text: 'Manually verified', bg: '#FDE68A', fg: '#78350F' },
  { icon: '💬', text: 'WhatsApp direct',  bg: '#BBF7D0', fg: '#064E3B' },
  { icon: '₹',  text: '0 fees, always',   bg: '#FECDD3', fg: '#7C2D12' },
]

const DOG_PHOTO =
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=580&h=580&fit=crop&crop=faces,center&auto=format&q=88'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: 1200,
          height: 630,
          position: 'relative',
          background: `linear-gradient(135deg, ${BG1} 0%, ${BG2} 55%, ${BG1} 100%)`,
          fontFamily: '"Inter", system-ui, sans-serif',
          overflow: 'hidden',
        }}
      >

        {/* ── Ambient amber bloom ──────────────────────────────────────────── */}
        <div style={{ position: 'absolute', top: '20%', left: '55%', width: 520, height: 520, borderRadius: '50%', background: '#FDE68A', opacity: 0.16, display: 'flex' }} />

        {/* ── 3D Spheres ───────────────────────────────────────────────────── */}

        {/* Large amber — top-right corner */}
        <div style={{ position: 'absolute', top: -65, right: -65, width: 290, height: 290, borderRadius: '50%', background: 'radial-gradient(circle at 32% 30%, #FEF9C3, #FDE68A 44%, #F59E0B 72%, #D97706)', boxShadow: '0 32px 80px rgba(180,83,9,0.24)', display: 'flex', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 38, left: 46, width: 76, height: 54, borderRadius: '50%', background: 'rgba(255,255,255,0.42)', display: 'flex' }} />
        </div>

        {/* Medium teal — bottom-right corner */}
        <div style={{ position: 'absolute', bottom: -40, right: 70, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle at 30% 28%, #99F6E4, #14B8A6 55%, #0B7A8A)', boxShadow: '0 16px 48px rgba(11,122,138,0.26)', display: 'flex', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 20, left: 24, width: 40, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.38)', display: 'flex' }} />
        </div>

        {/* Small lavender — mid-right */}
        <div style={{ position: 'absolute', top: 370, right: 410, width: 62, height: 62, borderRadius: '50%', background: 'radial-gradient(circle at 30% 28%, #EDE9FE, #C4B5FD 50%, #7C3AED)', boxShadow: '0 8px 24px rgba(124,58,237,0.22)', display: 'flex', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 8, left: 9, width: 16, height: 11, borderRadius: '50%', background: 'rgba(255,255,255,0.42)', display: 'flex' }} />
        </div>

        {/* Tiny amber — scattered */}
        <div style={{ position: 'absolute', top: 58, right: 428, width: 40, height: 40, borderRadius: '50%', background: 'radial-gradient(circle at 30% 28%, #FDE68A, #F59E0B 55%, #B45309)', boxShadow: '0 5px 16px rgba(180,83,9,0.26)', display: 'flex', overflow: 'hidden' }} />

        {/* ── Left clay card ───────────────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            left: CARD_L,
            top: CARD_T,
            width: CARD_W,
            height: 630 - CARD_T * 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'rgba(255, 252, 240, 0.93)',
            borderRadius: 44,
            padding: '38px 46px',
            boxShadow: '0 24px 72px rgba(120, 53, 15, 0.16), inset 0 1.5px 0 rgba(255,255,255,0.98)',
            border: '2.5px solid rgba(255, 255, 255, 0.96)',
          }}
        >

          {/* Brand row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 32 }}>🐾</span>
              <span style={{ fontFamily: '"DMSerif"', fontSize: 28, color: BROWN, lineHeight: 1 }}>
                Pup<span style={{ color: TEAL }}>Step</span>
              </span>
            </div>
            {/* Location pill */}
            <div style={{ display: 'flex', alignItems: 'center', background: AMBER, borderRadius: 100, padding: '7px 18px', boxShadow: '0 5px 18px rgba(180,83,9,0.26)', border: '2px solid rgba(255,255,255,0.65)' }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.6, color: '#FFFDF5', textTransform: 'uppercase' as const }}>Juhu, Mumbai</span>
            </div>
          </div>

          {/* Headline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontFamily: '"DMSerif"', fontSize: 55, color: BROWN, lineHeight: 1.04, letterSpacing: '-0.5px', display: 'flex' }}>
              Your dog&apos;s world,
            </div>
            <div style={{ fontFamily: '"DMSerif"', fontSize: 66, color: AMBER_D, lineHeight: 1.0, letterSpacing: '-0.5px', display: 'flex' }}>
              right here.
            </div>
            <div style={{ fontSize: 18, color: BROWN_M, marginTop: 10, lineHeight: 1.55, opacity: 0.78, display: 'flex' }}>
              Verified walkers, vets and groomers — WhatsApp direct, zero fees.
            </div>
          </div>

          {/* Category chips */}
          <div style={{ display: 'flex', gap: 10 }}>
            {CATS.map(({ emoji, label, bg, fg }) => (
              <div
                key={label}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: bg, borderRadius: 100, padding: '9px 18px', border: '2.5px solid rgba(255,255,255,0.88)', boxShadow: '0 4px 14px rgba(0,0,0,0.07)' }}
              >
                <span style={{ fontSize: 18 }}>{emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: fg }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', gap: 10 }}>
            {BADGES.map(({ icon, text, bg, fg }) => (
              <div
                key={text}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: bg, borderRadius: 100, padding: '8px 18px', border: '2px solid rgba(255,255,255,0.82)', boxShadow: '0 3px 10px rgba(0,0,0,0.07)' }}
              >
                <span style={{ fontSize: 16, fontWeight: 800, color: fg }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: fg }}>{text}</span>
              </div>
            ))}
          </div>

        </div>

        {/* ── Right photo panel ────────────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: RIGHT_W,
            height: 630,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Amber bloom behind photo */}
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, #FDE68A 0%, #FED7AA 45%, transparent 72%)', opacity: 0.72, display: 'flex' }} />

          {/* Dog photo circle */}
          <div
            style={{
              position: 'relative',
              width: 310,
              height: 310,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '7px solid #FEF3C7',
              boxShadow: '0 12px 0px rgba(180,83,9,0.20), 0 28px 60px rgba(253,230,138,0.50)',
              display: 'flex',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DOG_PHOTO}
              alt=""
              width={310}
              height={310}
              style={{ objectFit: 'cover', objectPosition: 'center 22%', width: 310, height: 310 }}
            />
          </div>

          {/* Verified pill — floating bottom-left of photo */}
          <div
            style={{
              position: 'absolute',
              bottom: 148,
              left: 12,
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 252, 240, 0.96)',
              borderRadius: 100,
              padding: '9px 18px',
              boxShadow: '0 5px 16px rgba(120,53,15,0.14)',
              border: '1.5px solid rgba(253,230,138,0.75)',
              gap: 7,
            }}
          >
            <span style={{ fontSize: 15, color: TEAL, fontWeight: 800 }}>✓</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: BROWN_M }}>Verified providers only</span>
          </div>

          {/* pupstep.in watermark */}
          <div style={{ position: 'absolute', bottom: 28, right: 28, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 13, color: AMBER_D, fontWeight: 700, opacity: 0.8 }}>pupstep.in</span>
          </div>
        </div>

      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'DMSerif', data: fontData, style: 'normal', weight: 400 }],
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=31536000',
      },
    },
  )
}
