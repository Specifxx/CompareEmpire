// TEMPORARY (deleted before merge): why does a store's collection give no rows?
import { readShopifyCollection, isPokemonCollection } from "../src/lib/feeds";
import { identifyAny } from "../src/lib/sealed-title";
const jobs: [string, string, string][] = [
  ["https://yuudachitcgarena.com", "US", "pokemon"],
  ["https://generalgames.com.au", "AU", "pokemon-tcg"],
  ["https://generalgames.com.au", "AU", "pokemon-1"],
  ["https://immaculatetcg.com", "US", "booster-box"],
  ["https://immaculatetcg.com", "US", "tins"],
  ["https://immaculatetcg.com", "US", "special-premium-collection-box"],
  ["https://safari-zone.com", "US", "preorders"],
  ["https://safari-zone.com", "US", "pokemon-loose-packs"],
  ["https://justcardstuff.com.au", "AU", "pokemon-tcg"],
  ["https://ultrarare.com.au", "AU", "pokemon-tcg"],
];
(async () => {
  for (const [base, c, h] of jobs) {
    const r = await readShopifyCollection(base, h, { country: c, maxPages: 4 });
    const strict = !isPokemonCollection(h);
    const tally: Record<string, number> = {};
    const samples: string[] = [];
    for (const p of r.products) {
      const id = identifyAny(p.title, { strict });
      const k = typeof id === "string" ? id : p.pickupOnly ? "pickupOnly" : p.inviteOnly ? "inviteOnly" : !p.variants.some((v) => v.available) ? "ok-soldout" : "OK";
      tally[k] = (tally[k] ?? 0) + 1;
      if (samples.length < 25 && k !== "not-sealed" && k !== "accessory") samples.push(`  [${k}] ${p.title} ${p.variants[0]?.priceCents}`);
    }
    console.log(`=== ${base} ${h} ok=${r.ok} n=${r.products.length} strict=${strict}`, JSON.stringify(tally));
    console.log(samples.join("\n"));
  }
})();
