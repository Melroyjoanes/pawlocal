import { type ReactNode } from 'react'
// Isolated shell — no PupStep header, nav, or footer
// Walk report is a standalone shareable card experience

export default function WalkReportLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh" style={{ background: 'oklch(0.975 0.006 85)' }}>
      {children}
    </div>
  )
}
