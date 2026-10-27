// MTGCompare logo — the five-colour mana pentagon (White, Blue, Black, Red,
// Green) on a dark tile: Magic's signature colour pie. Filter-free vector so it
// renders identically in the header, favicon, Apple icon and OG image (next/og).
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="MTGCompare logo" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mtgTile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#101a33" />
          <stop offset="100%" stopColor="#0a0f1f" />
        </linearGradient>
        <radialGradient id="mtgW" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%" stopColor="#fffef6" />
          <stop offset="100%" stopColor="#e8e3c8" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="12" fill="url(#mtgTile)" stroke="#27406b" strokeWidth="1.2" />
      {/* Five-colour mana pentagon (W U B R G, clockwise from top) */}
      <circle cx="24" cy="11" r="5" fill="url(#mtgW)" />
      <circle cx="36.4" cy="21" r="5" fill="#3aa9e0" />
      <circle cx="31.6" cy="35.5" r="5" fill="#23262f" stroke="#c9ccd6" strokeWidth="1.3" />
      <circle cx="16.4" cy="35.5" r="5" fill="#e0483b" />
      <circle cx="11.6" cy="21" r="5" fill="#3fb46a" />
    </svg>
  );
}
