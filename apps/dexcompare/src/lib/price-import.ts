// Reusable price-import engine. Pulls Pokémon singles from AU Shopify stores'
// public products.json feeds, matches them to cards, and writes RetailerPrice
// rows + Card.lowestPriceCents. Called by scripts/import-prices.ts (CLI) and the
// scheduled /api/cron/refresh-prices route.

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { RETAILER_LIST, RetailerInfo } from "./retailers";
import { isEbayEnabled, isEbayRateLimited, searchEbayLowest, primeEbayBudget, ebaySpentThisRun } from "./ebay";
import { importSealed } from "./sealed-import";
import { refreshTcgplayerPrices } from "./tcgplayer";

export interface ShopifyVariant { title: string; price: string; available: boolean }
export interface ShopifyProduct { title: string; handle: string; variants: ShopifyVariant[] }

// Calendar day (date-only) in Australia/Sydney, used as the price-history x-axis
// bucket so there's exactly one snapshot per card per local day.
function sydneyDay(d = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(d);
  return new Date(`${ymd}T00:00:00.000Z`);
}

export interface ImportSummary {
  stores: { name: string; products: number; priced: number; matched: number; unmatched: number }[];
  totalMatched: number;
  totalUnmatched: number;
  cardsPriced: number;
}

const SET_FROM_TITLE: [RegExp, string][] = [
  [/proving\s*grounds|\bOGS\b/i, "OGS"],
  [/spirit\s*forged|\bSFD\b/i, "SFD"],
  [/unleashed|\bUNL\b/i, "UNL"],
  [/vendetta|vengeance|\bVEN\b/i, "VEN"],
  [/origins|\bOGN\b/i, "OGN"],
];

// Set/condition/qualifier tokens to strip when isolating the card name.
const STOP =
  /\b(riftbound|proving\s*grounds|spirit\s*forged|unleashed|vengeance|origins|showcase|signature|overnumbered|alternate\s*art|alt\s*art|foil|holo(foil)?|near mint|lightly played|moderately played|heavily played|damaged|main set|the game|tcg|single)\b/gi;

function numKey(seg: string): string {
  const m = seg.match(/^0*(\d+)([a-z]*)/i);
  const base = m ? m[1] + m[2].toLowerCase() : seg.toLowerCase();
  // A "*" marks a Signature print (e.g. "223*/221"), a DIFFERENT card from the
  // plain overnumbered "223/221" — keep their keys distinct so listings don't mix.
  return seg.includes("*") ? `${base}s` : base;
}
function nameKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function cleanProductName(title: string): string {
  return title
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(STOP, " ");
}

// Word tokens for Pokémon name/set matching. Strips only generic noise (condition,
// grading, rarity/finish words, "pokemon/card/single", numbers) — NOT set-name words
// (e.g. "obsidian", "flames"), since those are what disambiguate same-numbered cards.
const TOK_STOP = new Set([
  "pokemon", "pokémon", "card", "cards", "single", "singles", "tcg", "the", "a", "an",
  "of", "and", "nm", "near", "mint", "lightly", "moderately", "heavily", "played",
  "lp", "mp", "hp", "dmg", "damaged", "holo", "holofoil", "reverse", "foil", "non",
  "rare", "common", "uncommon", "promo", "full", "alt", "alternate", "art", "secret",
  "rainbow", "hyper", "amazing", "radiant", "english", "japanese", "jpn", "eng",
  "graded", "psa", "bgs", "cgc", "ace", "trainer", "gallery", "pkmn", "genuine",
]);
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 1 && !TOK_STOP.has(w) && !/^\d+$/.test(w));
}
// Parse a collector number from any store title format, e.g.:
//   "(299*/298)", "(053/219)", "OGN-128/298", "[OGN - 213/298]", "239*/221"
// Keys are normalised via numKey so "039" and "39" compare equal (the leading-zero
// bug that previously mis-assigned base cards to their alt-art printings).
function parseNumber(title: string): { setCode: string | null; key: string; total: string } | null {
  const pref = title.match(/\b([A-Za-z]{2,4})\s*-\s*(\d+)([a-z*]*)\s*\/\s*(\d+)/);
  if (pref) return { setCode: pref[1].toUpperCase(), key: numKey(pref[2] + pref[3]), total: pref[4] };
  const bare = title.match(/(\d+)([a-z*]*)\s*\/\s*(\d+)/);
  if (bare) return { setCode: null, key: numKey(bare[1] + bare[2]), total: bare[3] };
  return null;
}

// Multi-card listings (playsets, lots, bundles) carry a SET price, not a per-card
// price — matching them to a single card would record a wildly wrong number. Stores
// like Cherry Collectables list "PLAYSET (3) 3x Watchful Sentry - 096/298". Mirror
// the bundle/lot guard the eBay matcher uses (EXCLUDE in src/lib/ebay.ts), scoped to
// the multi-quantity signals that actually appear in store titles.
export const MULTI_CARD =
  /\b(playset|lot|lots|bundle|joblot|job lot|x\s*\d+|\d+\s*x|set of|complete set|full set|bulk)\b/i;

// NOT a single card: sealed products (boxes/packs/tins/collections/decks), accessories
// (sleeves/binders/toploaders/playmats), and merch (Funko/plush/figures). A broad
// "pokemon" collection mixes these in with singles, and they often carry a number-like
// token that the resolver would otherwise mis-assign to a real card (e.g. a "Darkrai V
// Star Premium Collection" box → the Darkrai card, a "Funko POP Espeon" → the Espeon
// card). Phrases are specific so they don't reject real card names: "Aaron's Collection"
// survives (only "premium/figure/elite … collection" is rejected); "Tinkaton" survives
// (\btin\b is word-bounded); "Battle VIP Pass" survives (only "battle deck" is rejected).
export const NON_CARD =
  /\b(funko|pop!?\s*(?:vinyl|games)|plush|action\s*figure|portfolio|binder|sleeves?|toploaders?|top\s?loader|playmat|deck\s?box|card\s?case|storage\s*(?:box|case)|booster|\betb\b|elite\s*trainer|premium\s*collection|super[\s-]*premium|figure\s*collection|special\s*collection|collection\s*box|gift\s*(?:box|set)|\btin\b|\bbox\b|display|blister|battle\s*deck|theme\s*deck|starter\s*(?:deck|set)|build[\s&-]*battle|precon|pin\s*(?:badge|collection)|keychain|key\s?ring|lanyard|poster|sticker|\bmug\b|mouse\s?pad|booster\s*pack)\b/i;

// A promo printing shares the base card's collector number, so a listing is only a
// promo when its title says so. These markers route a listing to the promo card and
// keep it out of the base card's price.
export const PROMO_HINT = /\bpromo\b|promotional|pre-?release|gg\s*ez|organi[sz]ed\s*play|nexus\s*night|judge\s*promo/i;
const PROMO_WORDS = /\b(promo|promotional|pre-?release|gg\s*ez|organi[sz]ed\s*play|nexus\s*night|judge)\b/gi;

// Many TCG stores list a card with condition variants (Near Mint, Lightly Played,
// …). Picking the absolute cheapest variant records a played/damaged copy's price,
// which is LOWER than the Near-Mint price shoppers see on the product page (a card
// showed $33 when the store's NM price was $45). Rank by condition so we record the
// best available condition — matching the headline price on the listing.
function conditionRank(variantTitle: string): number {
  const t = (variantTitle || "").toLowerCase();
  if (/near\s*mint|\bnm\b|mint/.test(t)) return 0;
  if (/light(ly)?\s*play|\blp\b/.test(t)) return 1;
  if (/moderate(ly)?\s*play|\bmp\b/.test(t)) return 2;
  if (/heav(ily)?\s*play|\bhp\b/.test(t)) return 3;
  if (/damaged|\bdmg\b|\bdamage\b/.test(t)) return 4;
  return 0; // no condition in the title (e.g. "Default Title") → treat as standard/NM
}

// Use a realistic browser User-Agent. Some stores (e.g. Mint Collectables) serve a
// stale/cached price to obvious bot UAs but the fresh price to browsers, which was a
// source of wrong prices.
const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

// Per-request timeout (ms). Node's fetch has NO default total timeout, so a store
// that accepts the connection but never responds would otherwise hang the whole
// 52-store import indefinitely (it once stalled a CI run until the 2h job cap).
// AbortSignal.timeout aborts the request — body read included — and the throw is
// caught at each call site, so one dead store is skipped instead of wedging the run.
const FETCH_TIMEOUT_MS = 20000;

// Wall-clock budget for the whole import. The store walk writes prices
// incrementally (per store), so if a later refinement phase (the per-card price
// confirmation, in particular) runs long, we stop refining once the budget is
// spent and still proceed to the lowest-price recompute + clean disconnect —
// rather than letting the script run until the workflow's 120-min job cap kills
// it mid-flight (which left no per-card "lowest price" computed). Override with
// IMPORT_BUDGET_MIN.
const BUDGET_MS = (Number(process.env.IMPORT_BUDGET_MIN) || 70) * 60 * 1000;
const importStart = Date.now();
const budgetSpent = () => Date.now() - importStart > BUDGET_MS;

async function fetchText(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

// Collection handles that are clearly NOT singles (sealed, accessories, etc.).
const NON_SINGLE = /sealed|booster|box|bundle|preorder|pre-order|accessor|playmat|sleeve|merch|deck-?box|gift|case|tin|blister|collection-box/i;

// Auto-discover a store's Pokémon singles collections from its Shopify sitemap,
// so we only need the store's domain (handles vary wildly between stores). This is
// how an aggregator like Google captures every store without hard-coding URLs.
export async function discoverPokémonCollections(base: string): Promise<string[]> {
  const handles = new Set<string>();
  const index = await fetchText(`${base}/sitemap.xml`);
  let sitemaps = index
    ? Array.from(index.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]).filter((u) => /sitemap_collections/i.test(u))
    : [];
  if (!sitemaps.length) sitemaps = [`${base}/sitemap_collections_1.xml`];

  for (const sm of sitemaps.slice(0, 8)) {
    const xml = await fetchText(sm);
    if (!xml) continue;
    for (const m of xml.matchAll(/\/collections\/([^<\/?#"]+)/g)) {
      const h = m[1];
      // Require a Pokémon signal in the handle, and skip sealed/accessory
      // collections and image URLs. "singles" alone qualifies a Pokémon-named store.
      if (/pok[eé]mon|pkmn/i.test(h) && !NON_SINGLE.test(h) && !/\.(jpe?g|png|gif|webp|svg)$/i.test(h)) {
        handles.add(h);
      }
    }
  }
  return Array.from(handles);
}

export async function fetchCollection(store: RetailerInfo, handle: string): Promise<ShopifyProduct[]> {
  const cc = store.country ?? "AU";
  const all: ShopifyProduct[] = [];
  for (let page = 1; page <= 20; page++) {
    // country=XX is CRITICAL: Shopify Markets serves a different price per visitor
    // country, and our (US) server was getting US/default prices — e.g. $33 when the
    // real AU price is $45. Forcing the store's market gives the local shopper price
    // (AUD for AU stores, NZD for NZ stores).
    const url = `${store.base}/collections/${handle}/products.json?limit=250&page=${page}&country=${cc}&_=${Date.now()}`;
    let data: { products: ShopifyProduct[] };
    try {
      const res = await fetch(url, {
        headers: { ...UA, "Cache-Control": "no-cache", Pragma: "no-cache" },
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) break;
      // Keep the body read inside the try so an abort/timeout mid-stream is caught
      // here (skip the store) rather than throwing out of the import.
      data = (await res.json()) as { products: ShopifyProduct[] };
    } catch {
      break;
    }
    if (!data.products?.length) break;
    all.push(...data.products);
    if (data.products.length < 250) break;
  }
  return all;
}

// Best-condition (then cheapest) price among a product's variants. NOTE: the
// individual /products/<handle>.json endpoint does NOT reliably report `available`
// (it's often null there), so this only derives the PRICE — availability is taken
// from the collection feed, which does report it correctly.
function bestVariantPrice(variants: ShopifyVariant[]): { priceCents: number } | null {
  const priced = variants.filter((v) => parseFloat(v.price) > 0);
  if (!priced.length) return null;
  const best = priced.reduce((a, b) => {
    const ra = conditionRank(a.title);
    const rb = conditionRank(b.title);
    if (ra !== rb) return ra < rb ? a : b;
    return parseFloat(a.price) <= parseFloat(b.price) ? a : b;
  });
  return { priceCents: Math.round(parseFloat(best.price) * 100) };
}

// Re-verify each card's CHEAPEST in-stock store listing against its authoritative
// product.json. The collection products.json feed we scrape can lag the live
// product page (a card showed $33 when the product page was $45), so we confirm the
// one price we actually display per card. Updates the row if it has drifted.
async function verifyCheapestListings(): Promise<number> {
  const rows = await prisma.retailerPrice.findMany({
    where: { inStock: true, NOT: { retailer: { startsWith: "ebay" } } },
    select: { id: true, cardId: true, priceCents: true, url: true, country: true },
    orderBy: { priceCents: "asc" },
  });
  // Cheapest in-stock listing per card PER MARKET (AU and NZ are verified separately).
  const cheapest = new Map<string, { id: string; cardId: string; priceCents: number; url: string; country: string }>();
  for (const r of rows) {
    const k = `${r.cardId}|${r.country}`;
    if (!cheapest.has(k)) cheapest.set(k, r);
  }
  // Confirming the WHOLE catalogue (~68k listings) took ~14h and corrected ~0.02%
  // of prices, because the collection feed is already country-priced (country=XX) —
  // the very drift this pass guarded against. So only re-confirm the cheapest
  // listing for the most-wanted cards (the ones users actually open), capped by
  // CONFIRM_CAP. The rest keep their feed price, which is already correct.
  const CONFIRM_CAP = Number(process.env.CONFIRM_CAP) || 1500;
  const demand = await prisma.card.findMany({
    orderBy: [{ searchCount: "desc" }, { viewCount: "desc" }],
    take: CONFIRM_CAP,
    select: { id: true },
  });
  const wanted = new Set(demand.map((c) => c.id));
  const targets = Array.from(cheapest.values()).filter((t) => wanted.has(t.cardId));

  // Fetch a product's authoritative price. Uses the CLEAN product.json URL (no
  // cache-bust query param — that returned a stale/blocked response from the runner;
  // the plain URL returns the live price) with a browser UA, and one retry. Uses a
  // short timeout: these single-product fetches are the slow part, and a laggy store
  // isn't worth waiting 20s for on a redundant check.
  async function fetchProductPrice(url: string, country: string): Promise<{ priceCents: number } | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${url}.json?country=${country}`, {
          headers: { ...UA, "Cache-Control": "no-cache", Pragma: "no-cache" },
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) continue;
        const data = (await res.json()) as { product?: { variants?: ShopifyVariant[] } };
        const variants = data.product?.variants;
        if (!variants?.length) return null;
        return bestVariantPrice(variants);
      } catch {
        /* retry */
      }
    }
    return null;
  }

  let corrected = 0;
  let checked = 0;
  const BATCH = 20;
  console.log(`  Confirming ${targets.length} cheapest listings (top ${CONFIRM_CAP} cards by demand) against live product pages…`);
  for (let i = 0; i < targets.length; i += BATCH) {
    // Stop refining (but keep what we've corrected so far) once the budget is
    // spent, so the import can still reach the lowest-price recompute.
    if (budgetSpent()) {
      console.log(`  Budget reached during confirmation — stopped after ${checked}/${targets.length} (corrected ${corrected}).`);
      break;
    }
    await Promise.all(
      targets.slice(i, i + BATCH).map(async (t) => {
        try {
          const v = await fetchProductPrice(t.url, t.country);
          if (!v) return;
          // Only correct the PRICE — never flip availability from this endpoint
          // (its `available` is unreliable). Guard against absurd values too.
          if (v.priceCents !== t.priceCents && v.priceCents > 0) {
            await prisma.retailerPrice.update({
              where: { id: t.id },
              data: { priceCents: v.priceCents },
            });
            corrected++;
          }
        } catch {
          /* leave the feed price as-is on any failure */
        }
      })
    );
    checked += BATCH;
    if (checked % 1500 < BATCH) console.log(`    confirmed ${Math.min(checked, targets.length)}/${targets.length}…`);
  }
  return corrected;
}

// Refresh eBay prices for the AU (AUD) and US (USD) markets. Returns the total rows
// written. Each market is buffered then atomically replaced, scoped by country, so a
// rate-limited (0-result) market keeps its existing rows and never wipes the other.
// Promos are matched by promo-wording in the listing title (they share base numbers).
export async function refreshEbayMarkets(
  cards: { id: string; name: string; setCode: string; collectorNumber: string; isPromo: boolean }[]
): Promise<number> {
  // Each market has its own retailer key so eBay AU + US rows for the same card never
  // collide on the unique [cardId, retailer, condition, isFoil] key.
  const MARKETS = [
    { country: "AU", marketplace: "EBAY_AU", currency: "AUD", retailer: "ebay" },
    { country: "US", marketplace: "EBAY_US", currency: "USD", retailer: "ebay_us" },
    { country: "GB", marketplace: "EBAY_GB", currency: "GBP", retailer: "ebay_uk" },
  ];
  // Check the live quota and set a spend budget (leaves a reserve) so this can never
  // exhaust eBay's 5,000/day limit, however many times the importer runs.
  await primeEbayBudget();
  let written = 0;
  for (const mkt of MARKETS) {
    if (isEbayRateLimited()) break;
    console.log(`eBay ${mkt.country}: searching ${cards.length} cards…`);
    const rows: Prisma.RetailerPriceCreateManyInput[] = [];
    for (const c of cards) {
      if (isEbayRateLimited()) break;
      const [rawNum, total] = c.collectorNumber.split("/");
      const r = await searchEbayLowest({
        name: c.name,
        setCode: c.setCode,
        number: rawNum.replace(/\*/g, ""),
        total: total ?? "",
        isSignature: c.collectorNumber.includes("*"),
        isPromo: c.isPromo,
        marketplace: mkt.marketplace,
      });
      if (!r) continue;
      rows.push({
        cardId: c.id,
        retailer: mkt.retailer,
        retailerName: "eBay",
        title: r.title,
        url: r.url,
        condition: r.condition ?? null,
        isFoil: /foil/i.test(r.title),
        priceCents: r.priceCents,
        shippingCents: r.shippingCents,
        currency: mkt.currency,
        country: mkt.country,
        inStock: true,
      });
    }
    if (rows.length > 0) {
      await prisma.retailerPrice.deleteMany({ where: { retailer: mkt.retailer } });
      await prisma.retailerPrice.createMany({ data: rows });
      written += rows.length;
    } else {
      console.warn(`eBay ${mkt.country}: 0 results (rate-limited?) — keeping existing rows.`);
    }
  }
  console.log(`eBay singles: spent ${ebaySpentThisRun()} Browse calls this run.`);
  return written;
}

// A card as needed for title→card matching.
export interface MatchCard { id: string; name: string; setName: string | null; collectorNumber: string }

// Build a Pokémon title→cardId resolver over a set of cards. Pokémon store titles
// reliably carry the collector number ("125/197") and the card name, and usually the
// set name ("Obsidian Flames"); the set CODE almost never appears. So we match on
// number + name, using the set name to disambiguate when several cards share a number
// (rare cross-set collisions on equal set sizes). Pure + exported so it's unit-tested.
export function buildPokemonResolver(cards: MatchCard[]): (title: string) => string | null {
  interface IdxCard { id: string; nameToks: string[]; setToks: string[] }
  const byKey = new Map<string, IdxCard[]>(); // "num/total"
  const byNum = new Map<number, IdxCard[]>(); // num
  const byName = new Map<string, IdxCard[]>(); // primary name token
  const push = (m: Map<any, IdxCard[]>, k: any, v: IdxCard) => {
    const arr = m.get(k);
    if (arr) arr.push(v);
    else m.set(k, [v]);
  };
  const cardNum = (cn: string): { num: number; total: number } | null => {
    const m = cn.match(/(\d+)\s*\/\s*(\d+)/);
    if (m) return { num: parseInt(m[1], 10), total: parseInt(m[2], 10) };
    const m2 = cn.match(/(\d+)/);
    return m2 ? { num: parseInt(m2[1], 10), total: 0 } : null;
  };
  // Generic set-name words shared across many sets ("Legendary Collection",
  // "Radiant Collection", "Classic Collection", "EX Deoxys"…). Excluded from set
  // matching so a single common word like "collection" or "ex" can't link a listing
  // to the wrong set (a Radiant Collection listing was matching Legendary Collection).
  const SET_GENERIC = new Set(["collection", "set", "ex", "gx", "series", "edition", "tcg"]);
  for (const c of cards) {
    const nameToks = tokenize(c.name);
    if (!nameToks.length) continue;
    const ic: IdxCard = { id: c.id, nameToks, setToks: tokenize(c.setName || "").filter((s) => !SET_GENERIC.has(s)) };
    const d = cardNum(c.collectorNumber);
    if (d) {
      if (d.total) push(byKey, `${d.num}/${d.total}`, ic);
      push(byNum, d.num, ic);
    }
    push(byName, nameToks[0], ic);
  }

  return function resolve(title: string): string | null {
    const t = title;
    // Never match a multi-card listing (playset/lot/bundle) to a single card — its
    // price is for the whole group, not one card.
    if (MULTI_CARD.test(t)) return null;
    // Never match a sealed product / accessory / merch item to a single card.
    if (NON_CARD.test(t)) return null;
    const ptoks = tokenize(t);
    if (!ptoks.length) return null;
    const ptokset = new Set(ptoks);
    const nameOk = (c: IdxCard) => ptokset.has(c.nameToks[0]);
    const fullNameOk = (c: IdxCard) => c.nameToks.every((x) => ptokset.has(x));
    const setOk = (c: IdxCard) => c.setToks.some((s) => ptokset.has(s));

    // Celebrations / Classic Collection reprints reuse the ORIGINAL card's number in
    // store titles (e.g. "Charizard 4/102 [Celebrations: Classic Collection]"), which
    // would otherwise match — and mis-price — the genuine vintage Base Set card. Route
    // such listings strictly to the reprint card by name + reprint set; if we don't
    // hold that reprint, don't match at all (never pollute the original).
    if (/classic collection|celebration/i.test(t)) {
      for (const tok of ptoks) {
        const cands = byName.get(tok);
        if (!cands) continue;
        const hit = cands.find((c) => fullNameOk(c) && /celebration|classic/.test(c.setToks.join(" ")));
        if (hit) return hit.id;
      }
      return null;
    }

    const m = t.match(/(\d+)\s*\/\s*(\d+)/);
    if (m) {
      const num = parseInt(m[1], 10);
      const total = parseInt(m[2], 10);
      // 1) exact number + set size: the most precise key — BUT the card name must also
      // appear in the title. Many different cards share a number across sets (e.g.
      // "N 96/108" vs "Salamence ex 96/108", "Tarountula 079/078" vs "Mewtwo VSTAR
      // 79/78"), so never assign on number alone — that recorded a wrong card's price.
      const exact = byKey.get(`${num}/${total}`);
      if (exact && exact.length) {
        const hit =
          exact.find((c) => setOk(c) && fullNameOk(c)) ??
          exact.find((c) => setOk(c) && nameOk(c)) ??
          exact.find(fullNameOk) ??
          exact.find(nameOk);
        if (hit) return hit.id;
      }
      // 2) same number (set size differs/omitted): require the name to line up, and
      // prefer the set-name match to avoid grabbing a same-numbered card elsewhere.
      const same = byNum.get(num);
      if (same && same.length) {
        const hit =
          same.find((c) => setOk(c) && fullNameOk(c)) ??
          same.find((c) => setOk(c) && nameOk(c)) ??
          same.find(fullNameOk);
        if (hit) return hit.id;
      }
    }

    // 3) no usable number on the listing → match by full name + set name.
    for (const tok of ptoks) {
      const cands = byName.get(tok);
      if (!cands) continue;
      const hit = cands.find((c) => fullNameOk(c) && setOk(c));
      if (hit) return hit.id;
    }
    return null;
  };
}

export async function importPrices(): Promise<ImportSummary> {
  const cards = await prisma.card.findMany({
    select: { id: true, name: true, setName: true, collectorNumber: true },
  });
  const resolve = buildPokemonResolver(cards);
  const resolveCardId = (p: ShopifyProduct): string | null => resolve(p.title);

  const summary: ImportSummary = { stores: [], totalMatched: 0, totalUnmatched: 0, cardsPriced: 0 };

  for (const store of RETAILER_LIST) {
    // If the walk itself overruns the budget, stop opening new stores and move on
    // to the recompute so the markets scraped so far still get lowest-prices set.
    if (budgetSpent()) {
      console.log(`Budget reached during store walk — stopped after ${summary.stores.length}/${RETAILER_LIST.length} stores.`);
      break;
    }
    const cc = store.country ?? "AU";
    // Auto-discover the store's Pokémon collections from its sitemap (authoritative).
    // Only fall back to handles configured in retailers.ts if discovery finds nothing,
    // and never scrape a non-Pokémon (e.g. legacy "riftbound") handle.
    let handles = await discoverPokémonCollections(store.base);
    if (!handles.length) handles = (store.collections ?? []).filter((h) => /pok[eé]mon|pkmn/i.test(h));

    const products: ShopifyProduct[] = [];
    const seen = new Set<string>();
    for (const handle of handles) {
      for (const p of await fetchCollection(store, handle)) {
        if (seen.has(p.handle)) continue; // de-dup across overlapping collections
        seen.add(p.handle);
        products.push(p);
      }
    }
    if (!products.length) {
      summary.stores.push({ name: store.name, products: 0, priced: 0, matched: 0, unmatched: 0 });
      continue;
    }

    await prisma.retailerPrice.deleteMany({ where: { retailer: store.key } });

    const rows = new Map<string, any>();
    let matched = 0;
    let unmatched = 0;
    for (const p of products) {
      const cardId = resolveCardId(p);
      if (!cardId) { unmatched++; continue; }
      matched++;
      // Prefer in-stock variants. If none are available but the store still LISTS
      // the card with a price, record it as out-of-stock so the card page can show
      // "Store had it — currently sold out" (useful demand/availability signal).
      const priced = p.variants.filter((v) => parseFloat(v.price) > 0);
      if (!priced.length) continue;
      const avail = priced.filter((v) => v.available);
      const inStock = avail.length > 0;
      const pool = inStock ? avail : priced;
      // Best available CONDITION first (NM over LP over …), then cheapest within that
      // condition — so the price matches the listing's headline, not a played copy.
      const best = pool.reduce((a, b) => {
        const ra = conditionRank(a.title);
        const rb = conditionRank(b.title);
        if (ra !== rb) return ra < rb ? a : b;
        return parseFloat(a.price) <= parseFloat(b.price) ? a : b;
      });
      const priceCents = Math.round(parseFloat(best.price) * 100);
      const prev = rows.get(cardId);
      // Keep the best listing per store+card: in-stock beats out-of-stock, then
      // cheaper beats dearer.
      if (prev) {
        if (prev.inStock && !inStock) continue;
        if (prev.inStock === inStock && prev.priceCents <= priceCents) continue;
      }
      rows.set(cardId, {
        cardId,
        retailer: store.key,
        retailerName: store.name,
        title: p.title,
        url: `${store.base}/products/${p.handle}`,
        condition: best.title && best.title !== "Default Title" ? best.title : null,
        isFoil: /foil/i.test(p.title),
        priceCents,
        currency: cc === "NZ" ? "NZD" : cc === "US" ? "USD" : cc === "GB" ? "GBP" : "AUD",
        country: cc,
        inStock,
      });
    }
    await prisma.retailerPrice.createMany({ data: Array.from(rows.values()) });
    summary.stores.push({ name: store.name, products: products.length, priced: rows.size, matched, unmatched });
    summary.totalMatched += matched;
    summary.totalUnmatched += unmatched;
    console.log(`  [${summary.stores.length}/${RETAILER_LIST.length}] ${store.name} (${cc}): ${products.length} products → ${rows.size} priced, ${matched} matched`);
  }
  console.log(`Store walk complete: ${summary.totalMatched} matched across ${RETAILER_LIST.length} stores (${Math.round((Date.now() - importStart) / 1000)}s).`);

  // Confirm each card's displayed (cheapest) price against the live product page,
  // since the collection feed can lag it.
  const corrected = await verifyCheapestListings();
  if (corrected) console.log(`Verified cheapest listings — corrected ${corrected} stale prices.`);

  // ---- eBay AU + US (optional; only when EBAY_CLIENT_ID/SECRET are set) ---------
  // eBay covers EVERY card per market, but only ONCE a day, and NEVER on a deploy
  // (push). AU (AUD) + US (USD) ≈ 2×~1k calls, under eBay's ~5,000/day Browse limit.
  // NZ is store-only (no eBay). Cards are ordered by search demand so the most-wanted
  // are covered first if the quota is ever hit.
  //  - ebayDue:     last eBay refresh was > 20h ago (so it runs ~once a day).
  //  - ebayAllowed: the workflow sets EBAY_REFRESH=false for push/deploy runs.
  const lastEbay = await prisma.retailerPrice.findFirst({
    where: { retailer: { startsWith: "ebay" } },
    orderBy: { lastSeen: "desc" },
    select: { lastSeen: true },
  });
  const ebayDue = !lastEbay || Date.now() - lastEbay.lastSeen.getTime() > 20 * 60 * 60 * 1000;
  const ebayAllowed = process.env.EBAY_REFRESH !== "false";
  if (isEbayEnabled() && ebayDue && ebayAllowed) {
    const ebayCards = await prisma.card.findMany({
      orderBy: [
        { searchCount: "desc" },
        { viewCount: "desc" },
        { lowestPriceCents: { sort: "desc", nulls: "last" } },
      ],
      select: { id: true, name: true, setCode: true, collectorNumber: true, isPromo: true },
    });
    const n = await refreshEbayMarkets(ebayCards);
    summary.stores.push({ name: "eBay (AU+US)", products: ebayCards.length, priced: n, matched: n, unmatched: 0 });
  }

  // ---- TCGplayer (US market price) ---------------------------------------------
  // TCGplayer is the dominant US marketplace. We add its MARKET price (not the
  // lowest listing, which is often a different-language card) as a US source.
  // Isolated so a TCGplayer hiccup never fails the rest of the import.
  if (budgetSpent()) {
    console.log("Budget spent — skipping TCGplayer refresh, going straight to lowest-price recompute.");
  } else {
    try {
      console.log("Refreshing TCGplayer (US) market prices…");
      const n = await refreshTcgplayerPrices();
      if (n > 0) summary.stores.push({ name: "TCGplayer (US)", products: n, priced: n, matched: n, unmatched: 0 });
    } catch (e) {
      console.warn("TCGplayer import failed:", e);
    }
  }

  // Recompute each card's lowest live price PER MARKET from IN-STOCK listings only,
  // so the catalogue "from" price never reflects a sold-out listing. (Out-of-stock
  // rows still exist and are shown on the card page, just not used for the headline.)
  //   lowestPriceCents   = cheapest in-stock AU listing (AUD)
  //   lowestPriceCentsNz = cheapest in-stock NZ listing (NZD)
  //   lowestPriceCentsUs = cheapest in-stock US listing (USD)
  //   lowestPriceCentsGb = cheapest in-stock UK listing (GBP)
  console.log("Recomputing per-market lowest prices…");
  const [pricedAu, pricedNz, pricedUs, pricedGb] = await Promise.all([
    prisma.retailerPrice.groupBy({ by: ["cardId"], where: { inStock: true, country: "AU" }, _min: { priceCents: true } }),
    prisma.retailerPrice.groupBy({ by: ["cardId"], where: { inStock: true, country: "NZ" }, _min: { priceCents: true } }),
    prisma.retailerPrice.groupBy({ by: ["cardId"], where: { inStock: true, country: "US" }, _min: { priceCents: true } }),
    prisma.retailerPrice.groupBy({ by: ["cardId"], where: { inStock: true, country: "GB" }, _min: { priceCents: true } }),
  ]);
  const lowAu = new Map(pricedAu.map((r) => [r.cardId, r._min.priceCents ?? null]));
  const lowNz = new Map(pricedNz.map((r) => [r.cardId, r._min.priceCents ?? null]));
  const lowUs = new Map(pricedUs.map((r) => [r.cardId, r._min.priceCents ?? null]));
  const lowGb = new Map(pricedGb.map((r) => [r.cardId, r._min.priceCents ?? null]));
  // Diff-based update: write each card STRAIGHT to its new lowest only when it
  // changed. We must NOT reset every card to null first (the old approach) — that
  // briefly showed "No price yet" for the whole catalogue on every import/deploy
  // while the per-card repopulation loop caught up. Now each card transitions
  // old → new atomically and is never transiently null.
  const existing = await prisma.card.findMany({
    select: { id: true, lowestPriceCents: true, lowestPriceCentsNz: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true },
  });
  // Only the rows whose lowest actually moved. On the FIRST import this can be the
  // whole catalogue (AU goes null → price for tens of thousands of cards), so run
  // the updates with bounded concurrency instead of one-at-a-time — ~20k sequential
  // round-trips to Neon was a multi-minute (sometimes stalling) phase.
  const toUpdate = existing
    .map((c) => ({
      id: c.id,
      nAu: lowAu.get(c.id) ?? null,
      nNz: lowNz.get(c.id) ?? null,
      nUs: lowUs.get(c.id) ?? null,
      nGb: lowGb.get(c.id) ?? null,
      cur: c,
    }))
    .filter((r) => r.nAu !== r.cur.lowestPriceCents || r.nNz !== r.cur.lowestPriceCentsNz || r.nUs !== r.cur.lowestPriceCentsUs || r.nGb !== r.cur.lowestPriceCentsGb);
  let changed = 0;
  const UPD = 8;
  for (let i = 0; i < toUpdate.length; i += UPD) {
    await Promise.all(
      toUpdate.slice(i, i + UPD).map((r) =>
        prisma.card.update({
          where: { id: r.id },
          data: { lowestPriceCents: r.nAu, lowestPriceCentsNz: r.nNz, lowestPriceCentsUs: r.nUs, lowestPriceCentsGb: r.nGb },
        })
      )
    );
    changed += Math.min(UPD, toUpdate.length - i);
    if (changed % 5000 < UPD) console.log(`    updated ${changed}/${toUpdate.length} card lowest-prices…`);
  }
  console.log(`Lowest recompute: ${changed} cards changed (no null-reset window).`);
  summary.cardsPriced = lowAu.size;

  // Snapshot today's lowest price per card for the price-over-time chart. Backend
  // only for now (no UI) — we want a week+ of history before releasing it. One
  // point per card per Sydney day; a same-day re-run (e.g. a deploy) replaces it.
  try {
    const day = sydneyDay();
    // AU-only for now (the chart is unreleased; AU is the primary market).
    const points = pricedAu
      .filter((r) => r._min.priceCents != null)
      .map((r) => ({ cardId: r.cardId, day, lowestPriceCents: r._min.priceCents as number }));
    await prisma.priceHistory.deleteMany({ where: { day } });
    if (points.length > 0) {
      await prisma.priceHistory.createMany({ data: points });
    }
    console.log(`Price history: recorded ${points.length} points for ${day.toISOString().slice(0, 10)}.`);
  } catch (e) {
    console.warn("Price-history snapshot failed:", e);
  }

  // Also refresh sealed / non-single products (booster boxes, packs, …). Isolated
  // in try/catch so a hiccup here never fails the singles import.
  try {
    const n = await importSealed();
    console.log(`Sealed products: ${n} listings.`);
  } catch (e) {
    console.warn("Sealed import failed:", e);
  }

  return summary;
}
