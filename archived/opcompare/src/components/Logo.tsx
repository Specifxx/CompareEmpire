// OPCompare logo — Luffy's straw hat, One Piece's most iconic emblem, on a dark
// crimson tile. Filter-free vector so it renders identically in the header,
// favicon, Apple icon and OG image (next/og).
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="OPCompare logo" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="opTile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2c0c0c" />
          <stop offset="100%" stopColor="#160606" />
        </linearGradient>
        <linearGradient id="opStraw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8d98b" />
          <stop offset="100%" stopColor="#dca33f" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="12" fill="url(#opTile)" stroke="#7a1f1f" strokeWidth="1.2" />
      {/* crown (dome) */}
      <path d="M11.5 31 C 12.6 16.8, 35.4 16.8, 36.5 31 Z" fill="url(#opStraw)" />
      {/* red ribbon band */}
      <ellipse cx="24" cy="26" rx="11.2" ry="2.6" fill="#d8392e" />
      {/* wide brim */}
      <ellipse cx="24" cy="31.6" rx="17.6" ry="5" fill="url(#opStraw)" />
      <ellipse cx="24" cy="31.6" rx="17.6" ry="5" fill="none" stroke="#b5832f" strokeWidth="0.8" />
    </svg>
  );
}
