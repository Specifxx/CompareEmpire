// YGOCompare logo — the Millennium Puzzle (gold inverted pyramid) bearing the
// Eye of Wadjet, Yu-Gi-Oh!'s signature emblem, on a dark violet tile. Filter-free
// vector so it renders identically in the header, favicon, Apple icon and OG
// image (next/og).
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="YGOCompare logo" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ygTile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#241042" />
          <stop offset="100%" stopColor="#120726" />
        </linearGradient>
        <linearGradient id="ygGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7e08a" />
          <stop offset="55%" stopColor="#e9c14b" />
          <stop offset="100%" stopColor="#b8862b" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="12" fill="url(#ygTile)" stroke="#5b3ba0" strokeWidth="1.2" />
      {/* Millennium Puzzle — inverted pyramid */}
      <path d="M9 13 H39 L24 41 Z" fill="url(#ygGold)" stroke="#8a5e1e" strokeWidth="0.8" strokeLinejoin="round" />
      {/* Eye of Wadjet, inset into the gold */}
      <path d="M15.5 22 Q24 16.5 32.5 22 Q24 27.5 15.5 22 Z" fill="#1c0d33" />
      <circle cx="24" cy="22" r="3" fill="url(#ygGold)" />
      <circle cx="24" cy="22" r="1.4" fill="#1c0d33" />
      <path d="M14.5 19.8 Q24 14.6 33.5 19.8" fill="none" stroke="#1c0d33" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M19 26.3 L17.4 31.6" fill="none" stroke="#1c0d33" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M27.6 26 Q31.2 27.6 31.6 31.2" fill="none" stroke="#1c0d33" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
