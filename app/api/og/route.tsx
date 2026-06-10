import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const revalidate = 2592000 // 30 days

const logoBuffer = readFileSync(path.join(process.cwd(), 'public/logo.png'))
const logoSrc    = `data:image/png;base64,${logoBuffer.toString('base64')}`

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 1200,
          height: 630,
          background: 'linear-gradient(145deg, #FFFBEF 0%, #FEF3C7 50%, #FFFBEF 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={820}
          height={300}
          style={{ width: 820, height: 300, objectFit: 'contain' }}
          alt="PupStep"
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=31536000',
      },
    },
  )
}
