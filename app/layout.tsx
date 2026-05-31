import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pet Services in Juhu, Mumbai',
  description: 'Find trusted dog walkers, groomers, vets, pet stores and insurance near Juhu, Mumbai.',
  openGraph: {
    title: 'Pet Services in Juhu, Mumbai',
    description: 'Find trusted dog walkers, groomers, vets, pet stores near Juhu.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 antialiased`}>
        <header className="border-b px-4 py-3 flex items-center justify-between max-w-5xl mx-auto">
          <a href="/" className="text-xl font-bold tracking-tight">🐾 PawLocal</a>
          <a
            href="/join"
            className="text-sm font-medium bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition"
          >
            List your service
          </a>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t mt-16 py-6 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} PawLocal · Juhu, Mumbai
        </footer>
      </body>
    </html>
  )
}
