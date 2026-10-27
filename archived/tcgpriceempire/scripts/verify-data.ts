/**
 * Post-import data-quality gate. Prints per-game counts of cards / priced
 * cards / vendor rows and exits non-zero if any game ended up with ZERO cards
 * or ZERO priced cards — zero means that game's import broke outright.
 * Small-but-nonzero is fine (Riftbound is a young game with a tiny catalogue);
 * Pokémon/MTG should land in the tens of thousands.
 *
 * Usage: npx tsx scripts/verify-data.ts   (needs DATABASE_URL)
 */
import { GAME_KEYS } from "../src/lib/games";
import { prisma } from "../src/lib/db";

async function main() {
  let failed = false;

  console.log("── TCGPriceEmpire data gate ─────────────────────────────────");
  console.log("  game           cards     priced     vendor rows");
  for (const game of GAME_KEYS) {
    const [cards, priced, vendors] = await Promise.all([
      prisma.card.count({ where: { game } }),
      prisma.card.count({ where: { game, marketPriceCents: { not: null } } }),
      prisma.vendorPrice.count({ where: { card: { game } } }),
    ]);
    const ok = cards > 0 && priced > 0;
    if (!ok) failed = true;
    console.log(
      `  ${game.padEnd(10)} ${String(cards).padStart(9)} ${String(priced).padStart(10)} ${String(vendors).padStart(15)}   ${ok ? "OK" : "FAIL"}`
    );
  }
  console.log("─────────────────────────────────────────────────────────────");
  console.log(failed ? "RESULT: FAIL — a game has zero cards or zero priced cards." : "RESULT: PASS");
  if (failed) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("verify-data crashed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
