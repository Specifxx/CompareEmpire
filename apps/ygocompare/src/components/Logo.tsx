// YGOCompare logo — a bold "Y" in Millennium purple/gold on a dark tile, with a
// small price-spark. Vector so it stays crisp at any size.
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="YGOCompare logo" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ycBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22103a" />
          <stop offset="100%" stopColor="#100618" />
        </linearGradient>
        <linearGradient id="ycPurple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7e22ce" />
        </linearGradient>
        <filter id="ycGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#ycBg)" stroke="#4a2a7a" strokeWidth="1" />
      {/* Letter Y */}
      <path d="M11 11 H18 L24 21 L30 11 H37 L27.5 26 V38 H20.5 V26 Z" fill="url(#ycPurple)" filter="url(#ycGlow)" />
      {/* price spark */}
      <path d="M38 8 l1.3 2.8 2.8 1.3 -2.8 1.3 -1.3 2.8 -1.3 -2.8 -2.8 -1.3 2.8 -1.3 z" fill="#f5c518" filter="url(#ycGlow)" />
    </svg>
  );
}
