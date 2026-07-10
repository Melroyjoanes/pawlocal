'use client'

import GoogleSignInButton from '@/components/GoogleSignInButton'
import { CLAY_SHADOW_CREAM } from '@/lib/clayShadows'

interface Props {
  next?: string
}

export default function AccountClient({ next }: Props) {
  const redirectNext = next ?? '/my-account'

  return (
    <div className="max-w-md mx-auto py-14 px-4">
      <div className="text-center mb-8">
        <span className="text-5xl">🐾</span>
        <h1 className="text-2xl font-bold text-slate-900 mt-4 mb-2">
          Welcome to PupStep
        </h1>
        <p className="text-sm text-slate-500">
          {next
            ? 'Quick sign in to continue — free, takes 10 seconds.'
            : 'Sign in to save providers, post requests, and leave reviews.'}
        </p>
      </div>

      <div
        className="bg-white rounded-2xl p-6"
        style={{ boxShadow: CLAY_SHADOW_CREAM }}
      >
        <GoogleSignInButton
          redirectNext={redirectNext}
          label="Continue with Google"
        />
      </div>
    </div>
  )
}
