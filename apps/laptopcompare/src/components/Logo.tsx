// LaptopCompare logo — a laptop in indigo on a dark tile.
// Vector so it stays crisp at any size (favicon → hero).
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="LaptopCompare logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="lcBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1b1f3a" />
          <stop offset="100%" stopColor="#0c0e1c" />
        </linearGradient>
        <linearGradient id="lcScreen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <filter id="lcGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#lcBg)" stroke="#353a6b" strokeWidth="1" />

      {/* screen lid */}
      <rect x="12" y="13" width="24" height="16" rx="2" fill="#0c0e1c" stroke="#4b53a8" strokeWidth="1.4" />
      <rect x="14" y="15" width="20" height="12" rx="1" fill="url(#lcScreen)" filter="url(#lcGlow)" />
      {/* base / keyboard deck */}
      <path d="M8 33 H40 L42 36.5 H6 Z" fill="#2a2f5e" stroke="#4b53a8" strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="20" y="33.6" width="8" height="1.4" rx="0.7" fill="#0c0e1c" />
    </svg>
  );
}
