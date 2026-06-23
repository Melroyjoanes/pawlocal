import Link from 'next/link'

export const metadata = {
  title: 'Install PupStep — Add to Home Screen',
}

export default function InstallPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#FFFBEB',
        fontFamily: 'var(--font-nunito), sans-serif',
        padding: '0 0 48px',
      }}
    >
      {/* Header */}
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: '40px 20px 0',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>📲</div>
        <h1
          style={{
            fontFamily: 'var(--font-fredoka), sans-serif',
            fontSize: 28,
            fontWeight: 700,
            color: '#0A2F35',
            margin: '0 0 12px',
            lineHeight: 1.2,
          }}
        >
          Install PupStep on your phone
        </h1>
        <p
          style={{
            fontSize: 15,
            color: '#6B7280',
            margin: '0 0 32px',
            lineHeight: 1.6,
          }}
        >
          No App Store. No Play Store. Open this link and add it to your home
          screen in seconds.
        </p>
      </div>

      {/* Steps */}
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Android */}
        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
            padding: '20px 20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 48 }}>🤖</span>
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-fredoka), sans-serif',
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#0A2F35',
                  margin: 0,
                }}
              >
                Android (Chrome)
              </p>
            </div>
          </div>
          <ol
            style={{
              margin: 0,
              padding: '0 0 0 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {[
              'Open pupstep.in in Chrome on your Android phone.',
              'Tap the three dots menu in the top right.',
              'Tap Add to Home Screen.',
              'Tap Add. Done!',
            ].map((step, i) => (
              <li
                key={i}
                style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}
              >
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* iPhone */}
        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
            padding: '20px 20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 48 }}>🍎</span>
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-fredoka), sans-serif',
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#0A2F35',
                  margin: 0,
                }}
              >
                iPhone (Safari)
              </p>
            </div>
          </div>
          <ol
            style={{
              margin: 0,
              padding: '0 0 0 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {[
              'Open pupstep.in in Safari on your iPhone.',
              'Tap the Share button at the bottom (the square with an arrow).',
              'Scroll down and tap Add to Home Screen.',
              'Tap Add. Done!',
            ].map((step, i) => (
              <li
                key={i}
                style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}
              >
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* After installing */}
        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
            padding: '20px 20px 24px',
            borderLeft: '4px solid oklch(0.48 0.17 196)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-fredoka), sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: '#0A2F35',
              margin: '0 0 12px',
            }}
          >
            After installing
          </p>
          <ul
            style={{
              margin: 0,
              padding: '0 0 0 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {[
              'PupStep opens fullscreen, like a native app',
              'Works offline for viewing recent reports',
              'Gets updates automatically',
            ].map((item, i) => (
              <li
                key={i}
                style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <Link
          href="/home"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'oklch(0.48 0.17 196)',
            color: '#fff',
            borderRadius: 14,
            padding: '15px 24px',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'var(--font-fredoka), sans-serif',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(10,47,53,0.25)',
            marginTop: 8,
          }}
        >
          Open PupStep →
        </Link>
      </div>
    </div>
  )
}
