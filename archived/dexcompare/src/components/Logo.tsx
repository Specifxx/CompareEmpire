// DexCompare logo — a Pokéball mark (Pokémon-themed) with a subtle gloss and the
// brand's gold price-spark accent. Vector, so it stays crisp at any size.
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
        <linearGradient id="pbRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff6a6a" />
          <stop offset="100%" stopColor="#d61a1a" />
        </linearGradient>
        <linearGradient id="pbWhite" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dfe3ea" />
        </linearGradient>
        <radialGradient id="pbGloss" cx="0.34" cy="0.28" r="0.75">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <clipPath id="pbClip">
          <circle cx="24" cy="24" r="22" />
        </clipPath>
      </defs>

      {/* Ball halves + equator band, clipped to the circle */}
      <g clipPath="url(#pbClip)">
        <rect x="2" y="24" width="44" height="22" fill="url(#pbWhite)" />
        <rect x="2" y="2" width="44" height="22" fill="url(#pbRed)" />
        <rect x="2" y="21.5" width="44" height="5" fill="#161018" />
        <circle cx="24" cy="24" r="22" fill="url(#pbGloss)" />
      </g>

      {/* Rim */}
      <circle cx="24" cy="24" r="22" fill="none" stroke="#161018" strokeWidth="2" />

      {/* Centre button */}
      <circle cx="24" cy="24" r="7.5" fill="#161018" />
      <circle cx="24" cy="24" r="4.6" fill="#ffffff" />
      <circle cx="24" cy="24" r="2" fill="#eef1f6" />

      {/* DexCompare gold price-spark — the brand accent that makes it ours */}
      <path
        d="M38 6.5 l1.2 2.7 2.7 1.2 -2.7 1.2 -1.2 2.7 -1.2 -2.7 -2.7 -1.2 2.7 -1.2 z"
        fill="#ffd23f"
      />
    </svg>
  );
}
