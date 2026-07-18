'use client'
import { useEffect, useState } from 'react'

// ─── Shared helpers ────────────────────────────────────────────────────────────

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ─── AdminReportsTab ───────────────────────────────────────────────────────────

interface Report {
  id: string
  token: string
  dogName: string
  walkerName: string | null
  walkDate: string
  createdAt: string
  durationMins: number | null
  distanceMeters: number | null
  poopCount: number
  peeCount: number
  hasPhoto: boolean
  hasGps: boolean
  hasNotes: boolean
  qualityScore: number | null
  qualityLabel: 'good' | 'weak' | 'broken'
  parentOpened: boolean
  emailSentAt: string | null
}

const QUALITY_COLORS: Record<Report['qualityLabel'], { bg: string; text: string }> = {
  good:   { bg: '#DCFCE7', text: '#166534' },
  weak:   { bg: '#FEF9C3', text: '#854D0E' },
  broken: { bg: '#FEE2E2', text: '#991B1B' },
}

export function AdminReportsTab() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'good' | 'weak' | 'broken'>('all')

  useEffect(() => {
    fetch('/api/admin/v2/reports')
      .then(r => r.json())
      .then(d => {
        setReports(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const counts = {
    all:    reports.length,
    good:   reports.filter(r => r.qualityLabel === 'good').length,
    weak:   reports.filter(r => r.qualityLabel === 'weak').length,
    broken: reports.filter(r => r.qualityLabel === 'broken').length,
  }

  const filtered = filter === 'all' ? reports : reports.filter(r => r.qualityLabel === filter)

  const filterPills: { key: typeof filter; label: string }[] = [
    { key: 'all',    label: `All (${counts.all})` },
    { key: 'good',   label: `🟢 Good (${counts.good})` },
    { key: 'weak',   label: `🟡 Weak (${counts.weak})` },
    { key: 'broken', label: `🔴 Broken (${counts.broken})` },
  ]

  if (loading) {
    return <div style={{ padding: '32px', color: '#6B7280', fontSize: 14 }}>Loading reports…</div>
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {filterPills.map(pill => (
          <button
            key={pill.key}
            onClick={() => setFilter(pill.key)}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              border: filter === pill.key ? '2px solid #3B82F6' : '1px solid #D1D5DB',
              background: filter === pill.key ? '#EFF6FF' : '#F9FAFB',
              color: filter === pill.key ? '#1D4ED8' : '#374151',
              fontSize: 12,
              fontWeight: filter === pill.key ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F3F4F6', borderBottom: '1px solid #E5E7EB' }}>
              {['Dog', 'Walker', 'Date', 'Duration', 'Distance', 'Poop/Pee', 'Quality', 'GPS', 'Photo', 'Opened', 'Link'].map(col => (
                <th key={col} style={{ padding: '8px 10px', textAlign: 'left', color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF' }}>
                  No reports found
                </td>
              </tr>
            ) : (
              filtered.map(report => {
                const isBroken = report.qualityLabel === 'broken'
                const qc = QUALITY_COLORS[report.qualityLabel]
                return (
                  <tr
                    key={report.id}
                    style={{
                      background: isBroken ? '#FFF5F5' : 'white',
                      borderBottom: '1px solid #F3F4F6',
                    }}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#111827' }}>{report.dogName}</td>
                    <td style={{ padding: '8px 10px', color: '#374151' }}>{report.walkerName ?? '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#6B7280', whiteSpace: 'nowrap' }}>{relativeDate(report.walkDate)}</td>
                    <td style={{ padding: '8px 10px', color: '#374151' }}>
                      {report.durationMins != null ? `${report.durationMins} min` : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#374151' }}>
                      {report.distanceMeters != null
                        ? `${(report.distanceMeters / 1000).toFixed(1)} km`
                        : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      {`💩${report.poopCount} 💧${report.peeCount}`}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: qc.bg,
                        color: qc.text,
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: 'capitalize',
                      }}>
                        {report.qualityLabel}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{report.hasGps ? '✅' : '❌'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{report.hasPhoto ? '✅' : '❌'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{report.parentOpened ? '✅' : '❌'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <a
                        href={`/walk-report/${report.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 500 }}
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── AdminPaymentsTab ──────────────────────────────────────────────────────────

interface Payment {
  userId: string
  userEmail: string | null
  userName: string | null
  plan: string
  status: string
  amountPaise: number
  expiresAt: string | null
  daysLeft: number | null
  createdAt: string
  razorpayPaymentId: string | null
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:   { bg: '#DCFCE7', text: '#166534' },
  expired:  { bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { bg: '#F3F4F6', text: '#374151' },
  past_due:  { bg: '#FEF3C7', text: '#92400E' },
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`
}

function daysLeftColor(days: number | null): string {
  if (days == null) return '#6B7280'
  if (days > 7) return '#166534'
  if (days >= 3) return '#92400E'
  return '#991B1B'
}

export function AdminPaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/v2/payments')
      .then(r => r.json())
      .then(d => {
        setPayments(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const active  = payments.filter(p => p.status === 'active')
  const trial   = payments.filter(p => p.status === 'trial')
  const expired = payments.filter(p => p.status === 'expired')

  // MRR: sum of active monthly payments (naive: sum all active amounts / 12 if annual, just sum if monthly)
  const mrrPaise = active.reduce((sum, p) => sum + p.amountPaise, 0)
  const arrPaise = mrrPaise * 12

  if (loading) {
    return <div style={{ padding: '32px', color: '#6B7280', fontSize: 14 }}>Loading payments…</div>
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Summary row */}
      <div style={{
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: '10px 16px',
        marginBottom: 16,
        fontSize: 13,
        color: '#374151',
        display: 'flex',
        gap: 24,
        flexWrap: 'wrap',
      }}>
        <span><strong>Total MRR:</strong> {formatRupees(mrrPaise)}</span>
        <span><strong>ARR:</strong> {formatRupees(arrPaise)}</span>
        <span><strong>Active:</strong> {active.length}</span>
        <span><strong>Trial:</strong> {trial.length}</span>
        <span><strong>Expired:</strong> {expired.length}</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F3F4F6', borderBottom: '1px solid #E5E7EB' }}>
              {['User', 'Plan', 'Status', 'Amount', 'Expires', 'Days Left', 'Payment ID', 'Paid On'].map(col => (
                <th key={col} style={{ padding: '8px 10px', textAlign: 'left', color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF' }}>
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map(payment => {
                const statusKey = payment.status.toLowerCase().replace(' ', '_')
                const sc = STATUS_COLORS[statusKey] ?? { bg: '#F3F4F6', text: '#374151' }
                return (
                  <tr key={payment.userId} style={{ background: 'white', borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{payment.userName ?? '—'}</div>
                      <div style={{ color: '#9CA3AF', fontSize: 11 }}>{payment.userEmail ?? ''}</div>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#374151' }}>{payment.plan}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: sc.bg,
                        color: sc.text,
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: 'capitalize',
                      }}>
                        {payment.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#374151', fontWeight: 500 }}>
                      {formatRupees(payment.amountPaise)}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {payment.expiresAt ? relativeDate(payment.expiresAt) : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: daysLeftColor(payment.daysLeft) }}>
                      {payment.daysLeft != null ? `${payment.daysLeft}d` : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#9CA3AF', fontFamily: 'monospace', fontSize: 11 }}>
                      {payment.razorpayPaymentId ?? '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {relativeDate(payment.createdAt)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── AdminFollowupsTab ─────────────────────────────────────────────────────────

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

interface FollowupData {
  no_dog:       Parent[]
  no_walker:    Parent[]
  no_report:    Parent[]
  trial_ending: Parent[]
  ask_payment:  Parent[]
  paid:         Parent[]
}

const COLUMNS: {
  key: keyof FollowupData
  label: string
  color: string
  textColor: string
}[] = [
  { key: 'no_dog',       label: '🐕 No dog yet',        color: '#E5E7EB', textColor: '#374151' },
  { key: 'no_walker',    label: '🦮 No walker',          color: '#DBEAFE', textColor: '#1E40AF' },
  { key: 'no_report',    label: '📋 No report yet',      color: '#FEF3C7', textColor: '#92400E' },
  { key: 'trial_ending', label: '⏰ Trial ending',       color: '#FEE2E2', textColor: '#991B1B' },
  { key: 'ask_payment',  label: '💳 Ask for payment',    color: '#FEE2E2', textColor: '#991B1B' },
  { key: 'paid',         label: '✅ Paid',               color: '#DCFCE7', textColor: '#166534' },
]

const EMPTY_DATA: FollowupData = {
  no_dog:       [],
  no_walker:    [],
  no_report:    [],
  trial_ending: [],
  ask_payment:  [],
  paid:         [],
}

export function AdminFollowupsTab() {
  const [data, setData] = useState<FollowupData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/v2/followups')
      .then(r => r.json())
      .then(d => {
        setData({ ...EMPTY_DATA, ...d })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ padding: '32px', color: '#6B7280', fontSize: 14 }}>Loading follow-ups…</div>
  }

  return (
    <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
        {COLUMNS.map(col => {
          const parents = data[col.key]
          return (
            <div
              key={col.key}
              style={{
                minWidth: 200,
                maxWidth: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {/* Column header */}
              <div style={{
                background: col.color,
                color: col.textColor,
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>{col.label}</span>
                <span style={{
                  background: 'rgba(0,0,0,0.1)',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: 11,
                }}>
                  {parents.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {parents.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#9CA3AF', padding: '8px 0', textAlign: 'center' }}>
                    No users
                  </div>
                ) : (
                  parents.map(parent => (
                    <div
                      key={parent.id}
                      style={{
                        background: 'white',
                        borderRadius: 8,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        padding: 12,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#111827', marginBottom: 2 }}>{parent.name}</div>
                      <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 4 }}>{parent.email}</div>
                      <div style={{ color: '#6B7280', fontSize: 11, marginBottom: 2 }}>
                        Joined {relativeDate(parent.createdAt)}
                      </div>
                      {parent.trialDay != null && (
                        <div style={{
                          fontSize: 11,
                          color: (parent.trialDaysRemaining ?? 0) <= 1 ? '#991B1B' : '#92400E',
                          fontWeight: 600,
                          marginBottom: 4,
                        }}>
                          ⏰ Day {parent.trialDay}/3 · {parent.trialDaysRemaining}d left
                        </div>
                      )}
                      {parent.phone && (
                        <a
                          href={`https://wa.me/91${parent.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            marginTop: 4,
                            padding: '3px 10px',
                            background: '#22C55E',
                            color: 'white',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          WhatsApp →
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
