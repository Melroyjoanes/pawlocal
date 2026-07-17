import type { Metadata } from 'next'

// app/faq/page.tsx is a client component (accordion state), so its metadata
// lives here instead.
export const metadata: Metadata = {
  title: 'FAQ — How PupStep GPS Walk Reports Work',
  description:
    'Everything dog parents ask about PupStep — how GPS walk reports work, how your walker connects with a QR code or WhatsApp link and a 4-digit code, pricing, trials, and what walkers see.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/faq`,
  },
}

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children
}
