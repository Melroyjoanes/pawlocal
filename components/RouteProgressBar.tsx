'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Slim top progress bar for client-side route transitions. App Router doesn't
// expose a "navigation started" event, so we infer it: any click on an
// internal link starts the bar, then the next pathname/search-param commit
// (i.e. the new route has rendered) completes and fades it.
export default function RouteProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const growTimer = useRef<number | null>(null)
  const hideTimer = useRef<number | null>(null)
  const navigatingRef = useRef(false)

  useEffect(() => {
    const clearTimers = () => {
      if (growTimer.current) window.clearInterval(growTimer.current)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }

    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement)?.closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || !href.startsWith('/') || href.startsWith('//')) return
      if (anchor.target && anchor.target !== '_self') return
      if (href === window.location.pathname + window.location.search) return

      navigatingRef.current = true
      clearTimers()
      setVisible(true)
      setProgress(0.08)

      let current = 0.08
      growTimer.current = window.setInterval(() => {
        // Ease toward 88% — never finishes on its own, waits for the real commit.
        current += (0.88 - current) * 0.12
        setProgress(current)
      }, 180)
    }

    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
      clearTimers()
    }
  }, [])

  useEffect(() => {
    if (!navigatingRef.current) return
    navigatingRef.current = false

    if (growTimer.current) window.clearInterval(growTimer.current)
    setProgress(1)
    hideTimer.current = window.setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 260)

    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  return (
    <div
      aria-hidden="true"
      className="ps-progress"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="ps-progress__bar"
        style={{ transform: `scaleX(${progress})` }}
      />
      <style>{`
        .ps-progress {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          z-index: 1000;
          background: transparent;
          transition: opacity 260ms ease;
          pointer-events: none;
        }
        .ps-progress__bar {
          height: 100%;
          width: 100%;
          transform-origin: left center;
          background: linear-gradient(90deg, #FF8C52 0%, #F56B22 100%);
          box-shadow: 0 0 8px rgba(255,140,82,0.6);
          border-radius: 0 3px 3px 0;
          transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .ps-progress__bar { transition: transform 80ms linear; }
        }
      `}</style>
    </div>
  )
}
