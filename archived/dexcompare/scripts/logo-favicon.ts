// Build the app icon used by Apple touch + the Organization JSON-LD logo: a
// Pokéball drawn straight to pixels. Outputs a raster PNG (Search/Apple need
// raster, not SVG). The browser-tab favicon is generated separately by
// src/app/icon.tsx, so this writes ONLY public/icon-512.png (no src/app/icon.png,
// which would collide with icon.tsx).
import { Jimp } from "jimp";

const S = 512;
const CX = S / 2;
const CY = S / 2;
const R = 236; // ball radius

// Palette (matches the on-site <Logo /> Pokéball).
const DARK = { r: 0x16, g: 0x10, b: 0x18 };
const WHITE = { r: 0xff, g: 0xff, b: 0xff };
const WHITE_DK = { r: 0xdf, g: 0xe3, b: 0xea };
const RED_HI = { r: 0xff, g: 0x6a, b: 0x6a };
const RED_LO = { r: 0xd6, g: 0x1a, b: 0x1a };

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const mix = (a: typeof DARK, b: typeof DARK, t: number) => ({
  r: lerp(a.r, b.r, t),
  g: lerp(a.g, b.g, t),
  b: lerp(a.b, b.b, t),
});

async function main() {
  const icon = new Jimp({ width: S, height: S, color: 0x00000000 });
  const d = icon.bitmap.data;
  const BAND = R * 0.11; // half-height of the equator band
  const BTN_OUT = R * 0.3; // dark button ring
  const BTN_IN = R * 0.185; // white button centre

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x - CX;
      const dy = y - CY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > R) continue; // outside the ball → transparent

      let c: { r: number; g: number; b: number };
      if (dist <= BTN_IN) c = WHITE; // button centre
      else if (dist <= BTN_OUT) c = DARK; // button ring
      else if (Math.abs(dy) <= BAND) c = DARK; // equator band
      else if (dist > R - 10) c = DARK; // rim
      else if (dy < 0) c = mix(RED_HI, RED_LO, (dy + R) / R); // top: red gradient
      else c = mix(WHITE, WHITE_DK, dy / R); // bottom: white gradient

      // Soft gloss highlight in the upper-left for a glassy look.
      const gx = (x - S * 0.34) / (S * 0.5);
      const gy = (y - S * 0.28) / (S * 0.5);
      const gloss = Math.max(0, 1 - (gx * gx + gy * gy));
      if (gloss > 0 && dist <= R - 10 && dist > BTN_OUT) {
        c = mix(c, WHITE, Math.min(0.3, gloss * 0.3));
      }

      const i = (y * S + x) * 4;
      d[i] = c.r;
      d[i + 1] = c.g;
      d[i + 2] = c.b;
      d[i + 3] = 255;
    }
  }

  await icon.write("public/icon-512.png" as `${string}.png`);
  console.log(`wrote public/icon-512.png (${S}x${S}) — Pokéball`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
