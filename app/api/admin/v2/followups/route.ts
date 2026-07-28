import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { TRIAL_DAYS } from '@/lib/entitlement'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

interface Parent {
  id: string
  name: string
  email: string
  phone: string | null
  createdAt: string
  trialDaysRemaining: number | null
  trialDay: number | null
  reportCount: number
}

interface FollowupBuckets {
  no_dog: Parent[]
  no_walker: Parent[]
  no_report: Parent[]
  trial_ending: Parent[]
  ask_payment: Parent[]
  paid: Parent[]
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const client = db()

  // Fetch all profiles
  const { data: profiles, error } = await (client.from('profiles') as any)
    .select('id, display_name, trial_started_at, created_at, phone')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!profiles?.length) {
    return NextResponse.json({
      no_dog: [],
      no_walker: [],
      no_report: [],
      trial_ending: [],
      ask_payment: [],
      paid: [],
    })
  }

  const userIds: string[] = profiles.map((p: any) => p.id as string)

  // Batch fetch lifecycle data + auth emails
  const [dogsRes, connectionsRes, reportsRes, subsRes, authRes] = await Promise.all([
    (client.from('dogs') as any).select('owner_id').in('owner_id', userIds),
    (client.from('walker_connections') as any).select('owner_id, status').in('owner_id', userIds),
    (client.from('walk_reports') as any).select('owner_id').in('owner_id', userIds),
    (client.from('subscriptions') as any).select('user_id, status').eq('status', 'active').in('user_id', userIds),
    client.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const dogs: Array<{ owner_id: string }> = dogsRes.data ?? []
  const connections: Array<{ owner_id: string; status: string }> = connectionsRes.data ?? []
  const reports: Array<{ owner_id: string }> = reportsRes.data ?? []
  const activeSubs: Array<{ user_id: string }> = subsRes.data ?? []
  const authUsers = authRes.data?.users ?? []

  // Build email map
  const emailMap: Record<string, string> = {}
  for (const u of authUsers) {
    emailMap[u.id] = u.email ?? ''
  }

  // Build sets for quick lookup
  const hasDogSet = new Set(dogs.map((d) => d.owner_id))
  const hasActiveWalkerSet = new Set(
    connections.filter((c) => c.status === 'active').map((c) => c.owner_id)
  )
  const reportCountMap: Record<string, number> = {}
  for (const r of reports) {
    if (!r.owner_id) continue
    reportCountMap[r.owner_id] = (reportCountMap[r.owner_id] ?? 0) + 1
  }
  const paidSet = new Set(activeSubs.map((s) => s.user_id))

  const now = Date.now()
  const trialLengthMs = TRIAL_DAYS * 86400000

  const buckets: FollowupBuckets = {
    no_dog: [],
    no_walker: [],
    no_report: [],
    trial_ending: [],
    ask_payment: [],
    paid: [],
  }

  for (const p of profiles) {
    const uid: string = p.id
    const trialStartedAt: string | null = p.trial_started_at ?? null

    let trialDaysRemaining: number | null = null
    let trialExpired = false
    let trialActive = false
    let trialDay: number | null = null

    if (trialStartedAt) {
      const trialEnd = new Date(trialStartedAt).getTime() + trialLengthMs
      const remaining = Math.ceil((trialEnd - now) / 86400000)
      trialDaysRemaining = remaining
      trialExpired = remaining <= 0
      trialActive = remaining > 0
      trialDay = Math.min(TRIAL_DAYS, Math.floor((now - new Date(trialStartedAt).getTime()) / 86400000) + 1)
    }

    const rCount = reportCountMap[uid] ?? 0

    const parent: Parent = {
      id: uid,
      name: (p.display_name as string | null) ?? '',
      email: emailMap[uid] ?? '',
      phone: (p.phone as string | null) ?? null,
      createdAt: p.created_at as string,
      trialDaysRemaining,
      trialDay,
      reportCount: rCount,
    }

    // Classify into CRM stage
    if (paidSet.has(uid)) {
      buckets.paid.push(parent)
    } else if (!hasDogSet.has(uid)) {
      buckets.no_dog.push(parent)
    } else if (!hasActiveWalkerSet.has(uid)) {
      buckets.no_walker.push(parent)
    } else if (rCount === 0) {
      buckets.no_report.push(parent)
    } else if (trialActive && trialDaysRemaining !== null && trialDaysRemaining <= TRIAL_DAYS) {
      buckets.trial_ending.push(parent)
    } else if (trialExpired) {
      buckets.ask_payment.push(parent)
    } else {
      // Has reports, trial still active (> 5 days remaining) — no specific CRM action yet
      // Bucket into no_report as a catch-all for "engaged but not monetized"
      buckets.no_report.push(parent)
    }
  }

  return NextResponse.json(buckets)
}
