/**
 * READ-ONLY diagnostic. Writes NOTHING.
 *
 * Reports price coverage PER MARKET, which is the number that actually matters:
 * `hasLivePrice` is true when ANY market has a price, so it can read ~90% while
 * the AU market — the site's differentiator — is far thinner. Also reports store
 * health (which integrations returned nothing) and coverage weighted by demand,
 * so coverage work can be aimed at cards people actually search for.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const pct = (n: number, d: number) => (d === 0 ? "0.0" : ((n / d) * 100).toFixed(1));

async function main() {
  const total = await prisma.card.count();

  // ── 1. Headline tiering (what the sitemap uses) ────────────────────────────
  const hasLivePrice = await prisma.card.count({ where: { hasLivePrice: true } });
  const guideOnly = await prisma.card.count({ where: { hasLivePrice: false, marketPriceSource: "TCGplayer" } });
  console.log("── Sitemap tiering ──────────────────────────────────────────");
  console.log(`Total cards:                   ${total}`);
  console.log(`Tier 1 — hasLivePrice (any mkt): ${hasLivePrice}  (${pct(hasLivePrice, total)}%)`);
  console.log(`Tier 2 — TCGplayer guide only:   ${guideOnly}`);
  console.log(`Tier 3 — neither (noindex):      ${total - hasLivePrice - guideOnly}`);

  // ── 2. PER-MARKET coverage — the real story ────────────────────────────────
  const [au, us, gb] = await Promise.all([
    prisma.card.count({ where: { lowestPriceCents: { not: null } } }),
    prisma.card.count({ where: { lowestPriceCentsUs: { not: null } } }),
    prisma.card.count({ where: { lowestPriceCentsGb: { not: null } } }),
  ]);
  console.log("\n── Per-market card coverage ─────────────────────────────────");
  console.log(`AU (lowestPriceCents):    ${au}/${total}  (${pct(au, total)}%)`);
  console.log(`US (lowestPriceCentsUs):  ${us}/${total}  (${pct(us, total)}%)`);
  console.log(`GB (lowestPriceCentsGb):  ${gb}/${total}  (${pct(gb, total)}%)`);

  // AU-only gap: cards buyable somewhere, but NOT in our home market.
  const auMissingButOther = await prisma.card.count({
    where: {
      lowestPriceCents: null,
      OR: [{ lowestPriceCentsUs: { not: null } }, { lowestPriceCentsGb: { not: null } }],
    },
  });
  console.log(`Priced elsewhere but NOT in AU: ${auMissingButOther}  <- the AU coverage gap`);

  // ── 3. Coverage weighted by DEMAND (what to fix first) ─────────────────────
  // Phase 1 targets high-search-volume cards, so measure coverage on the demand
  // head rather than the whole catalogue.
  for (const n of [100, 1000, 5000]) {
    const top = await prisma.card.findMany({
      orderBy: [{ searchCount: "desc" }, { viewCount: "desc" }],
      take: n,
      select: { lowestPriceCents: true, searchCount: true, viewCount: true },
    });
    const withAu = top.filter((c) => c.lowestPriceCents != null).length;
    const anyDemand = top.filter((c) => (c.searchCount ?? 0) + (c.viewCount ?? 0) > 0).length;
    console.log(
      `Top ${String(n).padEnd(5)} by demand — AU-priced: ${String(withAu).padStart(5)}/${n} (${pct(withAu, n)}%)   [${anyDemand} have any recorded demand]`
    );
  }

  // ── 4. Store health — which integrations actually produce rows ─────────────
  const byRetailer = await prisma.retailerPrice.groupBy({
    by: ["retailer", "country"],
    _count: { _all: true },
  });
  const live = byRetailer.filter((r) => r._count._all > 0);
  const byCountry: Record<string, { stores: number; rows: number }> = {};
  for (const r of live) {
    const c = r.country ?? "AU";
    byCountry[c] ??= { stores: 0, rows: 0 };
    byCountry[c].stores++;
    byCountry[c].rows += r._count._all;
  }
  console.log("\n── Store health (retailers with >=1 row) ────────────────────");
  for (const [c, v] of Object.entries(byCountry).sort()) {
    console.log(`${c}: ${v.stores} retailers producing rows, ${v.rows} listings`);
  }
  console.log("\nSmallest 12 contributors (candidates for a broken matcher/feed):");
  for (const r of live.sort((a, b) => a._count._all - b._count._all).slice(0, 12)) {
    console.log(`  ${(r.country ?? "AU")}  ${r.retailer.padEnd(28)} ${r._count._all}`);
  }

  // ── 5. In-stock reality ────────────────────────────────────────────────────
  const inStock = await prisma.retailerPrice.groupBy({
    by: ["country"],
    where: { inStock: true, NOT: { retailer: { startsWith: "marketguide" } } },
    _count: { _all: true },
  });
  console.log("\n── In-stock listings by market ──────────────────────────────");
  for (const r of inStock) console.log(`${r.country}: ${r._count._all}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("FATAL:", e);
  await prisma.$disconnect();
  process.exit(1);
});
