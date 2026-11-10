// The hubs' server-rendered summary and FAQ (src/lib/hub-summary.ts, SEO indexing plan SEO-1, 2026-11-10): Google fetched the US
// booster box hub and left it unindexed with 787 characters of prose in 565 KB of HTML. Pure: reads the committed data/public files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findBannedCopy } from "../src/lib/copy-rules";
import type { ProductCardData } from "../src/lib/data";
import { toCard } from "../src/lib/data";
import { faqJsonLd, hubSummary } from "../src/lib/hub-summary";
import { cardRow, statsInMarket } from "../src/lib/public-data/joins";
import { REGIONS } from "../src/lib/regions";
import { TYPE_BY_SLUG } from "../src/lib/sealed-title";
import { SET_BY_SLUG } from "../src/lib/sets";
import { storesInMarket } from "../src/lib/stores";

const text = (s: ReturnType<typeof hubSummary>) => [...s.paragraphs, ...s.faq.flatMap((f) => [f.q, f.a])].join(" ");
const open = (p: ProductCardData) => p.inStockStores > 0 || p.marketplaceOpen;

function cards(market: "US" | "AU" | "UK", pick: (p: ProductCardData) => boolean): ProductCardData[] {
  return statsInMarket(market)
    .map((x) => toCard({ ...cardRow(x), product: { slug: String(x.p.slug), name: String(x.p.name), productType: String(x.p.productType), setCode: (x.p.setCode as string | null) ?? null, imageUrl: null } }))
    .filter(pick);
}

/** What type/[type]/page.tsx loads: the 48 cheapest open products and the 24 sold out most-listed, with the counts of all. */
function typeHub(region: "us" | "au" | "uk", slug: string) {
  const r = REGIONS[region];
  const t = TYPE_BY_SLUG.get(slug)!;
  const all = cards(r.market as "US", (p) => p.productType === t.label);
  const o = all.filter(open).sort((a, b) => (a.lowestPriceCents ?? 0) - (b.lowestPriceCents ?? 0));
  const s = all.filter((p) => !open(p)).sort((a, b) => b.listedStores - a.listedStores);
  return hubSummary({
    r,
    subject: t.plural.toLowerCase(),
    products: [...o.slice(0, 48), ...s.slice(0, 24)],
    complete: o.length <= 48 && s.length <= 24,
    openTotal: o.length,
    soldTotal: s.length,
    storeCount: storesInMarket(r.market).length,
    tcgplayer: r.market === "US",
  });
}

test("the booster box hubs carry 1,500+ characters of data-built prose, different in each region", () => {
  const out = (["us", "au", "uk"] as const).map((x) => text(typeHub(x, "booster-boxes")));
  for (const t of out) {
    assert.ok(t.length >= 1500, `only ${t.length} characters`);
    assert.equal(findBannedCopy(t), null, findBannedCopy(t) ?? "");
  }
  assert.equal(new Set(out).size, 3, "each region's words differ");
});

test("a set hub (Delta Reign) and a region home carry 1,500+ characters too", () => {
  const set = SET_BY_SLUG.get("delta-reign");
  assert.ok(set, "Delta Reign is in sets.ts");
  for (const region of ["us", "au"] as const) {
    const r = REGIONS[region];
    const products = cards(r.market as "US", (p) => p.setCode === set!.code);
    assert.ok(products.length > 0, `${region}: products listed`);
    const s = hubSummary({ r, subject: `Pokémon ${set!.name} sealed products`, products, complete: true, storeCount: storesInMarket(r.market).length, tcgplayer: r.market === "US" });
    assert.ok(text(s).length >= 1500, `${region} set hub: ${text(s).length} characters`);
    assert.equal(findBannedCopy(text(s)), null);
  }
  for (const region of ["us", "au", "uk"] as const) {
    const r = REGIONS[region];
    const rail = [...cards(r.market as "US", (p) => p.productType === "Booster Box" && open(p)).slice(0, 8), ...cards(r.market as "US", (p) => p.productType === "Elite Trainer Box" && open(p)).slice(0, 8)];
    const s = hubSummary({ r, subject: "newest booster boxes and Elite Trainer Boxes", countSubject: "Pokémon sealed products", products: rail, complete: false, openTotal: cards(r.market as "US", open).length, storeCount: storesInMarket(r.market).length, tcgplayer: r.market === "US" });
    assert.ok(text(s).length >= 1500, `${region} home: ${text(s).length} characters`);
    assert.equal(findBannedCopy(text(s)), null);
  }
});

test("with too little data a hub says less, never filler", () => {
  const r = REGIONS.us;
  const none = hubSummary({ r, subject: "tins", products: [], complete: true, storeCount: 12, tcgplayer: true });
  assert.ok(none.paragraphs[0].includes("None of the tins"));
  assert.ok(text(none).length < 900);
  assert.ok(!/cheapest is/i.test(text(none)));
  assert.equal(findBannedCopy(text(none)), null);
  const one: ProductCardData = { slug: "a", name: "A Tin", productType: "Tin", setCode: null, imageUrl: null, lowestPriceCents: 2999, inStockStores: 1, listedStores: 1, marketplaceOpen: false, medianOpenCents: null, releaseDate: null };
  const s = hubSummary({ r, subject: "tins", products: [one], complete: true, storeCount: 12 });
  assert.ok(s.paragraphs.join(" ").includes("A Tin at $29.99"));
  assert.ok(!s.faq.some((f) => /differ/.test(f.q)), "no spread with one product");
});

test("the FAQ JSON-LD carries exactly the visible questions, and the three pages wire the blocks in", () => {
  const s = typeHub("us", "booster-boxes");
  const ld = faqJsonLd(s.faq);
  assert.equal(ld.mainEntity.length, s.faq.length);
  assert.ok(s.faq.length >= 4 && s.faq.length <= 6);
  for (const f of ["src/app/[region]/type/[type]/page.tsx", "src/app/[region]/sets/[set]/page.tsx", "src/app/[region]/page.tsx"]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /hubSummary\(/, f);
    assert.match(src, /<HubSummaryText/, f);
    assert.match(src, /<HubFaqSection/, f);
  }
});
