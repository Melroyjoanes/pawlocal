import { NextRequest, NextResponse } from 'next/server'
import { getConnectionByToken } from '@/lib/getConnectionByToken'

// GET /api/connect/[token] — public, returns connection info for the QR landing page
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const connection = await getConnectionByToken(token)

  if (!connection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(connection)
}
