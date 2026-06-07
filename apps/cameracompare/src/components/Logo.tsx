// CameraCompare logo — a clean, generic camera (body + lens + flash) in amber
// on a dark tile. Vector so it stays crisp at any size (favicon → hero).
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="CameraCompare logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ccBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1b2330" />
          <stop offset="100%" stopColor="#0b0f16" />
        </linearGradient>
        <linearGradient id="ccLens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* tile */}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#ccBg)" stroke="#33405a" strokeWidth="1" />

      {/* camera body */}
      <rect x="8" y="16" width="32" height="20" rx="3.5" fill="#e8edf5" />
      {/* viewfinder hump */}
      <path d="M17 16 l2.2 -3.6 h9.6 L31 16 Z" fill="#e8edf5" />
      {/* shutter button */}
      <rect x="32.5" y="12.8" width="4" height="2.4" rx="1" fill="#cbd5e1" />
      {/* flash */}
      <rect x="11" y="19" width="3.2" height="2.4" rx="0.6" fill="#fde68a" />

      {/* lens */}
      <circle cx="24" cy="26.5" r="7.4" fill="#0b0f16" />
      <circle cx="24" cy="26.5" r="6" fill="url(#ccLens)" />
      <circle cx="24" cy="26.5" r="3" fill="#1b2330" />
      <circle cx="21.8" cy="24.3" r="1.4" fill="#fff7e6" opacity="0.85" />
    </svg>
  );
}
