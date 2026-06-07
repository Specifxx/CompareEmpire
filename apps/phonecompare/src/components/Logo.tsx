// PhoneCompare logo — a sleek smartphone in emerald on a dark tile.
// Vector so it stays crisp at any size (favicon → hero).
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="PhoneCompare logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pcBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f2e25" />
          <stop offset="100%" stopColor="#08130f" />
        </linearGradient>
        <linearGradient id="pcScreen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="pcGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#pcBg)" stroke="#1f5446" strokeWidth="1" />

      {/* phone body */}
      <rect x="16" y="8" width="16" height="32" rx="3.5" fill="#0b1a15" stroke="#2f7c66" strokeWidth="1.4" />
      {/* screen */}
      <rect x="18" y="12" width="12" height="22" rx="1.5" fill="url(#pcScreen)" filter="url(#pcGlow)" />
      {/* speaker + home dot */}
      <rect x="22" y="9.6" width="4" height="1" rx="0.5" fill="#2f7c66" />
      <circle cx="24" cy="37" r="1.2" fill="#2f7c66" />
      {/* price spark */}
      <path d="M36 9 l1.1 2.4 2.4 1.1 -2.4 1.1 -1.1 2.4 -1.1 -2.4 -2.4 -1.1 2.4 -1.1 z" fill="#a7f3d0" filter="url(#pcGlow)" />
    </svg>
  );
}
