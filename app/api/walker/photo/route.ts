import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST /api/walker/photo — walker photo upload (walk photo or poop photo).
//
// The walker page is token-based with no auth session, so direct
// browser-to-Storage uploads run as `anon` and are rejected by storage RLS
// (403 "new row violates row-level security policy"). That silent rejection
// is why every walker photo was missing from live reports. Uploading through
// this route uses the service role instead, gated on the walker's connection
// token being real — the same trust model as /api/walk-logs itself.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const token = form.get('token')
    const kind = form.get('kind') // 'walk' | 'poop'
    const file = form.get('file')

    if (typeof token !== 'string' || !token || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing token or file' }, { status: 400 })
    }
    const folder = kind === 'poop' ? 'poop-photos' : 'walk-photos'

    // 10MB cap — client compresses to ~150-400KB, so anything huge is abuse
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
    }

    const db = admin()

    // Validate the token belongs to a real connection before accepting bytes
    const { data: conn } = await (db.from('walker_connections') as any)
      .select('id, status')
      .eq('token', token)
      .maybeSingle()
    if (!conn) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    const path = `${folder}/${token}/${Date.now()}.jpg`
    const bytes = await file.arrayBuffer()
    const { error: uploadError } = await db.storage
      .from('provider-photos')
      .upload(path, bytes, { contentType: 'image/jpeg' })
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data } = db.storage.from('provider-photos').getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
