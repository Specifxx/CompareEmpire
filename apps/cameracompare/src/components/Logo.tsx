// CameraCompare logo — a camera aperture/iris with amber blades on a dark tile.
// Vector so it stays crisp at any size (favicon → hero).
export function Logo({ size = 36 }: { size?: number }) {
  const cx = 24, cy = 24, r = 13;
  // Six aperture blades arranged around the centre.
  const blades = Array.from({ length: 6 }, (_, i) => {
    const a0 = (i * 60 - 90) * (Math.PI / 180);
    const a1 = ((i + 1) * 60 - 90) * (Math.PI / 180);
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    // Inner point offset toward the next blade for the classic iris look.
    const xm = cx + r * 0.34 * Math.cos(a1), ym = cy + r * 0.34 * Math.sin(a1);
    return `M${cx} ${cy} L${x0.toFixed(2)} ${y0.toFixed(2)} L${x1.toFixed(2)} ${y1.toFixed(2)} L${xm.toFixed(2)} ${ym.toFixed(2)} Z`;
  });
  const shades = ["#ffb020", "#f59e0b", "#ffc24d", "#e8890c", "#ffcf6b", "#f0a317"];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="CameraCompare logo" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ccBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1b2330" />
          <stop offset="100%" stopColor="#0b0f16" />
        </linearGradient>
        <filter id="ccGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#ccBg)" stroke="#33405a" strokeWidth="1" />
      {/* lens barrel */}
      <circle cx={cx} cy={cy} r={r + 2.5} fill="none" stroke="#3c4a66" strokeWidth="1.6" />
      {/* aperture blades */}
      <g stroke="#0b0f16" strokeWidth="0.5" strokeLinejoin="round">
        {blades.map((d, i) => (
          <path key={i} d={d} fill={shades[i]} />
        ))}
      </g>
      {/* central highlight */}
      <circle cx={cx} cy={cy} r="2.6" fill="#fff7e6" filter="url(#ccGlow)" />
    </svg>
  );
}
