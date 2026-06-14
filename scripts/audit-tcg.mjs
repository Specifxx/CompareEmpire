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
import { enrichFromTcgplayer } from "../apps/opcompare/prisma/tcgplayer-enrich.mjs";
import { readFileSync } from "node:fs";

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" };
const NOT_FOUND_RE = /(no results|0 results|did not match|couldn'?t find|nothing found|page not found|404 not found|no products|sorry, no)/i;

async function probe(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 18000);
  try {
    const r = await fetch(url, { redirect: "follow", headers: UA, signal: ctrl.signal });
    let empty = false;
    if (r.ok) {
      const body = (await r.text()).slice(0, 250000);
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

const GAMES = [
  { key: "magic", file: "apps/mtgcompare/prisma/mtg-cards.json", maxFrom: 8000 },
  { key: "one-piece-card-game", file: "apps/opcompare/prisma/op-cards.json", maxFrom: Infinity },
  { key: "yugioh", file: "apps/ygocompare/prisma/ygo-cards.json", maxFrom: 8000 },
];

console.log("================ 1) TCGPLAYER MATCH + CLEAN IMAGES ================");
for (const g of GAMES) {
  const cards = JSON.parse(readFileSync(g.file, "utf8"));
  const sample = cards.length > 600 ? cards.filter((_, i) => i % Math.ceil(cards.length / 600) === 0) : cards;
  console.log(`\n-- ${g.key} (${cards.length} cards, matching ${sample.length}) --`);
  let map = new Map();
  try {
    map = await enrichFromTcgplayer(g.key, sample, { maxFrom: g.maxFrom });
  } catch (e) { console.log("  enrich error:", e.message); }
  const matched = [...map.entries()];
  console.log(`  matched ${matched.length}/${sample.length} (${((matched.length / sample.length) * 100).toFixed(0)}%)`);
  for (const [ext, v] of matched.slice(0, 4)) {
    console.log(`  ${ext} -> ${v.productUrl}`);
    console.log(`     img ${v.imageUrl} -> HTTP ${await imgOk(v.imageUrl)}  market=${v.marketCents != null ? "$" + (v.marketCents / 100).toFixed(2) : "—"}`);
  }
}

console.log("\n================ 2) STORE SEARCH CLICK TEST (query strategies) ================");
// Use real cards so the search is realistic.
const op = JSON.parse(readFileSync("apps/opcompare/prisma/op-cards.json", "utf8"));
const probes = [
  { game: "one-piece-card-game", card: op[0] }, // Monkey D. Luffy OP01-001
  { game: "magic", card: JSON.parse(readFileSync("apps/mtgcompare/prisma/mtg-cards.json", "utf8"))[0] }, // Black Lotus
];
const QUERY = {
  nameSet: (c) => `${c.name} ${c.setName}`,
  nameOnly: (c) => c.name,
  nameNum: (c) => `${c.name} ${String(c.collectorNumber).split("/")[0]}`,
};
const stores = buildStores("magic");
for (const { card } of probes) {
  console.log(`\n#### card: ${card.name} [${card.setName}] ${card.collectorNumber} ####`);
  for (const region of ["US", "AU", "GB", "NZ"]) {
    console.log(`-- ${region} --`);
    for (const s of stores[region]) {
      const line = [];
      for (const [qn, qf] of Object.entries(QUERY)) {
        const r = await probe(s.search(encodeURIComponent(qf(card))));
        line.push(`${qn}:${r.status}${r.empty ? "/empty" : ""}`);
      }
      console.log(`  ${s.name.padEnd(20)} ${line.join("  ")}`);
    }
  }
}
console.log("\nDONE");
