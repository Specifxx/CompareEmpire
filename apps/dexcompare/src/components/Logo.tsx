// DexCompare logo — a bold rounded "D" in Pokémon red/white on a dark tile,
// with a small price-spark. Vector so it stays crisp at any size.
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
        <linearGradient id="dcRed" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff5a5a" />
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

      {/* Letter D — outer red, inner counter cut to the tile, with a white spine */}
      <path
        d="M13 10 H25 C33.3 10 39 16.3 39 24 C39 31.7 33.3 38 25 38 H13 Z
           M21 17.5 V30.5 H25 C29 30.5 31.5 27.6 31.5 24 C31.5 20.4 29 17.5 25 17.5 Z"
        fill="url(#dcRed)"
        fillRule="evenodd"
        filter="url(#dcGlow)"
      />
      {/* white spine accent */}
      <rect x="13" y="10" width="4.4" height="28" rx="1" fill="#ffffff" opacity="0.92" />

      {/* price spark */}
      <path d="M37 8 l1.3 2.8 2.8 1.3 -2.8 1.3 -1.3 2.8 -1.3 -2.8 -2.8 -1.3 2.8 -1.3 z" fill="#ffd23f" filter="url(#dcGlow)" />
    </svg>
  );
}
