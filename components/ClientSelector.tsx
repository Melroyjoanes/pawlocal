'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ProviderClient {
  id: string
  pet_name: string
  owner_name: string | null
  owner_whatsapp: string | null
  linked_at: string | null
}

interface Props {
  selected: ProviderClient | null
  onSelect: (client: ProviderClient) => void
}

const EASE = { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } as const

export default function ClientSelector({ selected, onSelect }: Props) {
  const [clients, setClients] = useState<ProviderClient[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [open, setOpen] = useState(false)

  // Add form state
  const [petName, setPetName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerWa, setOwnerWa] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [waLink, setWaLink] = useState('')

  useEffect(() => {
    fetch('/api/pro/clients')
      .then(r => r.json())
      .then(d => { setClients(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleAdd() {
    if (!petName.trim() || !ownerWa.trim()) return
    setAdding(true); setAddError('')
    const res = await fetch('/api/pro/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pet_name: petName, owner_name: ownerName, owner_whatsapp: ownerWa }),
    })
    const json = await res.json()
    if (!res.ok) { setAddError(json.error ?? 'Something went wrong'); setAdding(false); return }

    const newClient: ProviderClient = { id: json.client.id, pet_name: json.client.pet_name, owner_name: json.client.owner_name, owner_whatsapp: json.client.owner_whatsapp, linked_at: null }
    setClients(prev => [newClient, ...prev])
    setWaLink(json.whatsapp_link ?? '')
    setPetName(''); setOwnerName(''); setOwnerWa('')
    setAdding(false); setShowAdd(false)
    onSelect(newClient)
    setOpen(false)
  }

  return (
    <div className="w-full">
      {/* Selector button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl text-left transition-all"
        style={{
          background: selected ? 'oklch(0.94 0.06 196)' : 'white',
          border: `1.5px solid ${selected ? 'oklch(0.75 0.12 196)' : 'rgba(226,220,200,0.9)'}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{selected ? '🐕' : '🔍'}</span>
          <div>
            {selected ? (
              <>
                <p className="text-sm font-bold text-stone-900">{selected.pet_name}</p>
                {selected.owner_name && <p className="text-xs text-stone-400">{selected.owner_name}</p>}
              </>
            ) : (
              <p className="text-sm font-medium text-stone-400">Select a dog…</p>
            )}
          </div>
        </div>
        <span className="text-stone-300 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {/* WhatsApp send nudge after adding */}
      <AnimatePresence>
        {waLink && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={EASE}
            className="mt-2 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
            style={{ background: '#DCFCE7', border: '1px solid #BBF7D0' }}>
            <p className="text-xs font-semibold text-green-800">Client added! Send them the invite link.</p>
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex-shrink-0"
              style={{ background: '#25D366' }}
              onClick={() => setWaLink('')}>
              Send on WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={EASE}
            className="mt-1.5 rounded-2xl overflow-hidden z-50"
            style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1.5px solid rgba(226,220,200,0.7)' }}
          >
            {/* Existing clients */}
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-stone-400">Loading…</div>
            ) : clients.length === 0 && !showAdd ? (
              <div className="px-4 py-5 text-center">
                <p className="text-sm text-stone-400 mb-3">No clients yet.</p>
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto">
                {clients.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { onSelect(c); setOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors border-b last:border-b-0"
                    style={{ borderColor: 'rgba(226,220,200,0.5)' }}
                  >
                    <span className="text-lg">🐕</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-900">{c.pet_name}</p>
                      {(c.owner_name || c.owner_whatsapp) && (
                        <p className="text-xs text-stone-400 truncate">
                          {[c.owner_name, c.owner_whatsapp].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    {c.linked_at && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: '#DCFCE7', color: '#166534' }}>linked</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Add new client */}
            {!showAdd ? (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center gap-2 px-4 py-3.5 text-sm font-bold transition-colors border-t"
                style={{ borderColor: 'rgba(226,220,200,0.5)', color: 'oklch(0.44 0.16 196)', background: 'oklch(0.97 0.02 196)' }}
              >
                <span>＋</span> Add new client
              </button>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={EASE}
                className="border-t p-4 space-y-2.5"
                style={{ borderColor: 'rgba(226,220,200,0.5)', background: 'oklch(0.97 0.02 196)' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'oklch(0.44 0.16 196)' }}>New client</p>
                <input
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: 'rgba(226,220,200,0.9)', background: 'white' }}
                  placeholder="Dog's name *"
                  value={petName}
                  onChange={e => setPetName(e.target.value)}
                  autoFocus
                />
                <input
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: 'rgba(226,220,200,0.9)', background: 'white' }}
                  placeholder="Owner's name"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                />
                <input
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: 'rgba(226,220,200,0.9)', background: 'white' }}
                  placeholder="Owner's WhatsApp (10-digit) *"
                  inputMode="tel"
                  value={ownerWa}
                  onChange={e => setOwnerWa(e.target.value)}
                />
                {addError && <p className="text-xs text-red-500">{addError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowAdd(false); setAddError('') }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-stone-400 bg-white border"
                    style={{ borderColor: 'rgba(226,220,200,0.9)' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleAdd} disabled={adding || !petName.trim() || !ownerWa.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
                    style={{ background: 'oklch(0.48 0.17 196)' }}>
                    {adding ? 'Adding…' : 'Add client'}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
