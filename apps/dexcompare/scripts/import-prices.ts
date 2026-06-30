/**
 * Import live Pokémon single prices from AU/NZ/US retailers into RetailerPrice.
 *
 * Reads public Shopify products.json feeds (catalogue data only), matches each
 * product to a card, and stores the cheapest price per store. Configure stores +
 * shipping in src/lib/retailers.ts. Matching logic lives in src/lib/price-import.ts.
 *
 * Usage: npx tsx scripts/import-prices.ts
 */
import { importPrices } from "../src/lib/price-import";
import { importSealed } from "../src/lib/sealed-import";
import { pingAfterPriceRefresh } from "../src/lib/indexnow";
import { prisma } from "../src/lib/db";

async function main() {
  const s = await importPrices();
  for (const st of s.stores) {
    console.log(`  ${st.name}: ${st.products} products → ${st.priced} cards priced, ${st.matched} matched, ${st.unmatched} unmatched`);
  }
  console.log(`Done. ${s.totalMatched} matched, ${s.totalUnmatched} unmatched. ${s.cardsPriced} cards now have prices.`);

  // Sealed products (booster boxes/ETBs/bundles) — powers /sealed and the
  // homepage new-arrivals rail. Isolated so a sealed hiccup never fails singles.
  try {
    const n = await importSealed();
    console.log(`Sealed import done: ${n} listings.`);
  } catch (e) {
    console.error("Sealed import failed:", e);
  }

  // IndexNow: tell Bing/Yandex the priced pages changed so they recrawl now.
  // force: this runs in GitHub Actions (not the Vercel runtime), but the host +
  // key are the real production ones, so the ping is legitimate.
  try {
    const pinged = await pingAfterPriceRefresh({ force: true });
    console.log(`IndexNow: submitted ${pinged} URLs.`);
  } catch (e) {
    console.error("IndexNow ping failed:", e);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
