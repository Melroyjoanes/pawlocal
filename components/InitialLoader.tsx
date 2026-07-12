'use client'

import { useEffect, useRef, useState } from 'react'

// First-paint splash screen. Mounted once at the root layout, so it only
// appears on a hard load/refresh (App Router keeps layout components mounted
// across client-side navigations — it won't re-flash on every route change).
const MIN_VISIBLE_MS = 750
const MAX_VISIBLE_MS = 4000
const FADE_MS = 400

export default function InitialLoader() {
  const [visible, setVisible] = useState(true)
  const [fadingOut, setFadingOut] = useState(false)
  const [progress, setProgress] = useState(0.06)
  const growTimer = useRef<number | null>(null)

  useEffect(() => {
    const start = Date.now()
    let dismissed = false

    growTimer.current = window.setInterval(() => {
      setProgress(p => p + (0.92 - p) * 0.1)
    }, 120)

    const dismiss = () => {
      if (dismissed) return
      dismissed = true
      if (growTimer.current) window.clearInterval(growTimer.current)
      const elapsed = Date.now() - start
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed)
      window.setTimeout(() => {
        setProgress(1)
        window.setTimeout(() => {
          setFadingOut(true)
          window.setTimeout(() => setVisible(false), FADE_MS)
        }, 160)
      }, wait)
    }

    if (document.readyState === 'complete') {
      dismiss()
    } else {
      window.addEventListener('load', dismiss)
    }
    const maxTimer = window.setTimeout(dismiss, MAX_VISIBLE_MS)

    return () => {
      window.removeEventListener('load', dismiss)
      window.clearTimeout(maxTimer)
      if (growTimer.current) window.clearInterval(growTimer.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-label="Loading PupStep"
      className={`ps-loader ${fadingOut ? 'ps-loader--out' : ''}`}
    >
      <div className="ps-loader__stage">
        <img src="/logo.webp" alt="" width={400} height={147} className="ps-loader__logo" />

        <div className="ps-loader__progress-row" aria-hidden="true">
          <div className="ps-loader__progress-track">
            <div className="ps-loader__progress-fill" style={{ transform: `scaleX(${progress})` }} />
          </div>
          <svg viewBox="0 0 24 24" className="ps-loader__pin">
            <path d="M12 2c-3.6 0-6.5 2.9-6.5 6.5 0 4.9 6.5 13 6.5 13s6.5-8.1 6.5-13C18.5 4.9 15.6 2 12 2Zm0 9a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
          </svg>
        </div>
        <span className="ps-loader__percent" aria-hidden="true">{Math.round(progress * 100)}%</span>
      </div>

      <style>{`
        .ps-loader {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: flex;
          flex-direction: column;
          background: #0A2F35;
          opacity: 1;
          transition: opacity ${FADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ps-loader--out {
          opacity: 0;
          pointer-events: none;
        }

        .ps-loader__stage {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          padding: 2rem;
        }
        .ps-loader__logo {
          width: min(72vw, 380px);
          height: auto;
          animation: psLogoIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .ps-loader__progress-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: min(80vw, 340px);
        }
        .ps-loader__percent {
          font-family: var(--font-nunito), sans-serif;
          font-weight: 700;
          font-size: 0.9rem;
          font-variant-numeric: tabular-nums;
          color: rgba(255, 251, 235, 0.55);
          letter-spacing: 0.02em;
        }
        .ps-loader__progress-track {
          flex: 1;
          height: 6px;
          border-radius: 3px;
          background: rgba(255, 251, 235, 0.14);
          overflow: hidden;
        }
        .ps-loader__progress-fill {
          height: 100%;
          width: 100%;
          transform-origin: left center;
          background: #FF8C52;
          border-radius: 3px;
          transition: transform 160ms linear;
        }
        .ps-loader__pin {
          width: 20px;
          height: 20px;
          fill: #FF8C52;
          flex-shrink: 0;
        }

        @keyframes psLogoIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ps-loader__logo { animation: none; }
          .ps-loader__progress-fill { transition: none; }
        }
      `}</style>
    </div>
  )
}
