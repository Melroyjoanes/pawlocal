import type { Metadata } from 'next'
import WalkerGuideClient from './WalkerGuideClient'

// This page has no login gate by design — dog walkers reach it via a
// token-based dashboard link and have no account to authenticate with
// (see app/walker/[token]/WalkerClient.tsx). It also isn't linked from the
// public marketing site. Keep it out of search results instead of gating it.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function WalkerGuidePage() {
  return <WalkerGuideClient />
}
