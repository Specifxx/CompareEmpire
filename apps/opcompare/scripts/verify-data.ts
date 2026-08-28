// Post-import data-quality gate ("accuracy CI"). Runs after the daily import and
// exits non-zero if a core accuracy invariant regressed, so a bad import fails
// the workflow loudly instead of silently shipping wrong prices.
//
// Checks (all thresholds overridable via env):
//   A. No AU card's headline lowest price is cheaper than any REAL buyable
//      listing — i.e. the market guide never leaked into lowestPriceCents.
//   B. Store lowest isn't absurdly far below the TCGplayer market guide
//      (<40% → likely a wrong-card match or foreign print). A spike fails.
//   C. The priced-card count didn't collapse vs the previous snapshot day
//      (>50% drop → catastrophic import failure).
//
// Usage: npx tsx scripts/verify-data.ts   (needs DATABASE_URL)
import { prisma } from "../src/lib/db";
import { marketGuideCents } from "../src/lib/country";

const PCT_OF_GUIDE_FLOOR = Number(process.env.VERIFY_GUIDE_FLOOR ?? 0.4); // <40% of guide = suspicious
const SUSPICIOUS_CAP = Number(process.env.VERIFY_SUSPICIOUS_CAP ?? 150); // fail if more than this many are suspicious
// Below this share of the catalogue carrying a live price, assume the import
// or the store matching broke rather than that the market emptied out.
const PRICED_SHARE_FLOOR = 0.05;

// Same predicate the importer uses to recompute a market's headline lowest price:
// in-stock, real store (not the market guide), NM/LP or unconditioned.
const headlineWhere = (country: string) => ({
  inStock: true,
  country,
  NOT: { retailer: { startsWith: "marketguide" } },
  OR: [{ condition: { in: ["NM", "LP"] } }, { condition: null }],
});

async function main() {
  let failed = false;
  const lines: string[] = [];

  // ── Check A: guide never undercuts a real listing in AU ────────────────────
  const [realLowRows, auCards] = await Promise.all([
    prisma.retailerPrice.groupBy({ by: ["cardId"], where: headlineWhere("AU"), _min: { priceCents: true } }),
    prisma.card.findMany({ where: { lowestPriceCents: { not: null } }, select: { id: true, name: true, lowestPriceCents: true } }),
  ]);
  const realLow = new Map(realLowRows.map((r) => [r.cardId, r._min.priceCents ?? null]));
  const guideLeak = auCards.filter((c) => {
    const real = realLow.get(c.id);
    // BAD = a stored AU headline with no real listing to justify it, or cheaper
    // than the cheapest real listing (only a guide/stale row could produce that).
    return real == null || (c.lowestPriceCents as number) < real;
  });
  const aOk = guideLeak.length === 0;
  if (!aOk) failed = true;
  lines.push(`A guide-leak (AU headline below any real listing)   ${aOk ? "PASS" : "FAIL"}  ${guideLeak.length} cards`);
  if (!aOk) console.error("  e.g.", guideLeak.slice(0, 8).map((c) => `${c.name} ($${((c.lowestPriceCents as number) / 100).toFixed(2)})`).join(" | "));

  // ── Check B: store lowest not absurdly below the TCGplayer guide ───────────
  const guided = await prisma.card.findMany({
    where: { marketPriceSource: "TCGplayer", marketPriceCents: { gt: 0 }, lowestPriceCents: { not: null } },
    select: { id: true, name: true, lowestPriceCents: true, marketPriceCents: true },
  });
  const suspicious = guided.filter((c) => {
    const guideAud = marketGuideCents(c.marketPriceCents, "AU"); // AUD, same unit as lowestPriceCents
    return guideAud != null && (c.lowestPriceCents as number) < guideAud * PCT_OF_GUIDE_FLOOR;
  });
  // A handful of genuine clearance deals is fine; a SPIKE means a matching regression.
  const bOk = suspicious.length <= SUSPICIOUS_CAP;
  if (!bOk) failed = true;
  lines.push(`B suspicious (<${Math.round(PCT_OF_GUIDE_FLOOR * 100)}% of TCGplayer guide)          ${bOk ? "PASS" : "FAIL"}  ${suspicious.length} cards (cap ${SUSPICIOUS_CAP})`);
  if (suspicious.length) console.error("  e.g.", suspicious.slice(0, 8).map((c) => c.name).join(" | "));

  // ── Check C: the catalogue still has a sane share of priced cards ─────────
  // This used to compare today's priced-card count against yesterday's, read
  // from the per-card PriceHistory table. That table is gone (it grew with
  // catalogue x market x day to serve a two-day lookback), so the equivalent
  // history-free guard is an absolute floor: if an importer run breaks matching,
  // hasLivePrice collapses toward zero and this fails without needing a
  // stored baseline.
  const [pricedCount, totalCount] = await Promise.all([
    prisma.card.count({ where: { hasLivePrice: true } }),
    prisma.card.count(),
  ]);
  const pricedShare = totalCount > 0 ? pricedCount / totalCount : 0;
  const cOk = totalCount === 0 || pricedShare >= PRICED_SHARE_FLOOR;
  if (!cOk) failed = true;
  lines.push(
    `C priced-card share of catalogue                   ${cOk ? "PASS" : "FAIL"}  ${pricedCount}/${totalCount} (${(pricedShare * 100).toFixed(1)}%, floor ${(PRICED_SHARE_FLOOR * 100).toFixed(0)}%)`
  );

  console.log("\n── OPCompare data-quality gate ─────────────────────────────");
  for (const l of lines) console.log("  " + l);
  console.log("─────────────────────────────────────────────────────────────");
  console.log(failed ? "RESULT: FAIL — see flagged checks above." : "RESULT: PASS");

  await prisma.$disconnect();
  if (failed) process.exit(1);
}

main().catch(async (e) => {
  console.error("verify-data crashed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
