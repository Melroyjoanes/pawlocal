'use client'

import Link from 'next/link'
import type { Dog, WalkLogWithDog } from '@/lib/supabase/types'

type DogWithWalker = Dog & {
  walker_name: string | null
  walker_phone: string | null
  has_active_walker: boolean
}

interface Props {
  dogs: DogWithWalker[]
  walkLogs: WalkLogWithDog[]
}

const MOOD_EMOJI: Record<string, string> = {
  great: '😄',
  good: '🙂',
  okay: '😐',
  tired: '😪',
  anxious: '😰',
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export default function MyDogsClient({ dogs, walkLogs }: Props) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFBEB',
        fontFamily: 'var(--font-nunito), sans-serif',
        padding: '24px 16px 48px',
      }}
    >
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-fredoka), sans-serif',
              fontSize: '32px',
              fontWeight: 700,
              color: '#0A2F35',
              margin: 0,
            }}
          >
            My Dogs &amp; Walk Reports 🐾
          </h1>

          <Link
            href="/setup"
            style={{
              backgroundColor: '#FF8C52',
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '10px',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: 'var(--font-fredoka), sans-serif',
              whiteSpace: 'nowrap',
              transition: 'background-color 0.15s',
            }}
          >
            + Add another dog
          </Link>
        </div>

        {/* Dogs Section */}
        <section style={{ marginBottom: '40px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-fredoka), sans-serif',
              fontSize: '20px',
              fontWeight: 700,
              color: '#0A2F35',
              margin: '0 0 16px',
            }}
          >
            Your dogs
          </h2>

          {dogs.length === 0 ? (
            /* Empty state */
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '48px 32px',
                textAlign: 'center',
                boxShadow: '0 2px 12px rgba(10, 47, 53, 0.06)',
              }}
            >
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🐕</div>
              <p
                style={{
                  fontFamily: 'var(--font-fredoka), sans-serif',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#0A2F35',
                  margin: '0 0 8px',
                }}
              >
                No dogs yet!
              </p>
              <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 24px' }}>
                Add your first dog to generate a QR code for your walker.
              </p>
              <Link
                href="/setup"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#FF8C52',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-fredoka), sans-serif',
                }}
              >
                Add your first dog →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dogs.map(dog => (
                <DogCard key={dog.id} dog={dog} />
              ))}
            </div>
          )}
        </section>

        {/* Walk Reports Section */}
        <section>
          <h2
            style={{
              fontFamily: 'var(--font-fredoka), sans-serif',
              fontSize: '20px',
              fontWeight: 700,
              color: '#0A2F35',
              margin: '0 0 16px',
            }}
          >
            Recent Walk Reports
          </h2>

          {walkLogs.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '36px 24px',
                textAlign: 'center',
                boxShadow: '0 2px 12px rgba(10, 47, 53, 0.06)',
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🦮</div>
              <p
                style={{
                  color: '#6B7280',
                  fontSize: '14px',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                No walks logged yet.{' '}
                {dogs.length === 0
                  ? 'Add a dog and connect a walker to get started.'
                  : 'Connect a walker to get started.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {walkLogs.map(log => (
                <WalkLogCard key={log.id} log={log} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function DogCard({ dog }: { dog: DogWithWalker }) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 2px 12px rgba(10, 47, 53, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Avatar */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#FFF7ED',
            border: '2px solid #FF8C52',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            flexShrink: 0,
          }}
        >
          🐶
        </div>

        {/* Dog info */}
        <div>
          <p
            style={{
              fontFamily: 'var(--font-fredoka), sans-serif',
              fontSize: '18px',
              fontWeight: 700,
              color: '#0A2F35',
              margin: '0 0 2px',
            }}
          >
            {dog.name}
          </p>
          {dog.breed && (
            <p style={{ color: '#6B7280', fontSize: '13px', margin: 0 }}>
              {dog.breed}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Connection status */}
        {dog.has_active_walker ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              borderRadius: '100px',
              padding: '5px 12px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            ✅ {dog.walker_name ?? 'Walker linked'}
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: '#F3F4F6',
              color: '#6B7280',
              borderRadius: '100px',
              padding: '5px 12px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            No walker linked yet
          </span>
        )}

        {/* QR link */}
        <Link
          href={`/setup/qr?dog=${dog.id}`}
          style={{
            fontSize: '13px',
            color: '#FF8C52',
            textDecoration: 'none',
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: '8px',
            border: '1.5px solid #FF8C52',
            whiteSpace: 'nowrap',
          }}
        >
          View QR
        </Link>
      </div>
    </div>
  )
}

function WalkLogCard({ log }: { log: WalkLogWithDog }) {
  const dogName = log.dog_name ?? 'Unknown dog'
  const moodEmoji = log.mood ? (MOOD_EMOJI[log.mood] ?? '') : ''

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        padding: '16px 20px',
        boxShadow: '0 2px 12px rgba(10, 47, 53, 0.06)',
      }}
    >
      {/* Top row: dog + walker + date */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        <div>
          <p
            style={{
              fontWeight: 700,
              color: '#0A2F35',
              fontSize: '15px',
              margin: '0 0 2px',
            }}
          >
            🐾 {dogName}
            {moodEmoji && (
              <span style={{ marginLeft: '6px' }}>{moodEmoji}</span>
            )}
          </p>
          {log.walker_name && (
            <p style={{ color: '#6B7280', fontSize: '13px', margin: 0 }}>
              walked by {log.walker_name}
            </p>
          )}
        </div>
        <span
          style={{
            color: '#9CA3AF',
            fontSize: '13px',
            flexShrink: 0,
            paddingTop: '1px',
          }}
        >
          {formatDate(log.created_at)}
        </span>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        {log.duration_mins != null && (
          <Chip label={`⏱ ${log.duration_mins} mins`} />
        )}
        {log.distance_km != null && (
          <Chip label={`📍 ${log.distance_km.toFixed(1)} km`} />
        )}
        {log.poop_count > 0 && (
          <Chip label={`💩 × ${log.poop_count}`} />
        )}
        {log.pee_count > 0 && (
          <Chip label={`💧 × ${log.pee_count}`} />
        )}
        {log.mood && (
          <Chip label={`${moodEmoji} ${log.mood}`} />
        )}
      </div>

      {/* Notes */}
      {log.notes && (
        <p
          style={{
            color: '#6B7280',
            fontSize: '13px',
            margin: '10px 0 0',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          &ldquo;{log.notes}&rdquo;
        </p>
      )}
    </div>
  )
}

function Chip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: '#FFF7ED',
        color: '#C2410C',
        borderRadius: '100px',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  )
}
