import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const revalidate = 86400

const fontData = readFileSync(
  path.join(process.cwd(), 'public/fonts/DMSerifDisplay-Regular.ttf'),
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

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return '' }
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

const BG1     = '#FFFBF0'
const BG2     = '#FEF3C7'
const BG3     = '#FDE68A'
const AMBER   = '#F59E0B'
const AMBER_D = '#D97706'
const BROWN   = '#1C0A00'
const BROWN_M = '#78350F'
const TEAL    = '#0b7a8a'
const WHITE   = '#FFFDF5'
const PHOTO_W = 440
const CARD_L  = 36
const CARD_T  = 36
const CARD_W  = 1200 - PHOTO_W - CARD_L - 30

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  let report: Report | null = null
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb.from('walk_reports') as any)
      .select('dog_name,duration_mins,poop_count,pee_count,distance_meters,photo_url,walk_date,providers(name,is_verified)')
      .eq('token', token)
      .single()

    if (data) {
      report = {
        dog_name:        data.dog_name               ?? 'Dog',
        duration_mins:   data.duration_mins           ?? 0,
        poop_count:      data.poop_count              ?? 0,
        pee_count:       data.pee_count               ?? 0,
        distance_meters: data.distance_meters         ?? null,
        photo_url:       data.photo_url               ?? null,
        walk_date:       data.walk_date,
        provider_name:   data.providers?.name         ?? 'Your Walker',
        is_verified:     data.providers?.is_verified  ?? false,
      }
    }
  } catch { /* fallback card */ }

  const dogName  = report?.dog_name      ?? 'Walk Report'
  const walker   = report?.provider_name ?? ''
  const verified = report?.is_verified   ?? false
  const dateStr  = report ? formatDate(report.walk_date) : ''
  const photoUrl = report?.photo_url     ?? null
  const poops    = report?.poop_count    ?? 0
  const pees     = report?.pee_count     ?? 0
  const mins     = report?.duration_mins ?? 0
  const dist     = (report?.distance_meters ?? 0) > 0 ? fmtDist(report!.distance_meters!) : null

  const nameFontSize = dogName.length > 14 ? 66
    : dogName.length > 10 ? 80
    : dogName.length > 7  ? 92
    : 104

  const stats: { emoji: string; label: string; bg: string; fg: string }[] = []
  if (poops > 0) stats.push({ emoji: '💩', label: `${poops}`,    bg: '#FED7AA', fg: '#9A3412' })
  if (pees  > 0) stats.push({ emoji: '💧', label: `${pees}`,     bg: '#BAE6FD', fg: '#075985' })
  if (mins  > 0) stats.push({ emoji: '⏱', label: `${mins} min`, bg: '#BBF7D0', fg: '#065F46' })
  if (dist)      stats.push({ emoji: '📏', label: dist,          bg: '#DDD6FE', fg: '#4C1D95' })

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', width: 1200, height: 630,
        position: 'relative',
        background: `linear-gradient(135deg, ${BG1} 0%, ${BG2} 50%, ${BG3} 100%)`,
        fontFamily: '"Inter", system-ui, sans-serif',
        overflow: 'hidden',
      }}>
        {/* Large amber sphere */}
        <div style={{ position: 'absolute', top: -70, left: -70, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle at 32% 30%, #FEF9C3, #FDE68A 44%, #F59E0B 72%, #D97706)', boxShadow: '0 28px 72px rgba(180,83,9,0.24)', display: 'flex', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 36, left: 44, width: 74, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.40)', display: 'flex' }} />
        </div>
        {/* Medium amber sphere */}
        <div style={{ position: 'absolute', bottom: -45, left: 400, width: 148, height: 148, borderRadius: '50%', background: 'radial-gradient(circle at 30% 28%, #FEF3C7, #FCD34D 50%, #D97706)', boxShadow: '0 16px 48px rgba(180,83,9,0.22)', display: 'flex', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 18, left: 22, width: 38, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.36)', display: 'flex' }} />
        </div>
        {/* Teal sphere */}
        <div style={{ position: 'absolute', top: 68, left: 746, width: 66, height: 66, borderRadius: '50%', background: 'radial-gradient(circle at 30% 28%, #99F6E4, #14B8A6 55%, #0F766E)', boxShadow: '0 8px 28px rgba(15,118,110,0.30)', display: 'flex', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 8, left: 10, width: 17, height: 12, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', display: 'flex' }} />
        </div>
        {/* Tiny amber sphere */}
        <div style={{ position: 'absolute', bottom: 66, left: 762, width: 40, height: 40, borderRadius: '50%', background: 'radial-gradient(circle at 30% 28%, #FDE68A, #F59E0B 55%, #B45309)', boxShadow: '0 5px 18px rgba(180,83,9,0.24)', display: 'flex', overflow: 'hidden' }} />

        {/* Clay card */}
        <div style={{ position: 'absolute', left: CARD_L, top: CARD_T, width: CARD_W, height: 630 - CARD_T * 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(255, 252, 237, 0.92)', borderRadius: 44, padding: '38px 48px', boxShadow: '0 24px 72px rgba(120, 53, 15, 0.18)', border: '2.5px solid rgba(255, 255, 255, 0.96)' }}>
          {/* Brand + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 34 }}>🐾</span>
              <span style={{ fontFamily: '"DMSerif"', fontSize: 30, color: BROWN, lineHeight: 1 }}>
                Paw<span style={{ color: TEAL }}>Local</span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', background: AMBER, borderRadius: 100, padding: '7px 20px', boxShadow: '0 6px 20px rgba(180,83,9,0.28)', border: '2.5px solid rgba(255,255,255,0.65)' }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.8, color: WHITE, textTransform: 'uppercase' }}>Walk Report</span>
            </div>
          </div>

          {/* Dog name + walker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: '"DMSerif"', fontSize: nameFontSize, color: BROWN, lineHeight: 1.0, display: 'flex', letterSpacing: '-0.5px' }}>
              {dogName}&apos;s Walk
            </div>
            {walker && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                <span style={{ fontSize: 26, color: BROWN_M, fontWeight: 500 }}>with {walker}</span>
                {verified && (
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(11,122,138,0.10)', border: '1.5px solid rgba(11,122,138,0.28)', borderRadius: 100, padding: '5px 16px' }}>
                    <span style={{ fontSize: 14, color: TEAL, fontWeight: 700 }}>✓ Verified</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 14 }}>
            {stats.length > 0 ? stats.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: s.bg, borderRadius: 100, padding: '11px 24px', boxShadow: '0 5px 22px rgba(0,0,0,0.08)', border: '2.5px solid rgba(255,255,255,0.88)' }}>
                <span style={{ fontSize: 28 }}>{s.emoji}</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: s.fg }}>{s.label}</span>
              </div>
            )) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF3C7', borderRadius: 100, padding: '11px 28px', boxShadow: '0 5px 22px rgba(0,0,0,0.07)', border: '2.5px solid rgba(255,255,255,0.88)' }}>
                <span style={{ fontSize: 28 }}>🐾</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: BROWN_M }}>Great walk today!</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, color: BROWN_M, opacity: 0.55 }}>📍 Juhu, Mumbai</span>
            {dateStr && (<>
              <span style={{ color: BROWN_M, fontSize: 17, opacity: 0.35 }}>·</span>
              <span style={{ fontSize: 17, color: BROWN_M, opacity: 0.55 }}>{dateStr}</span>
            </>)}
            <span style={{ color: BROWN_M, fontSize: 17, opacity: 0.35 }}>·</span>
            <span style={{ fontSize: 17, color: AMBER_D, fontWeight: 700 }}>pupstep.in</span>
          </div>
        </div>

        {/* Photo panel */}
        <div style={{ position: 'absolute', right: 0, top: 0, width: PHOTO_W, height: 630, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {photoUrl ? (
            <div style={{ display: 'flex', width: PHOTO_W, height: 630, position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" width={630} height={PHOTO_W} style={{ objectFit: 'cover', width: 630, height: PHOTO_W, transform: 'rotate(90deg)', flexShrink: 0 }} />
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(170deg, ${AMBER} 0%, ${AMBER_D} 100%)`, gap: 24 }}>
              <span style={{ fontSize: 118, opacity: 0.18, display: 'flex' }}>🐾</span>
              <span style={{ fontFamily: '"DMSerif"', fontSize: 22, color: WHITE, opacity: 0.65, letterSpacing: 1.5 }}>PawLocal</span>
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200, height: 630,
      fonts: [{ name: 'DMSerif', data: fontData, style: 'normal', weight: 400 }],
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  )
}
