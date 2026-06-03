interface Props {
  tier: 'contacted' | 'verified' | 'certified'
  size?: 'sm' | 'md'
}

export default function VerificationBadge({ tier, size = 'sm' }: Props) {
  if (tier === 'contacted' || !tier) return null

  if (tier === 'certified') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full border ${
          size === 'md'
            ? 'text-xs px-3 py-1.5'
            : 'text-[10px] px-1.5 py-0.5 leading-none'
        }`}
        style={{
          background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
          borderColor: '#D97706',
          color: '#451A03',
        }}
      >
        <span style={{ letterSpacing: '-0.5px' }}>&#x1F43E;&#x1F43E;&#x1F43E;</span>
        <span>PawLocal Certified</span>
      </span>
    )
  }

  // tier === 'verified'
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border ${
        size === 'md'
          ? 'text-xs px-3 py-1.5'
          : 'text-[10px] px-1.5 py-0.5 leading-none'
      }`}
      style={{
        backgroundColor: 'var(--pl-amber-light)',
        borderColor: 'oklch(0.88 0.12 75)',
        color: 'var(--pl-amber)',
      }}
    >
      <span style={{ letterSpacing: '-0.5px' }}>&#x1F43E;&#x1F43E;</span>
      <span>Verified</span>
    </span>
  )
}
