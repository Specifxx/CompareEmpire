// Standalone price-history snapshot + stats. Two jobs:
//   1. Print PriceHistory coverage (rows per market per day) so we can see
//      exactly how much index history exists.
//   2. Unless --stats-only: snapshot TODAY's lowest in-stock price per card for
//      all four markets — identical semantics to the snapshot inside the daily
//      refresh (headline = NM/LP or condition-less, market guides excluded),
//      and safe to re-run (same-day rows are replaced).
// The daily refresh keeps doing this at 18:30 UTC; this script exists so a
// fresh database (e.g. after the Neon reseed) can get a same-day data point
// without waiting for the next refresh.
//
//   DATABASE_URL=... npx tsx scripts/snapshot-history.ts [--stats-only]
import { prisma } from "../src/lib/db";

function sydneyDay(d = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(d);
  return new Date(`${ymd}T00:00:00.000Z`);
}

const MARKETS = ["AU", "NZ", "US", "GB"] as const;

async function stats(label: string) {
  const rows = await prisma.priceHistory.groupBy({
    by: ["country", "day"],
    _count: { _all: true },
    orderBy: [{ day: "asc" }, { country: "asc" }],
  });
  console.log(`\n${label} — PriceHistory coverage:`);
  if (rows.length === 0) {
    console.log("  (no rows at all)");
    return;
  }
  for (const r of rows) {
    console.log(`  ${r.day.toISOString().slice(0, 10)}  ${r.country}  ${r._count._all} cards`);
  }
}

async function main() {
  await stats("BEFORE");
  if (process.argv.includes("--stats-only")) return;

  const day = sydneyDay();
  // Same headline semantics as the daily refresh: cheapest IN-STOCK listing,
  // NM/LP or condition-less rows only, market-guide pseudo-retailers excluded.
  const headlineWhere = (country: string) => ({
    inStock: true,
    country,
    NOT: { retailer: { startsWith: "marketguide" } },
    OR: [{ condition: { in: ["NM", "LP"] } }, { condition: null }],
  });

  let total = 0;
  for (const country of MARKETS) {
    const grouped = await prisma.retailerPrice.groupBy({
      by: ["cardId"],
      where: headlineWhere(country),
      _min: { priceCents: true },
    });
    const points = grouped
      .filter((r) => r._min.priceCents != null)
      .map((r) => ({ cardId: r.cardId, country, day, lowestPriceCents: r._min.priceCents as number }));
    await prisma.priceHistory.deleteMany({ where: { country, day } });
    if (points.length > 0) await prisma.priceHistory.createMany({ data: points });
    console.log(`snapshot ${country}: ${points.length} cards for ${day.toISOString().slice(0, 10)}`);
    total += points.length;
  }
  console.log(`Snapshot complete: ${total} points across ${MARKETS.length} markets.`);

  await stats("AFTER");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
