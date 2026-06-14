// MTGCompare logo — a bold "M" in mana blue/white on a dark tile, with a small
// price-spark. Vector so it stays crisp at any size.
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="MTGCompare logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mcBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0d1730" />
          <stop offset="100%" stopColor="#060a14" />
        </linearGradient>
        <linearGradient id="mcBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <filter id="mcGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* tile */}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#mcBg)" stroke="#26406e" strokeWidth="1" />

      {/* Letter M */}
      <path
        d="M11 38 V11 H17 L24 24 L31 11 H37 V38 H30.5 V22 L24 33 L17.5 22 V38 Z"
        fill="url(#mcBlue)"
        filter="url(#mcGlow)"
      />

      {/* price spark */}
      <path d="M38 8 l1.3 2.8 2.8 1.3 -2.8 1.3 -1.3 2.8 -1.3 -2.8 -2.8 -1.3 2.8 -1.3 z" fill="#ffd23f" filter="url(#mcGlow)" />
    </svg>
  );
}
