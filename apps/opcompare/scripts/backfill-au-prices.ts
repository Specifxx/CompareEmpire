// Immediate fix for sparse AU price coverage: AU previously had no catalogue-wide
// baseline (only live AU stores ~47% of cards), while NZ/US/GB had the TCGplayer/
// Cardmarket baseline (~99%). This derives the AU TCGplayer baseline (USD→AUD) from
// the existing tcgplayer_us rows and recomputes each card's AU lowest price, bringing
// AU coverage in line with the other markets without a full re-seed/import. Idempotent.
// The permanent fix is in prisma/seed.ts (AU added to the baseline); this just patches
// the live data now. Live AU store prices still win the lowest-price recompute.
//
//   DATABASE_URL=... npx tsx scripts/backfill-au-prices.ts
import { prisma } from "../src/lib/db";

const USD_TO_AUD = 1.55;

async function main() {
  const usRows = await prisma.retailerPrice.findMany({
    where: { retailer: "tcgplayer_us" },
    select: { cardId: true, priceCents: true, url: true },
  });
  console.log(`Found ${usRows.length} tcgplayer_us rows → building AU baseline (×${USD_TO_AUD}).`);

  const auRows = usRows.map((r) => ({
    cardId: r.cardId,
    retailer: "marketguide_au",
    retailerName: "Market Price (guide)",
    title: "Market Price (guide)",
    url: "", // a guide/estimate, not a purchasable store (TCGplayer doesn't ship to AU)
    priceCents: Math.round(r.priceCents * USD_TO_AUD),
    currency: "AUD",
    inStock: true,
    country: "AU",
  }));

  await prisma.retailerPrice.deleteMany({ where: { retailer: { in: ["tcgplayer_au", "marketguide_au"] } } });
  for (let i = 0; i < auRows.length; i += 5000) {
    await prisma.retailerPrice.createMany({ data: auRows.slice(i, i + 5000), skipDuplicates: true });
    process.stdout.write(`\r  inserted ${Math.min(i + 5000, auRows.length)}/${auRows.length}`);
  }
  console.log(`\nInserted ${auRows.length} tcgplayer_au baseline rows.`);

  // Recompute each card's AU lowest from IN-STOCK AU listings (baseline + live stores).
  console.log("Recomputing AU lowest prices…");
  const pricedAu = await prisma.retailerPrice.groupBy({ by: ["cardId"], where: { inStock: true, country: "AU", OR: [{ condition: { in: ["NM", "LP"] } }, { condition: null }] }, _min: { priceCents: true } });
  const lowAu = new Map(pricedAu.map((r) => [r.cardId, r._min.priceCents ?? null]));
  const existing = await prisma.card.findMany({ select: { id: true, lowestPriceCents: true } });
  const toUpdate = existing.filter((c) => (lowAu.get(c.id) ?? null) !== c.lowestPriceCents);
  let changed = 0;
  const UPD = 8;
  for (let i = 0; i < toUpdate.length; i += UPD) {
    await Promise.all(
      toUpdate.slice(i, i + UPD).map((c) =>
        prisma.card.update({ where: { id: c.id }, data: { lowestPriceCents: lowAu.get(c.id) ?? null } })
      )
    );
    changed += Math.min(UPD, toUpdate.length - i);
    if (changed % 5000 < UPD) console.log(`    updated ${changed}/${toUpdate.length}…`);
  }
  const auPriced = await prisma.card.count({ where: { lowestPriceCents: { not: null } } });
  const total = await prisma.card.count();
  console.log(`Done. ${changed} cards updated. AU-priced now ${auPriced}/${total}.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
