import { type ReactNode } from 'react'
// Do NOT import the main site Header or Footer

export default function ProLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-50">
      {children}
    </div>
  )
}
