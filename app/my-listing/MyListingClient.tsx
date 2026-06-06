'use client'

import GoogleSignInButton from '@/components/GoogleSignInButton'

const ADMIN_WA = 'https://wa.me/919082980099?text=' + encodeURIComponent(
  'Hi! I am a service provider listed on PawLocal and I want to access my dashboard. My name is: '
)

export default function MyListingClient() {
  return (
    <div className="max-w-md mx-auto py-14 px-4">
      <a
        href="/"
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
          Sign in with the Google account linked to your PawLocal profile.
        </p>

        {/* Primary: Google sign-in — /dashboard auto-finds their linked profile */}
        <GoogleSignInButton
          redirectNext="/dashboard"
          label="Sign in with Google"
        />

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">not set up yet?</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Contact admin to get linked */}
        <a
          href={ADMIN_WA}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3.5 font-semibold text-sm transition-colors"
        >
          💬 Message PawLocal to get access
        </a>

        <p className="text-xs text-slate-400 text-center mt-4 leading-relaxed">
          Send us your name and we'll link your Google account to your listing — usually within a few hours.
        </p>
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
