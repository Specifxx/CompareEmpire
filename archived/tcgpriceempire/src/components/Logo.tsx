// Brand mark: a gold crown over a fanned hand of cards — "the empire of TCG
// prices". Inline SVG so it ships with zero requests and scales crisply.
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      {/* Fanned cards */}
      <g>
        <rect x="10" y="26" width="20" height="28" rx="3" transform="rotate(-12 10 26)" fill="#252b38" stroke="#8b5cf6" strokeWidth="2" />
        <rect x="34" y="23" width="20" height="28" rx="3" transform="rotate(12 54 23)" fill="#252b38" stroke="#8b5cf6" strokeWidth="2" />
        <rect x="22" y="22" width="20" height="30" rx="3" fill="#13171f" stroke="#a78bfa" strokeWidth="2" />
        <circle cx="32" cy="37" r="5" fill="#8b5cf6" />
      </g>
      {/* Crown */}
      <path
        d="M18 18 L24 10 L32 16 L40 10 L46 18 L44 22 L20 22 Z"
        fill="#fbbf24"
        stroke="#fcd34d"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="9" r="2" fill="#fcd34d" />
      <circle cx="40" cy="9" r="2" fill="#fcd34d" />
      <circle cx="32" cy="15" r="2" fill="#fcd34d" />
    </svg>
  );
}
