'use client'

import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

type InviteLang = 'en' | 'hi' | 'mr'

interface Props {
  token: string
  dogName: string
  dogId: string
  walkerName: string | null
  walkerPhone: string | null
  status: string
  otp: string | null
  parentFirstName: string | null
}

// Walker-invite message, Option A: the parent's own name up front (this is
// who the walker actually trusts, not an app they've never heard of), a
// one-line reason framed around what it does for the parent, an explicit
// "it's free" reassurance since an unfamiliar link is the main hesitation,
// and the code pulled onto its own clearly-labelled line instead of buried
// mid-sentence in asterisks.
function buildInviteText(lang: InviteLang, parentFirstName: string | null, dogName: string, otp: string, link: string): string {
  const owner = parentFirstName ? parentFirstName : null
  if (lang === 'hi') {
    const intro = owner
      ? `नमस्ते! मैं ${owner} बोल रहा/रही हूँ, ${dogName} का पालक।`
      : `नमस्ते! मैं ${dogName} का पालक बोल रहा/रही हूँ।`
    return `${intro} PupStep ऐप से मुझे हर वॉक के बाद ${dogName} का पूरा अपडेट मिलता है — यह मुफ़्त है और बस 30 सेकंड लगते हैं। नीचे दिया लिंक खोलें।\n\nआपका कोड: ${otp}\n\n${link}`
  }
  if (lang === 'mr') {
    const intro = owner
      ? `नमस्कार! मी ${owner}, ${dogName}चा पालक.`
      : `नमस्कार! मी ${dogName}चा पालक.`
    return `${intro} PupStep अ‍ॅपमुळे मला दर वेळी ${dogName}च्या वॉकचा अपडेट मिळतो — हे मोफत आहे आणि फक्त 30 सेकंद लागतात. खालील लिंक उघडा.\n\nतुमचा कोड: ${otp}\n\n${link}`
  }
  const intro = owner ? `Hi! This is ${owner}, ${dogName}'s parent.` : `Hi! This is ${dogName}'s parent.`
  return `${intro} I'm using an app called PupStep so I can keep a real-time check on how ${dogName} did on every walk — it's free and takes 30 seconds. Tap the link below.\n\nYour code: ${otp}\n\n${link}`
}

export default function QRDisplayClient({
  token,
  dogName,
  dogId,
  walkerName: initialWalkerName,
  walkerPhone: initialWalkerPhone,
  status: initialStatus,
  otp,
  parentFirstName,
}: Props) {
  const [connectUrl, setConnectUrl] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [walkerDashUrl, setWalkerDashUrl] = useState('')
  const [walkerDashWaUrl, setWalkerDashWaUrl] = useState('')
  const [walkerName, setWalkerName] = useState(initialWalkerName)
  const [walkerPhone, setWalkerPhone] = useState(initialWalkerPhone)
  const [status, setStatus] = useState(initialStatus)
  const [justConnected, setJustConnected] = useState(false)
  const [copied, setCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [walkerDirectPhone, setWalkerDirectPhone] = useState('')
  const [inviteLang, setInviteLang] = useState<InviteLang>('en')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Build connect URL and WhatsApp share URL using window.location.origin (client-side only)
  useEffect(() => {
    const origin = window.location.origin
    const url = origin + '/connect/' + token
    setConnectUrl(url)
    const msg = buildInviteText(inviteLang, parentFirstName, dogName, otp ?? '', url)
    setShareUrl('https://wa.me/?text=' + encodeURIComponent(msg))
    const dashUrl = origin + '/walker/' + token
    setWalkerDashUrl(dashUrl)
  }, [token, dogName, otp, inviteLang, parentFirstName])

  // Build walker dashboard WhatsApp URL (depends on walkerName which may update after poll)
  useEffect(() => {
    if (!walkerDashUrl) return
    const displayName = walkerName ?? 'Your walker'
    const msg = `Hi ${displayName}! Here's your PupStep dashboard for ${dogName} 🐾\nTap this link anytime to log walks:\n${walkerDashUrl}`
    setWalkerDashWaUrl('https://wa.me/?text=' + encodeURIComponent(msg))
  }, [walkerDashUrl, walkerName, dogName])

  function buildDirectWaLink(phone: string): string {
    const fullPhone = phone.startsWith('91') ? phone : `91${phone}`
    const msg = buildInviteText(inviteLang, parentFirstName, dogName, otp ?? '', connectUrl)
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`
  }

  async function saveExpectedPhone(phone: string) {
    trackEvent('walker_invite_shared', { method: 'whatsapp_direct' })
    // Fire-and-forget: save the walker's expected phone to the connection
    if (!dogId) return
    fetch(`/api/dogs/${dogId}/qr/expected-phone`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.replace(/\D/g, '') }),
    }).catch(() => {})
  }

  function handleCopyLink() {
    if (!walkerDashUrl) return
    trackEvent('walker_invite_shared', { method: 'copy_link' })
    navigator.clipboard.writeText(walkerDashUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleCopyCode() {
    if (!otp) return
    navigator.clipboard.writeText(otp).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
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
              <button
                type="button"
                onClick={handleCopyCode}
                style={{
                  background: codeCopied ? 'rgba(134,239,172,0.15)' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${codeCopied ? 'rgba(134,239,172,0.4)' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: '100px',
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: codeCopied ? '#86EFAC' : '#9ECDD4',
                  fontFamily: 'var(--font-nunito), sans-serif',
                  cursor: 'pointer',
                }}
              >
                {codeCopied ? '✅ Copied!' : '📋 Copy code'}
              </button>
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
                onClick={() => trackEvent('walker_invite_shared', { method: 'whatsapp_dashboard' })}
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

        {/* Share section — shown only when pending */}
        {!isActive && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Divider */}
            <div style={{ borderTop: '1px solid #E5E7EB', width: '100%' }} />

            {/* Message language — picks the language the invite message below is written in */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Message language for your walker
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['en', 'hi', 'mr'] as InviteLang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setInviteLang(l)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: 'var(--font-nunito)',
                      border: inviteLang === l ? '2px solid #FF8C52' : '2px solid #E5E7EB',
                      background: inviteLang === l ? 'rgba(255,140,82,0.08)' : '#fff',
                      color: inviteLang === l ? '#C2410C' : '#6B7280',
                      cursor: 'pointer',
                    }}
                  >
                    {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी' : 'मराठी'}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct send to walker — primary action */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 15, fontWeight: 700, color: '#0A2F35', margin: 0 }}>
                Send to your walker
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '2px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                  <span style={{ padding: '12px 8px 12px 12px', fontSize: 14, color: '#6B7280', fontWeight: 700, fontFamily: 'var(--font-nunito)', userSelect: 'none', flexShrink: 0 }}>+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={walkerDirectPhone}
                    onChange={e => setWalkerDirectPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Walker's number"
                    style={{ flex: 1, padding: '12px 12px 12px 4px', border: 'none', outline: 'none', fontSize: 14, fontFamily: 'var(--font-nunito)', color: '#0A2F35', background: 'transparent', minWidth: 0 }}
                  />
                </div>
                <a
                  href={walkerDirectPhone.length === 10 ? buildDirectWaLink(walkerDirectPhone) : '#'}
                  onClick={walkerDirectPhone.length === 10 ? () => saveExpectedPhone(walkerDirectPhone) : (e: React.MouseEvent<HTMLAnchorElement>) => e.preventDefault()}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: walkerDirectPhone.length === 10 ? '#25D366' : '#E5E7EB',
                    color: walkerDirectPhone.length === 10 ? '#fff' : '#9CA3AF',
                    borderRadius: 12, padding: '0 16px', minHeight: 48, fontFamily: 'var(--font-fredoka)', fontSize: 15, fontWeight: 700, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                >
                  Send →
                </a>
              </div>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                We&apos;ll include the link and code in the message
              </p>
            </div>

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

            {/* Share link button — secondary, but still clearly clickable (teal outline, not grey) */}
            <a
              href={shareUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('walker_invite_shared', { method: 'whatsapp_generic' })}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                backgroundColor: '#fff',
                color: 'oklch(0.40 0.17 196)',
                textDecoration: 'none',
                borderRadius: '16px',
                padding: '14px 24px',
                fontSize: '15px',
                fontWeight: 700,
                fontFamily: 'var(--font-fredoka), sans-serif',
                boxSizing: 'border-box',
                border: '2px solid oklch(0.48 0.17 196)',
              }}
            >
              🔗 Share link
            </a>
          </div>
        )}

        {/* Escape hatch — not everyone here wants to connect a walker right
            now (or ever). Visible, not buried, and tracked so we know how
            many people actually take this path. */}
        <Link
          href="/walk/self"
          onClick={() => trackEvent('setup_qr_self_walk_clicked', { dog_id: dogId })}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            backgroundColor: '#FFFBEB',
            color: '#92400E',
            textDecoration: 'none',
            borderRadius: '16px',
            padding: '14px 24px',
            fontSize: '15px',
            fontWeight: 700,
            fontFamily: 'var(--font-fredoka), sans-serif',
            boxSizing: 'border-box',
            border: '2px solid #FDE68A',
          }}
        >
          Not right now — I&apos;ll walk {dogName} myself
        </Link>

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
