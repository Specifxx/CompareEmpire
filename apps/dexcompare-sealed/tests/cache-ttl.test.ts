// How often a cached page may refresh. The owner (2026-10-14): prices only need refreshing every 6 to 24
// hours. Prices change when the store import runs (twice a day), and that import re-renders every cached
// page through /api/revalidate, so a page's own TTL is only the backstop for a missed import. These pin
// the floor: nothing under src/ caches a page, layout, sitemap or route for less than 6 hours, every page
// that reads the database is ISR-cached, and the one short cache is the eBay listings API (a strip's
// JSON, 5 minutes at the CDN by design: src/lib/ebay-route.ts, pinned in tests/ebay-route.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MIN_TTL_S = 6 * 3600;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const SOURCES = walk(join(ROOT, "src"))
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => ({ path: relative(ROOT, f).split("\\").join("/"), text: readFileSync(f, "utf8") }));

const ttlOf = (text: string): string | null => /^export const revalidate\s*=\s*([^;\n]+);?/m.exec(text)?.[1].trim() ?? null;

test("no page, layout, sitemap or route is cached for less than 6 hours", () => {
  const found = SOURCES.filter((s) => ttlOf(s.text) !== null);
  assert.ok(found.length >= 13, "the region pages and the sitemap all declare a TTL");
  for (const s of found) {
    const v = ttlOf(s.text)!;
    if (v === "false") continue; // cached until the next deploy or import refresh
    assert.match(v, /^\d[\d_]*$/, `${s.path}: revalidate must be a number literal, got ${v}`);
    assert.ok(Number(v.replace(/_/g, "")) >= MIN_TTL_S, `${s.path}: revalidate = ${v} is under 6 hours (never lower it)`);
  }
});

test("only API routes render per request; no fetch is revalidated more often than every 6 hours", () => {
  for (const s of SOURCES) {
    if (!s.path.startsWith("src/app/api/")) {
      assert.doesNotMatch(s.text, /export const dynamic\s*=\s*["']force-dynamic["']/, `${s.path}: a page must stay ISR`);
      assert.doesNotMatch(s.text, /export const fetchCache\s*=/, `${s.path}: no fetchCache override`);
    }
    for (const m of s.text.matchAll(/next:\s*\{[^}]*revalidate:\s*(\d[\d_]*)/g)) {
      assert.ok(Number(m[1].replace(/_/g, "")) >= MIN_TTL_S, `${s.path}: fetch revalidate ${m[1]} is under 6 hours`);
    }
  }
});

test("every page that reads the database is ISR-cached; the sitemap too", () => {
  const pages = SOURCES.filter((s) => s.path.startsWith("src/app/[region]/") && s.path.endsWith("/page.tsx"));
  assert.ok(pages.length >= 12);
  for (const s of [...pages, ...SOURCES.filter((x) => x.path === "src/app/sitemap.ts")]) {
    assert.ok(ttlOf(s.text) !== null, `${s.path}: export const revalidate (at least ${MIN_TTL_S})`);
  }
});

test("a CDN cache under 6 hours exists only for the eBay listings API", () => {
  for (const s of SOURCES) {
    for (const m of s.text.matchAll(/s-maxage=(\d+)/g)) {
      if (Number(m[1]) >= MIN_TTL_S) continue;
      assert.equal(s.path, "src/lib/ebay-route.ts", `${s.path}: s-maxage=${m[1]} is under 6 hours`);
    }
  }
});
