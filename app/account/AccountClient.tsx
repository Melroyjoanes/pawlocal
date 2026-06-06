'use client'

import GoogleSignInButton from '@/components/GoogleSignInButton'

interface Props {
  reason?: string
  next?: string
}

export default function AccountClient({ reason, next }: Props) {
  const isProviderFlow = reason === 'provider'
  const redirectNext = next ?? (isProviderFlow ? '/dashboard' : '/my-account')

  return (
    <div className="max-w-md mx-auto py-14 px-4">
      <div className="text-center mb-8">
        <span className="text-5xl">🐾</span>
        <h1 className="text-2xl font-bold text-slate-900 mt-4 mb-2">
          {isProviderFlow ? 'Provider sign in' : 'Welcome to PawLocal'}
        </h1>
        <p className="text-sm text-slate-500">
          {isProviderFlow
            ? 'Sign in to access your dashboard and manage your listing.'
            : 'Sign in to save providers, post requests, and leave reviews.'}
        </p>
      </div>

      {/* Single Google sign-in — works for both owners and providers */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm mb-4">
        <GoogleSignInButton
          redirectNext={redirectNext}
          label={isProviderFlow ? 'Sign in with Google' : 'Continue with Google'}
        />
      </div>

      {!isProviderFlow && (
        <>
          {/* Or choose a role */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or browse without signing in</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex flex-col gap-3">
            {/* Pet Owner — no account needed to browse */}
            <a
              href="/my-account"
              className="group bg-white border-2 border-border hover:border-[var(--pl-teal)] rounded-2xl p-5 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl flex-shrink-0">
                  🐶
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-[var(--pl-teal)] transition-colors">
                    I'm a pet owner
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Saved providers, broadcasts, reviews</p>
                </div>
                <span className="text-slate-300 group-hover:text-[var(--pl-teal)] transition-colors">→</span>
              </div>
            </a>

            {/* Provider */}
            <a
              href="/my-listing"
              className="group bg-white border-2 border-border hover:border-[var(--pl-teal)] rounded-2xl p-5 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-2xl flex-shrink-0">
                  🏪
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-[var(--pl-teal)] transition-colors">
                    I'm a service provider
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Dashboard, stats, live walk tracking</p>
                </div>
                <span className="text-slate-300 group-hover:text-[var(--pl-teal)] transition-colors">→</span>
              </div>
            </a>
          </div>
        </>
      )}

      <p className="text-xs text-slate-400 text-center mt-6">
        New provider?{' '}
        <a href="/join" className="text-[var(--pl-amber)] font-semibold hover:underline">
          List your service for free →
        </a>
      </p>
    </div>
  )
}
