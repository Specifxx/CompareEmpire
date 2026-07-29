/**
 * READ-ONLY diagnostic: reports the exact URL counts for the new three-tier
 * card sitemap policy (see src/app/sitemap.ts bucket 1), before/after
 * comparison against the old single hasLivePrice check, plus a sanity count
 * for the /pokemon species hubs and /cards facet hubs (P1/P2 of the
 * RiftCompare parity sprint). Writes nothing to the database.
 *
 * Usage: npx tsx scripts/sitemap-coverage-report.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.card.count();
  const hasLivePrice = await prisma.card.count({ where: { hasLivePrice: true } });
  const guideOnly = await prisma.card.count({ where: { hasLivePrice: false, marketPriceSource: "TCGplayer" } });
  const neither = total - hasLivePrice - guideOnly;
  const newSitemapCount = hasLivePrice + guideOnly;

  console.log("── Card sitemap tiering (bucket 1) ──────────────────────────");
  console.log(`Total cards:                     ${total}`);
  console.log(`Tier 1 — hasLivePrice:           ${hasLivePrice}  (indexed, priority 0.8)`);
  console.log(`Tier 2 — TCGplayer guide only:   ${guideOnly}  (indexed, priority 0.55)`);
  console.log(`Tier 3 — neither:                ${neither}  (noindex, NOT in sitemap)`);
  console.log("");
  console.log(`OLD sitemap coverage (hasLivePrice only): ${hasLivePrice}/${total}`);
  console.log(`NEW sitemap coverage (tier 1 + tier 2):   ${newSitemapCount}/${total}`);
  console.log(`Net new indexable URLs:                    +${guideOnly}`);

  // speciesSlug hasn't been backfilled yet on this environment if this is 0 —
  // expected until scripts/backfill-species.ts is run once.
  const withSpecies = await prisma.card.count({ where: { speciesSlug: { not: null } } });
  const speciesGroups = await prisma.card.groupBy({
    by: ["speciesSlug"],
    where: { speciesSlug: { not: null }, hasLivePrice: true },
    _count: { _all: true },
  });
  const indexableSpecies = speciesGroups.filter((g) => g._count._all >= 2).length;

  console.log("");
  console.log("── Pokemon species hubs (P1, bucket 3) ──────────────────────");
  console.log(`Cards with speciesSlug set:       ${withSpecies}/${total} (0 = backfill not yet run)`);
  console.log(`Distinct species w/ >=1 priced:   ${speciesGroups.length}`);
  console.log(`Indexable hubs (>=2 priced):      ${indexableSpecies}`);

  const rarityGroups = await prisma.card.groupBy({ by: ["rarity"], where: { hasLivePrice: true }, _count: { _all: true } });
  const indexableRarities = rarityGroups.filter((g) => g._count._all >= 2).length;
  console.log("");
  console.log("── Facet hubs (P2, bucket 0) ─────────────────────────────────");
  console.log(`Distinct rarities w/ priced cards: ${rarityGroups.length} (${indexableRarities} clear the >=2 threshold)`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
