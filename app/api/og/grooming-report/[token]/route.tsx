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
  provider_name: string
  is_verified: boolean
  services_count: number
  ticks_found: number
  after_photo_url: string | null
  grooming_date: string
}

const BG1    = '#FFFBF0'
const BG2    = '#FEF3C7'
const TEAL   = '#0A8A96'
const TEAL_L = '#E0F7FA'
const ORANGE = '#F07030'
const BROWN  = '#1C0A00'
const WHITE  = '#FFFDF5'
const PHOTO_W = 420

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const url = new URL(req.url)

  let report: Report | null = null

  // Fast path — no DB query needed (metadata embeds params)
  const dogParam = url.searchParams.get('dog')
  if (dogParam) {
    report = {
      dog_name:       dogParam,
      provider_name:  url.searchParams.get('groomer') ?? 'Your Groomer',
      is_verified:    url.searchParams.get('verified') === '1',
      services_count: parseInt(url.searchParams.get('services') ?? '0') || 0,
      ticks_found:    parseInt(url.searchParams.get('ticks') ?? '0') || 0,
      after_photo_url: null,
      grooming_date:  new Date().toISOString(),
    }
  } else {
    // Slow path — old links without params
    try {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (admin.from('grooming_reports') as any)
        .select('dog_name, after_photo_url, grooming_date, services_done, ticks_found, providers(name, is_verified)')
        .eq('token', token)
        .single()

      if (data) {
        report = {
          dog_name:       data.dog_name,
          provider_name:  data.providers?.name ?? 'Your Groomer',
          is_verified:    data.providers?.is_verified ?? false,
          services_count: (data.services_done ?? []).length,
          ticks_found:    data.ticks_found ?? 0,
          after_photo_url: data.after_photo_url ?? null,
          grooming_date:   data.grooming_date,
        }
      }
    } catch { /* fall through to fallback */ }
  }

  // Fallback card if no report found
  if (!report) {
    return new ImageResponse(
      (
        <div style={{ width: 1200, height: 630, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG1 }}>
          <div style={{ fontSize: 64 }}>✂️</div>
          <div style={{ fontSize: 40, color: TEAL, fontFamily: 'serif', marginLeft: 20 }}>Grooming Report</div>
        </div>
      ),
      { width: 1200, height: 630, fonts: [{ name: 'DMSerif', data: fontData, style: 'normal' }] },
    )
  }

  const CARD_L = 36
  const CARD_T = 36
  const CARD_W = report.after_photo_url ? 1200 - PHOTO_W - CARD_L - 30 : 1200 - CARD_L * 2

  const groomDate = (() => {
    try {
      return new Date(report.grooming_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
    } catch { return '' }
  })()

  return new ImageResponse(
    (
      <div style={{
        width: 1200,
        height: 630,
        display: 'flex',
        background: `radial-gradient(ellipse at 80% 20%, ${BG2} 0%, ${BG1} 60%)`,
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* ── After photo ── */}
        {report.after_photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={report.after_photo_url}
            alt=""
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: PHOTO_W,
              height: 630,
              objectFit: 'cover',
            }}
          />
        )}

        {/* Photo gradient fade */}
        {report.after_photo_url && (
          <div style={{
            position: 'absolute',
            right: PHOTO_W - 60,
            top: 0,
            width: 120,
            height: 630,
            background: `linear-gradient(to right, ${BG1}, transparent)`,
          }} />
        )}

        {/* ── Decorative scissors ── */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          right: report.after_photo_url ? PHOTO_W + 20 : 40,
          fontSize: 120,
          opacity: 0.06,
          lineHeight: 1,
        }}>✂️</div>

        {/* ── Main card content ── */}
        <div style={{
          position: 'absolute',
          left: CARD_L,
          top: CARD_T,
          width: CARD_W,
          height: 630 - CARD_T * 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>

          {/* Top section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* PupStep badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
            }}>
              <div style={{
                background: TEAL,
                color: WHITE,
                fontSize: 13,
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: 100,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                PupStep · Grooming
              </div>
            </div>

            {/* ✂️ freshly groomed label */}
            <div style={{
              fontSize: 15,
              color: TEAL,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              ✂️ Freshly Groomed!
            </div>

            {/* Dog name */}
            <div style={{
              fontFamily: 'DMSerif',
              fontSize: 72,
              lineHeight: 1,
              color: BROWN,
              marginBottom: 8,
            }}>
              {report.dog_name}
            </div>

            {/* Date */}
            <div style={{
              fontSize: 16,
              color: '#78350F',
              opacity: 0.7,
              marginBottom: 24,
            }}>
              {groomDate}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>

              {/* Services */}
              {report.services_count > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: TEAL_L,
                  borderRadius: 12,
                  padding: '10px 16px',
                }}>
                  <span style={{ fontSize: 22 }}>🛁</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: TEAL, lineHeight: 1.1 }}>
                      {report.services_count}
                    </span>
                    <span style={{ fontSize: 12, color: TEAL, opacity: 0.8, fontWeight: 600 }}>
                      service{report.services_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Ticks */}
              {report.ticks_found > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(240,112,48,0.12)',
                  borderRadius: 12,
                  padding: '10px 16px',
                }}>
                  <span style={{ fontSize: 22 }}>🕷️</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: ORANGE, lineHeight: 1.1 }}>
                      {report.ticks_found}
                    </span>
                    <span style={{ fontSize: 12, color: ORANGE, opacity: 0.9, fontWeight: 600 }}>
                      tick{report.ticks_found !== 1 ? 's' : ''} removed
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Provider row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 16,
            padding: '12px 18px',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 28 }}>✂️</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, color: BROWN, opacity: 0.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Groomed by
              </span>
              <span style={{ fontSize: 20, fontWeight: 800, color: BROWN }}>
                {report.provider_name}
                {report.is_verified ? ' ✓' : ''}
              </span>
            </div>
          </div>

        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'DMSerif', data: fontData, style: 'normal' }],
    },
  )
}
