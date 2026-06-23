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
  otp: string | null
}

export default function QRDisplayClient({
  token,
  dogName,
  dogId,
  walkerName: initialWalkerName,
  walkerPhone: initialWalkerPhone,
  status: initialStatus,
  otp,
}: Props) {
  const [connectUrl, setConnectUrl] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [walkerDashUrl, setWalkerDashUrl] = useState('')
  const [walkerDashWaUrl, setWalkerDashWaUrl] = useState('')
  const [hindiScript, setHindiScript] = useState('')
  const [walkerName, setWalkerName] = useState(initialWalkerName)
  const [walkerPhone, setWalkerPhone] = useState(initialWalkerPhone)
  const [status, setStatus] = useState(initialStatus)
  const [justConnected, setJustConnected] = useState(false)
  const [copied, setCopied] = useState(false)
  const [walkerGuideOpen, setWalkerGuideOpen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Build connect URL and WhatsApp share URL using window.location.origin (client-side only)
  useEffect(() => {
    const origin = window.location.origin
    const url = origin + '/connect/' + token
    setConnectUrl(url)
    const msg = `Hi! I use PupStep to track ${dogName}'s walks. Scan this QR code and enter code: ${otp ?? ''} 🐾\n${url}`
    setShareUrl('https://wa.me/?text=' + encodeURIComponent(msg))
    const dashUrl = origin + '/walker/' + token
    setWalkerDashUrl(dashUrl)
    setHindiScript(`Hi! PupStep se apne kutte ki walk track karo.\n\n1. Yeh link kholo\n2. Code daalo jo main dikhata/dikhati hun\n3. Apna naam aur number daalo\n4. "Walk shuru karo" dabao\n5. Chalne ke waqt 💧 Toilet aur 💩 Potty button dabao\n6. Walk khatam hone pe kutte ki photo lo\n7. "Send karo" dabao\n\nBas! Owner ko report mil jayegi. 🐾\n\n${url}`)
  }, [token, dogName, otp])

  // Build walker dashboard WhatsApp URL (depends on walkerName which may update after poll)
  useEffect(() => {
    if (!walkerDashUrl) return
    const displayName = walkerName ?? 'Your walker'
    const msg = `Hi ${displayName}! Here's your PupStep dashboard for ${dogName} 🐾\nTap this link anytime to log walks:\n${walkerDashUrl}`
    setWalkerDashWaUrl('https://wa.me/?text=' + encodeURIComponent(msg))
  }, [walkerDashUrl, walkerName, dogName])

  function handleCopyLink() {
    if (!walkerDashUrl) return
    navigator.clipboard.writeText(walkerDashUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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

          {/* OTP display — shown only when pending */}
          {!isActive && otp && (
            <div
              style={{
                backgroundColor: '#0A2F35',
                borderRadius: '16px',
                padding: '20px 24px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <p
                style={{
                  color: '#9ECDD4',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: 0,
                  fontFamily: 'var(--font-nunito), sans-serif',
                }}
              >
                Your walker&apos;s entry code
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'center',
                }}
              >
                {otp.split('').map((digit, i) => (
                  <div
                    key={i}
                    style={{
                      width: '56px',
                      height: '64px',
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '36px',
                      fontWeight: 800,
                      color: '#0A2F35',
                      fontFamily: 'var(--font-fredoka), sans-serif',
                      letterSpacing: '0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                    }}
                  >
                    {digit}
                  </div>
                ))}
              </div>
              <p
                style={{
                  color: '#9ECDD4',
                  fontSize: '12px',
                  margin: 0,
                  textAlign: 'center',
                  fontFamily: 'var(--font-nunito), sans-serif',
                }}
              >
                Tell this to your walker when they scan
              </p>
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

        {/* Walker dashboard sharing — shown only when connected */}
        {isActive && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderTop: '1px solid #E5E7EB', width: '100%' }} />

            <p
              style={{
                fontFamily: 'var(--font-fredoka), sans-serif',
                fontSize: '17px',
                fontWeight: 700,
                color: '#0A2F35',
                margin: 0,
                textAlign: 'center',
              }}
            >
              🎉 Share {walkerName ?? 'your walker'}&apos;s dashboard with them
            </p>

            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 2px 12px rgba(10, 47, 53, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* WhatsApp button */}
              <a
                href={walkerDashWaUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '16px',
                  padding: '14px 24px',
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-fredoka), sans-serif',
                  boxSizing: 'border-box',
                }}
              >
                📲 Send {walkerName ?? 'walker'}&apos;s dashboard on WhatsApp
              </a>

              {/* Copy link button */}
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  backgroundColor: copied ? '#F0FDF4' : '#F3F4F6',
                  color: copied ? '#15803D' : '#374151',
                  border: copied ? '1px solid #86EFAC' : '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-nunito), sans-serif',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                {copied ? '✅ Link copied!' : '🔗 Copy dashboard link'}
              </button>

              <p
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  margin: 0,
                  textAlign: 'center',
                  fontFamily: 'var(--font-nunito), sans-serif',
                }}
              >
                Your walker needs this link to start logging walks
              </p>
            </div>
          </div>
        )}

        {/* How to share with your walker — shown only when pending */}
        {!isActive && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Divider */}
            <div style={{ borderTop: '1px solid #E5E7EB', width: '100%' }} />

            {/* Section heading */}
            <p
              style={{
                fontFamily: 'var(--font-fredoka), sans-serif',
                fontSize: '17px',
                fontWeight: 700,
                color: '#0A2F35',
                margin: 0,
                textAlign: 'center',
              }}
            >
              How to share with your walker
            </p>

            {/* Teal info card */}
            <div
              style={{
                backgroundColor: '#F0FDFA',
                border: '1px solid #99F6E4',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <p style={{ fontSize: '14px', color: '#0D9488', fontWeight: 600, margin: 0 }}>
                Show your walker this screen and say:
              </p>

              {/* Amber quote box */}
              <div
                style={{
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '14px',
                  color: '#0A2F35',
                  lineHeight: 1.6,
                }}
              >
                &ldquo;Scan this QR code with your camera, then type{' '}
                {otp ? (
                  <strong style={{ color: '#F59E0B' }}>{otp}</strong>
                ) : (
                  <strong style={{ color: '#F59E0B' }}>your code</strong>
                )}{' '}
                when it asks for a code&rdquo;
              </div>
            </div>

            {/* WhatsApp share button */}
            <a
              href={shareUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                backgroundColor: '#25D366',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '16px',
                padding: '14px 24px',
                fontSize: '15px',
                fontWeight: 700,
                fontFamily: 'var(--font-fredoka), sans-serif',
                boxSizing: 'border-box',
              }}
            >
              📲 Share via WhatsApp
            </a>

            {/* Hindi walker instructions button */}
            <a
              href={hindiScript ? `https://wa.me/?text=${encodeURIComponent(hindiScript)}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                minHeight: 52,
                borderRadius: 14,
                background: '#25D366',
                color: '#fff',
                fontFamily: 'var(--font-fredoka)',
                fontSize: 16,
                fontWeight: 700,
                textDecoration: 'none',
                padding: '0 16px',
                boxSizing: 'border-box',
              }}
            >
              📋 Send walker instructions (Hindi)
            </a>
          </div>
        )}

        {/* What your walker will see — collapsible parent guide */}
        {(() => {
          const walkerSteps = [
            { icon: '📱', title: 'Connect screen', desc: 'Walker opens the link → enters 4-digit OTP → types their name and phone' },
            { icon: '🏠', title: 'Walker dashboard', desc: `They see a big "Start Walk" button with ${dogName}'s health notes below it` },
            { icon: '🗺️', title: 'During the walk', desc: 'Live GPS map + two big buttons: 💧 Toilet and 💩 Potty. They tap when it happens.' },
            { icon: '📸', title: 'After the walk', desc: 'They take a photo of your dog, then tap "Send report" — you get the WhatsApp link instantly' },
          ]
          return (
            <div style={{ width: '100%', background: '#F8F7F4', borderRadius: 16, overflow: 'hidden', border: '1.5px solid rgba(226,220,200,0.7)' }}>
              <button
                onClick={() => setWalkerGuideOpen(o => !o)}
                style={{ width: '100%', background: 'none', border: 'none', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', minHeight: 48 }}
              >
                <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: '#0A2F35', margin: 0 }}>
                  👁 What will my walker see?
                </p>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: 'oklch(0.48 0.17 196)', fontWeight: 700 }}>
                  {walkerGuideOpen ? 'Hide ↑' : 'Show ↓'}
                </span>
              </button>
              {walkerGuideOpen && (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {walkerSteps.map((s, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</span>
                      <div>
                        <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 13, fontWeight: 700, color: '#0A2F35', margin: '0 0 2px' }}>
                          Step {i + 1}: {s.title}
                        </p>
                        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                  <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#94A3B8', textAlign: 'center', margin: 0 }}>
                    Your walker can also try a practice walk on their dashboard before the first real walk
                  </p>
                </div>
              )}
            </div>
          )
        })()}

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
            href="/my-account"
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
            My account &amp; reports →
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
