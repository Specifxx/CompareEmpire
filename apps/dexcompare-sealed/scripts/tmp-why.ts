// TEMPORARY (deleted before merge): what would a Pokémon-only read of these collections take?
import { readShopifyCollection } from "../src/lib/feeds";
import { identifyAny, isIdentity } from "../src/lib/sealed-title";
import { priceOf } from "../src/lib/importer";
const jobs: [string, string, string[]][] = [
  ["https://elite4tcg.com", "US", ["booster-boxes", "etbs", "collection-boxes-tins", "booster-bundle", "new-english-set", "sealed-product"]],
  ["https://immaculatetcg.com", "US", ["elite-trainer-box", "tins", "special-premium-collection-box", "booster-bundle", "booster-pack", "pre-order", "booster-box"]],
];
(async () => {
  for (const [base, c, hs] of jobs) for (const h of hs) {
    const r = await readShopifyCollection(base, h, { country: c, maxPages: 4 });
    const tally: Record<string, number> = {};
    const lines: string[] = [];
    for (const p of r.products) {
      const s = identifyAny(p.title, { strict: true });
      const l = identifyAny(p.title, { strict: false });
      const priced = isIdentity(l) ? priceOf(p as never, 0) : null;
      const k = isIdentity(s) ? "strict-ok" : isIdentity(l) ? (priced ? "GAINED" : "gained-unpriced") : `no:${l}`;
      tally[k] = (tally[k] ?? 0) + 1;
      if (k === "GAINED" || k === "gained-unpriced") lines.push(`  [${k}] ${p.title} => ${(l as { groupKey: string }).groupKey} ${priced?.priceCents} ${priced?.inStock}`);
      else if (k.startsWith("no:")) lines.push(`  [${k}] ${p.title}`);
    }
    console.log(`=== ${base} ${h} n=${r.products.length}`, JSON.stringify(tally));
    console.log(lines.join("\n"));
  }
})();
