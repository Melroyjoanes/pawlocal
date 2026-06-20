'use client'

import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'

interface Props {
  token: string
  dogName: string
  dogId: string
  walkerName: string | null
  walkerPhone: string | null
  status: string
}

export default function QRDisplayClient({
  token,
  dogName,
  dogId,
  walkerName: initialWalkerName,
  walkerPhone: initialWalkerPhone,
  status: initialStatus,
}: Props) {
  const [connectUrl, setConnectUrl] = useState('')
  const [walkerName, setWalkerName] = useState(initialWalkerName)
  const [walkerPhone, setWalkerPhone] = useState(initialWalkerPhone)
  const [status, setStatus] = useState(initialStatus)
  const [justConnected, setJustConnected] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Build connect URL using window.location.origin (client-side only)
  useEffect(() => {
    setConnectUrl(window.location.origin + '/connect/' + token)
  }, [token])

  // Poll for walker connection status every 5 seconds
  useEffect(() => {
    if (status === 'active') return // already connected, no need to poll

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/dogs/${dogId}/qr`)
        if (!res.ok) return
        const data = await res.json()
        if (data.status === 'active' && status !== 'active') {
          setStatus('active')
          setWalkerName(data.walker_name ?? null)
          setWalkerPhone(data.walker_phone ?? null)
          setJustConnected(true)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {
        // silently ignore poll errors
      }
    }, 5000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [dogId, status])

  const isActive = status === 'active'

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFBEB',
        fontFamily: 'var(--font-nunito), sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        {/* Heading */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: 'var(--font-fredoka), sans-serif',
              fontSize: '28px',
              fontWeight: 700,
              color: '#0A2F35',
              margin: '0 0 8px',
            }}
          >
            Show this QR to your walker 📱
          </h1>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
            {isActive
              ? 'Your walker is connected and ready to go!'
              : 'Your walker scans this with their phone camera'}
          </p>
        </div>

        {/* QR Code Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: '0 4px 24px rgba(10, 47, 53, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            width: '100%',
          }}
        >
          {/* QR Frame */}
          <div
            style={{
              padding: '16px',
              borderRadius: '16px',
              border: '3px solid #FF8C52',
              backgroundColor: '#ffffff',
              display: 'inline-flex',
              boxShadow: '0 2px 12px rgba(255, 140, 82, 0.2)',
            }}
          >
            {connectUrl ? (
              <QRCodeSVG
                value={connectUrl}
                size={240}
                bgColor="#ffffff"
                fgColor="#0A2F35"
                level="M"
                includeMargin={false}
              />
            ) : (
              /* Placeholder while URL hydrates */
              <div
                style={{
                  width: 240,
                  height: 240,
                  backgroundColor: '#F3F4F6',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9CA3AF',
                  fontSize: '13px',
                }}
              >
                Loading...
              </div>
            )}
          </div>

          {/* Dog name */}
          <p
            style={{
              fontFamily: 'var(--font-fredoka), sans-serif',
              fontSize: '26px',
              fontWeight: 700,
              color: '#0A2F35',
              margin: 0,
              letterSpacing: '0.01em',
            }}
          >
            {dogName}
          </p>

          {/* Status badge */}
          {isActive ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#DCFCE7',
                border: '1px solid #86EFAC',
                borderRadius: '100px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#15803D',
              }}
            >
              ✅ {walkerName ?? 'Your walker'} is connected
              {walkerPhone && (
                <span style={{ fontWeight: 400, color: '#16A34A' }}>
                  · {walkerPhone}
                </span>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFF7ED',
                border: '1px solid #FED7AA',
                borderRadius: '100px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#C2410C',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#F97316',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  flexShrink: 0,
                }}
              />
              Waiting for walker to scan...
            </div>
          )}

          {/* Just connected celebration */}
          {justConnected && (
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '12px',
                padding: '12px 16px',
                textAlign: 'center',
                fontSize: '14px',
                color: '#166534',
              }}
            >
              🎉 <strong>{walkerName ?? 'Your walker'}</strong> just scanned your QR code! They&apos;re now linked to {dogName}.
            </div>
          )}
        </div>

        {/* Navigation links */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
          }}
        >
          <Link
            href="/my-dogs"
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              backgroundColor: '#0A2F35',
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '12px',
              padding: '14px 24px',
              fontSize: '15px',
              fontWeight: 700,
              fontFamily: 'var(--font-fredoka), sans-serif',
              transition: 'background-color 0.15s',
            }}
          >
            My dogs &amp; reports →
          </Link>

          <Link
            href="/setup"
            style={{
              fontSize: '14px',
              color: '#6B7280',
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            ← Back to setup
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}
