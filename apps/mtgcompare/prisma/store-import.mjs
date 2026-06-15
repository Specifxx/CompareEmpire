// Magic store-price importer — a direct port of DexCompare's proven engine
// (apps/dexcompare/src/lib/price-import.ts + retailers.ts), adapted for Magic.
// Same stores (they sell Magic too), same Shopify sitemap collection discovery,
// same country-priced /collections/<handle>/products.json scrape, same robust
// title→card resolver. This is why MTG can have comparable store coverage to the
// Pokémon site. Every row is a REAL product page with the store's real price/stock.

// ── Retailers (ported from DexCompare; these Shopify stores all carry Magic) ──
// Only domain + market are needed; Magic collections are auto-discovered per store.
export const RETAILERS = [
  // Australia (AUD)
  ["cherry", "Cherry Collectables", "https://www.cherrycollectables.com.au", "AU"],
  ["ozzie", "Ozzie Collectables", "https://www.ozziecollectables.com", "AU"],
  ["finalboss", "The Final Boss Collectables", "https://thefinalbosscollectables.com.au", "AU"],
  ["adventurers", "The Adventurers Guild", "https://www.theadventurersguild.com.au", "AU"],
  ["manamarket", "Mana Market", "https://manamarket.com.au", "AU"],
  ["steelcity", "Steel City Games", "https://www.steelcitygames.com.au", "AU"],
  ["cardbot", "Cardbot", "https://cardbot.com.au", "AU"],
  ["ggadelaide", "Good Games Adelaide", "https://ggadelaide.com.au", "AU"],
  ["goodgames", "Good Games", "https://www.goodgames.com.au", "AU"],
  ["vaultgames", "Vault Games", "https://vaultgames.com.au", "AU"],
  ["mintcollectables", "Mint Collectables", "https://mintcollectables.com.au", "AU"],
  ["cardhub", "The Card Hub Australia", "https://thecardhubaustralia.com.au", "AU"],
  ["collectiblemadness", "Collectible Madness", "https://collectiblemadness.com.au", "AU"],
  ["chimera", "Chimera Gaming", "https://chimeragaming.com.au", "AU"],
  ["gamescapital", "The Games Capital", "https://www.thegamescapital.com.au", "AU"],
  ["gameology", "Gameology", "https://www.gameology.com.au", "AU"],
  ["bantertoys", "Banter Toys & Collectables", "https://bantertoys.com.au", "AU"],
  ["kingofcards", "King of Cards", "https://kingofcards.com.au", "AU"],
  ["skyfoxes", "Sky Foxes Cards", "https://skyfoxescards.com.au", "AU"],
  ["tcgsingles", "TCG Singles Australia", "https://tcgsingles.com.au", "AU"],
  ["kollecter", "Kollecter", "https://www.kollecter.com.au", "AU"],
  ["progamers", "Pro Gamers & Collectables", "https://progamers.com.au", "AU"],
  ["guf", "Guf", "https://guf.com.au", "AU"],
  ["tabletopgaminghub", "Tabletop Gaming Hub", "https://tabletopgaminghub.com.au", "AU"],
  ["trollaustralia", "Troll Australia", "https://www.trollaustralia.com.au", "AU"],
  ["kingdomofgeek", "Kingdom of Geek", "https://kingdomofgeek.com.au", "AU"],
  ["gapgames", "GAP Games", "https://www.gapgames.com.au", "AU"],
  ["hobbymaster", "Hobbymaster", "https://www.hobbymaster.com.au", "AU"],
  ["epictcg", "Epic TCG", "https://epictcg.com.au", "AU"],
  ["goodgrieftcg", "Good Grief TCG", "https://goodgrieftcg.com.au", "AU"],
  ["nextlevelgames", "Next Level Games", "https://nextlevelgames.com.au", "AU"],
  ["gameforce", "GameForce", "https://gameforce.com.au", "AU"],
  ["timelesscollectables", "Timeless Collectables", "https://timelesscollectables.com.au", "AU"],
  // New Zealand (NZD)
  ["cardmerchant", "Card Merchant NZ", "https://cardmerchant.co.nz", "NZ"],
  ["tcgcollectornz", "TCG Collector NZ", "https://tcgcollectornz.com", "NZ"],
  ["ironknight", "Iron Knight Gaming", "https://ironknightgaming.co.nz", "NZ"],
  ["calicokeep", "Calico Keep", "https://www.calicokeep.co.nz", "NZ"],
  ["cardbotnz", "Card Bot NZ", "https://cardbot.co.nz", "NZ"],
  ["gamingdna", "Gaming DNA", "https://gamingdna.co.nz", "NZ"],
  ["shuffleandcut", "Shuffle n Cut Games", "https://www.shuffleandcutgames.co.nz", "NZ"],
  ["gameroost", "Game Roost", "https://www.gameroost.co.nz", "NZ"],
  ["vaulttcgnz", "Vault TCG", "https://www.vaulttcg.co.nz", "NZ"],
  ["cerberusgamesnz", "Cerberus Games", "https://cerberusgames.co.nz", "NZ"],
  // United States (USD)
  ["mythicstore", "The Mythic Store", "https://themythicstore.com", "US"],
  ["danireon", "Danireon Cards & Games", "https://www.danireon.com", "US"],
  ["punkouter", "PunkOuter Games", "https://punkouter.com", "US"],
  ["gglegends", "GG Legends", "https://store.gglehi.com", "US"],
  ["mistymountain", "Misty Mountain Games", "https://www.mistymountaingames.com", "US"],
  ["theboosterbox", "The Booster Box", "https://theboosterbox.com", "US"],
  ["npcollectibles", "NP Collectibles", "https://npcollectibles.com", "US"],
  ["capefear", "Cape Fear Collectibles", "https://www.capefearcollectibles.com", "US"],
  ["hobbiesville", "Hobbiesville", "https://hobbiesville.com", "US"],
  ["kanzengames", "KanZenGames", "https://kanzengames.com", "US"],
  ["onestoptcg", "OneStopTCG", "https://onestoptcg.com", "US"],
  ["galaxygames", "Galaxy Games LLC", "https://galaxygamesllc.com", "US"],
  ["gamersgrove", "Gamers Grove", "https://gamersgrove.com", "US"],
  ["collectorscache", "Collector's Cache", "https://collectorscache.com", "US"],
  ["eternalcardboard", "Eternal Cardboard", "https://eternalcardboard.com", "US"],
  // United Kingdom (GBP)
  ["titancards", "Titan Cards", "https://titancards.co.uk", "GB"],
  ["totalcards", "Total Cards", "https://totalcards.net", "GB"],
  ["dicesaloon", "Dice Saloon", "https://dicesaloonsingles.co.uk", "GB"],
  ["lvlupgaming", "Lvl Up Gaming UK", "https://lvlupgaming.co.uk", "GB"],
  ["cardrush", "CardRush UK", "https://cardrush.co.uk", "GB"],
  ["gocardsuk", "Go Cards UK", "https://gocardsuk.co.uk", "GB"],
  ["eternacards", "Eterna Cards", "https://eternacards.co.uk", "GB"],
  ["hillscards", "Hills Cards", "https://www.hillscards.co.uk", "GB"],
  ["chuscards", "Chu's Cards", "https://chuscards.com", "GB"],
  ["manaleak_uk", "Manaleak", "https://www.manaleak.com", "GB"],
  ["magicmadhouse_uk", "Magic Madhouse", "https://www.magicmadhouse.co.uk", "GB"],
];

const CUR = { AU: "AUD", NZ: "NZD", US: "USD", GB: "GBP" };
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36", Accept: "application/json, text/plain, */*" };
const TIMEOUT = 20000;

async function fetchText(url) {
  try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT) }); return r.ok ? await r.text() : null; } catch { return null; }
}

const NON_SINGLE = /sealed|booster|box|bundle|preorder|pre-order|accessor|playmat|sleeve|merch|deck-?box|gift|case|\btin\b|blister|collection-box|plush|funko/i;

// Auto-discover a store's Magic singles collections from its Shopify sitemap.
export async function discoverMagicCollections(base) {
  const handles = new Set();
  const index = await fetchText(`${base}/sitemap.xml`);
  let sitemaps = index ? Array.from(index.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]).filter((u) => /sitemap_collections/i.test(u)) : [];
  if (!sitemaps.length) sitemaps = [`${base}/sitemap_collections_1.xml`];
  for (const sm of sitemaps.slice(0, 8)) {
    const xml = await fetchText(sm);
    if (!xml) continue;
    for (const m of xml.matchAll(/\/collections\/([^<\/?#"]+)/g)) {
      const h = m[1];
      if (/(magic|mtg|gathering)/i.test(h) && /single/i.test(h) && !NON_SINGLE.test(h) && !/\.(jpe?g|png|gif|webp|svg)$/i.test(h)) handles.add(h);
    }
    // also accept generic "magic-the-gathering" collections if no -singles found
    if (!handles.size) for (const m of xml.matchAll(/\/collections\/([^<\/?#"]+)/g)) {
      const h = m[1];
      if (/(magic-the-gathering|mtg-singles|magic-singles)/i.test(h) && !NON_SINGLE.test(h)) handles.add(h);
    }
  }
  return Array.from(handles);
}

async function fetchCollection(base, handle, country) {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const url = `${base}/collections/${handle}/products.json?limit=250&page=${page}&country=${country}`;
    let data;
    try {
      const res = await fetch(url, { headers: { ...UA, "Cache-Control": "no-cache" }, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });
      if (!res.ok) break;
      data = await res.json();
    } catch { break; }
    if (!data.products?.length) break;
    all.push(...data.products);
    if (data.products.length < 250) break;
  }
  return all;
}

const TOK_STOP = new Set(["magic","the","gathering","mtg","card","cards","single","singles","tcg","a","an","of","and","nm","near","mint","lightly","moderately","heavily","played","lp","mp","hp","dmg","damaged","foil","nonfoil","non","etched","borderless","extended","showcase","retro","promo","rare","common","uncommon","mythic","full","alt","alternate","art","english","japanese","jpn","eng","graded","psa","bgs","cgc"]);
function tokenize(s) { return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(" ").filter((w)=>w.length>1 && !TOK_STOP.has(w) && !/^\d+$/.test(w)); }
const SET_GENERIC = new Set(["edition","set","series","the","of","and"]);
const BASIC = /^(plains|island|swamp|mountain|forest|wastes)$/;

const MULTI_CARD = /\b(playset|lot|lots|bundle|joblot|job lot|x\s*\d+|\d+\s*x|set of|complete set|full set|bulk)\b/i;
const NON_CARD = /\b(funko|pop!?\s*(?:vinyl|games)|plush|action\s*figure|portfolio|binder|sleeves?|toploaders?|top\s?loader|playmat|deck\s?box|card\s?case|storage\s*(?:box|case)|booster|elite\s*trainer|premium\s*collection|collection\s*box|gift\s*(?:box|set)|\btin\b|\bbox\b|display|blister|theme\s*deck|starter\s*(?:deck|set)|precon|commander\s*deck|bundle|playmat|dice|token|sticker|poster|\bpin\b)\b/i;

function conditionBucket(t) {
  t = (t||"").toLowerCase();
  if (/damaged|\bdmg\b|\bpoor\b/.test(t)) return "DMG";
  if (/heav(ily)?\s*play|\bhp\b/.test(t)) return "HP";
  if (/moderate(ly)?\s*play|\bmp\b|\bgood\b/.test(t)) return "MP";
  if (/light(ly)?\s*play|\blp\b|\bplayed\b|\bexcellent\b/.test(t)) return "LP";
  return "NM";
}

// Magic title→cardId resolver. Magic titles reliably carry NAME + SET (and a
// collector number when present). We match on full name + set-name overlap, using
// the collector number to disambiguate where the title has one. Basic lands require
// a number (their name+set is ambiguous across arts).
export function buildMagicResolver(cards) {
  const byName = new Map(); // every name token -> [card]
  const push = (k, v) => { const a = byName.get(k); if (a) a.push(v); else byName.set(k, [v]); };
  for (const c of cards) {
    const nameToks = tokenize(c.name);
    if (!nameToks.length) continue;
    const setToks = tokenize(c.setName || "").filter((s) => !SET_GENERIC.has(s));
    const num = (String(c.collectorNumber).match(/\d+/) || [])[0] || "";
    const ic = { id: c.id, nameToks, setToks, num, basic: BASIC.test(nameToks.join("")) };
    for (const tok of nameToks) push(tok, ic);
  }
  return function resolve(title) {
    if (MULTI_CARD.test(title) || NON_CARD.test(title)) return null;
    const ptoks = tokenize(title);
    if (!ptoks.length) return null;
    const set = new Set(ptoks);
    const numInTitle = (n) => !!n && new RegExp(`(^|\\D)${n}(\\D|$)`).test(title);
    const seen = new Set();
    let nameSetHit = null;
    for (const tok of ptoks) {
      const cands = byName.get(tok);
      if (!cands) continue;
      for (const c of cands) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        if (!c.nameToks.every((x) => set.has(x))) continue;           // full name present
        if (c.setToks.length && !c.setToks.some((s) => set.has(s))) continue; // set overlap
        if (numInTitle(c.num)) return c.id;                           // name+set+number → exact
        if (!c.basic && !nameSetHit) nameSetHit = c.id;               // name+set fallback (not basics)
      }
    }
    return nameSetHit;
  };
}

const GRADE_ORDER = ["NM", "LP", "MP", "HP", "DMG"];

// Walk all stores, resolve their Magic singles to our cards, and write RetailerPrice
// rows. Bounded concurrency + per-store write so one slow/dead store can't stall it.
export async function importMagicStores(prisma, cards) {
  const resolve = buildMagicResolver(cards);
  const CONC = Math.max(1, Number(process.env.STORE_CONCURRENCY) || 6);
  const queue = [...RETAILERS];
  let done = 0, totalRows = 0;
  const summary = [];

  async function processStore([key, name, base, country]) {
    let handles = await discoverMagicCollections(base);
    if (!handles.length) handles = ["magic-the-gathering-singles", "mtg-singles", "magic-singles"];
    const products = [];
    const seenH = new Set();
    for (const h of handles.slice(0, 12)) {
      for (const p of await fetchCollection(base, h, country)) {
        if (seenH.has(p.handle)) continue;
        seenH.add(p.handle);
        products.push(p);
      }
    }
    if (!products.length) { summary.push(`${name} (${country}): 0`); return; }
    const currency = CUR[country];
    const rows = new Map(); // cardId|foil -> row
    for (const p of products) {
      const cardId = resolve(p.title);
      if (!cardId) continue;
      const isFoil = /\bfoil\b/i.test(p.title) && !/non[\s-]?foil/i.test(p.title);
      const priced = (p.variants || []).filter((v) => parseFloat(v.price) > 0);
      if (!priced.length) continue;
      const inStockG = {}, oosG = {};
      for (const v of priced) {
        const g = conditionBucket(v.title);
        const c = Math.round(parseFloat(v.price) * 100);
        const tgt = v.available ? inStockG : oosG;
        if (tgt[g] == null || c < tgt[g]) tgt[g] = c;
      }
      const inStock = Object.keys(inStockG).length > 0;
      const spectrum = inStock ? inStockG : oosG;
      const grade = GRADE_ORDER.find((g) => spectrum[g] != null) ?? null;
      const priceCents = grade ? spectrum[grade] : Math.min(...Object.values(spectrum));
      const k = `${cardId}|${isFoil ? 1 : 0}`;
      const prev = rows.get(k);
      if (prev) { if (prev.inStock && !inStock) continue; if (prev.inStock === inStock && prev.priceCents <= priceCents) continue; }
      rows.set(k, { cardId, retailer: key, retailerName: name, title: p.title, url: `${base}/products/${p.handle}`, condition: grade, conditionPrices: spectrum, isFoil, priceCents, currency, country, inStock });
    }
    if (rows.size) {
      const data = Array.from(rows.values());
      for (let i = 0; i < data.length; i += 5000) await prisma.retailerPrice.createMany({ data: data.slice(i, i + 5000), skipDuplicates: true });
      totalRows += data.length;
    }
    summary.push(`${name} (${country}): ${rows.size}`);
    console.log(`  [${++done}/${RETAILERS.length}] ${name} (${country}): ${products.length} products → ${rows.size} card deep-links`);
  }

  const workers = Array.from({ length: Math.min(CONC, queue.length) }, async () => {
    for (;;) { const s = queue.shift(); if (!s) return; try { await processStore(s); } catch (e) { console.warn(`  ${s[1]} failed: ${e.message}`); } }
  });
  await Promise.all(workers);
  console.log(`Store walk: ${totalRows} rows across ${RETAILERS.length} stores.`);
  return { totalRows, summary };
}
