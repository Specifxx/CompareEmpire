// READ-ONLY: exercises the homepage trending queries against the live DB exactly
// as src/lib/trending.ts runs them, so a failure here reproduces a homepage 500.
//   DATABASE_URL=... npx tsx scripts/test-trending.ts
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/db";
import { dbHistory } from "../src/lib/db-history";

async function main() {
  const days = await dbHistory.priceHistory.findMany({
    distinct: ["day"],
    orderBy: { day: "desc" },
    select: { day: true },
    take: 30,
  });
  console.log(`distinct days: ${days.length}`, days.map((d) => d.day.toISOString().slice(0, 10)).join(", "));
  if (days.length < 2) {
    console.log("fewer than 2 days — movers returns [] (section hidden)");
  } else {
    const d0 = days[0].day;
    const target = d0.getTime() - 7 * 86400_000;
    const baseline = days
      .slice(1)
      .reduce((best, d) => (Math.abs(d.day.getTime() - target) < Math.abs(best.day.getTime() - target) ? d : best)).day;
    console.log("d0:", d0.toISOString(), "baseline:", baseline.toISOString());
    const rows = await dbHistory.$queryRaw<{ cardId: string; now: number; before: number }[]>(Prisma.sql`
      SELECT a."cardId", a."lowestPriceCents" AS now, b."lowestPriceCents" AS before
      FROM "PriceHistory" a
      JOIN "PriceHistory" b ON b."cardId" = a."cardId" AND b."day" = ${baseline}::date
      WHERE a."day" = ${d0}::date
        AND b."lowestPriceCents" >= 300
        AND a."lowestPriceCents" >= 100
        AND a."lowestPriceCents" <> b."lowestPriceCents"
    `);
    console.log(`movers raw rows: ${rows.length}`);
    console.log(rows.slice(0, 5));
  }

  const popular = await prisma.card.findMany({
    where: { viewCount: { gt: 0 }, lowestPriceCents: { not: null } },
    orderBy: [{ viewCount: "desc" }],
    take: 12,
    select: { id: true, name: true, viewCount: true, lowestPriceCents: true },
  });
  console.log(`popular: ${popular.length}`, popular.slice(0, 3).map((p) => `${p.name}(${p.viewCount})`).join(", "));

  // The card-page history query.
  const anyCard = await dbHistory.priceHistory.findFirst({ select: { cardId: true } });
  if (anyCard) {
    const h = await dbHistory.priceHistory.findMany({
      where: { cardId: anyCard.cardId },
      orderBy: { day: "asc" },
      select: { day: true, lowestPriceCents: true },
      take: 365,
    });
    console.log(`history for ${anyCard.cardId}: ${h.length} points`);
  }
  console.log("ALL TRENDING QUERIES OK");
}
main().catch((e) => { console.error("TRENDING QUERY FAILED:", e); process.exit(1); }).finally(() => Promise.all([prisma.$disconnect(), dbHistory.$disconnect()]));
