import type { Metadata } from 'next'

// app/contact/page.tsx is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Questions about PupStep GPS walk reports? Reach the PupStep team on WhatsApp or email — we reply fast.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/contact`,
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
