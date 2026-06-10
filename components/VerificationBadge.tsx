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
          background: 'linear-gradient(135deg, oklch(0.94 0.06 44) 0%, oklch(0.74 0.18 44) 100%)',
          borderColor: 'oklch(0.60 0.18 44)',
          color: '#451A03',
        }}
      >
        <span style={{ letterSpacing: '-0.5px' }}>&#x1F43E;&#x1F43E;&#x1F43E;</span>
        <span>PupStep Certified</span>
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
