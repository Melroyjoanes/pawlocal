import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/walker/lookup?phone=9876543210
// Checks if a walker phone exists in the walkers table
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')?.replace(/\D/g, '')
  if (!phone || phone.length !== 10) {
    return NextResponse.json({ found: false })
  }

  const db = admin()
  const { data } = await (db.from('walkers') as any)
    .select('id, name, role')
    .eq('phone', phone)
    .maybeSingle()

  if (!data) return NextResponse.json({ found: false })

  return NextResponse.json({
    found: true,
    name: data.name as string,
    role: data.role as string | null,
  })
}
