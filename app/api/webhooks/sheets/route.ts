import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'

async function pushToSheets(event: string, data: Record<string, unknown>) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL
  if (!url) return

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }),
  }).catch(() => {/* non-blocking */})
}

// Supabase Database Webhooks POST here with the table row as JSON
export async function POST(req: NextRequest) {
  // Verify secret header to block spoofed calls
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { table, type, record } = body as {
    table: string
    type: 'INSERT' | 'UPDATE' | 'DELETE'
    record: Record<string, unknown>
  }

  // Only care about INSERTs (and specific UPDATE cases)
  if (type !== 'INSERT' && type !== 'UPDATE') {
    return NextResponse.json({ ok: true })
  }

  const db = admin()

  try {
    switch (table) {
      case 'profiles': {
        if (type !== 'INSERT') break
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: authUser } = await (db.auth.admin as any).getUserById(record.id as string)
        await pushToSheets('new_signup', {
          display_name: record.display_name ?? '',
          email:        authUser?.user?.email ?? '',
          phone:        record.phone ?? authUser?.user?.phone ?? '',
          role:         record.role ?? 'customer',
          source:       'organic',
        })
        break
      }

      case 'walk_reports': {
        if (type !== 'INSERT') break
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: provider } = await (db.from('providers') as any)
          .select('name, email').eq('id', record.provider_id).maybeSingle()
        let parentEmail = ''
        if (record.customer_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: parent } = await (db.auth.admin as any).getUserById(record.customer_id as string)
          parentEmail = parent?.user?.email ?? ''
        }
        await pushToSheets('walk_report', {
          dog_name:      record.dog_name,
          provider_name: provider?.name ?? '',
          parent_email:  parentEmail,
          duration_mins: record.duration_mins,
          report_url:    `${SITE_URL}/walk-report/${record.token}`,
          claimed:       !!record.customer_id,
        })
        break
      }

      case 'grooming_reports': {
        if (type !== 'INSERT') break
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: provider } = await (db.from('providers') as any)
          .select('name, email').eq('id', record.provider_id).maybeSingle()
        let parentEmail = ''
        if (record.customer_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: parent } = await (db.auth.admin as any).getUserById(record.customer_id as string)
          parentEmail = parent?.user?.email ?? ''
        }
        await pushToSheets('grooming_report', {
          dog_name:      record.dog_name,
          provider_name: provider?.name ?? '',
          parent_email:  parentEmail,
          duration_mins: record.duration_mins,
          report_url:    `${SITE_URL}/grooming-report/${record.token}`,
          claimed:       !!record.customer_id,
        })
        break
      }

      case 'subscriptions': {
        if (type !== 'INSERT') break
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: authUser } = await (db.auth.admin as any).getUserById(record.user_id as string)
        await pushToSheets('payment', {
          email:                authUser?.user?.email ?? '',
          plan:                 record.plan,
          amount_paise:         record.amount_paise,
          razorpay_payment_id:  record.razorpay_payment_id,
          expires_at:           record.expires_at,
          status:               record.status,
        })
        break
      }

      case 'walker_connections': {
        if (type !== 'INSERT' && type !== 'UPDATE') break
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dog } = await (db.from('dogs') as any)
          .select('name').eq('id', record.dog_id).maybeSingle()
        await pushToSheets('walker_connection', {
          dog_name:    dog?.name ?? '',
          owner_id:    record.owner_id,
          walker_name: record.walker_name,
          walker_phone:record.walker_phone,
          walker_role: record.walker_role,
          otp:         record.otp,
          claimed_at:  record.claimed_at,
          status:      record.status,
        })
        break
      }

      case 'walk_logs': {
        if (type !== 'INSERT') break
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dog } = await (db.from('dogs') as any)
          .select('name').eq('id', record.dog_id).maybeSingle()
        await pushToSheets('walk_log', {
          dog_name:     dog?.name ?? '',
          walker_name:  record.walker_name,
          started_at:   record.started_at,
          duration_mins:record.duration_mins,
          distance_km:  record.distance_km,
          poop_count:   record.poop_count,
          pee_count:    record.pee_count,
          mood:         record.mood,
          notes:        record.notes,
        })
        break
      }
    }
  } catch (e) {
    console.error('Sheets webhook error:', e)
  }

  return NextResponse.json({ ok: true })
}
