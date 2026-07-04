// Shared entitlement logic — the single source of truth for "does this user
// currently have paid report-viewing access."
//
// Option A (decided): cancelling a subscription stops auto-renewal, it does
// NOT immediately revoke access already paid for. A `cancelled` row still
// counts as Pro until its `expires_at` passes — this matches the promise made
// in the cancellation email (app/api/payments/cancel/route.ts): "Your access
// continues until {expiry date}."
//
// Used by app/home/page.tsx, app/upgrade/page.tsx, app/my-reports/page.tsx,
// and app/walk-report/[token]/page.tsx so all four surfaces agree on who's
// entitled.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any

export const TRIAL_DAYS = 3

export type Entitlement = {
  /** Has a paid subscription currently within its paid period (active OR cancelled-but-not-yet-expired). */
  isPro: boolean
  planExpiresAt: string | null
  trialActive: boolean
  trialDaysRemaining: number | null
  trialExpired: boolean
  /** isPro || trialActive — the single flag that gates report viewing. */
  isEntitled: boolean
  /**
   * True if this account has EVER had access before — either (a) any
   * `subscriptions` row exists at all for this user_id, regardless of its
   * current status (active, cancelled, or however else it's marked) and
   * regardless of whether it's still within its paid period, or (b)
   * `trial_started_at` is non-null on their profile (a trial was started at
   * some point, even if it's currently active or long expired).
   *
   * This is a cheap existence check, not filtered by current validity — it's
   * what lets us distinguish a lapsed returning customer (had access, lost
   * it) from a genuine first-time visitor (never had access) even though
   * both currently have isEntitled === false.
   */
  hasHistory: boolean
}

export async function getEntitlement(db: AnySupabaseClient, userId: string): Promise<Entitlement> {
  const [{ data: subData }, { data: profileData }, { data: anySubData }] = await Promise.all([
    (db.from('subscriptions') as AnySupabaseClient)
      .select('plan, status, expires_at')
      .eq('user_id', userId)
      .in('status', ['active', 'cancelled'])
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    (db.from('profiles') as AnySupabaseClient)
      .select('trial_started_at')
      .eq('id', userId)
      .maybeSingle(),

    // Existence check only — any subscription row at all for this user,
    // regardless of status or expiry. Used solely to compute `hasHistory`.
    (db.from('subscriptions') as AnySupabaseClient)
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
  ])

  const sub = subData as { plan?: string; status?: string; expires_at?: string } | null
  const isPro = !!sub
  const planExpiresAt: string | null = sub?.expires_at ?? null

  const trialStartedAt: string | null = (profileData as { trial_started_at?: string | null } | null)?.trial_started_at ?? null

  let trialActive = false
  let trialDaysRemaining: number | null = null
  let trialExpired = false

  if (!isPro && trialStartedAt) {
    const msRemaining = new Date(trialStartedAt).getTime() + TRIAL_DAYS * 86400 * 1000 - Date.now()
    if (msRemaining > 0) {
      trialActive = true
      trialDaysRemaining = Math.ceil(msRemaining / 86400000)
    } else {
      trialExpired = true
    }
  }

  const hasHistory = !!anySubData || !!trialStartedAt

  return {
    isPro,
    planExpiresAt,
    trialActive,
    trialDaysRemaining,
    trialExpired,
    isEntitled: isPro || trialActive,
    hasHistory,
  }
}
