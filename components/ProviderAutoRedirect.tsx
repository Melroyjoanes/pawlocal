'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

// When a provider clicks a magic link they land on the homepage with
// #access_token=... in the URL. Supabase sets the session from the hash;
// once it fires SIGNED_IN we redirect to /pro which then redirects
// approved providers straight to /pro/dashboard.
export default function ProviderAutoRedirect() {
  const router = useRouter()

  useEffect(() => {
    if (!window.location.hash.includes('access_token=')) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.replace('/pro')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return null
}
