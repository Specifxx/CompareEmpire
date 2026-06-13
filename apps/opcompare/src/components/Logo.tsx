// OPCompare logo — a bold "O" in straw-hat orange/gold on a dark tile, with a
// small price-spark. Vector so it stays crisp at any size.
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="OPCompare logo" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ocBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a1405" />
          <stop offset="100%" stopColor="#140a02" />
        </linearGradient>
        <linearGradient id="ocOrange" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <filter id="ocGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#ocBg)" stroke="#7a4a1e" strokeWidth="1" />
      {/* Letter O */}
      <circle cx="24" cy="24" r="13" fill="none" stroke="url(#ocOrange)" strokeWidth="6.5" filter="url(#ocGlow)" />
      {/* price spark */}
      <path d="M38 8 l1.3 2.8 2.8 1.3 -2.8 1.3 -1.3 2.8 -1.3 -2.8 -2.8 -1.3 2.8 -1.3 z" fill="#fde047" filter="url(#ocGlow)" />
    </svg>
  );
}
