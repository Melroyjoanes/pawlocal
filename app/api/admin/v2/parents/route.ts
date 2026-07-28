import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { TRIAL_DAYS } from '@/lib/entitlement'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const client = db()

  // Owners of dogs are the source of truth for "who is a parent" — most
  // owners never get a `profiles` row (it's only created lazily by a few
  // flows), so starting from `profiles` and filtering by owner id silently
  // dropped nearly everyone. Start from `dogs.owner_id` instead and treat
  // `profiles` as an optional enrichment.
  const { data: dogOwnerRows } = await (client.from('dogs') as any).select('owner_id').limit(500)
  const userIds: string[] = [...new Set<string>((dogOwnerRows ?? []).map((d: any) => d.owner_id as string).filter(Boolean))]

  if (!userIds.length) return NextResponse.json([])

  const { data: profiles } = await (client.from('profiles') as any)
    .select('id, display_name, phone, trial_started_at, created_at')
    .in('id', userIds)

  const profileMap: Record<string, { full_name: string | null; phone: string | null; trial_started_at: string | null; created_at: string | null }> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id as string] = {
      full_name: p.display_name ?? null,
      phone: p.phone ?? null,
      trial_started_at: p.trial_started_at ?? null,
      created_at: p.created_at ?? null,
    }
  }

  // 2-5. Batch fetch related data
  const [dogsRes, connectionsRes, reportsRes, subsRes, authRes] = await Promise.all([
    (client.from('dogs') as any).select('owner_id').in('owner_id', userIds),
    (client.from('walker_connections') as any).select('owner_id, status, owner_phone, created_at').in('owner_id', userIds),
    (client.from('walk_reports') as any).select('owner_id, created_at').in('owner_id', userIds).order('created_at', { ascending: false }),
    (client.from('subscriptions') as any).select('user_id, plan, status').in('user_id', userIds),
    client.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const dogs: Array<{ owner_id: string }> = dogsRes.data ?? []
  const connections: Array<{ owner_id: string; status: string; owner_phone: string | null; created_at: string }> = connectionsRes.data ?? []

  // Fallback phone map — profiles.phone is the source of truth when present
  // (kept current via My Account/setup), but most owners never get a
  // profiles row (see note above), so walker_connections.owner_phone is the
  // number that's actually on file for them. Same fallback pattern already
  // used in app/api/walk-logs/route.ts and lib/getConnectionByToken.ts —
  // this admin view was the one place it had been missed, silently showing
  // "no phone" for most real accounts.
  const fallbackPhoneMap: Record<string, string> = {}
  for (const c of [...connections].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())) {
    if (c.owner_phone) fallbackPhoneMap[c.owner_id] = c.owner_phone
  }
  const reports: Array<{ owner_id: string; created_at: string }> = reportsRes.data ?? []
  const subs: Array<{ user_id: string; plan: string; status: string }> = subsRes.data ?? []
  const authUsers = authRes.data?.users ?? []

  // Build email + fallback-signup-date map from auth users — used whenever a
  // profiles row doesn't exist for this owner (the common case).
  const emailMap: Record<string, string> = {}
  const authCreatedMap: Record<string, string> = {}
  for (const u of authUsers) {
    emailMap[u.id] = u.email ?? ''
    authCreatedMap[u.id] = u.created_at
  }

  // Build dog count map
  const dogCountMap: Record<string, number> = {}
  for (const d of dogs) {
    dogCountMap[d.owner_id] = (dogCountMap[d.owner_id] ?? 0) + 1
  }

  // Build active walker count map
  const activeWalkerMap: Record<string, number> = {}
  for (const c of connections) {
    if (c.status === 'active') {
      activeWalkerMap[c.owner_id] = (activeWalkerMap[c.owner_id] ?? 0) + 1
    }
  }

  // Build report count and last report date map
  const reportCountMap: Record<string, number> = {}
  const lastReportMap: Record<string, string> = {}
  for (const r of reports) {
    if (!r.owner_id) continue
    reportCountMap[r.owner_id] = (reportCountMap[r.owner_id] ?? 0) + 1
    if (!lastReportMap[r.owner_id]) {
      lastReportMap[r.owner_id] = r.created_at
    }
  }

  // Build subscription map (latest active sub per user)
  const subMap: Record<string, { plan: string; status: string }> = {}
  for (const s of subs) {
    if (!subMap[s.user_id] || s.status === 'active') {
      subMap[s.user_id] = { plan: s.plan, status: s.status }
    }
  }

  const now = Date.now()
  const trialLengthMs = TRIAL_DAYS * 86400000

  const result = userIds
    .map((id) => {
      const profile = profileMap[id] ?? null
      const trialStartedAt: string | null = profile?.trial_started_at ?? null
      let trialDaysRemaining: number | null = null
      let trialExpired = false
      let trialDay: number | null = null

      if (trialStartedAt) {
        const trialEnd = new Date(trialStartedAt).getTime() + trialLengthMs
        const remaining = Math.ceil((trialEnd - now) / 86400000)
        trialDaysRemaining = remaining
        trialExpired = remaining <= 0
        // Day 1 on the day it started, counting up to TRIAL_DAYS, capped so an
        // expired trial still reads as "day 3 of 3" rather than climbing forever.
        trialDay = Math.min(TRIAL_DAYS, Math.floor((now - new Date(trialStartedAt).getTime()) / 86400000) + 1)
      }

      const sub = subMap[id] ?? null

      return {
        id,
        name: profile?.full_name ?? '',
        email: emailMap[id] ?? '',
        phone: profile?.phone ?? fallbackPhoneMap[id] ?? null,
        trialStartedAt,
        trialDaysRemaining,
        trialExpired,
        trialDay,
        plan: sub?.plan ?? null,
        subStatus: sub?.status ?? null,
        dogCount: dogCountMap[id] ?? 0,
        activeWalkers: activeWalkerMap[id] ?? 0,
        reportCount: reportCountMap[id] ?? 0,
        lastReportDate: lastReportMap[id] ?? null,
        createdAt: profile?.created_at ?? authCreatedMap[id] ?? new Date(0).toISOString(),
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100)

  return NextResponse.json(result)
}
