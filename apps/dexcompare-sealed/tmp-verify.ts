import { readShopifyCollection, isPokemonCollection } from "./src/lib/feeds";
import { identifyAny, isIdentity } from "./src/lib/sealed-title";
import { sleep } from "./src/lib/scrape-http";
const ADD: Record<string, string[]> = JSON.parse(process.env.ADD!);
const S = require("./src/data/stores.json") as { key: string; base: string; market: string; country: string; collections: string[] }[];
(async () => {
  for (const [key, extra] of Object.entries(ADD)) {
    const st = S.find((x) => x.key === key && x.market === "UK")!;
    const per: Record<string, Map<string, { title: string; stock: boolean }>> = {};
    for (const h of [...st.collections, ...extra]) {
      await sleep(1000);
      const r = await readShopifyCollection(st.base, h, { country: st.country, maxPages: 8 });
      const m = new Map<string, { title: string; stock: boolean }>();
      const strict = !isPokemonCollection(h);
      for (const p of r.products) {
        const id = identifyAny(p.title, { strict });
        if (isIdentity(id)) m.set(id.groupKey, { title: p.title, stock: p.variants.some((v) => v.available) });
      }
      per[h] = m;
      console.log(`  ${key} ${h} ok=${r.ok} products=${r.products.length} accepted=${m.size} strict=${strict}`);
    }
    const old = new Set(st.collections.flatMap((h) => [...per[h].keys()]));
    const gained = new Map<string, { title: string; stock: boolean }>();
    for (const h of extra) for (const [g, v] of per[h]) if (!old.has(g)) gained.set(g, v);
    console.log(`## ${key} old=${old.size} gained=${gained.size} gainedInStock=${[...gained.values()].filter((v) => v.stock).length}`);
    for (const [g, v] of gained) console.log(`    + ${g} ${v.stock ? "IN" : "out"} | ${v.title}`);
  }
})();
