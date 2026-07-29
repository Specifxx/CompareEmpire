/**
 * Daily DexCompare Index snapshot — computes and upserts today's basket value
 * for every index key (global + AU/US/GB + 3 era sub-indices). Writes ONLY
 * IndexSnapshot rows (one per key per day, ~7 rows/run) — no per-card data.
 * Idempotent: safe to re-run same-day.
 *
 * Usage: npx tsx scripts/snapshot-index.ts
 */
import { PrismaClient } from "@prisma/client";
import { ALL_INDEX_KEYS, snapshotIndex } from "../src/lib/market-index";

const prisma = new PrismaClient();

async function main() {
  for (const key of ALL_INDEX_KEYS) {
    const result = await snapshotIndex(key);
    if (result) console.log(`${key}: basket ${(result.basketCents / 100).toFixed(2)} across ${result.count} constituents`);
    else console.log(`${key}: skipped (no eligible constituents yet)`);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
