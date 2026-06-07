export default function LocationPicker() {
  return (
    <div
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 whitespace-nowrap"
      style={{
        background: '#FDE68A',
        color: '#78350F',
        boxShadow: '0 2px 0px rgba(180,83,9,0.15), 0 4px 12px rgba(253,230,138,0.55)',
      }}
      aria-label="Serving Juhu, Mumbai"
    >
      <span>📍</span>
      <span>Juhu, Mumbai</span>
    </div>
  )
}
