import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const alt = 'PawLocal Walk Report'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Cache for 24 hours — walk report data never changes after creation.
// Next.js serves the cached PNG instantly; no Supabase/satori cold-start on repeat hits.
export const revalidate = 86400

// ── Font loaded once at module level (cached across requests) ──
const fontData = readFileSync(
  path.join(process.cwd(), 'public/fonts/DMSerifDisplay-Regular.ttf')
)

type Report = {
  dog_name: string
  duration_mins: number
  poop_count: number
  pee_count: number
  distance_meters: number | null
  photo_url: string | null
  walk_date: string
  provider_name: string
  is_verified: boolean
}

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return '' }
}

function fmtDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

// ── Amber / golden yellow palette ─────────────────────────────
const AMBER_BG     = '#FDE68A'  // warm lemon — main bg left
const AMBER_MID    = '#FCD34D'  // golden mid
const AMBER_RICH   = '#F59E0B'  // rich amber accent
const AMBER_DEEP   = '#D97706'  // pl-amber — logo, badges
const BROWN_DARK   = '#451A03'  // darkest brown — primary text
const BROWN_MID    = '#78350F'  // mid brown — secondary text
const BROWN_GHOST  = 'rgba(69,26,3,0.45)'  // ghost text
const WHITE_PURE   = '#fffefa'  // near-white for photo overlay
const TEAL         = '#0b7a8a'  // pl-teal — logo only (small)

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // ── Fetch report ──────────────────────────────────────────────
  let report: Report | null = null
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin.from('walk_reports') as any)
      .select('dog_name, duration_mins, poop_count, pee_count, distance_meters, photo_url, walk_date, providers(name, is_verified)')
      .eq('token', token)
      .single()

    if (data) {
      report = {
        dog_name: data.dog_name ?? 'Dog',
        duration_mins: data.duration_mins ?? 0,
        poop_count: data.poop_count ?? 0,
        pee_count: data.pee_count ?? 0,
        distance_meters: data.distance_meters ?? null,
        photo_url: data.photo_url ?? null,
        walk_date: data.walk_date,
        provider_name: data.providers?.name ?? 'Your Walker',
        is_verified: data.providers?.is_verified ?? false,
      }
    }
  } catch { /* render fallback card */ }

  // ── Data ─────────────────────────────────────────────────────
  const dogName  = report?.dog_name ?? 'Walk Report'
  const walker   = report?.provider_name ?? ''
  const verified = report?.is_verified ?? false
  const dateStr  = report ? formatDate(report.walk_date) : ''
  const photoUrl = report?.photo_url ?? null
  const poops    = report?.poop_count ?? 0
  const pees     = report?.pee_count ?? 0
  const mins     = report?.duration_mins ?? 0
  const dist     = (report?.distance_meters ?? 0) > 0
    ? fmtDistance(report!.distance_meters!)
    : null

  const statParts: string[] = []
  if (poops > 0) statParts.push(`💩 ${poops}`)
  if (pees > 0)  statParts.push(`💧 ${pees}`)
  if (mins > 0)  statParts.push(`⏱ ${mins} mins`)
  if (dist)      statParts.push(`📏 ${dist}`)
  const statLine = statParts.join('   ')

  const nameFontSize = dogName.length > 12 ? 76 : dogName.length > 8 ? 88 : 98

  const PHOTO_W = 460

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: 1200,
          height: 630,
          position: 'relative',
          // warm golden gradient — bright left, richer right edge
          background: `linear-gradient(135deg, ${AMBER_BG} 0%, ${AMBER_MID} 55%, ${AMBER_RICH} 100%)`,
          fontFamily: '"Inter", system-ui, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* ── Soft radial warmth — top-left glow ──────────────── */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            left: -60,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,220,0.55) 0%, transparent 68%)',
            display: 'flex',
          }}
        />
        {/* Bottom right warmth */}
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            right: PHOTO_W + 20,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.28) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* ── Left content panel ─────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 1200 - PHOTO_W,
            height: 630,
            padding: '44px 52px',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Logo + Walk Report badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>🐾</span>
              <span
                style={{
                  fontFamily: '"DMSerif"',
                  fontSize: 26,
                  color: BROWN_DARK,
                  lineHeight: 1,
                }}
              >
                Paw<span style={{ color: TEAL }}>Local</span>
              </span>
            </div>

            {/* Walk Report pill — white on amber, rounded */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.55)',
                border: `1.5px solid rgba(255,255,255,0.85)`,
                borderRadius: 40,
                padding: '5px 14px',
                marginLeft: 4,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 2.5,
                  color: BROWN_MID,
                  textTransform: 'uppercase',
                }}
              >
                Walk Report
              </span>
            </div>
          </div>

          {/* Dog name — the hero element */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                fontFamily: '"DMSerif"',
                fontSize: nameFontSize,
                color: BROWN_DARK,
                lineHeight: 1.0,
                display: 'flex',
                letterSpacing: '-0.5px',
              }}
            >
              {dogName}&apos;s Walk
            </div>

            {/* Walker + verified */}
            {walker && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <span style={{ fontSize: 22, color: BROWN_MID, fontWeight: 500 }}>
                  by {walker}
                </span>
                {verified && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.60)',
                      border: '1.5px solid rgba(255,255,255,0.9)',
                      borderRadius: 24,
                      padding: '4px 12px',
                    }}
                  >
                    <span style={{ fontSize: 13, color: TEAL, fontWeight: 700 }}>
                      ✓ Verified
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          {statLine.length > 0 && (
            <div
              style={{
                display: 'flex',
                fontSize: 27,
                color: BROWN_DARK,
                fontWeight: 700,
                letterSpacing: 0.2,
              }}
            >
              {statLine}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, color: BROWN_GHOST }}>📍 Juhu, Mumbai</span>
            {dateStr && (
              <>
                <span style={{ color: BROWN_GHOST, fontSize: 15 }}>·</span>
                <span style={{ fontSize: 15, color: BROWN_GHOST }}>{dateStr}</span>
              </>
            )}
            <span style={{ color: BROWN_GHOST, fontSize: 15, marginLeft: 2 }}>·</span>
            <span style={{ fontSize: 15, color: BROWN_GHOST, fontWeight: 600 }}>
              pawlocal.in
            </span>
          </div>
        </div>

        {/* ── Right panel: dog photo or warm no-photo state ────── */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: PHOTO_W,
            height: 630,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {photoUrl ? (
            <div style={{ display: 'flex', width: PHOTO_W, height: 630, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
              {/*
                Rotate 90° clockwise so portrait photos fill the landscape panel.
                DOM size is swapped (630 wide × PHOTO_W tall) so after rotation
                the visual result is exactly PHOTO_W wide × 630 tall — fills the panel.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt=""
                width={630}
                height={PHOTO_W}
                style={{
                  objectFit: 'cover',
                  width: 630,
                  height: PHOTO_W,
                  transform: 'rotate(90deg)',
                  flexShrink: 0,
                }}
              />
            </div>
          ) : (
            /* No photo — amber accent panel */
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(160deg, ${AMBER_RICH} 0%, ${AMBER_DEEP} 100%)`,
                borderLeft: `2px solid rgba(255,255,255,0.30)`,
                gap: 14,
              }}
            >
              <span style={{ fontSize: 110, opacity: 0.25 }}>🐾</span>
              <span
                style={{
                  fontFamily: '"DMSerif"',
                  fontSize: 18,
                  color: WHITE_PURE,
                  opacity: 0.55,
                  letterSpacing: 1.5,
                }}
              >
                PawLocal
              </span>
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'DMSerif', data: fontData, style: 'normal', weight: 400 },
      ],
      // Tell WhatsApp / CDNs to cache this image for 24h
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  )
}
