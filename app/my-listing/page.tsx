'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MyListingPage() {
  const router = useRouter()
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFind(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const num = whatsapp.replace(/\D/g, '').replace(/^91/, '')
    if (num.length < 10) {
      setError('Enter your 10-digit WhatsApp number')
      setLoading(false)
      return
    }

    const res = await fetch(`/api/provider/find?whatsapp=${encodeURIComponent(whatsapp)}`)
    const json = await res.json()

    if (!res.ok || !json.id) {
      setError(json.error ?? 'No listing found for this number. Make sure you registered on PawLocal.')
      setLoading(false)
      return
    }

    router.push(`/provider/${json.id}`)
  }

  return (
    <div className="max-w-md mx-auto py-14 px-4">
      <a
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        ← Home
      </a>

      <div className="bg-white border border-border rounded-2xl p-7 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl mb-5">
          🐾
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Find my listing</h1>
        <p className="text-sm text-slate-500 mb-7">
          Enter your registered WhatsApp number to find and manage your PawLocal profile.
        </p>

        <form onSubmit={handleFind} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Your WhatsApp number
            </label>
            <div className="flex items-center gap-2 border border-border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-amber-400 bg-white">
              <span className="text-sm text-slate-400 font-medium">+91</span>
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="98765 43210"
                className="flex-1 text-sm outline-none bg-transparent"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)',
              color: '#451A03',
              boxShadow: '0 4px 0px rgba(120,53,15,0.28)',
            }}
          >
            {loading ? 'Searching…' : 'Find my profile →'}
          </button>
        </form>
      </div>

      <p className="text-xs text-slate-400 text-center mt-5">
        Not registered yet?{' '}
        <a href="/join" className="underline hover:text-slate-600">
          List your services for free
        </a>
      </p>
    </div>
  )
}
