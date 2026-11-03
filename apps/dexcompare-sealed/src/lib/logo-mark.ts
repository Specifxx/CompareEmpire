// The DexCompare ball mark's shapes, in a 64×64 box. One source for the header/footer/menu mark (components/Logo.tsx), the
// share images (og-card.tsx, og/preorders) and the static files (src/app/icon.svg, public/logo.svg, which must equal BALL_SVG;
// favicon.ico, apple-icon.png and public/logo.png are rendered from it). tests/logo.test.ts pins them together.
export const BALL_RED = "#d2300a";
export const BALL_INK = "#1b1720";
export const BALL_WHITE = "#f3f4f7";
export const BALL_SPARK = "#ffcb05";
export const BALL_TOP = "M3.21 28.5A29 29 0 0 1 60.79 28.5Z";
export const BALL_BAND = "M3.21 28.5H60.79A29 29 0 0 1 60.79 35.5H3.21A29 29 0 0 1 3.21 28.5Z";
export const BALL_GLOSS = "M13.5 17.5A22 22 0 0 1 26 8.6";
export const BALL_STAR = "M32 26.2Q32.9 31.1 37.8 32 32.9 32.9 32 37.8 31.1 32.9 26.2 32 31.1 31.1 32 26.2z";

export const BALL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="29" fill="${BALL_WHITE}"/>
  <g transform="rotate(-14 32 32)">
    <path d="${BALL_TOP}" fill="${BALL_RED}"/>
    <path d="${BALL_BAND}" fill="${BALL_INK}"/>
  </g>
  <path d="${BALL_GLOSS}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="29" fill="none" stroke="${BALL_INK}" stroke-width="3"/>
  <circle cx="32" cy="32" r="11" fill="${BALL_INK}"/>
  <circle cx="32" cy="32" r="7.6" fill="#fff"/>
  <path d="${BALL_STAR}" fill="${BALL_SPARK}" stroke="${BALL_RED}" stroke-width="1" stroke-linejoin="round"/>
</svg>
`;

/** The mark as a data URI, for an <img> in a share image (satori draws it with resvg). */
export const BALL_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(BALL_SVG).toString("base64")}`;
