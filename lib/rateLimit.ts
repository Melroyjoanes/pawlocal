// Postgres-backed rate limiting — deliberately not Redis (see
// supabase/migrations/024_fix_rls_security.sql's note, and the
// project's own "don't add Redis" convention). Good enough for
// low-volume unauthenticated endpoints; not meant for anything
// needing sub-millisecond checks or huge request volume.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any

export type RateLimitResult = { allowed: true } | { allowed: false }

// Returns { allowed: false } if `key` has already hit `maxHits` within the
// last `windowSec` seconds; otherwise records this hit and returns
// { allowed: true }. Self-pruning: deletes this key's own expired rows on
// every check, so the table never grows unbounded.
//
// Fails OPEN on a database error (allows the request) — a rate limiter
// that's down should never be the reason a legitimate user can't submit
// a contact form; the endpoint's own logic is still the real gate.
export async function checkRateLimit(
  db: AnySupabaseClient,
  key: string,
  { windowSec, maxHits }: { windowSec: number; maxHits: number },
): Promise<RateLimitResult> {
  const windowStartIso = new Date(Date.now() - windowSec * 1000).toISOString()

  try {
    // Prune this key's own expired rows first — keeps the table small
    // without needing a separate cleanup cron.
    await db.from('rate_limit_hits').delete().eq('key', key).lt('created_at', windowStartIso)

    const { count, error: countError } = await db
      .from('rate_limit_hits')
      .select('id', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStartIso)

    if (countError) return { allowed: true }
    if ((count ?? 0) >= maxHits) return { allowed: false }

    await db.from('rate_limit_hits').insert({ key })
    return { allowed: true }
  } catch {
    return { allowed: true }
  }
}
