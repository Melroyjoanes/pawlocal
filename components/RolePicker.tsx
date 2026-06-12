'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userName: string
  userAvatar: string | null
}

export default function RolePicker({ userName, userAvatar }: Props) {
  const [loading, setLoading] = useState<'owner' | 'provider' | null>(null)
  const firstName = userName.split(' ')[0] || 'there'

  async function choose(role: 'pet_owner' | 'provider') {
    setLoading(role === 'pet_owner' ? 'owner' : 'provider')
    const supabase = createClient()
    // Persist role in auth metadata so we never show this screen again
    await supabase.auth.updateUser({ data: { pawlocal_role: role } })

    if (role === 'pet_owner') {
      window.location.href = '/my-account'
    } else {
      window.location.href = '/my-listing'
    }
  }

  return (
    <div className="max-w-md mx-auto py-14 px-4">
      {/* Avatar + greeting */}
      <div className="text-center mb-10">
        {userAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userAvatar}
            alt={userName}
            className="w-16 h-16 rounded-full mx-auto mb-4 border-4 border-amber-100 shadow-sm"
          />
        ) : (
          <div className="w-16 h-16 rounded-full mx-auto mb-4 bg-amber-50 flex items-center justify-center text-3xl shadow-sm">
            🐾
          </div>
        )}
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Welcome, {firstName}! 👋
        </h1>
        <p className="text-sm text-slate-500">What brings you to PupStep?</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Pet owner */}
        <button
          type="button"
          onClick={() => choose('pet_owner')}
          disabled={!!loading}
          className="group bg-white border-2 border-border hover:border-amber-400 rounded-2xl p-6 transition-all hover:shadow-md text-left disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center text-3xl flex-shrink-0 transition-colors">
              🐶
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors mb-0.5">
                {loading === 'owner' ? 'Taking you there…' : "I'm a pet owner"}
              </h2>
              <p className="text-sm text-slate-500">
                Save providers, post requests, leave reviews
              </p>
            </div>
            <span className="text-slate-300 group-hover:text-amber-400 transition-colors text-xl">→</span>
          </div>
        </button>

        {/* Service provider */}
        <button
          type="button"
          onClick={() => choose('provider')}
          disabled={!!loading}
          className="group bg-white border-2 border-border hover:border-[var(--pl-teal)] rounded-2xl p-6 transition-all hover:shadow-md text-left disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center text-3xl flex-shrink-0 transition-colors">
              🏪
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-[var(--pl-teal)] transition-colors mb-0.5">
                {loading === 'provider' ? 'Taking you there…' : "I'm a service provider"}
              </h2>
              <p className="text-sm text-slate-500">
                Access your dashboard, stats, and live walk tracking
              </p>
            </div>
            <span className="text-slate-300 group-hover:text-[var(--pl-teal)] transition-colors text-xl">→</span>
          </div>
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center mt-6">
        You can always switch later from your account settings.
      </p>
    </div>
  )
}
