// Reusable price-import engine. Pulls One Piece singles from AU Shopify stores'
// public products.json feeds, matches them to cards, and writes RetailerPrice
// rows + Card.lowestPriceCents. Called by scripts/import-prices.ts (CLI) and the
// scheduled /api/cron/refresh-prices route.

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { RETAILER_LIST, RetailerInfo } from "./retailers";
import { importSealed } from "./sealed-import";
import { refreshTcgplayerPrices } from "./tcgplayer";
import { marketGuideCents, type Country } from "./country";
import { characterOf } from "./op-characters";

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

// Word tokens for One Piece name/set matching. Strips only generic noise (condition,
// grading, rarity/finish words, "one piece/card/single", numbers) — NOT set-name words
// (e.g. "romance", "dawn"), since those are what disambiguate same-numbered cards.
const TOK_STOP = new Set([
  "one", "piece", "onepiece", "opcg", "op", "card", "cards", "single", "singles", "tcg",
  "the", "a", "an", "of", "and", "nm", "near", "mint", "lightly", "moderately", "heavily",
  "played", "lp", "mp", "hp", "dmg", "damaged", "foil", "non", "rare", "common", "uncommon",
  "promo", "full", "alt", "alternate", "art", "secret", "special", "leader", "parallel",
  "manga", "english", "japanese", "jpn", "eng", "graded", "psa", "bgs", "cgc", "genuine",
]);
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 1 && !TOK_STOP.has(w) && !/^\d+$/.test(w));
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
// a broad card-game collection mixes these in with singles, and they often carry a
// number-like token that the resolver would otherwise mis-assign to a real card (e.g.
// a "One Piece Premium Card Collection" box, a "Funko POP Luffy" figure). Phrases are
// specific so they don't reject real card names: "Aaron's Collection" survives (only
// "premium/figure/elite … collection" is rejected); "Tinkaton"-style names survive
// (\btin\b is word-bounded); "Battle VIP Pass" survives (only "battle deck" is rejected);
// singles from the real set "Premium Booster -The Best-" survive ("booster" alone is
// NOT rejected, only "booster box/pack/case" — a bare set-name mention isn't sealed).
export const NON_CARD =
  /\b(funko|pop!?\s*(?:vinyl|games)|plush|action\s*figure|portfolio|binder|sleeves?|toploaders?|top\s?loader|playmat|deck\s?box|card\s?case|storage\s*(?:box|case)|booster\s*(?:box|pack|case)|premium\s*collection|super[\s-]*premium|figure\s*collection|special\s*collection|collection\s*box|gift\s*(?:box|set)|\btin\b|\bbox\b|display|blister|battle\s*deck|theme\s*deck|starter\s*(?:deck|set)|precon|pin\s*(?:badge|collection)|keychain|key\s?ring|lanyard|poster|sticker|\bmug\b|mouse\s?pad)\b/i;

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

// Normalised condition bucket for the per-condition price spectrum shown on the card
// page. Unstated condition ≈ Near Mint (most stores' default). Stored on the row's
// `condition` field so the card page can show the cheapest price for each grade.
export type ConditionBucket = "NM" | "LP" | "MP" | "HP" | "DMG";
export function conditionBucket(variantTitle: string): ConditionBucket {
  const t = (variantTitle || "").toLowerCase();
  if (/damaged|\bdmg\b|\bdamage\b|\bpoor\b/.test(t)) return "DMG";
  if (/heav(ily)?\s*play|\bhp\b/.test(t)) return "HP";
  if (/moderate(ly)?\s*play|\bmp\b|\bgood\b/.test(t)) return "MP";
  if (/light(ly)?\s*play|\blp\b|\bplayed\b|\bexcellent\b|\bvery\s*good\b/.test(t)) return "LP";
  return "NM";
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

// Auto-discover a store's One Piece singles collections from its Shopify sitemap,
// so we only need the store's domain (handles vary wildly between stores). This is
// how an aggregator like Google captures every store without hard-coding URLs.
export async function discoverOnePieceCollections(base: string): Promise<string[]> {
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
      // Require a One Piece signal in the handle, and skip sealed/accessory
      // collections and image URLs. "singles" alone qualifies a One Piece-named store.
      if (/one[-_]?piece|\bopcg\b|(?:^|[-_])op(?:cg)?(?:[-_]|$)/i.test(h) && !NON_SINGLE.test(h) && !/\.(jpe?g|png|gif|webp|svg)$/i.test(h)) {
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
    // Skip eBay (verified live by its own import) and the non-buyable baseline rows
    // (market guide / TCGplayer / Cardmarket references aren't Shopify product pages).
    where: {
      inStock: true,
      NOT: [
        { retailer: { startsWith: "ebay" } },
        { retailer: { startsWith: "marketguide" } },
        { retailer: { startsWith: "tcgplayer" } },
        { retailer: { startsWith: "cardmarket" } },
      ],
    },
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

// eBay singles sourcing removed: OPCompare uses no eBay API at all. eBay
// remains a destination via plain EPN-tagged SEARCH links (lib/affiliate.ts),
// which need no API key and no daily quota.

// A card as needed for title→card matching.
export interface MatchCard { id: string; name: string; setName: string | null; collectorNumber: string }

// Build a One Piece title→cardId resolver over a set of cards. One Piece store titles
// reliably carry the collector number ("125/197") and the card name, and usually the
// set name ("Obsidian Flames"); the set CODE almost never appears. So we match on
// number + name, using the set name to disambiguate when several cards share a number
// (rare cross-set collisions on equal set sizes). Pure + exported so it's unit-tested.
export function buildCardResolver(cards: MatchCard[]): (title: string) => string | null {
  interface IdxCard { id: string; nameToks: string[]; setToks: string[]; setCode: string | null }
  const byKey = new Map<string, IdxCard[]>(); // "SETCODE-NUM", e.g. "OP01-25"
  const byNum = new Map<number, IdxCard[]>(); // NUM alone (no recognisable set code in the title)
  const byName = new Map<string, IdxCard[]>(); // primary name token
  const push = (m: Map<any, IdxCard[]>, k: any, v: IdxCard) => {
    const arr = m.get(k);
    if (arr) arr.push(v);
    else m.set(k, [v]);
  };
  // Our own collectorNumber is always "SETCODE-NUM" (e.g. "OP01-025", "P-001"),
  // never Pokémon's bare "num/total" — pull the set code and the number out of it.
  const cardNum = (cn: string): { num: number; setCode: string | null } | null => {
    const m = cn.match(/^([A-Za-z]+\d*)-(\d+)/);
    if (m) return { num: parseInt(m[2], 10), setCode: m[1].toUpperCase() };
    const m2 = cn.match(/(\d+)/);
    return m2 ? { num: parseInt(m2[1], 10), setCode: null } : null;
  };
  // Generic set-name words shared across many sets ("Starter Deck", "Booster Pack"…).
  // Excluded from set matching so a single common word can't link a listing to the
  // wrong set.
  const SET_GENERIC = new Set(["collection", "set", "series", "edition", "tcg", "starter", "booster", "deck"]);
  for (const c of cards) {
    const nameToks = tokenize(c.name);
    if (!nameToks.length) continue;
    const d = cardNum(c.collectorNumber);
    const ic: IdxCard = { id: c.id, nameToks, setToks: tokenize(c.setName || "").filter((s) => !SET_GENERIC.has(s)), setCode: d?.setCode ?? null };
    if (d) {
      if (d.setCode) push(byKey, `${d.setCode}-${d.num}`, ic);
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

    // 1) SETCODE-NUMBER in the listing title, e.g. "OP01-025", "OP01 025" — the most
    // precise signal a One Piece listing can carry, since the set code alone already
    // identifies the set (unlike Pokémon's bare n/total). Still never assign on the
    // number alone — the name must also appear in the title.
    const withSet = t.match(/\b((?:OP|EB|ST|PRB|P)\d{0,2})[\s-]+(\d{2,3})\b/i);
    if (withSet) {
      const setCode = withSet[1].toUpperCase();
      const num = parseInt(withSet[2], 10);
      const exact = byKey.get(`${setCode}-${num}`);
      if (exact && exact.length) {
        const hit = exact.find((c) => fullNameOk(c)) ?? exact.find((c) => nameOk(c));
        if (hit) return hit.id;
      }
    }

    // 2) a bare 2-3 digit card number with no recognisable set-code prefix: require
    // BOTH the set name and the full card name to line up before trusting it — a
    // standalone number is otherwise far too common across the catalogue to trust
    // alone (many different cards share a number across sets).
    const bareNum = t.match(/\b(\d{2,3})\b/);
    if (bareNum) {
      const num = parseInt(bareNum[1], 10);
      const same = byNum.get(num);
      if (same && same.length) {
        const hit =
          same.find((c) => setOk(c) && fullNameOk(c)) ??
          same.find((c) => setOk(c) && nameOk(c));
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
  const resolve = buildCardResolver(cards);
  const resolveCardId = (p: ShopifyProduct): string | null => resolve(p.title);

  const summary: ImportSummary = { stores: [], totalMatched: 0, totalUnmatched: 0, cardsPriced: 0 };

  // Stores are independent (different domains, different retailer keys), so walk
  // them with bounded concurrency instead of one at a time — the sequential walk
  // was the bulk of the ~80-minute run. Each store's own collection pages are
  // still fetched sequentially, so no single shop sees more load than before.
  const STORE_CONCURRENCY = Math.max(1, Number(process.env.STORE_CONCURRENCY) || 4);
  let storesDone = 0;
  let stoppedForBudget = false;

  async function processStore(store: RetailerInfo): Promise<void> {
    const cc = store.country ?? "AU";
    // Auto-discover the store's One Piece collections from its sitemap (authoritative).
    // Only fall back to handles configured in retailers.ts if discovery finds nothing,
    // and never scrape a non-One Piece (e.g. legacy "riftbound") handle.
    let handles = await discoverOnePieceCollections(store.base);
    if (!handles.length) handles = (store.collections ?? []).filter((h) => /one[-_]?piece|\bopcg\b|(?:^|[-_])op(?:cg)?(?:[-_]|$)/i.test(h));

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
      return;
    }

    await prisma.retailerPrice.deleteMany({ where: { retailer: store.key } });

    // ONE row per (card, finish) per store — with the per-grade prices captured in a
    // compact JSON map (conditionPrices) so the card page can show the whole
    // NM→DMG spectrum without exploding the row count (a row-per-grade approach blew
    // past the DB size limit). The row's headline price/condition = best available
    // grade, cheapest within it.
    const GRADE_ORDER = ["NM", "LP", "MP", "HP", "DMG"] as const;
    const rows = new Map<string, any>();
    const matchedCards = new Set<string>();
    let unmatched = 0;
    const currency = cc === "NZ" ? "NZD" : cc === "US" ? "USD" : cc === "GB" ? "GBP" : "AUD";
    for (const p of products) {
      const cardId = resolveCardId(p);
      if (!cardId) { unmatched++; continue; }
      matchedCards.add(cardId);
      const isFoil = /foil/i.test(p.title);
      const priced = p.variants.filter((v) => parseFloat(v.price) > 0);
      if (!priced.length) continue;
      // Cheapest price per grade, split by availability.
      const inStockGrades: Record<string, number> = {};
      const oosGrades: Record<string, number> = {};
      for (const v of priced) {
        const g = conditionBucket(v.title);
        const c = Math.round(parseFloat(v.price) * 100);
        const tgt = v.available ? inStockGrades : oosGrades;
        if (tgt[g] == null || c < tgt[g]) tgt[g] = c;
      }
      const inStock = Object.keys(inStockGrades).length > 0;
      const spectrum = inStock ? inStockGrades : oosGrades;
      const headlineGrade = GRADE_ORDER.find((g) => spectrum[g] != null) ?? null;
      const priceCents = headlineGrade ? spectrum[headlineGrade] : Math.min(...Object.values(spectrum));
      const key = `${cardId}|${isFoil ? 1 : 0}`;
      const prev = rows.get(key);
      // Keep the best listing per store+card+finish: in-stock beats OOS, then cheaper.
      if (prev) {
        if (prev.inStock && !inStock) continue;
        if (prev.inStock === inStock && prev.priceCents <= priceCents) continue;
      }
      rows.set(key, {
        cardId,
        retailer: store.key,
        retailerName: store.name,
        title: p.title,
        url: `${store.base}/products/${p.handle}`,
        condition: headlineGrade,
        conditionPrices: spectrum,
        isFoil,
        priceCents,
        currency,
        country: cc,
        inStock,
      });
    }
    const matched = matchedCards.size;
    await prisma.retailerPrice.createMany({ data: Array.from(rows.values()) });
    summary.stores.push({ name: store.name, products: products.length, priced: rows.size, matched, unmatched });
    summary.totalMatched += matched;
    summary.totalUnmatched += unmatched;
    console.log(`  [${++storesDone}/${RETAILER_LIST.length}] ${store.name} (${cc}): ${products.length} products → ${rows.size} priced, ${matched} matched`);
  }

  // Worker pool: STORE_CONCURRENCY stores in flight at once. Stops launching new
  // stores when the wall-clock budget is spent (in-flight ones finish) so the run
  // always reaches the lowest-price recompute. One store failing never kills the walk.
  {
    const queue = [...RETAILER_LIST];
    const workers = Array.from({ length: Math.min(STORE_CONCURRENCY, queue.length) }, async () => {
      for (;;) {
        if (budgetSpent()) {
          stoppedForBudget = true;
          return;
        }
        const store = queue.shift();
        if (!store) return;
        try {
          await processStore(store);
        } catch (e) {
          console.warn(`  ${store.name}: store walk failed — ${(e as Error).message}`);
          summary.stores.push({ name: store.name, products: 0, priced: 0, matched: 0, unmatched: 0 });
        }
      }
    });
    await Promise.all(workers);
  }
  if (stoppedForBudget) {
    console.log(`Budget reached during store walk — stopped after ${storesDone}/${RETAILER_LIST.length} stores.`);
  }
  console.log(`Store walk complete: ${summary.totalMatched} matched across ${RETAILER_LIST.length} stores (${Math.round((Date.now() - importStart) / 1000)}s).`);

  // Confirm each card's displayed (cheapest) price against the live product page,
  // since the collection feed can lag it.
  const corrected = await verifyCheapestListings();
  if (corrected) console.log(`Verified cheapest listings — corrected ${corrected} stale prices.`);

  // The One Piece catalogue (20k+ cards) is far larger than the daily Browse quota,
  // stalest cards — see its doc comment. Runs at most ONCE a day, NEVER on a deploy
  // get the "hot" slice of every market's budget.

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
  // The headline "from" price defaults to Lightly-Played-and-above (NM/LP) plus the
  // null-condition store baselines (TCGplayer / Cardmarket) — NOT a damaged copy.
  // The MARKET GUIDE ("marketguide_*") is deliberately EXCLUDED: it's a sales-based
  // estimate, not a buyable listing, so it must never become the cheapest/"from"
  // price. It's shown separately, clearly labelled with its source, on the card page.
  // The full per-condition spectrum is still shown on the card page.
  console.log("Recomputing per-market lowest prices…");
  const headlineWhere = (country: string) => ({
    inStock: true,
    country,
    NOT: { retailer: { startsWith: "marketguide" } },
    OR: [{ condition: { in: ["NM", "LP"] } }, { condition: null }],
  });
  const [pricedAu, pricedNz, pricedUs, pricedGb] = await Promise.all([
    prisma.retailerPrice.groupBy({ by: ["cardId"], where: headlineWhere("AU"), _min: { priceCents: true } }),
    prisma.retailerPrice.groupBy({ by: ["cardId"], where: headlineWhere("NZ"), _min: { priceCents: true } }),
    prisma.retailerPrice.groupBy({ by: ["cardId"], where: headlineWhere("US"), _min: { priceCents: true } }),
    prisma.retailerPrice.groupBy({ by: ["cardId"], where: headlineWhere("GB"), _min: { priceCents: true } }),
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

  // Per-card daily price history is deliberately NOT recorded: at catalogue x
  // market x day it grew without bound to serve features that only ever read a
  // two-day window. The derived values the site actually needs are precomputed
  // in place instead — fixed-width, overwritten every run, no row growth.
  try {
    await recomputeDerived();
  } catch (e) {
    console.warn("Derived precompute (hasLivePrice / deals) failed:", e);
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

// ---- Derived, precomputed values -------------------------------------------
// Two things every catalogue page needs that would otherwise be recomputed on
// every request:
//   1. Card.hasLivePrice — a denormalised OR of the four lowestPriceCents*
//      columns. One indexed boolean instead of a 4-column OR scan, and the
//      single source of truth for sitemap/browse indexability.
//   2. Deal rows — "cheapest live price vs the TCGplayer guide", ranked per
//      market. Bounded by DEALS_PER_MARKET per market and rewritten in place,
//      so unlike a history table this never grows with time.
const DEALS_PER_MARKET = 60;
const DEAL_MIN_PCT = 15; // below this it isn't a deal worth surfacing
const DEAL_MAX_PCT = 80; // above this it's almost always a mismatched listing

async function recomputeDerived(): Promise<void> {
  // 1) hasLivePrice — two bulk updateMany calls, no per-row work.
  const priced = {
    OR: [
      { lowestPriceCents: { not: null } },
      { lowestPriceCentsNz: { not: null } },
      { lowestPriceCentsUs: { not: null } },
      { lowestPriceCentsGb: { not: null } },
    ],
  };
  const [on, off] = await Promise.all([
    prisma.card.updateMany({ where: { ...priced, hasLivePrice: false }, data: { hasLivePrice: true } }),
    prisma.card.updateMany({ where: { NOT: priced, hasLivePrice: true }, data: { hasLivePrice: false } }),
  ]);
  console.log(`hasLivePrice: +${on.count} / -${off.count}.`);

  // 2) Deals per market, from the cards that have both a live price and a real
  //    TCGplayer guide to measure against.
  const cards = await prisma.card.findMany({
    where: { hasLivePrice: true, marketPriceSource: "TCGplayer", marketPriceCents: { gt: 0 } },
    select: {
      id: true, marketPriceCents: true,
      lowestPriceCents: true, lowestPriceCentsNz: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true,
    },
  });

  const MARKETS: { country: Country; pick: (c: (typeof cards)[number]) => number | null }[] = [
    { country: "AU", pick: (c) => c.lowestPriceCents },
    { country: "NZ", pick: (c) => c.lowestPriceCentsNz },
    { country: "US", pick: (c) => c.lowestPriceCentsUs },
    { country: "GB", pick: (c) => c.lowestPriceCentsGb },
  ];

  for (const { country, pick } of MARKETS) {
    const rows: { cardId: string; pct: number; priceCents: number; guideCents: number }[] = [];
    for (const c of cards) {
      const priceCents = pick(c);
      const guideCents = marketGuideCents(c.marketPriceCents, country);
      if (priceCents == null || guideCents == null || guideCents <= 0) continue;
      const pct = Math.round(((guideCents - priceCents) / guideCents) * 100);
      if (pct < DEAL_MIN_PCT || pct > DEAL_MAX_PCT) continue;
      rows.push({ cardId: c.id, pct, priceCents, guideCents });
    }
    rows.sort((a, b) => b.pct - a.pct);
    const top = rows.slice(0, DEALS_PER_MARKET);
    // Rewrite this market's block in place: delete + recreate inside one
    // transaction so a reader never sees a half-empty deals list.
    await prisma.$transaction([
      prisma.deal.deleteMany({ where: { country } }),
      prisma.deal.createMany({
        data: top.map((r, i) => ({ cardId: r.cardId, country, rank: i, pct: r.pct, priceCents: r.priceCents, guideCents: r.guideCents })),
      }),
    ]);
    console.log(`Deals ${country}: ${top.length} rows.`);
  }
}
