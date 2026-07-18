'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminReportsTab, AdminPaymentsTab, AdminFollowupsTab } from './AdminExtraTabs'
import { parseCareFocus } from '@/lib/careFocus'

type AdminTab = 'overview' | 'parents' | 'dogs' | 'walkers' | 'reports' | 'payments' | 'followups'

// ── Helpers ───────────────────────────────────────────────────────────────────

function rel(iso: string): string {
  const d = new Date(iso), now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(diff / 86400000)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function fmt(n: number) { return n.toLocaleString('en-IN') }
function rupee(paise: number) { return `₹${Math.round(paise / 100).toLocaleString('en-IN')}` }

const BADGE = {
  good:    { bg: '#DCFCE7', color: '#166534' },
  weak:    { bg: '#FEF3C7', color: '#92400E' },
  broken:  { bg: '#FEE2E2', color: '#991B1B' },
  active:  { bg: '#DCFCE7', color: '#166534' },
  trial:   { bg: '#DBEAFE', color: '#1E40AF' },
  expired: { bg: '#FEE2E2', color: '#991B1B' },
  none:    { bg: '#F3F4F6', color: '#6B7280' },
}

function Badge({ text, type }: { text: string; type: keyof typeof BADGE }) {
  const s = BADGE[type]
  return (
    <span style={{ background: s.bg, color: s.color, fontWeight: 700, fontSize: 11,
      padding: '3px 8px', borderRadius: 100, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: '10px 12px', textAlign: 'left', fontFamily: 'var(--font-nunito)',
      fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase',
      letterSpacing: '0.06em', background: '#F3F4F6', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  )
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td style={{ padding: '10px 12px', fontSize: 13, color: '#374151', borderBottom: '1px solid #F3F4F6',
      fontFamily: mono ? 'monospace' : 'var(--font-nunito)', whiteSpace: 'nowrap' }}>
      {children}
    </td>
  )
}

function Card({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px' }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9CA3AF',
        textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-nunito)' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: color ?? '#0A2F35',
        fontFamily: 'var(--font-fredoka)', lineHeight: 1.2 }}>
        {typeof value === 'number' ? fmt(value) : value}
      </p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF', fontFamily: 'var(--font-nunito)' }}>{sub}</p>}
    </div>
  )
}

function Spinner() {
  return <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF', fontFamily: 'var(--font-nunito)' }}>Loading…</div>
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

interface OverviewData {
  northStar: number
  funnel: { signedUp: number; dogCreated: number; walkerConnected: number; firstReport: number; parentOpened: number; paid: number }
  parentsTotal: number; parentsToday: number; parentsThisWeek: number
  dogsTotal: number; walkersActive: number
  reportsTotal: number; reportsToday: number; reportsThisWeek: number
  mrr: number; arr: number; activeSubscribers: number; monthlySubscribers: number; annualSubscribers: number
  trialUsers: number; expiredTrials: number
  avgQualityScore: number; goodReports: number; weakReports: number; brokenReports: number
}

function OverviewTab() {
  const [data, setData] = useState<OverviewData | null>(null)
  useEffect(() => { fetch('/api/admin/v2/overview').then(r => r.json()).then(setData).catch(() => {}) }, [])
  if (!data) return <Spinner />

  const f = data.funnel
  const steps = [
    { label: 'Signed up', n: f.signedUp, prev: null },
    { label: 'Dog created', n: f.dogCreated, prev: f.signedUp },
    { label: 'Walker connected', n: f.walkerConnected, prev: f.dogCreated },
    { label: 'First report', n: f.firstReport, prev: f.walkerConnected },
    { label: 'Parent opened', n: f.parentOpened, prev: f.firstReport },
    { label: 'Paid', n: f.paid, prev: f.parentOpened },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* North star */}
      <div style={{ background: '#0A2F35', borderRadius: 16, padding: '24px 28px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-nunito)' }}>
          ★ North Star Metric
        </p>
        <p style={{ margin: '0 0 8px', fontSize: 48, fontWeight: 800, color: '#FF8C52',
          fontFamily: 'var(--font-fredoka)', lineHeight: 1 }}>
          {fmt(data.northStar)}
        </p>
        <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-nunito)' }}>
          walk reports opened by parents this week
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-nunito)', fontStyle: 'italic' }}>
          A parent who opens their report is getting value. This is the only number that matters.
        </p>
      </div>

      {/* Activation funnel */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px 24px' }}>
        <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#374151', fontFamily: 'var(--font-nunito)' }}>
          Activation Funnel
        </p>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
          {steps.map((s, i) => {
            const pct = s.prev ? Math.round((s.n / s.prev) * 100) : 100
            const isLast = i === steps.length - 1
            return (
              <div key={s.label} style={{ flex: 1, minWidth: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div style={{ width: '100%', background: isLast ? '#DCFCE7' : '#EFF6FF', borderRadius: 8, padding: '12px 8px', textAlign: 'center', marginBottom: 6 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 800, color: isLast ? '#166534' : '#1E40AF', fontFamily: 'var(--font-fredoka)' }}>
                    {fmt(s.n)}
                  </p>
                  {s.prev !== null && (
                    <p style={{ margin: 0, fontSize: 11, color: pct >= 70 ? '#166534' : pct >= 40 ? '#92400E' : '#991B1B', fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>
                      {pct}%
                    </p>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 10, color: '#6B7280', textAlign: 'center', fontFamily: 'var(--font-nunito)', fontWeight: 600 }}>
                  {s.label}
                </p>
                {i < steps.length - 1 && (
                  <div style={{ position: 'absolute', right: -8, top: 18, fontSize: 16, color: '#D1D5DB', zIndex: 1 }}>→</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
        <Card label="Total parents" value={data.parentsTotal} sub={`+${data.parentsToday} today`} />
        <Card label="This week" value={data.parentsThisWeek} sub="new parents" />
        <Card label="Active walkers" value={data.walkersActive} />
        <Card label="Total reports" value={data.reportsTotal} sub={`${data.reportsToday} today · ${data.reportsThisWeek} this week`} />
        <Card label="MRR" value={rupee(data.mrr * 100)} color="oklch(0.48 0.17 196)" />
        <Card label="ARR" value={rupee(data.arr * 100)} color="oklch(0.48 0.17 196)" />
        <Card label="Paid subscribers" value={data.activeSubscribers} sub={`${data.monthlySubscribers} monthly · ${data.annualSubscribers} annual`} />
        <Card label="Trial users" value={data.trialUsers} sub={`${data.expiredTrials} expired`} />
      </div>

      {/* Quality */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px 24px' }}>
        <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#374151', fontFamily: 'var(--font-nunito)' }}>
          Report Quality · avg score {Math.round(data.avgQualityScore ?? 0)}/100
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { label: '🟢 Good', n: data.goodReports, ...BADGE.good },
            { label: '🟡 Weak', n: data.weakReports, ...BADGE.weak },
            { label: '🔴 Broken', n: data.brokenReports, ...BADGE.broken },
          ].map(q => (
            <div key={q.label} style={{ background: q.bg, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: q.color, fontFamily: 'var(--font-fredoka)' }}>{fmt(q.n)}</p>
              <p style={{ margin: 0, fontSize: 12, color: q.color, fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>{q.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Parents Tab ───────────────────────────────────────────────────────────────

interface Parent {
  id: string; name: string; email: string; phone: string | null
  trialStartedAt: string | null; trialDaysRemaining: number | null; trialExpired: boolean; trialDay: number | null
  plan: string | null; subStatus: string | null
  dogCount: number; activeWalkers: number; reportCount: number; lastReportDate: string | null; createdAt: string
}

function ParentsTab() {
  const [parents, setParents] = useState<Parent[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [actingOn, setActingOn] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/admin/v2/parents').then(r => r.json()).then(d => { setParents(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function runAction(userId: string, action: 'grant' | 'cancel' | 'revoke') {
    const confirmMsg = {
      grant: 'Grant this parent free Pro access for 1 year?',
      cancel: 'Cancel auto-renewal? Access continues until the current period ends.',
      revoke: 'Immediately end this parent’s access right now?',
    }[action]
    if (!window.confirm(confirmMsg)) return

    setActingOn(userId)
    try {
      const res = await fetch(`/api/admin/v2/parents/${userId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Action failed')
      load()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActingOn(null)
    }
  }

  const filtered = parents.filter(p =>
    !q || p.name?.toLowerCase().includes(q.toLowerCase()) || p.email?.toLowerCase().includes(q.toLowerCase())
  )

  const trialBadge = (p: Parent) => {
    if (p.subStatus === 'active') return <Badge text={`${p.plan ?? 'Pro'}`} type="active" />
    if (p.trialExpired) return <Badge text={`Expired (day ${p.trialDay ?? '?'})`} type="expired" />
    if (p.trialDay !== null) return <Badge text={`Day ${p.trialDay}/3 · ${p.trialDaysRemaining}d left`} type="trial" />
    return <Badge text="No trial" type="none" />
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email…"
          style={{ flex: 1, padding: '8px 14px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14,
            fontFamily: 'var(--font-nunito)', outline: 'none' }} />
        <span style={{ padding: '8px 14px', background: '#F3F4F6', borderRadius: 8, fontSize: 13, color: '#6B7280', fontFamily: 'var(--font-nunito)' }}>
          {filtered.length} parents
        </span>
      </div>
      {loading ? <Spinner /> : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #E5E7EB' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
            <thead>
              <tr><Th>Parent</Th><Th>WhatsApp</Th><Th>Dogs</Th><Th>Walker</Th><Th>Reports</Th><Th>Status</Th><Th>Last report</Th><Th>Joined</Th><Th>Access</Th></tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const busy = actingOn === p.id
                const hasActiveAccess = p.subStatus === 'active' || (p.trialDaysRemaining !== null && !p.trialExpired)
                return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                    <Td>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#0A2F35' }}>{p.name || '—'}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{p.email}</p>
                      </div>
                    </Td>
                    <Td>
                      {p.phone ? (
                        <a
                          href={`https://wa.me/91${p.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#0A2F35', textDecoration: 'underline', fontSize: 12 }}
                        >
                          {p.phone}
                        </a>
                      ) : '❌'}
                    </Td>
                    <Td>{p.dogCount}</Td>
                    <Td>{p.activeWalkers > 0 ? '✅' : '❌'}</Td>
                    <Td>{p.reportCount}</Td>
                    <Td>{trialBadge(p)}</Td>
                    <Td>{p.lastReportDate ? rel(p.lastReportDate) : 'Never'}</Td>
                    <Td>{rel(p.createdAt)}</Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          disabled={busy}
                          onClick={() => runAction(p.id, 'grant')}
                          style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                            border: '1px solid #16A34A', background: '#F0FDF4', color: '#166534', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1 }}
                        >
                          Grant
                        </button>
                        {hasActiveAccess && (
                          <>
                            <button
                              disabled={busy}
                              onClick={() => runAction(p.id, 'cancel')}
                              style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                                border: '1px solid #D97706', background: '#FFFBEB', color: '#92400E', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1 }}
                            >
                              Cancel
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => runAction(p.id, 'revoke')}
                              style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                                border: '1px solid #DC2626', background: '#FEF2F2', color: '#991B1B', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1 }}
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Dogs Tab ──────────────────────────────────────────────────────────────────

interface Dog {
  id: string; name: string; breed: string | null; careFocus: string
  hasPhoto: boolean; hasHealthNotes: boolean; ownerName: string | null; ownerEmail: string | null
  activeWalkers: number; reportCount: number; lastReportDate: string | null; createdAt: string
}

const FOCUS_COLORS: Record<string, { bg: string; color: string }> = {
  normal:   { bg: '#F3F4F6', color: '#374151' },
  stomach:  { bg: '#FEF3C7', color: '#92400E' },
  recovery: { bg: '#FEE2E2', color: '#991B1B' },
  anxiety:  { bg: '#DBEAFE', color: '#1E40AF' },
  senior:   { bg: '#F3E8FF', color: '#7C3AED' },
  puppy:    { bg: '#DCFCE7', color: '#166534' },
}

function DogsTab() {
  const [dogs, setDogs] = useState<Dog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/v2/dogs').then(r => r.json()).then(d => { setDogs(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6B7280', fontFamily: 'var(--font-nunito)' }}>{dogs.length} dogs total</p>
      {loading ? <Spinner /> : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #E5E7EB' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
            <thead>
              <tr><Th>Dog</Th><Th>Parent</Th><Th>Care focus</Th><Th>Photo</Th><Th>Health notes</Th><Th>Walkers</Th><Th>Reports</Th><Th>Last walk</Th></tr>
            </thead>
            <tbody>
              {dogs.map((d, i) => {
                const focusKeys = parseCareFocus(d.careFocus)
                const primaryFocus = focusKeys.find(k => k !== 'normal') ?? 'normal'
                const fc = FOCUS_COLORS[primaryFocus] ?? FOCUS_COLORS.normal
                return (
                  <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                    <Td>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#0A2F35' }}>{d.name}</p>
                        {d.breed && <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{d.breed}</p>}
                      </div>
                    </Td>
                    <Td>
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{d.ownerName || '—'}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{d.ownerEmail}</p>
                      </div>
                    </Td>
                    <Td>
                      <span style={{ background: fc.bg, color: fc.color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 100 }}>
                        {focusKeys.join(' + ')}
                      </span>
                    </Td>
                    <Td>{d.hasPhoto ? '✅' : '❌'}</Td>
                    <Td>{d.hasHealthNotes ? '✅' : '❌'}</Td>
                    <Td>{d.activeWalkers > 0 ? '✅' : '❌'}</Td>
                    <Td>{d.reportCount}</Td>
                    <Td>{d.lastReportDate ? rel(d.lastReportDate) : 'Never'}</Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Walkers Tab ───────────────────────────────────────────────────────────────

interface Walker {
  id: string; name: string; phone: string; totalWalks: number
  firstSeenAt: string; lastSeenAt: string
  connections: Array<{ dogName: string; ownerName: string | null; status: string; reportCount: number; avgQuality: number | null; token: string }>
}

function WalkersTab() {
  const [walkers, setWalkers] = useState<Walker[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/v2/walkers').then(r => r.json()).then(d => { setWalkers(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  function copyLink(token: string) {
    const url = `https://pupstep.in/walker/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(t => (t === token ? null : t)), 1500)
    })
  }

  return (
    <div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6B7280', fontFamily: 'var(--font-nunito)' }}>
        {walkers.length} walkers registered — copy a dog's dashboard link here to send it manually until Twilio auto-send is wired up.
      </p>
      {loading ? <Spinner /> : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #E5E7EB' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
            <thead>
              <tr><Th>Walker</Th><Th>Phone</Th><Th>Dogs</Th><Th>Total walks</Th><Th>Avg quality</Th><Th>Last active</Th><Th>Since</Th></tr>
            </thead>
            <tbody>
              {walkers.map((w, i) => {
                const allQ = w.connections.map(c => c.avgQuality).filter(Boolean) as number[]
                const avgQ = allQ.length ? Math.round(allQ.reduce((a, b) => a + b, 0) / allQ.length) : null
                const qType = avgQ === null ? 'none' : avgQ >= 70 ? 'good' : avgQ >= 40 ? 'weak' : 'broken'
                return (
                  <tr key={w.id} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                    <Td><span style={{ fontWeight: 700 }}>{w.name}</span></Td>
                    <Td mono>{w.phone}</Td>
                    <Td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {w.connections.length ? w.connections.map((c) => (
                          <div key={c.token} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13 }}>{c.dogName || '—'}</span>
                            {c.token && (
                              <button
                                type="button"
                                onClick={() => copyLink(c.token)}
                                style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                                  border: '1px solid #E5E7EB', background: copiedToken === c.token ? '#DCFCE7' : '#F9FAFB',
                                  color: copiedToken === c.token ? '#166534' : '#6B7280', cursor: 'pointer' }}
                              >
                                {copiedToken === c.token ? 'Copied ✓' : 'Copy link'}
                              </button>
                            )}
                          </div>
                        )) : '—'}
                      </div>
                    </Td>
                    <Td>{w.totalWalks}</Td>
                    <Td>{avgQ !== null ? <Badge text={`${avgQ}`} type={qType as any} /> : '—'}</Td>
                    <Td>{rel(w.lastSeenAt)}</Td>
                    <Td>{rel(w.firstSeenAt)}</Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'overview',   label: '📊 Overview'    },
  { id: 'parents',    label: '🏠 Parents'     },
  { id: 'dogs',       label: '🐕 Dogs'        },
  { id: 'walkers',    label: '🦮 Walkers'     },
  { id: 'reports',    label: '📋 Reports'     },
  { id: 'payments',   label: '💳 Payments'    },
  { id: 'followups',  label: '📌 Follow-ups'  },
]

export default function AdminV2Client() {
  const [tab, setTab] = useState<AdminTab>('overview')
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [secsAgo, setSecsAgo] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setSecsAgo(s => s + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setLastUpdated(new Date())
      setSecsAgo(0)
    }, 60000)
    return () => clearInterval(id)
  }, [])

  const refresh = useCallback(() => { setLastUpdated(new Date()); setSecsAgo(0) }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA' }}>

      {/* Header */}
      <header style={{ background: '#0A2F35', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 16, position: 'sticky', top: 0, zIndex: 40 }}>
        <span style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#fff' }}>
          PupStep Admin
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-nunito)' }}>
          {secsAgo < 5 ? 'Just updated' : `${secsAgo}s ago`}
        </span>
        <button onClick={refresh}
          style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 8,
            padding: '5px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontWeight: 600 }}>
          ↻ Refresh
        </button>
        <a href="/home" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none', fontFamily: 'var(--font-nunito)' }}>
          ← App
        </a>
      </header>

      {/* Tab bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 24px',
        display: 'flex', gap: 0, overflowX: 'auto', position: 'sticky', top: 56, zIndex: 30 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: 'none', border: 'none', padding: '14px 16px', fontSize: 13, cursor: 'pointer',
              whiteSpace: 'nowrap', fontFamily: 'var(--font-nunito)',
              fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? 'oklch(0.48 0.17 196)' : '#6B7280',
              borderBottom: tab === t.id ? '2.5px solid oklch(0.48 0.17 196)' : '2.5px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        {tab === 'overview'  && <OverviewTab  key={lastUpdated.toISOString()} />}
        {tab === 'parents'   && <ParentsTab   key={lastUpdated.toISOString()} />}
        {tab === 'dogs'      && <DogsTab      key={lastUpdated.toISOString()} />}
        {tab === 'walkers'   && <WalkersTab   key={lastUpdated.toISOString()} />}
        {tab === 'reports'   && <AdminReportsTab  key={lastUpdated.toISOString()} />}
        {tab === 'payments'  && <AdminPaymentsTab key={lastUpdated.toISOString()} />}
        {tab === 'followups' && <AdminFollowupsTab key={lastUpdated.toISOString()} />}
      </main>
    </div>
  )
}
