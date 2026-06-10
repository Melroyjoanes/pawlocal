import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const revalidate = 2592000 // 30 days

// ── Fonts ─────────────────────────────────────────────────────────────────────
const fontData = readFileSync(
  path.join(process.cwd(), 'public/fonts/DMSerifDisplay-Regular.ttf'),
)

// ── Horizontal PupStep logo as base64 data URI ────────────────────────────────
const logoBuffer = readFileSync(path.join(process.cwd(), 'public/logo.png'))
const logoSrc    = `data:image/png;base64,${logoBuffer.toString('base64')}`

// ── Brand tokens ──────────────────────────────────────────────────────────────
const CREAM  = '#FFFBEF'
const CREAM2 = '#FEF3C7'
const TEAL   = '#0A8A96'
const ORANGE = '#F07030'
const BROWN  = '#1C0A00'
const BROWN2 = '#78350F'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: 1200,
          height: 630,
          background: `linear-gradient(145deg, ${CREAM} 0%, ${CREAM2} 60%, ${CREAM} 100%)`,
          fontFamily: 'system-ui, sans-serif',
          overflow: 'hidden',
          position: 'relative',
        }}
      >

        {/* ── Ambient warm bloom — centred glow ─────────────────────────── */}
        <div style={{
          position: 'absolute', top: '15%', left: '35%',
          width: 560, height: 560, borderRadius: '50%',
          background: 'radial-gradient(ellipse, #FDE68A 0%, #FED7AA 40%, transparent 70%)',
          opacity: 0.28, display: 'flex',
        }} />

        {/* ── 3D Sphere — large orange, top-right corner ────────────────── */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 28%, #FFE4CC, #FFAA66 38%, #F07030 65%, #C04010)',
          boxShadow: '0 32px 80px rgba(180,83,9,0.30)',
          display: 'flex', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 44, left: 52, width: 80, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.38)', display: 'flex' }} />
        </div>

        {/* ── 3D Sphere — teal, bottom-left ─────────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: -55, left: -55,
          width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 28%, #99F6E4, #2DD4BF 45%, #0A8A96 68%, #065A67)',
          boxShadow: '0 24px 60px rgba(10,138,150,0.32)',
          display: 'flex', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 26, left: 30, width: 54, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.35)', display: 'flex' }} />
        </div>

        {/* ── 3D Sphere — lavender, mid-left ────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 60, left: 32,
          width: 70, height: 70, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 28%, #EDE9FE, #C4B5FD 48%, #7C3AED)',
          boxShadow: '0 10px 28px rgba(124,58,237,0.22)',
          display: 'flex', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 9, left: 10, width: 18, height: 12, borderRadius: '50%', background: 'rgba(255,255,255,0.40)', display: 'flex' }} />
        </div>

        {/* ── 3D Sphere — small lemon, above logo ───────────────────────── */}
        <div style={{
          position: 'absolute', top: 28, right: 285,
          width: 52, height: 52, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 28%, #FEFCE8, #FEF08A 45%, #EAB308)',
          boxShadow: '0 7px 20px rgba(202,138,4,0.28)',
          display: 'flex', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 7, left: 8, width: 13, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', display: 'flex' }} />
        </div>

        {/* ── 3D Sphere — small rose, below logo ────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 60, right: 128,
          width: 44, height: 44, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 28%, #FFF1F2, #FECDD3 45%, #FB7185)',
          boxShadow: '0 6px 18px rgba(251,113,133,0.26)',
          display: 'flex', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 5, left: 6, width: 11, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.42)', display: 'flex' }} />
        </div>

        {/* ── Sparkle stars ─────────────────────────────────────────────── */}
        {/* Top-left cluster */}
        <div style={{ position: 'absolute', top: 38, left: 130, fontSize: 22, display: 'flex', color: ORANGE, opacity: 0.7 }}>✦</div>
        <div style={{ position: 'absolute', top: 82, left: 88,  fontSize: 14, display: 'flex', color: TEAL,   opacity: 0.55 }}>✦</div>
        {/* Bottom-right cluster */}
        <div style={{ position: 'absolute', bottom: 56, right: 220, fontSize: 18, display: 'flex', color: ORANGE, opacity: 0.65 }}>✦</div>
        <div style={{ position: 'absolute', bottom: 96, right: 168, fontSize: 11, display: 'flex', color: TEAL,   opacity: 0.50 }}>✦</div>

        {/* ── Left: text content ────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', left: 56, top: 0, bottom: 0,
          width: 610,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0,
        }}>

          {/* Eyebrow pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: TEAL, borderRadius: 100,
            padding: '7px 20px', marginBottom: 22,
            width: 'fit-content',
            boxShadow: '0 6px 20px rgba(10,138,150,0.30)',
          }}>
            <span style={{ fontSize: 15 }}>🐾</span>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '2.5px', color: '#FFFDF5', textTransform: 'uppercase' }}>Juhu, Mumbai</span>
          </div>

          {/* Headline — conversational, second-person */}
          <div style={{
            fontFamily: '"DMSerif"', fontSize: 58, color: BROWN,
            lineHeight: 1.06, letterSpacing: '-0.5px',
            display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16,
          }}>
            <span style={{ display: 'flex' }}>Your pup&apos;s people</span>
            <span style={{ display: 'flex', color: ORANGE }}>are right here.</span>
          </div>

          {/* Sub-copy — warm, direct */}
          <div style={{
            fontSize: 19, color: BROWN2, lineHeight: 1.55,
            opacity: 0.82, display: 'flex', marginBottom: 30, maxWidth: 520,
          }}>
            Trusted walkers, vets &amp; groomers near you in Juhu. WhatsApp them directly. Zero booking fees, always.
          </div>

          {/* Trust pills */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { icon: '✓', label: 'Manually verified', bg: '#FEF3C7', fg: BROWN2 },
              { icon: '💬', label: 'WhatsApp direct',  bg: '#BBF7D0', fg: '#064E3B' },
              { icon: '₹',  label: '0 fees, always',   bg: '#FECDD3', fg: '#9F1239' },
            ].map(({ icon, label, bg, fg }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: bg, borderRadius: 100, padding: '9px 18px',
                border: '2px solid rgba(255,255,255,0.88)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.07)',
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: fg }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: fg }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Domain watermark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 28 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: ORANGE, opacity: 0.7 }}>pupstep.in</span>
          </div>

        </div>

        {/* ── Right: circular logo, floating ────────────────────────────── */}
        <div style={{
          position: 'absolute', right: 52, top: 0, bottom: 0,
          width: 430,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Soft glow behind logo */}
          <div style={{
            position: 'absolute',
            width: 420, height: 420, borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(253,230,138,0.55) 0%, rgba(254,215,170,0.30) 50%, transparent 72%)',
            display: 'flex',
          }} />

          {/* Horizontal PupStep logo — crisp, prominent */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            width={380}
            height={140}
            style={{
              width: 380, height: 140,
              objectFit: 'contain',
              filter: 'drop-shadow(0 12px 32px rgba(15,45,50,0.16))',
            }}
            alt="PupStep"
          />
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
