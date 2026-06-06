'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import GoogleSignInButton from '@/components/GoogleSignInButton'

export default function MyListingClient() {
  const router = useRouter()
  const [showManual, setShowManual] = useState(false)
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

    router.push(`/provider/${json.id}/dashboard`)
  }

  return (
    <div className="max-w-md mx-auto py-14 px-4">
      <a
        href="/account"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        ← Back
      </a>

      <div className="bg-white border border-border rounded-2xl p-7 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-2xl mb-5">
          🏪
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Access my dashboard</h1>
        <p className="text-sm text-slate-500 mb-7 leading-relaxed">
          Sign in with the Google account you used to secure your PawLocal profile.
        </p>

        {/* Primary: Google sign-in */}
        <GoogleSignInButton
          redirectNext="/dashboard"
          label="Sign in with Google"
        />

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Fallback: WhatsApp lookup */}
        {!showManual ? (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="w-full text-sm text-center text-slate-500 hover:text-slate-700 transition-colors py-1"
          >
            Haven't secured your profile yet? Find listing by WhatsApp →
          </button>
        ) : (
          <form onSubmit={handleFind} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Your registered WhatsApp number
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
        )}
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
