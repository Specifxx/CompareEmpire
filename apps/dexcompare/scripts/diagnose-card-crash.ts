/**
 * READ-ONLY: replicates card/[id]/page.tsx's exact query + render-prep logic
 * against production to surface the real error behind a live 500. Writes
 * nothing. Usage: npx tsx scripts/diagnose-card-crash.ts <slug-or-id>
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_COUNTRY = "AU";

async function main() {
  const id = process.argv[2] ?? "me1-56-alakazam";
  console.log(`Diagnosing card: ${id}`);

  try {
    const card = await prisma.card.findFirst({
      where: { OR: [{ slug: id }, { id }] },
      select: {
        id: true, slug: true, name: true, nameNormalized: true,
        setCode: true, setName: true, collectorNumber: true,
        domain: true, type: true, rarity: true, variant: true, isPromo: true,
        might: true, energyCost: true, orientation: true, artSeed: true,
        imageUrl: true, imageThumbUrl: true, blurDataUrl: true,
        marketPriceCents: true, marketPriceSource: true, marketPriceUpdatedAt: true,
        lowestPriceCents: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true,
        retailerPrices: {
          where: { country: DEFAULT_COUNTRY },
          orderBy: { priceCents: "asc" },
          select: {
            id: true, retailer: true, retailerName: true, priceCents: true,
            shippingCents: true, condition: true, conditionPrices: true,
            isFoil: true, inStock: true, url: true, lastSeen: true, title: true,
          },
        },
      },
    });
    console.log("Main query: OK. Card found:", !!card);
    if (!card) { console.log("Card not found for this id/slug."); return; }
    console.log("card.id =", card.id, "retailerPrices:", card.retailerPrices.length);

    const [otherPrints, reviewRows, cheaperInSet, sameDomainCards, sameRarityCards, species] = await Promise.all([
      card.nameNormalized
        ? prisma.card.findMany({ where: { nameNormalized: card.nameNormalized, id: { not: card.id } }, take: 12 })
        : Promise.resolve([]),
      prisma.cardReview.findMany({ where: { cardId: card.id, status: "PUBLISHED" }, take: 20 }).catch((e) => {
        console.log("cardReview query FAILED (should be soft-caught):", e.message);
        return [];
      }),
      prisma.card.findMany({ where: { setCode: card.setCode, id: { not: card.id } }, take: 8 }),
      prisma.card.findMany({ where: { domain: card.domain, id: { not: card.id }, setCode: { not: card.setCode } }, skip: card.artSeed % 20, take: 8 }),
      prisma.card.findMany({ where: { rarity: card.rarity, id: { not: card.id }, setCode: { not: card.setCode } }, skip: (card.artSeed + 7) % 20, take: 8 }),
      prisma.card.findUnique({ where: { id: card.id }, select: { speciesSlug: true, speciesName: true } }).catch((e) => {
        console.log("speciesSlug query FAILED (should be soft-caught):", e.message);
        return null;
      }),
    ]);
    console.log("Secondary Promise.all: OK.");
    console.log("  otherPrints:", otherPrints.length, "cheaperInSet:", cheaperInSet.length);
    console.log("  sameDomainCards:", sameDomainCards.length, "sameRarityCards:", sameRarityCards.length);
    console.log("  reviewRows:", reviewRows.length, "species:", species);

    console.log("\nALL QUERIES SUCCEEDED. The 500 is not a Prisma/DB error on this path.");
  } catch (e) {
    console.error("\n!!! QUERY THREW !!!");
    console.error(e);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("FATAL:", e);
  await prisma.$disconnect();
  process.exit(1);
});
