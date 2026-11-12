import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CHRISTMAS_FESTIVE_LAYER, SEASON_BOOT_SCRIPT, seasonAt, seasonMarkupLive } from "../src/lib/season";
import { GUIDE_BY_SLUG, guideRegions } from "../src/content/guides";
import { X_DEFAULT_REGION } from "../src/lib/regions";

// The Christmas season (owner, 2026-11-01: "make all of the sites Christmas
// themed"). These pin its window (1 November to Boxing Day, gone on 27
// December), the ?season= preview, and that every piece of it is decoration:
// gated by the attribute, aria-hidden, never taking a tap, small cached art.

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

test("Christmas runs 1 November to Boxing Day, and is gone on 27 December", () => {
  assert.equal(seasonAt(at(2026, 10, 31)), "halloween");
  assert.equal(seasonAt(at(2026, 11, 1)), "christmas");
  assert.equal(seasonAt(at(2026, 12, 26)), "christmas");
  assert.equal(seasonAt(at(2026, 12, 27)), null);
  assert.equal(seasonAt(at(2027, 11, 20)), "christmas", "it comes back every year");
  assert.equal(seasonMarkupLive("christmas", at(2026, 12, 27)), true, "a day of slack for the page cache");
  assert.equal(seasonMarkupLive("christmas", at(2026, 12, 28)), false);
});

function boot(date: Date, search = ""): string | null {
  let stamped: string | null = null;
  const RealDate = Date;
  const FakeDate = function () {
    return new RealDate(date.getTime());
  } as unknown as DateConstructor;
  const ctx = vm.createContext({
    Date: FakeDate,
    location: { search },
    document: { documentElement: { setAttribute: (k: string, v: string) => k === "data-season" && (stamped = v), getAttribute: () => stamped } },
  });
  vm.runInContext(SEASON_BOOT_SCRIPT, ctx);
  return stamped;
}

test("the boot script stamps Christmas from the visitor's date and takes a ?season= preview", () => {
  for (const d of [at(2026, 11, 1), at(2026, 12, 26), at(2026, 12, 27), at(2026, 3, 3)]) {
    assert.equal(boot(d), seasonAt(d), d.toDateString());
  }
  assert.equal(boot(at(2026, 3, 3), "?season=christmas"), "christmas", "preview it out of season");
  assert.equal(boot(at(2026, 11, 20), "?season=off"), null, "switch it off in season");
  assert.equal(boot(at(2026, 11, 20), "?season=bogus"), null);
});

test("Christmas is tasteful accents in the site's own colours (owner, 2026-11-08 tone-down, 2026-11-12 more festive)", () => {
  const css = read("src/app/globals.css");
  for (const gone of [".xmas-snow", ".xmas-lights", ".xmas-art", ".xmas-hero", ".xmas-logo-hat", "/xmas/", "#dc2626 0 10px", "snowfall", "flake"]) {
    assert.ok(!css.includes(gone), `${gone} is gone`);
  }
  const block = css.slice(css.indexOf("xmas-common:start"), css.indexOf("xmas-common:end"));
  assert.doesNotMatch(block.replace(/\/\*[\s\S]*?\*\//g, ""), /@keyframes|animation|canvas|repeating-linear-gradient|45deg/, "no animation, canvas or candy stripes");
  assert.doesNotMatch(css, /data-season="christmas"\][^{]*\{[^}]*--(c-ink|bg|surface|brand)/, "no palette swap");
  assert.match(css, /:root\[data-season="christmas"\] \.xmas-pill-row \{\s*display: flex;/);
  assert.match(css, /\.xmas-pill \{[^}]*color: inherit;/, "drawn in the site's own colours");
  assert.match(css, /\[data-season="christmas"\]\[data-festive\] \.xmas-banner \{\s*display: flex;/, "the banner needs the season and the switch");
  assert.match(css, /\[data-season="christmas"\]\[data-festive\] body \{[^}]*border-top: 3px solid[^}]*linear-gradient\(90deg, rgb\(var\(--xmas-red\)\) 50%, rgb\(var\(--xmas-green\)\) 50%\)/, "a 3px two-tone hairline, hard stop");
  assert.match(css, /\[data-holiday-strip\] \{\s*box-shadow: inset 3px 0 0 rgb\(var\(--xmas-red\)\)/, "the Black Friday strip takes the token");
  assert.match(css, /:root:not\(\[data-theme="light"\]\) \{\s*--xmas-red/, "dark-theme tokens");
  const gifts = read("src/components/season/ChristmasGifts.tsx");
  assert.match(gifts, /seasonMarkupLive\("christmas"\)/);
  assert.match(gifts, /CHRISTMAS_FESTIVE_LAYER/);
  assert.doesNotMatch(gifts, /<h[1-6]|canvas|snow|flake/, "the banner is not a heading");
  assert.match(gifts, /currentColor/);
});

test("the festive layer has one off switch, and the gift guide it links exists", () => {
  assert.equal(CHRISTMAS_FESTIVE_LAYER, true);
  assert.match(read("src/app/layout.tsx"), /data-festive=\{CHRISTMAS_FESTIVE_LAYER/);
  const gifts = read("src/components/season/ChristmasGifts.tsx");
  const slug = /guides\/([a-z0-9-]+)`/.exec(gifts)?.[1] ?? "";
  const g = GUIDE_BY_SLUG.get(slug);
  assert.ok(g, `guide ${slug} exists`);
  assert.ok(guideRegions(g!).includes(X_DEFAULT_REGION), "and covers the default region");
});
