import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { BALL_SVG } from "../src/lib/logo-mark";
import { organizationJsonLd } from "../src/lib/seo";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const has = (p: string) => existsSync(new URL(`../${p}`, import.meta.url));

test("logo: one ball mark everywhere (owner, 2026-11-03: bring back the Pokéball-style logo)", () => {
  // The tab icon and the JSON-LD vector are the same file as the shared shapes.
  assert.equal(src("src/app/icon.svg"), BALL_SVG);
  assert.equal(src("public/logo.svg"), BALL_SVG);
  // Header, footer and phone menu draw the shared shapes; the share images use the same mark.
  assert.match(src("src/components/Logo.tsx"), /from "@\/lib\/logo-mark"/);
  assert.match(src("src/lib/og-card.tsx"), /BALL_DATA_URI/);
  assert.match(src("src/app/og/preorders/[set]/route.tsx"), /BALL_DATA_URI/);
  // Raster copies for Google, iOS and Vercel's dashboard.
  for (const f of ["src/app/favicon.ico", "src/app/apple-icon.png", "public/logo.png"]) assert.ok(has(f), f);
  assert.equal(organizationJsonLd().logo.endsWith("/logo.png"), true);
});

test("logo: an original mark, not the official ball (tilted band, the brand's spark in the button)", () => {
  assert.match(BALL_SVG, /rotate\(-14 32 32\)/);
  assert.match(BALL_SVG, /#ffcb05/);
  // No ids, gradients or clip paths: three copies on one page (one inside a hidden menu) must all draw.
  assert.doesNotMatch(BALL_SVG + src("src/components/Logo.tsx"), /clipPath|Gradient|\bid=/);
});
