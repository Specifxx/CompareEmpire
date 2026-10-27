/**
 * One-off backfill: populate Card.speciesSlug / Card.speciesName for every
 * existing card, using the base-species heuristic in lib/pokemon-species.ts.
 * Powers the /pokemon/{slug} hubs (P1). Safe to re-run — idempotent (always
 * recomputes from the current name), and touches no other columns.
 *
 * Usage: npx tsx scripts/backfill-species.ts
 */
import { PrismaClient } from "@prisma/client";
import { speciesOf } from "../src/lib/pokemon-species";

const prisma = new PrismaClient();
const CHUNK = 500;

async function main() {
  const cards = await prisma.card.findMany({ select: { id: true, name: true, type: true } });
  console.log(`Computing species for ${cards.length} cards…`);

  let updated = 0;
  let cleared = 0;
  const bySlug = new Map<string, number>();

  for (let i = 0; i < cards.length; i += CHUNK) {
    const batch = cards.slice(i, i + CHUNK);
    await prisma.$transaction(
      batch.map((c) => {
        const sp = speciesOf(c.name, c.type);
        if (sp) bySlug.set(sp.slug, (bySlug.get(sp.slug) ?? 0) + 1);
        else cleared++;
        updated++;
        return prisma.card.update({
          where: { id: c.id },
          data: { speciesSlug: sp?.slug ?? null, speciesName: sp?.name ?? null },
        });
      })
    );
    console.log(`  ${Math.min(i + CHUNK, cards.length)}/${cards.length}`);
  }

  console.log(`Done. Updated ${updated} rows (${cleared} had no resolvable species).`);
  console.log(`${bySlug.size} distinct species hubs.`);
  const sample = [...bySlug.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log("Top 15 by printing count:", sample);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
