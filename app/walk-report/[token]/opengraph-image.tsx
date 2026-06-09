import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const alt = 'PawLocal Walk Report'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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
        dog_name: data.dog_name,
        duration_mins: data.duration_mins,
        poop_count: data.poop_count,
        pee_count: data.pee_count,
        distance_meters: data.distance_meters ?? null,
        photo_url: data.photo_url ?? null,
        walk_date: data.walk_date,
        provider_name: data.providers?.name ?? 'Your Walker',
        is_verified: data.providers?.is_verified ?? false,
      }
    }
  } catch { /* fallback to default card */ }

  // ── Fonts ─────────────────────────────────────────────────────
  const fontData = readFileSync(
    path.join(process.cwd(), 'public/fonts/DMSerifDisplay-Regular.ttf')
  )

  // ── Stat pills config ─────────────────────────────────────────
  const pills: { label: string; bg: string; color: string }[] = []
  if (report) {
    if (report.poop_count > 0)
      pills.push({ label: `💩 ${report.poop_count} ${report.poop_count === 1 ? 'poop' : 'poops'}`, bg: '#FEF3C7', color: '#92400E' })
    if (report.pee_count > 0)
      pills.push({ label: `💧 ${report.pee_count} ${report.pee_count === 1 ? 'pee' : 'pees'}`, bg: '#EFF6FF', color: '#1E40AF' })
    if (report.duration_mins > 0)
      pills.push({ label: `⏱ ${report.duration_mins} mins`, bg: '#F0FDF4', color: '#166534' })
    if (report.distance_meters && report.distance_meters > 0)
      pills.push({ label: `📏 ${fmtDistance(report.distance_meters)}`, bg: '#FDF4FF', color: '#6B21A8' })
  }

  const dogName  = report?.dog_name ?? 'Walk Report'
  const walker   = report?.provider_name ?? ''
  const verified = report?.is_verified ?? false
  const dateStr  = report ? formatDate(report.walk_date) : ''
  const photoUrl = report?.photo_url ?? null

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: 1200,
          height: 630,
          background: '#faf7f2',
          fontFamily: '"Inter", system-ui, sans-serif',
        }}
      >
        {/* ── Left content panel ─────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '52px 60px',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 30 }}>🐾</span>
            <span
              style={{
                fontFamily: '"DMSerif"',
                fontSize: 26,
                color: '#1c1917',
                lineHeight: 1,
              }}
            >
              Paw
              <span style={{ color: '#d97706' }}>Local</span>
            </span>
            <div
              style={{
                marginLeft: 'auto',
                background: 'rgba(15,118,110,0.1)',
                border: '1px solid rgba(15,118,110,0.22)',
                borderRadius: 24,
                padding: '5px 14px',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2.5,
                color: '#0f766e',
                textTransform: 'uppercase',
                display: 'flex',
              }}
            >
              Walk Report
            </div>
          </div>

          {/* Dog name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                fontFamily: '"DMSerif"',
                fontSize: dogName.length > 10 ? 60 : 72,
                color: '#1c1917',
                lineHeight: 1.05,
                display: 'flex',
              }}
            >
              {dogName}&apos;s Walk
            </div>

            {/* Walker row */}
            {walker && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <span style={{ fontSize: 17, color: '#78716c' }}>by {walker}</span>
                {verified && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'rgba(15,118,110,0.08)',
                      border: '1px solid rgba(15,118,110,0.20)',
                      borderRadius: 20,
                      padding: '3px 10px',
                      fontSize: 12,
                      color: '#0f766e',
                      fontWeight: 700,
                    }}
                  >
                    ✓ Verified
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stat pills */}
          {pills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {pills.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: p.bg,
                    color: p.color,
                    borderRadius: 40,
                    padding: '8px 16px',
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  {p.label}
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#a8a29e' }}>📍 Juhu, Mumbai</span>
            {dateStr && (
              <>
                <span style={{ color: '#d6cfc4', fontSize: 13 }}>·</span>
                <span style={{ fontSize: 13, color: '#a8a29e' }}>{dateStr}</span>
              </>
            )}
            <span style={{ color: '#d6cfc4', fontSize: 13, marginLeft: 4 }}>·</span>
            <span style={{ fontSize: 13, color: '#c4bdb2', fontWeight: 600 }}>pawlocal.in</span>
          </div>
        </div>

        {/* ── Right panel: photo or teal ──────────────────────── */}
        <div
          style={{
            width: 420,
            height: 630,
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            position: 'relative',
          }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt=""
              width={420}
              height={630}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          ) : (
            /* Teal gradient panel with watermark paw */
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(160deg, #0d9488 0%, #0f766e 40%, #134e4a 100%)',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <span style={{ fontSize: 110, opacity: 0.35 }}>🐾</span>
              <span
                style={{
                  fontFamily: '"DMSerif"',
                  fontSize: 18,
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: 1,
                }}
              >
                PawLocal
              </span>
            </div>
          )}

          {/* Bottom gradient overlay on photo */}
          {photoUrl && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 100,
                background: 'linear-gradient(to top, rgba(15,118,110,0.55) 0%, transparent 100%)',
                display: 'flex',
              }}
            />
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
