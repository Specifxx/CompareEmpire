// CarCompare logo — a sleek car silhouette in electric blue on a dark tile.
// Vector so it stays crisp at any size (favicon → hero).
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="CarCompare logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ccBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10243f" />
          <stop offset="100%" stopColor="#0a1322" />
        </linearGradient>
        <linearGradient id="ccCar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <filter id="ccGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#ccBg)" stroke="#274a73" strokeWidth="1" />

      {/* speed lines */}
      <g stroke="#3b82f6" strokeWidth="1.4" opacity="0.5" strokeLinecap="round">
        <path d="M6 19 H16" />
        <path d="M6 24 H13" />
      </g>

      {/* car body */}
      <path
        d="M9 30 L12 22 C12.8 20 14.2 19 16.5 19 H29 C31.5 19 33.2 20 35 22 L40 27 C41 28 41.5 29 41.5 30 V32.5 H9 Z"
        fill="url(#ccCar)"
        filter="url(#ccGlow)"
      />
      {/* windows */}
      <path d="M16.5 22 L18 19.6 H27.5 L31 22 Z" fill="#0a1322" opacity="0.85" />
      {/* wheels */}
      <circle cx="17" cy="33" r="3.6" fill="#0a1322" stroke="#9cc3ff" strokeWidth="1.4" />
      <circle cx="33" cy="33" r="3.6" fill="#0a1322" stroke="#9cc3ff" strokeWidth="1.4" />
    </svg>
  );
}
