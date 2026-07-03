// Shared IST-aware date helpers + streak calculation.
//
// Used by both app/home/page.tsx (parent's view of their dog's walk streak) and
// app/walker/[token]/page.tsx (walker's own logging streak) so the two surfaces
// never drift out of sync on what counts as a "streak day".

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

// IST midnight (today), returned as a UTC ISO string
export function todayMidnightIST(): string {
  const now = new Date()
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS)
  const midnightIST = new Date(nowIST)
  midnightIST.setUTCHours(0, 0, 0, 0)
  return new Date(midnightIST.getTime() - IST_OFFSET_MS).toISOString()
}

export function fourteenDaysAgoIST(): string {
  const d = new Date(todayMidnightIST())
  d.setDate(d.getDate() - 14)
  return d.toISOString()
}

// Counts consecutive days (working backward from today, IST calendar days)
// that have at least one walk logged. Breaks on the first gap day.
export function computeStreak(logs: Array<{ started_at: string }>): number {
  if (!logs || logs.length === 0) return 0
  const toISTDateStr = (iso: string) => {
    const d = new Date(new Date(iso).getTime() + IST_OFFSET_MS)
    return d.toISOString().slice(0, 10)
  }
  const walkedDates = new Set(logs.map(l => toISTDateStr(l.started_at)))
  let streak = 0
  const now = new Date(Date.now() + IST_OFFSET_MS)
  const check = new Date(now)
  check.setUTCHours(0, 0, 0, 0)
  while (walkedDates.has(check.toISOString().slice(0, 10))) {
    streak++
    check.setDate(check.getDate() - 1)
  }
  return streak
}
