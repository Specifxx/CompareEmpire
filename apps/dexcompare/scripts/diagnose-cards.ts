// READ-ONLY diagnostic: why do some cards show no price? Reports per-market price
// coverage, RetailerPrice row counts by country (all vs in-stock), and for given
// search terms the exact listings we hold per card (country/retailer/price/in-stock/
// title) plus the card's collector number — so we can tell "not stocked" from
// "stocked but didn't match" from "matched but out of stock". No writes.
//
//   DATABASE_URL=... npx tsx scripts/diagnose-cards.ts ["Mewtwo VSTAR" "Salamence" ...]
import { prisma } from "../src/lib/db";

async function main() {
  const terms = process.argv.slice(2);
  const search = terms.length ? terms : ["Mewtwo VSTAR", "Salamence", "Rayquaza ex", "Charizard"];

  const total = await prisma.card.count();
  const [auP, nzP, usP, gbP] = await Promise.all([
    prisma.card.count({ where: { lowestPriceCents: { not: null } } }),
    prisma.card.count({ where: { lowestPriceCentsNz: { not: null } } }),
    prisma.card.count({ where: { lowestPriceCentsUs: { not: null } } }),
    prisma.card.count({ where: { lowestPriceCentsGb: { not: null } } }),
  ]);
  const totalRows = await prisma.retailerPrice.count();
  const byCountry = await prisma.retailerPrice.groupBy({ by: ["country"], _count: { _all: true } });
  const byCountryIn = await prisma.retailerPrice.groupBy({ by: ["country"], where: { inStock: true }, _count: { _all: true } });
  const distAuAny = (await prisma.retailerPrice.groupBy({ by: ["cardId"], where: { country: "AU" } })).length;
  const distAuIn = (await prisma.retailerPrice.groupBy({ by: ["cardId"], where: { country: "AU", inStock: true } })).length;

  console.log(`Cards: ${total}  |  priced — AU ${auP}  NZ ${nzP}  US ${usP}  GB ${gbP}`);
  console.log(`RetailerPrice rows: ${totalRows}`);
  console.log(`  by country (all):      ${byCountry.map((r) => `${r.country}:${r._count._all}`).join("  ")}`);
  console.log(`  by country (in-stock): ${byCountryIn.map((r) => `${r.country}:${r._count._all}`).join("  ")}`);
  console.log(`Distinct AU cards: any row ${distAuAny}  |  in-stock row ${distAuIn}  (gap = matched-but-OOS: ${distAuAny - distAuIn})`);

  for (const term of search) {
    console.log(`\n===== "${term}" =====`);
    const cards = await prisma.card.findMany({
      where: { name: { contains: term, mode: "insensitive" } },
      select: { id: true, name: true, setName: true, setCode: true, collectorNumber: true, lowestPriceCents: true, lowestPriceCentsNz: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true },
      orderBy: [{ searchCount: "desc" }],
      take: 10,
    });
    for (const c of cards) {
      const rows = await prisma.retailerPrice.findMany({ where: { cardId: c.id }, select: { retailer: true, retailerName: true, country: true, priceCents: true, condition: true, conditionPrices: true, inStock: true, title: true }, take: 12 });
      const inAu = rows.filter((r) => r.country === "AU").length;
      console.log(`\n  ${c.name} [${c.collectorNumber}] — ${c.setName ?? c.setCode ?? "?"}`);
      console.log(`    lowest: AU=${c.lowestPriceCents} NZ=${c.lowestPriceCentsNz} US=${c.lowestPriceCentsUs} GB=${c.lowestPriceCentsGb}  | ${rows.length} listings (${inAu} AU)`);
      for (const r of rows) {
        const cp = r.conditionPrices ? ` grades=${JSON.stringify(r.conditionPrices)}` : "";
        console.log(`      ${r.country} ${r.inStock ? "IN " : "OOS"} ${r.retailer}/${r.retailerName}[${r.condition ?? "-"}] ${r.priceCents}${cp}  "${r.title}"`);
      }
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
