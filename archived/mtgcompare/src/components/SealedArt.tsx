// Self-contained SVG "box art" for sealed products that have no store image —
// a themed booster-box graphic generated from the set code + product type, so
// the /sealed grid never shows a blank tile.
function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
export function SealedArt({
  setCode,
  productType,
  className,
}: {
  setCode?: string | null;
  productType: string;
  className?: string;
}) {
  const hue = hashHue((setCode || productType) + productType);
  const c1 = `hsl(${hue} 70% 52%)`;
  const c2 = `hsl(${(hue + 40) % 360} 65% 28%)`;
  const code = (setCode || productType).slice(0, 5).toUpperCase();
  const short = productType.replace(/Booster /i, "").replace(/ Box/i, " Box");
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={`${setCode ?? ""} ${productType}`} className={className} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`sb-${hue}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      {/* box body */}
      <rect x="44" y="40" width="112" height="130" rx="8" fill={`url(#sb-${hue})`} stroke="#0a0d13" strokeWidth="3" />
      {/* lid */}
      <rect x="40" y="34" width="120" height="26" rx="6" fill={c2} stroke="#0a0d13" strokeWidth="3" />
      {/* label band */}
      <rect x="54" y="78" width="92" height="60" rx="5" fill="#0a0d13" opacity="0.55" />
      <text x="100" y="106" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff" fontFamily="ui-sans-serif, system-ui, sans-serif">{code}</text>
      <text x="100" y="128" textAnchor="middle" fontSize="11" fontWeight="600" fill="#e8e8ef" fontFamily="ui-sans-serif, system-ui, sans-serif">{short}</text>
      {/* sparkle */}
      <path d="M150 150 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="#fff" opacity="0.85" />
    </svg>
  );
}
