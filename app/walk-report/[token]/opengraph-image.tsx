import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const alt = 'PawLocal Walk Report'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/jpeg'

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

// Deep teal palette — OKLCH-inspired hex approximations
const TEAL_DEEP   = '#083d4a'   // oklch(0.25 0.11 200) — darkest bg
const TEAL_MID    = '#0b5c6b'   // oklch(0.36 0.13 198) — gradient mid
const TEAL_BRIGHT = '#0e7485'   // oklch(0.46 0.14 196) — photo overlay start
const CREAM       = '#faf7f0'   // warm cream text
const CREAM_DIM   = 'rgba(250,247,240,0.68)'
const CREAM_GHOST = 'rgba(250,247,240,0.36)'
const AMBER       = '#d97706'   // pl-amber
const AMBER_LIGHT = '#fef3c7'   // amber chip bg

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

  // ── Font ─────────────────────────────────────────────────────
  const fontData = readFileSync(
    path.join(process.cwd(), 'public/fonts/DMSerifDisplay-Regular.ttf')
  )

  // ── Data ─────────────────────────────────────────────────────
  const dogName     = report?.dog_name ?? 'Walk Report'
  const walker      = report?.provider_name ?? ''
  const verified    = report?.is_verified ?? false
  const dateStr     = report ? formatDate(report.walk_date) : ''
  const photoUrl    = report?.photo_url ?? null
  const poops       = report?.poop_count ?? 0
  const pees        = report?.pee_count ?? 0
  const mins        = report?.duration_mins ?? 0
  const dist        = (report?.distance_meters ?? 0) > 0
    ? fmtDistance(report!.distance_meters!)
    : null

  // Build stat string — designed for large single-line render
  const statParts: string[] = []
  if (poops > 0) statParts.push(`💩 ${poops}`)
  if (pees > 0)  statParts.push(`💧 ${pees}`)
  if (mins > 0)  statParts.push(`⏱ ${mins} mins`)
  if (dist)      statParts.push(`📏 ${dist}`)
  const statLine = statParts.join('   ')

  // Scale dog name font: very long names get a smaller size
  const nameFontSize = dogName.length > 12 ? 76 : dogName.length > 8 ? 86 : 96

  const PHOTO_WIDTH = 460   // right photo panel width

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: 1200,
          height: 630,
          position: 'relative',
          background: `linear-gradient(138deg, ${TEAL_MID} 0%, ${TEAL_DEEP} 100%)`,
          fontFamily: '"Inter", system-ui, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* ── Subtle teal vignette corner accent ─────────────── */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: PHOTO_WIDTH - 40,
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(14,116,133,0.30) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(14,116,133,0.20) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* ── Left content panel ─────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 1200 - PHOTO_WIDTH,
            height: 630,
            padding: '44px 52px',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Logo + badge row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 26 }}>🐾</span>
              <span
                style={{
                  fontFamily: '"DMSerif"',
                  fontSize: 24,
                  color: CREAM,
                  lineHeight: 1,
                }}
              >
                Paw<span style={{ color: AMBER }}>Local</span>
              </span>
            </div>

            {/* Walk Report pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: AMBER_LIGHT,
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
                  color: '#78350f',
                  textTransform: 'uppercase',
                }}
              >
                Walk Report
              </span>
            </div>
          </div>

          {/* Dog name — the hero */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                fontFamily: '"DMSerif"',
                fontSize: nameFontSize,
                color: CREAM,
                lineHeight: 1.0,
                display: 'flex',
                letterSpacing: '-0.5px',
              }}
            >
              {dogName}&apos;s Walk
            </div>

            {/* Walker + verified */}
            {walker && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    color: CREAM_DIM,
                    fontWeight: 500,
                  }}
                >
                  by {walker}
                </span>
                {verified && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'rgba(14,116,133,0.35)',
                      border: `1px solid rgba(14,200,200,0.25)`,
                      borderRadius: 24,
                      padding: '4px 12px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: 'rgba(180,255,245,0.9)',
                        fontWeight: 700,
                      }}
                    >
                      ✓ Verified
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats line */}
          {statLine.length > 0 && (
            <div
              style={{
                display: 'flex',
                fontSize: 26,
                color: CREAM,
                fontWeight: 600,
                letterSpacing: 0.2,
                opacity: 0.92,
              }}
            >
              {statLine}
            </div>
          )}

          {/* Footer: location + date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, color: CREAM_GHOST }}>
              📍 Juhu, Mumbai
            </span>
            {dateStr && (
              <>
                <span style={{ color: CREAM_GHOST, fontSize: 15 }}>·</span>
                <span style={{ fontSize: 15, color: CREAM_GHOST }}>{dateStr}</span>
              </>
            )}
            <span style={{ color: CREAM_GHOST, fontSize: 15, marginLeft: 2 }}>·</span>
            <span
              style={{
                fontSize: 15,
                color: 'rgba(250,247,240,0.45)',
                fontWeight: 600,
              }}
            >
              pawlocal.in
            </span>
          </div>
        </div>

        {/* ── Right panel: photo or teal accent ──────────────── */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: PHOTO_WIDTH,
            height: 630,
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          {photoUrl ? (
            <div style={{ display: 'flex', width: PHOTO_WIDTH, height: 630, position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt=""
                width={PHOTO_WIDTH}
                height={630}
                style={{
                  objectFit: 'cover',
                  width: '100%',
                  height: '100%',
                }}
              />
              {/* Left gradient blend into teal background */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 120,
                  height: '100%',
                  background: `linear-gradient(to right, ${TEAL_MID} 0%, transparent 100%)`,
                  display: 'flex',
                }}
              />
              {/* Bottom gradient for depth */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 140,
                  background: `linear-gradient(to top, ${TEAL_DEEP}CC 0%, transparent 100%)`,
                  display: 'flex',
                }}
              />
            </div>
          ) : (
            /* No photo — teal accent panel with paw watermark */
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(160deg, ${TEAL_BRIGHT} 0%, ${TEAL_DEEP} 100%)`,
                borderLeft: `1px solid rgba(14,200,200,0.12)`,
                gap: 12,
              }}
            >
              <span style={{ fontSize: 100, opacity: 0.18 }}>🐾</span>
              <span
                style={{
                  fontFamily: '"DMSerif"',
                  fontSize: 16,
                  color: 'rgba(250,247,240,0.30)',
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
        {
          name: 'DMSerif',
          data: fontData,
          style: 'normal',
          weight: 400,
        },
      ],
    }
  )
}
