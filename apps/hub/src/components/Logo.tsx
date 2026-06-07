// CompareEmpire logo — a crown formed from three "compare" bars, in imperial
// indigo with a gold crest. Vector so it stays crisp at any size.
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="CompareEmpire logo" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ceBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1b1e3a" />
          <stop offset="100%" stopColor="#0a0b16" />
        </linearGradient>
        <linearGradient id="ceGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#e0a92a" />
        </linearGradient>
        <linearGradient id="ceIndigo" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#ceBg)" stroke="#33396b" strokeWidth="1" />
      {/* crown / comparison bars of rising height */}
      <g>
        <rect x="11" y="26" width="6.5" height="11" rx="1.5" fill="url(#ceIndigo)" />
        <rect x="20.75" y="20" width="6.5" height="17" rx="1.5" fill="url(#ceIndigo)" />
        <rect x="30.5" y="14" width="6.5" height="23" rx="1.5" fill="url(#ceIndigo)" />
      </g>
      {/* crown points (gold) sitting atop the bars */}
      <path d="M9 24 L14.25 13 L19.5 22 L24 9 L28.5 22 L33.75 11 L39 24 Z" fill="url(#ceGold)" stroke="#7a5a12" strokeWidth="0.5" />
      <circle cx="14.25" cy="13" r="1.5" fill="#fff3cf" />
      <circle cx="24" cy="9" r="1.7" fill="#fff3cf" />
      <circle cx="33.75" cy="11" r="1.5" fill="#fff3cf" />
    </svg>
  );
}
