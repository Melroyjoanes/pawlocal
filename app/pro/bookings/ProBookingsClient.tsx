'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Booking = {
  id: string
  date: string        // YYYY-MM-DD
  service: string
  ownerName: string
  petName: string
  duration: number    // minutes
  amount: number      // ₹
  notes: string
}

const SERVICE_LABELS: Record<string, string> = {
  'dog-walking': '🦮 Dog Walking',
  'grooming': '✂️ Grooming',
  'vet': '🏥 Vet Visit',
  'pet-store': '🛒 Pet Store',
  'dog-training': '🎓 Dog Training',
  'insurance': '🛡 Insurance',
  'other': '📌 Other',
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function monthLabel(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  })
}

function thisMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface Props {
  providerId: string
  firstName: string
  categorySlugs: string[]
}

export default function ProBookingsClient({ providerId, firstName, categorySlugs }: Props) {
  const STORAGE_KEY = `pawlocal_bookings_${providerId}`

  const [bookings, setBookings] = useState<Booking[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    service: categorySlugs[0] ?? 'dog-walking',
    ownerName: '',
    petName: '',
    duration: '60',
    amount: '',
    notes: '',
  })

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setBookings(JSON.parse(raw))
    } catch { /* empty */ }
  }, [STORAGE_KEY])

  function save(updated: Booking[]) {
    setBookings(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const booking: Booking = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: form.date,
      service: form.service,
      ownerName: form.ownerName.trim(),
      petName: form.petName.trim(),
      duration: parseInt(form.duration, 10) || 0,
      amount: parseFloat(form.amount) || 0,
      notes: form.notes.trim(),
    }
    const updated = [booking, ...bookings]
    save(updated)
    setForm({
      date: new Date().toISOString().split('T')[0],
      service: categorySlugs[0] ?? 'dog-walking',
      ownerName: '', petName: '', duration: '60', amount: '', notes: '',
    })
    setShowForm(false)
    setSaving(false)
  }

  function deleteBooking(id: string) {
    save(bookings.filter(b => b.id !== id))
  }

  // Monthly stats
  const mk = thisMonthKey()
  const thisMonth = bookings.filter(b => b.date.startsWith(mk))
  const monthlyEarnings = thisMonth.reduce((s, b) => s + b.amount, 0)
  const monthlyCount = thisMonth.length
  const monthlyHours = Math.round(thisMonth.reduce((s, b) => s + b.duration, 0) / 60 * 10) / 10

  // Group by month for display
  const grouped: Record<string, Booking[]> = {}
  for (const b of bookings) {
    const key = b.date.slice(0, 7)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(b)
  }
  const monthKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="min-h-dvh bg-stone-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20 }}>
            Bookings
          </h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-85"
            style={{ backgroundColor: 'oklch(0.48 0.17 196)' }}
          >
            + Log booking
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Monthly summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)', border: '1px solid #99F6E4' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-3">This month</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {monthlyCount}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">Sessions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
                ₹{monthlyEarnings.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">Earned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {monthlyHours}h
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">On the job</p>
            </div>
          </div>
        </motion.div>

        {/* Booking list */}
        {bookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
            className="bg-white rounded-2xl border border-border p-8 text-center"
          >
            <div className="text-4xl mb-3">📒</div>
            <p className="font-semibold text-stone-700 mb-1">No bookings yet</p>
            <p className="text-sm text-stone-400 mb-5">Log your first session to start tracking your work and earnings.</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white"
              style={{ backgroundColor: 'oklch(0.48 0.17 196)' }}
            >
              Log your first booking →
            </button>
          </motion.div>
        ) : (
          monthKeys.map((mk, gi) => (
            <motion.div
              key={mk}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: gi * 0.05 }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">
                {monthLabel(grouped[mk][0].date)}
                <span className="ml-2 font-normal normal-case text-stone-400">
                  · ₹{grouped[mk].reduce((s, b) => s + b.amount, 0).toLocaleString('en-IN')} earned
                </span>
              </p>
              <div className="space-y-2">
                {grouped[mk].map((b) => (
                  <div
                    key={b.id}
                    className="bg-white rounded-2xl border border-border p-4 flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                          {SERVICE_LABELS[b.service] ?? b.service}
                        </span>
                        <span className="text-xs text-stone-400">{formatDate(b.date)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {b.petName && <span className="font-medium text-stone-800">🐾 {b.petName}</span>}
                        {b.ownerName && <span className="text-stone-500">{b.ownerName}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                        {b.duration > 0 && <span>⏱ {b.duration} min</span>}
                        {b.notes && <span className="truncate">{b.notes}</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {b.amount > 0 && (
                        <p className="font-bold text-stone-900">₹{b.amount.toLocaleString('en-IN')}</p>
                      )}
                      <button
                        onClick={() => deleteBooking(b.id)}
                        className="text-[10px] text-stone-300 hover:text-red-400 transition-colors mt-1"
                      >
                        remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </main>

      {/* Log booking modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)', maxHeight: '90dvh', overflowY: 'auto' }}
            >
              <div className="max-w-lg mx-auto px-5 pt-5 pb-6">
                {/* Drag handle */}
                <div className="w-10 h-1 rounded-full bg-stone-200 mx-auto mb-5" />
                <h2 className="text-lg font-bold text-stone-900 mb-5">Log a booking</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Date + Service */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-stone-500 block mb-1.5">Date</label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-500 block mb-1.5">Service</label>
                      <select
                        value={form.service}
                        onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                      >
                        {[...categorySlugs, ...Object.keys(SERVICE_LABELS).filter(k => !categorySlugs.includes(k))].map(slug => (
                          <option key={slug} value={slug}>{SERVICE_LABELS[slug] ?? slug}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Pet name + Owner */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-stone-500 block mb-1.5">Pet name</label>
                      <input
                        type="text"
                        placeholder="Bruno"
                        value={form.petName}
                        onChange={e => setForm(f => ({ ...f, petName: e.target.value }))}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-500 block mb-1.5">Owner name</label>
                      <input
                        type="text"
                        placeholder="Priya"
                        value={form.ownerName}
                        onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                    </div>
                  </div>

                  {/* Duration + Amount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-stone-500 block mb-1.5">Duration (min)</label>
                      <input
                        type="number"
                        placeholder="60"
                        min="1"
                        value={form.duration}
                        onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-500 block mb-1.5">Amount earned (₹)</label>
                      <input
                        type="number"
                        placeholder="500"
                        min="0"
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-semibold text-stone-500 block mb-1.5">Notes (optional)</label>
                    <textarea
                      placeholder="Anything to remember..."
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: 'oklch(0.48 0.17 196)' }}
                  >
                    {saving ? 'Saving…' : 'Save booking'}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
