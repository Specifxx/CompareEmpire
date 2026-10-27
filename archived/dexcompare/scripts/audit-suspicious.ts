// Read-only diagnostic for Check B of the data-quality gate: the AU cards whose
// cheapest store price sits below 40% of their TCGplayer market guide. It pulls
// the actual matched listing(s) behind each flag and classifies the LIKELY cause
// so we can tell genuine mismatches (a wrong listing attached to a card) apart
// from legitimately-cheap listings (played condition / non-holo variant / a guide
// that's simply stale). Writes NOTHING — safe to run against production.
//
// Usage: npx tsx scripts/audit-suspicious.ts   (needs DATABASE_URL)
import { prisma } from "../src/lib/db";
import { marketGuideCents } from "../src/lib/country";

const PCT_OF_GUIDE_FLOOR = Number(process.env.VERIFY_GUIDE_FLOOR ?? 0.4);

// Condition strings that mean "played/damaged" → a legitimately cheaper copy.
const PLAYED = /\b(mp|hp|dm|pl|po|played|damaged|poor|heavily|moderately)\b/i;
const NM_LP = /\b(nm|lp|near\s*mint|lightly|mint)\b/i;

function digitsOf(collectorNumber: string): string {
  return (collectorNumber.split("/")[0] ?? "").replace(/[^0-9]/g, "").replace(/^0+/, "");
}
function firstNameTok(name: string): string {
  return (name.toLowerCase().match(/[a-z0-9]+/g) ?? [""])[0];
}

async function main() {
  // Same population + predicate as verify-data.ts Check B.
  const guided = await prisma.card.findMany({
    where: { marketPriceSource: "TCGplayer", marketPriceCents: { gt: 0 }, lowestPriceCents: { not: null } },
    select: { id: true, name: true, setName: true, setCode: true, collectorNumber: true, rarity: true, variant: true, lowestPriceCents: true, marketPriceCents: true },
  });
  const suspicious = guided
    .map((c) => {
      const guideAud = marketGuideCents(c.marketPriceCents, "AU");
      return { c, guideAud };
    })
    .filter(({ c, guideAud }) => guideAud != null && (c.lowestPriceCents as number) < (guideAud as number) * PCT_OF_GUIDE_FLOOR);

  console.log(`\nGuided cards: ${guided.length} | suspicious (<${Math.round(PCT_OF_GUIDE_FLOOR * 100)}% of guide): ${suspicious.length}\n`);

  // Pull the AU in-stock non-guide rows behind each suspicious card in one query.
  const ids = suspicious.map((s) => s.c.id);
  const rows = await prisma.retailerPrice.findMany({
    where: { cardId: { in: ids }, country: "AU", inStock: true, NOT: { retailer: { startsWith: "marketguide" } } },
    select: { cardId: true, retailer: true, retailerName: true, condition: true, isFoil: true, priceCents: true, title: true },
  });
  const byCard = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = byCard.get(r.cardId);
    if (arr) arr.push(r);
    else byCard.set(r.cardId, [r]);
  }

  const cls = { CONDITION_PLAYED: 0, FOIL_VARIANT: 0, NAME_NUMBER_MISMATCH: 0, EBAY_CHEAP: 0, STALE_GUIDE_OR_REVIEW: 0 };
  const byRetailer = new Map<string, number>();
  const examples: Record<string, string[]> = {};

  for (const { c, guideAud } of suspicious) {
    const rs = (byCard.get(c.id) ?? [])
      .filter((r) => NM_LP.test(r.condition ?? "") || r.condition == null) // mirror headlineWhere (NM/LP/null)
      .sort((a, b) => a.priceCents - b.priceCents);
    const low = rs[0];
    const pct = Math.round(((c.lowestPriceCents as number) / (guideAud as number)) * 100);
    let label = "STALE_GUIDE_OR_REVIEW";
    if (low) {
      byRetailer.set(low.retailer, (byRetailer.get(low.retailer) ?? 0) + 1);
      const title = (low.title ?? "").toLowerCase();
      const hasNum = digitsOf(c.collectorNumber) !== "" && title.includes(digitsOf(c.collectorNumber));
      const hasName = title.includes(firstNameTok(c.name));
      const isEbay = low.retailer.startsWith("ebay");
      // The card's guide tracks a holo/foil/chase variant if its rarity/variant says so;
      // a non-foil matched listing is then a cheaper-variant explanation, not a bug.
      const cardLikelyFoil = /holo|foil|ultra|secret|illustration|rainbow|gold|shiny|amazing/i.test(`${c.rarity ?? ""} ${c.variant ?? ""}`);
      if (low.condition && PLAYED.test(low.condition)) label = "CONDITION_PLAYED";
      else if (cardLikelyFoil && !low.isFoil) label = "FOIL_VARIANT";
      else if (!isEbay && (!hasName || !hasNum)) label = "NAME_NUMBER_MISMATCH";
      else if (isEbay) label = "EBAY_CHEAP";
    }
    cls[label as keyof typeof cls]++;
    (examples[label] ??= []).push(
      `${c.name} [${c.setCode} ${c.collectorNumber}] guide≈$${((guideAud as number) / 100).toFixed(2)} → low $${((c.lowestPriceCents as number) / 100).toFixed(2)} (${pct}%)` +
        (low ? ` | ${low.retailer}${low.condition ? `/${low.condition}` : ""}${low.isFoil ? "/foil" : ""}: "${(low.title ?? "").slice(0, 70)}"` : " | NO HEADLINE ROW")
    );
  }

  console.log("── Classification of suspicious cards ───────────────────────");
  for (const [k, v] of Object.entries(cls)) console.log(`  ${k.padEnd(24)} ${v}`);
  console.log("\n── Cheapest-row retailer distribution ───────────────────────");
  for (const [k, v] of [...byRetailer.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(20)} ${v}`);
  console.log("\n── Examples (up to 12 per class) ────────────────────────────");
  for (const [k, arr] of Object.entries(examples)) {
    console.log(`\n  [${k}]`);
    for (const line of arr.slice(0, 12)) console.log("    " + line);
  }
  console.log("");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("audit-suspicious crashed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
