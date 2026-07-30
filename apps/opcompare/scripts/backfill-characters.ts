/**
 * One-off backfill: populate Card.characterSlug / Card.characterName for every
 * existing card using the heuristic in src/lib/op-characters.ts. Powers the
 * /character/{slug} hubs. Idempotent (always recomputes from the current name)
 * and touches no other columns.
 *
 * Usage: npx tsx scripts/backfill-characters.ts
 */
import { PrismaClient } from "@prisma/client";
import { characterOf } from "../src/lib/op-characters";

const prisma = new PrismaClient();
const CHUNK = 500;

async function main() {
  const cards = await prisma.card.findMany({ select: { id: true, name: true, type: true } });
  console.log(`Computing characters for ${cards.length} cards…`);

  let updated = 0;
  let cleared = 0;
  const bySlug = new Map<string, number>();

  for (let i = 0; i < cards.length; i += CHUNK) {
    const batch = cards.slice(i, i + CHUNK);
    await prisma.$transaction(
      batch.map((c) => {
        const ch = characterOf(c.name, c.type);
        if (ch) bySlug.set(ch.slug, (bySlug.get(ch.slug) ?? 0) + 1);
        else cleared++;
        updated++;
        return prisma.card.update({
          where: { id: c.id },
          data: { characterSlug: ch?.slug ?? null, characterName: ch?.name ?? null },
        });
      })
    );
    console.log(`  ${Math.min(i + CHUNK, cards.length)}/${cards.length}`);
  }

  console.log(`Done. Updated ${updated} rows (${cleared} had no resolvable character — Event/Stage cards and unparseable names).`);
  console.log(`${bySlug.size} distinct character hubs.`);
  console.log("Top 15 by printing count:", [...bySlug.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
