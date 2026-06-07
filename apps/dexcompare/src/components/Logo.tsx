// DexCompare logo — a Poké Ball with a subtle price-tag spark, on a dark tile.
// Vector so it stays crisp at any size (favicon → hero).
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="DexCompare logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="dcBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a0d0d" />
          <stop offset="100%" stopColor="#120607" />
        </linearGradient>
        <linearGradient id="dcRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff5252" />
          <stop offset="100%" stopColor="#d61a1a" />
        </linearGradient>
        <filter id="dcGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* tile */}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#dcBg)" stroke="#5c2a2a" strokeWidth="1" />

      {/* Poké Ball */}
      <g>
        {/* white base */}
        <circle cx="24" cy="24" r="15" fill="#f4f4f5" stroke="#1b1b1f" strokeWidth="1.5" />
        {/* red top half */}
        <path d="M9 24 A15 15 0 0 1 39 24 Z" fill="url(#dcRed)" stroke="#1b1b1f" strokeWidth="1.5" />
        {/* centre band */}
        <rect x="9" y="22.5" width="30" height="3" fill="#1b1b1f" />
        {/* button */}
        <circle cx="24" cy="24" r="5.2" fill="#1b1b1f" />
        <circle cx="24" cy="24" r="3.4" fill="#ffffff" stroke="#1b1b1f" strokeWidth="1" />
        <circle cx="24" cy="24" r="1.5" fill="#ffd23f" filter="url(#dcGlow)" />
      </g>

      {/* compare spark */}
      <path d="M37 9 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 z" fill="#ffd23f" filter="url(#dcGlow)" />
    </svg>
  );
}
