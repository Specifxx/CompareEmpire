// Store deep-link EXPLORER — decides which stores can resolve to a SPECIFIC card.
//   node scripts/verify-stores.mjs
// Accuracy is the only goal: a store qualifies ONLY if we can point a link at the
// exact card the user wants. Two mechanisms are tested per store:
//   1) Shopify /products.json — download the store's real catalogue and match our
//      cards by unique code (OP/YGO) or name+set (Magic). A match = a REAL product
//      URL (https://host/products/<handle>) with the store's real price + stock.
//   2) (TCGplayer is handled in the seed via real product ids — verified separately.)
// Stores that aren't Shopify, aren't TCG retailers, or yield ~no matches are
// reported as NON-QUALIFYING so they can be removed.
import { buildCatalog } from "../apps/opcompare/prisma/tcgplayer-enrich.mjs";
import { readFileSync } from "node:fs";

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36", Accept: "application/json" };

// Every store currently in the directory + the non-Shopify majors (to confirm
// they can't be deep-linked this way).
const HOSTS = [
  // AU
  ["Guf", "guf.com.au", "AU"], ["Cherry Collectables", "cherrycollectables.com.au", "AU"],
  ["GameForce", "gameforce.com.au", "AU"], ["The Games Capital", "www.thegamescapital.com.au", "AU"],
  ["Kings Comics", "www.kingscomics.com", "AU"], ["Gameology", "www.gameology.com.au", "AU"],
  ["Games Empire", "gamesempire.com.au", "AU"], ["Good Games", "goodgames.com.au", "AU"],
  ["GAP Games", "www.gapgames.com.au", "AU"], ["House of Cards", "houseofcards.com.au", "AU"],
  ["Bird Keeper", "birdkeeper.com.au", "AU"], ["Mighty Ape AU", "www.mightyape.com.au", "AU"],
  // US / CA
  ["Card Cavern", "cardcavern.com", "US"], ["401 Games", "store.401games.ca", "US"],
  ["Card Kingdom", "www.cardkingdom.com", "US"], ["Star City Games", "starcitygames.com", "US"],
  ["CoolStuffInc", "www.coolstuffinc.com", "US"], ["Magic Stronghold", "www.magicstronghold.com", "US"],
  // GB
  ["Total Cards", "www.totalcards.net", "GB"], ["Element Games", "elementgames.co.uk", "GB"],
  ["Dark Sphere", "www.darksphere.co.uk", "GB"], ["Goblin Gaming", "www.goblingaming.co.uk", "GB"],
  ["Axion Now", "www.axionnow.com", "GB"], ["Hairy T", "www.hairyt.com", "GB"],
  ["Card Empire", "www.cardempire.co.uk", "GB"], ["Travelling Man", "travellingman.com", "GB"],
  ["Chaos Cards", "www.chaoscards.co.uk", "GB"], ["Magic Madhouse", "www.magicmadhouse.co.uk", "GB"],
  ["Patriot Games", "www.patriotgames.co.uk", "GB"], ["Manaleak", "www.manaleak.com", "GB"],
  ["Big Orbit Cards", "bigorbitcards.co.uk", "GB"], ["Wayland Games", "www.waylandgames.co.uk", "GB"],
  ["Spellbound Games", "www.spellboundgames.co.uk", "GB"],
  // NZ
  ["Card Merchant NZ", "www.cardmerchant.co.nz", "NZ"], ["Board Games NZ", "www.boardgames.co.nz", "NZ"],
  ["Game Kings", "www.gamekings.co.nz", "NZ"], ["The Vault", "thevault.co.nz", "NZ"],
  ["Goblin Games NZ", "goblingames.co.nz", "NZ"],
];

const norm = (s) => String(s || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const codeKey = (s) => { const m = String(s || "").toLowerCase().match(/[a-z0-9]{2,6}-[a-z]{0,3}\d{1,4}/); return m ? m[0].replace(/[^a-z0-9]/g, "") : ""; };
function setOverlap(a, b) { a = norm(a); b = norm(b); return !!a && !!b && (a === b || a.includes(b) || b.includes(a)); }

async function fetchJson(url) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { headers: UA, redirect: "follow", signal: ctrl.signal });
    if (!r.ok) return { err: `HTTP ${r.status}` };
    const ct = r.headers.get("content-type") || "";
    if (!/json/.test(ct)) return { err: `non-json (${ct.split(";")[0]})` };
    return { data: await r.json() };
  } catch (e) { return { err: e.cause?.code || e.name || "fail" }; }
  finally { clearTimeout(t); }
}

// Download a Shopify catalogue (products.json), capped for the explorer.
async function shopifyCatalog(host, maxPages = 25) {
  const products = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data, err } = await fetchJson(`https://${host}/products.json?limit=250&page=${page}`);
    if (err) return page === 1 ? { ok: false, reason: err, products } : { ok: true, products };
    const arr = data?.products;
    if (!Array.isArray(arr)) return { ok: false, reason: "no products[]", products };
    if (!arr.length) break;
    for (const p of arr) products.push({ title: p.title, handle: p.handle, vendor: p.vendor, type: p.product_type });
    if (arr.length < 250) break;
  }
  return { ok: true, products };
}

function indexCatalog(products) {
  const byCode = new Map(); const byName = [];
  for (const p of products) {
    const ck = codeKey(p.title);
    if (ck && !byCode.has(ck)) byCode.set(ck, p);
    byName.push({ p, n: norm(p.title) });
  }
  return { byCode, byName };
}
function matchCard(idx, card, game) {
  if (game !== "magic") {
    const ck = codeKey(card.collectorNumber);
    return ck ? idx.byCode.get(ck) || null : null;
  }
  // magic: all name tokens present AND the set name appears in the title
  const tokens = norm(card.name).split(" ").filter((t) => t.length > 2);
  for (const { p, n } of idx.byName) {
    if (tokens.length && tokens.every((t) => n.includes(t)) && setOverlap(card.setName, p.title)) return p;
  }
  return null;
}

async function main() {
  console.log("Loading sample cards…");
  const op = (await buildCatalog("one-piece-card-game", { maxFrom: 250 }).catch(() => [])).slice(0, 40);
  const mtg = (await buildCatalog("magic", { maxFrom: 250 }).catch(() => [])).slice(0, 40);
  const ygoAll = JSON.parse(readFileSync("apps/ygocompare/prisma/ygo-cards.json", "utf8"));
  const ygo = ygoAll.filter((_, i) => i % Math.ceil(ygoAll.length / 40) === 0).slice(0, 40);
  console.log(`samples: OP ${op.length}, MTG ${mtg.length}, YGO ${ygo.length}\n`);
  const games = [["one-piece-card-game", op], ["magic", mtg], ["yugioh", ygo]];

  for (const [name, host] of HOSTS) {
    const cat = await shopifyCatalog(host);
    if (!cat.ok || cat.products.length === 0) {
      console.log(`[DROP]   ${name.padEnd(20)} ${host.padEnd(28)} not Shopify / no catalogue (${cat.reason || "empty"})`);
      continue;
    }
    const idx = indexCatalog(cat.products);
    const out = [];
    let sampleUrl = "";
    for (const [g, cards] of games) {
      let hit = 0;
      for (const c of cards) { const p = matchCard(idx, c, g); if (p) { hit++; if (!sampleUrl) sampleUrl = `https://${host}/products/${p.handle}`; } }
      out.push(`${g.split("-")[0]}:${hit}/${cards.length}`);
    }
    const total = out.reduce((s, x) => s + Number(x.split(":")[1].split("/")[0]), 0);
    const verdict = total >= 8 ? "KEEP" : "WEAK";
    console.log(`[${verdict}]   ${name.padEnd(20)} ${host.padEnd(28)} products=${String(cat.products.length).padEnd(6)} ${out.join("  ")}  ${sampleUrl}`);
  }
  console.log("\nDONE");
}
main().catch((e) => { console.error(e); process.exit(1); });
