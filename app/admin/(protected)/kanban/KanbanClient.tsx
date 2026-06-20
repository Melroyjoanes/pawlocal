'use client'

import { useMemo, useState } from 'react'

interface Props {
  connections: any[]
  walkLogs: any[]
  walkReports: any[]
  groomingReports: any[]
}

type TimeFilter = 'today' | 'week' | 'all'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} mins ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hours ago`
  return `${Math.floor(hrs / 24)} days ago`
}

function isWithin(dateStr: string | null | undefined, ms: number): boolean {
  if (!dateStr) return false
  return Date.now() - new Date(dateStr).getTime() < ms
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const MONTH_MS = 30 * DAY_MS

function CtaChip({
  label,
  color,
  pulse,
}: {
  label: string
  color: 'gray' | 'amber' | 'green' | 'red' | 'cyan' | 'live'
  pulse?: boolean
}) {
  const cls: Record<string, string> = {
    gray: 'bg-slate-100 text-slate-500',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-600',
    cyan: 'bg-cyan-100 text-cyan-700',
    live: 'bg-red-500 text-white',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cls[color]} ${pulse ? 'animate-pulse' : ''}`}>
      {label}
    </span>
  )
}

function EmptyState({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-40">
      <span className="text-3xl">{emoji}</span>
      <p className="text-xs font-medium text-white">Nothing here</p>
    </div>
  )
}

interface ColumnProps {
  color: string
  icon: string
  title: string
  count: number
  children: React.ReactNode
  emptyEmoji: string
}

function KanbanColumn({ color, icon, title, count, children, emptyEmoji }: ColumnProps) {
  const isEmpty = count === 0
  return (
    <div className="flex flex-col min-w-[280px] w-[280px] rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: color }}>
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-bold text-white">{title}</span>
        </div>
        <span className="text-xs font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {isEmpty ? <EmptyState emoji={emptyEmoji} label={title} /> : children}
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 space-y-2">
      {children}
    </div>
  )
}

function CardRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] text-slate-400 font-medium w-14 flex-shrink-0">{label}</span>
      <span className="text-xs text-slate-700 font-medium truncate">{value}</span>
    </div>
  )
}

export default function KanbanClient({ connections, walkLogs, walkReports, groomingReports }: Props) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [refreshedAt] = useState(() => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))

  const filterMs = timeFilter === 'today' ? DAY_MS : timeFilter === 'week' ? WEEK_MS : Infinity

  // ── Col 1: QR Generated ──────────────────────────────────────────
  const col1 = useMemo(() => connections.filter((c) => {
    if (c.status !== 'pending' || c.otp != null) return false
    return isWithin(c.created_at, filterMs)
  }), [connections, filterMs])

  // ── Col 2: OTP Shared ────────────────────────────────────────────
  const col2 = useMemo(() => connections.filter((c) => {
    if (c.status !== 'pending' || c.otp == null || c.claimed_at != null) return false
    return isWithin(c.created_at, filterMs)
  }), [connections, filterMs])

  // ── Col 3: Connected ─────────────────────────────────────────────
  const col3 = useMemo(() => connections.filter((c) => {
    if (c.status !== 'active') return false
    if (filterMs !== Infinity) return isWithin(c.claimed_at ?? c.created_at, filterMs)
    return true
  }), [connections, filterMs])

  // Walk log index: dog_id+date → has report
  const walkReportIndex = useMemo(() => {
    const s = new Set<string>()
    for (const r of walkReports) {
      const d = r.walk_date ? r.walk_date.slice(0, 10) : null
      if (r.dog_name && d) s.add(`${r.dog_name}__${d}`)
    }
    for (const r of groomingReports) {
      const d = r.grooming_date ? r.grooming_date.slice(0, 10) : null
      if (r.dog_name && d) s.add(`${r.dog_name}__${d}`)
    }
    return s
  }, [walkReports, groomingReports])

  // Walk log dog_id → dog name from connections
  const dogNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of connections) {
      if (c.dog_id && c.dogs?.name) m[c.dog_id] = c.dogs.name
    }
    return m
  }, [connections])

  // ── Col 4: Walk In Progress ──────────────────────────────────────
  const col4 = useMemo(() => walkLogs.filter((l) => {
    if (l.ended_at != null) return false
    return isWithin(l.started_at ?? l.created_at, DAY_MS)
  }), [walkLogs])

  // ── Col 5: Walk Done — Report Pending ────────────────────────────
  const col5 = useMemo(() => {
    const sevenDaysAgo = Date.now() - WEEK_MS
    return walkLogs.filter((l) => {
      if (l.ended_at == null) return false
      if (new Date(l.ended_at).getTime() < sevenDaysAgo) return false
      const dogName = l.walker_name ? dogNameMap[l.dog_id] ?? null : null
      const date = l.ended_at ? l.ended_at.slice(0, 10) : null
      if (dogName && date && walkReportIndex.has(`${dogName}__${date}`)) return false
      if (filterMs !== Infinity) return isWithin(l.ended_at, filterMs)
      return true
    })
  }, [walkLogs, walkReportIndex, dogNameMap, filterMs])

  // ── Col 6: Report Shared ─────────────────────────────────────────
  const col6Walk = useMemo(() => walkReports.filter((r) => isWithin(r.created_at, Math.min(filterMs, MONTH_MS))), [walkReports, filterMs])
  const col6Groom = useMemo(() => groomingReports.filter((r) => isWithin(r.created_at, Math.min(filterMs, MONTH_MS))), [groomingReports, filterMs])

  // ── Stats ─────────────────────────────────────────────────────────
  const activeConnections = connections.filter((c) => c.status === 'active').length
  const otpsPending = col2.length
  const walksToday = walkLogs.filter((l) => isWithin(l.started_at ?? l.created_at, DAY_MS)).length
  const reportsUnclaimed = [...col6Walk, ...col6Groom].filter((r) => !r.customer_id).length

  return (
    <div className="min-h-screen" style={{ background: '#0A2F35' }}>
      {/* Top bar */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-white/50 hover:text-white text-sm transition-colors">← Admin</a>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-fredoka, sans-serif)' }}>
            Ops Board
          </h1>
          <span className="text-xs text-white/40">Updated {refreshedAt}</span>
        </div>
        {/* Time filter */}
        <div className="flex items-center gap-1.5 bg-white/10 rounded-xl p-1">
          {(['today', 'week', 'all'] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                timeFilter === f ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
              }`}
            >
              {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="px-6 pb-4 flex gap-3 flex-wrap">
        {[
          { label: 'Active Connections', value: activeConnections, color: '#10B981' },
          { label: 'OTPs Pending', value: otpsPending, color: '#F59E0B' },
          { label: 'Walks Today', value: walksToday, color: '#FF8C52' },
          { label: 'Reports Unclaimed', value: reportsUnclaimed, color: '#06B6D4' },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2"
          >
            <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-fredoka, sans-serif)' }}>{s.value}</span>
            <span className="text-xs text-white/60" style={{ fontFamily: 'var(--font-nunito, sans-serif)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <div className="px-6 pb-6 overflow-x-auto">
        <div className="flex gap-4" style={{ width: 'max-content' }}>

          {/* ── Col 1: QR Generated ───────────────────────────────── */}
          <KanbanColumn color="#3B82F6" icon="🔵" title="QR Generated" count={col1.length} emptyEmoji="🔵">
            {col1.map((c) => (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900 truncate">{c.dogs?.name ?? '—'}</p>
                  <CtaChip label="OTP not yet set" color="gray" />
                </div>
                <CardRow label="Owner" value={c.owner_id ? `…${String(c.owner_id).slice(-8)}` : '—'} />
                <CardRow label="Walker" value={c.walker_name ?? '—'} />
                <CardRow label="Phone" value={c.walker_phone ?? '—'} />
                <p className="text-[10px] text-slate-400">QR generated {timeAgo(c.created_at)}</p>
              </Card>
            ))}
          </KanbanColumn>

          {/* ── Col 2: OTP Shared ─────────────────────────────────── */}
          <KanbanColumn color="#F59E0B" icon="🟡" title="OTP Shared" count={col2.length} emptyEmoji="🟡">
            {col2.map((c) => {
              const otpOld = !isWithin(c.created_at, 30 * 60 * 1000)
              return (
                <Card key={c.id}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">{c.dogs?.name ?? '—'}</p>
                    <CtaChip label="Awaiting QR Scan" color="amber" />
                  </div>
                  <CardRow label="Walker" value={c.walker_name ?? '—'} />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">OTP</span>
                    <span className="font-mono text-base font-bold text-slate-900 tracking-widest">{c.otp}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Shared {timeAgo(c.created_at)}</p>
                  {otpOld && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      ⏰ Follow up
                    </span>
                  )}
                </Card>
              )
            })}
          </KanbanColumn>

          {/* ── Col 3: Connected ──────────────────────────────────── */}
          <KanbanColumn color="#10B981" icon="🟢" title="Connected" count={col3.length} emptyEmoji="🟢">
            {col3.map((c) => {
              const dogLogs = walkLogs.filter((l) => l.dog_id === c.dog_id)
              const totalWalks = dogLogs.length
              const lastWalk = dogLogs[0]?.started_at ?? dogLogs[0]?.created_at ?? null
              return (
                <Card key={c.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{c.dogs?.name ?? '—'}</p>
                      {c.dogs?.breed && <p className="text-[10px] text-slate-400">{c.dogs.breed}</p>}
                    </div>
                    <CtaChip label="Active ✓" color="green" />
                  </div>
                  <CardRow label="Walker" value={c.walker_name ?? '—'} />
                  <CardRow label="Phone" value={c.walker_phone ?? '—'} />
                  <CardRow label="Walks" value={totalWalks} />
                  {lastWalk && <CardRow label="Last walk" value={timeAgo(lastWalk)} />}
                  <p className="text-[10px] text-slate-400">Connected {timeAgo(c.claimed_at ?? c.created_at)}</p>
                </Card>
              )
            })}
          </KanbanColumn>

          {/* ── Col 4: Walk In Progress ───────────────────────────── */}
          <KanbanColumn color="#FF8C52" icon="🟠" title="Walk In Progress" count={col4.length} emptyEmoji="🟠">
            {col4.map((l) => {
              const dogName = dogNameMap[l.dog_id] ?? l.walker_name ?? '—'
              const startedMins = Math.floor((Date.now() - new Date(l.started_at ?? l.created_at).getTime()) / 60000)
              return (
                <Card key={l.id}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">{dogName}</p>
                    <CtaChip label="Live 🔴" color="live" pulse />
                  </div>
                  <CardRow label="Walker" value={l.walker_name ?? '—'} />
                  <p className="text-[10px] text-slate-400">Started {startedMins} mins ago</p>
                  {l.distance_km != null && (
                    <CardRow label="Distance" value={`${Number(l.distance_km).toFixed(2)} km`} />
                  )}
                </Card>
              )
            })}
          </KanbanColumn>

          {/* ── Col 5: Walk Done — Report Pending ─────────────────── */}
          <KanbanColumn color="#8B5CF6" icon="📋" title="Report Pending" count={col5.length} emptyEmoji="📋">
            {col5.map((l) => {
              const dogName = dogNameMap[l.dog_id] ?? '—'
              return (
                <Card key={l.id}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">{dogName}</p>
                    <CtaChip label="Report not filed" color="red" />
                  </div>
                  <CardRow label="Walker" value={l.walker_name ?? '—'} />
                  <CardRow label="Ended" value={timeAgo(l.ended_at)} />
                  {l.duration_mins != null && <CardRow label="Duration" value={`${l.duration_mins} mins`} />}
                  <div className="flex gap-3 text-[10px] text-slate-500">
                    <span>💩 {l.poop_count ?? 0}</span>
                    <span>💧 {l.pee_count ?? 0}</span>
                  </div>
                </Card>
              )
            })}
          </KanbanColumn>

          {/* ── Col 6: Report Shared ──────────────────────────────── */}
          <KanbanColumn color="#06B6D4" icon="✅" title="Report Shared" count={col6Walk.length + col6Groom.length} emptyEmoji="✅">
            {/* Walk reports sub-section */}
            {col6Walk.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 px-1">Walk Reports</p>
                <div className="space-y-3">
                  {col6Walk.map((r) => {
                    const claimed = !!r.customer_id
                    const providerName = r.providers?.name ?? '—'
                    return (
                      <Card key={r.id}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{r.dog_name ?? '—'}</p>
                          <CtaChip label={claimed ? 'Claimed' : 'Not claimed'} color={claimed ? 'green' : 'amber'} />
                        </div>
                        <CardRow label="Provider" value={providerName} />
                        <CardRow label="Date" value={r.walk_date ? new Date(r.walk_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'} />
                        {claimed
                          ? <p className="text-[10px] text-emerald-600 font-medium">Parent viewed ✓</p>
                          : <p className="text-[10px] text-slate-400">Awaiting parent</p>
                        }
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Grooming reports sub-section */}
            {col6Groom.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 px-1 mt-4">Grooming Reports</p>
                <div className="space-y-3">
                  {col6Groom.map((r) => {
                    const claimed = !!r.customer_id
                    const providerName = r.providers?.name ?? '—'
                    return (
                      <Card key={r.id}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{r.dog_name ?? '—'}</p>
                          <CtaChip label={claimed ? 'Claimed' : 'Not claimed'} color={claimed ? 'green' : 'amber'} />
                        </div>
                        <CardRow label="Provider" value={providerName} />
                        <CardRow label="Date" value={r.grooming_date ? new Date(r.grooming_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'} />
                        {claimed
                          ? <p className="text-[10px] text-emerald-600 font-medium">Parent viewed ✓</p>
                          : <p className="text-[10px] text-slate-400">Awaiting parent</p>
                        }
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </KanbanColumn>

        </div>
      </div>
    </div>
  )
}
