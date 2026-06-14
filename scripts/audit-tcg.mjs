// Persona-click audit — runs on a GitHub Actions runner (open internet).
//   APITCG_API_KEY=optional node scripts/audit-tcg.mjs
//
// Simulates what a real user experiences after clicking a "View deal" link:
//  1) TCGplayer enrichment — can we match each game's cards to a real TCGplayer
//     product (→ accurate product URL) and does the CLEAN image load (HTTP 200,
//     no Bandai "SAMPLE")? This is what makes dexcompare's links land on the
//     exact card instead of a 404.
//  2) Store search links — for sample real cards, build each store's search URL
//     with several query strategies and FOLLOW it (redirects included), then flag
//     pages that 404 or return "no results". Picks the query that actually finds
//     the card.
import { buildStores } from "../apps/mtgcompare/prisma/stores.mjs";
import { enrichFromTcgplayer, fetchSampleProducts } from "../apps/opcompare/prisma/tcgplayer-enrich.mjs";
import { readFileSync } from "node:fs";

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" };
const NOT_FOUND_RE = /(no results|0 results|did not match|couldn'?t find|nothing found|page not found|404 not found|no products|sorry, no)/i;

async function probe(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, { redirect: "follow", headers: UA, signal: ctrl.signal });
    let empty = false;
    if (r.ok) {
      const body = (await r.text()).slice(0, 60000);
      empty = NOT_FOUND_RE.test(body);
    }
    return { status: r.status, empty };
  } catch (e) {
    return { status: `ERR:${e.cause?.code || e.name || "fail"}`, empty: false };
  } finally { clearTimeout(t); }
}
async function imgOk(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { redirect: "follow", headers: UA, signal: ctrl.signal });
    const len = Number(r.headers.get("content-length") || 0);
    return `${r.status}${len ? ` ${(len / 1024).toFixed(0)}KB` : ""}`;
  } catch (e) { return `ERR:${e.cause?.code || e.name || "fail"}`; }
  finally { clearTimeout(t); }
}

// OP first (small + the critical fix), then capped MTG/YGO so the audit is fast.
// The real seed does an uncapped pull for full coverage.
const GAMES = [
  { key: "one-piece-card-game", file: "apps/opcompare/prisma/op-cards.json" },
  { key: "magic", file: "apps/mtgcompare/prisma/mtg-cards.json" },
  { key: "yugioh", file: "apps/ygocompare/prisma/ygo-cards.json" },
];

console.log("================ 0) RAW TCGPLAYER PRODUCT SHAPE ================");
for (const g of GAMES) {
  try {
    const samp = await fetchSampleProducts(g.key, 5);
    console.log(`\n-- ${g.key} --`);
    for (const p of samp) {
      console.log(`  number=${JSON.stringify(p.customAttributes?.number)} set=${JSON.stringify(p.setName)} name=${JSON.stringify(p.productName)} foilOnly=${p.foilOnly}`);
    }
  } catch (e) { console.log(`  ${g.key} sample error:`, e.message); }
}

console.log("\n================ 1) TCGPLAYER MATCH + CLEAN IMAGES ================");
for (const g of GAMES) {
  const cards = JSON.parse(readFileSync(g.file, "utf8"));
  // OP/MTG: whole (small) catalogue. YGO: representative ~250-card sample.
  const sample = cards.length > 300 ? cards.filter((_, i) => i % Math.ceil(cards.length / 250) === 0) : cards;
  console.log(`\n-- ${g.key} (${cards.length} cards, matching ${sample.length}) --`);
  let map = new Map();
  try {
    map = await enrichFromTcgplayer(g.key, sample, { concurrency: 6 });
  } catch (e) { console.log("  enrich error:", e.message); }
  const matched = [...map.entries()];
  console.log(`  matched ${matched.length}/${sample.length} (${((matched.length / sample.length) * 100).toFixed(0)}%)`);
  for (const [ext, v] of matched.slice(0, 3)) {
    console.log(`  ${ext} -> ${v.productUrl}`);
    console.log(`     img -> HTTP ${await imgOk(v.imageUrl)}  market=${v.marketCents != null ? "$" + (v.marketCents / 100).toFixed(2) : "—"}`);
  }
}

const op = JSON.parse(readFileSync("apps/opcompare/prisma/op-cards.json", "utf8"));
const mtg = JSON.parse(readFileSync("apps/mtgcompare/prisma/mtg-cards.json", "utf8"));
const stores = buildStores("magic");

console.log("\n========= 2a) QUERY STRATEGY (TCGplayer + representative stores) =========");
// Which query string actually returns the card? Tested on a small set so it's fast.
const QUERY = {
  nameOnly: (c) => c.name,
  nameClean: (c) => c.name.replace(/[.,'']/g, "").replace(/\s+/g, " ").trim(),
};
const repKeys = ["tcgplayer_us", "cardkingdom", "starcitygames", "coolstuffinc", "guf", "elementgames", "cherrycollectables", "gamenerdz"];
const rep = Object.values(stores).flat().filter((s) => repKeys.includes(s.key));
for (const card of [op[0], mtg[0]]) {
  console.log(`\n#### ${card.name} [${card.setName}] ${card.collectorNumber} ####`);
  for (const s of rep) {
    const line = [];
    for (const [qn, qf] of Object.entries(QUERY)) {
      const r = await probe(s.search(encodeURIComponent(qf(card))));
      line.push(`${qn}:${r.status}${r.empty ? "/empty" : ""}`);
    }
    console.log(`  ${s.name.padEnd(20)} ${line.join("  ")}`);
  }
}

console.log("\n========= 2b) ALL STORES — NAME-ONLY CLICK TEST (cull dead/404) =========");
// The query the seed actually uses. Flags any store that 404s or returns nothing.
for (const card of [op[0], mtg[0]]) {
  console.log(`\n#### ${card.name} ####`);
  for (const region of ["US", "AU", "GB", "NZ"]) {
    console.log(`-- ${region} --`);
    for (const s of stores[region]) {
      const r = await probe(s.search(encodeURIComponent(card.name)));
      const verdict = /^(2)/.test(String(r.status)) ? (r.empty ? "EMPTY?" : "OK") : /^(3)/.test(String(r.status)) ? "OK(redir)" : "DEAD?";
      console.log(`  [${r.status}] ${verdict.padEnd(9)} ${s.name.padEnd(20)} ${s.search("X").split("/").slice(0, 3).join("/")}`);
    }
  }
}
console.log("\nDONE");
