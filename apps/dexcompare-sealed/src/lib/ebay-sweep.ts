// The catalogue sweep: eBay listings for (nearly) EVERY product the site lists, inside the daily call budget.
//
// One search per product costs one Browse call per (marketplace, product): ~12,000 keys against ~2,500 calls a day, so
// most products never had listings of their own. The sweep turns that round: it pages through a handful of BROAD searches
// per marketplace ("Pokemon tin", "Pokemon elite trainer box", …) 200 listings a call, runs every listing through the
// repo's own classifier (sealed-title.ts identify(), the one the store import files products with), and hands it to the
// product it IS. One call can feed dozens of products; a marketplace's whole sealed catalogue on eBay is a few hundred calls.
//
// PURE apart from the injected page fetcher: the importer (ebay-import.ts) supplies the fetch (reserved, retried and
// circuit-broken like every other search) and writes the feeds; tests/ run it with fakes.
//
// Matching (matchListing):
//   • a SET product (booster box, ETB, bundle…, and a UPC with a canonical key): the listing's group key IS the product's;
//   • a collection, tin, blister or deck: same type; the sets do not disagree (either may be unnamed); every identifying word
//     of the product is in the listing; and any OTHER word of the listing names no product of that type anywhere in the
//     catalogue (seller filler like "fast" or "nib" is fine, "super" or "mini" or another Pokémon is not: that listing is a
//     different product). The most specific product wins; a tie between two products is refused.
//   • the listing is ONE unit (no lots, no "x2"), not pre-sale / dented / opened (SEALED_NOISE), not used, and at or over the
//     type's price floor.
import { MAX_SEARCH_DEPTH, type SearchSpec } from "./ebay-api";
import { feedReference, type FeedItem, type MarketplaceId } from "./ebay-context";
import { baseItem, EBAY_NOISE, groupParts, lowestPriceFirst, sealedIdentity, typeFloor } from "./ebay-normalise";
import type { PlanRow } from "./ebay-store";
import { identify, isIdentity, normalizeTitle, TYPE_BY_KEY, TYPE_BY_LABEL, type TypeKey } from "./sealed-title";
import { MARKET_WEIGHT, MARKETPLACE_OF_REGION } from "./ebay-context";
import type { Region } from "./regions";
import { SETS } from "./sets";

/** Listings per sweep call (the Browse API's maximum). */
export const SWEEP_PAGE = 200;
/** Listings kept per product feed (the product strip shows 6; one spare). */
export const SWEEP_KEEP = 8;
/** A product with fewer accepted listings than this still "gains" from a page (the paging keeps going while pages gain). */
export const GAIN_TARGET = 6;
/** A query stops after this many pages in a row that gained nothing (after its first SWEEP_MIN_PAGES pages). */
export const DRY_PAGES = 2;
export const SWEEP_MIN_PAGES = 2;

export interface SweepQuery {
  key: string;
  /** Without "Pokemon": the sweep prefixes it. */
  q: string;
  /** The product types this query is FOR (its price floor is the lowest of theirs). Any type it finds is still matched. */
  types: readonly TypeKey[];
}

/**
 * The broad searches, per marketplace. Each word is required (eBay ANDs the keywords); the classifier sorts out the rest.
 * Measured 2026-10-11 (scripts/ebay-sweep-probe.ts, 60 calls): a bare "collection" or "deck" is mostly loose-card lots
 * (800,000 US results, ~12 products gained a page), so collections and decks are searched by the words their products use.
 * Every query pages only while it keeps finding listings for products that need them (sweepMarketplace).
 */
export const SWEEP_QUERIES: readonly SweepQuery[] = [
  { key: "etb", q: "elite trainer box", types: ["etb", "pc-etb", "etb-case"] },
  { key: "box", q: "booster box", types: ["booster-box", "booster-box-case"] },
  { key: "tin", q: "tin", types: ["tin"] },
  { key: "premium", q: "premium collection", types: ["collection", "upc"] },
  { key: "blister", q: "blister", types: ["blister"] },
  { key: "bundle", q: "booster bundle", types: ["booster-bundle", "booster-bundle-case"] },
  { key: "special", q: "special collection", types: ["collection"] },
  { key: "colbox", q: "collection box", types: ["collection", "upc"] },
  { key: "build", q: "build battle", types: ["build-battle", "build-battle-stadium"] },
  { key: "checklane", q: "checklane", types: ["blister"] },
  { key: "pack", q: "booster pack", types: ["booster-pack", "sleeved-booster", "blister"] },
  { key: "illustration", q: "illustration collection", types: ["collection"] },
  { key: "poster", q: "poster collection", types: ["collection"] },
  { key: "pin", q: "pin collection", types: ["collection"] },
  { key: "figure", q: "figure collection", types: ["collection"] },
  { key: "battledeck", q: "battle deck", types: ["deck"] },
  { key: "themedeck", q: "theme deck", types: ["deck"] },
];

// ─── The product index ─────────────────────────────────────────────────────────

export interface SweepProduct {
  productId: string;
  name: string;
  type: TypeKey;
  groupKey: string;
  /** set code, or "-" */
  set: string;
  /** Token signatures that identify it: its stored group key's, and its NAME re-read by today's classifier (the stored key may be older). */
  sigs: string[][];
}

export interface SweepIndex {
  marketplace: MarketplaceId;
  products: SweepProduct[];
  /** exact group key → product (set products, canonical UPCs, and every product's stored key) */
  byKey: Map<string, SweepProduct>;
  /** collections, tins, blisters, decks (and non-canonical UPCs) by type */
  byType: Map<TypeKey, SweepProduct[]>;
  /** per type: every word that identifies SOME product of that type, in any marketplace */
  vocab: Map<TypeKey, Set<string>>;
  /** type|signature → the set codes ("-" for none) products with that signature are sold under, catalogue-wide */
  sigSets: Map<string, Set<string>>;
}

/** Format words an older stored key may carry that today's classifier reads as the type itself. */
const DROPPABLE = new Set(["triple", "3pk", "3pack", "set", "base"]);

const typeOfLabel = (label: string): TypeKey | undefined => TYPE_BY_LABEL.get(label)?.key;
const marketplaceOfMarket = (market: string): MarketplaceId | undefined => MARKETPLACE_OF_REGION[market.toLowerCase() as Region];

function signatures(groupKey: string, name: string, type: TypeKey): { set: string; sigs: string[][] } | null {
  const own = groupParts(groupKey);
  if (!own) return null;
  const sigs: string[][] = [own.tokens];
  let set = own.set;
  // The stored key was made by the classifier of its day; the name re-read today gives the words a listing will be read into.
  // It may only DROP a format word ("Triple Blister" read as a plain blister): a re-read that loses a year ("Mewtwo EX Tin 2012")
  // or any other word would match a different product, so it is not used.
  const again = identify(name, { strict: false });
  if (isIdentity(again) && again.type === type) {
    const p = groupParts(again.groupKey);
    if (p && (p.set === set || p.set === "-" || set === "-")) {
      const dropped = own.tokens.filter((w) => !p.tokens.includes(w));
      const added = p.tokens.filter((w) => !own.tokens.includes(w));
      if (dropped.every((w) => DROPPABLE.has(w)) && added.length === 0) {
        if (set === "-") set = p.set;
        if (dropped.length) sigs.push(p.tokens);
      }
    }
  }
  return { set, sigs: sigs.filter((s) => s.length > 0) };
}

/** Every word that names some product of a type, across the WHOLE catalogue (every marketplace): what a listing's extra word may not be. */
export function sweepVocabulary(rows: readonly PlanRow[]): Map<TypeKey, Set<string>> {
  const vocab = new Map<TypeKey, Set<string>>();
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.productId)) continue;
    seen.add(r.productId);
    const type = typeOfLabel(r.typeLabel);
    if (!type || TYPE_BY_KEY.get(type)!.kind === "set") continue;
    const s = signatures(r.groupKey, r.name, type);
    if (!s) continue;
    const v = vocab.get(type) ?? new Set<string>();
    for (const sig of s.sigs) for (const w of sig) if (!EBAY_NOISE.has(w)) v.add(w);
    vocab.set(type, v);
  }
  return vocab;
}

const sigKey = (type: TypeKey, sig: readonly string[]) => `${type}|${[...sig].sort().join("-")}`;

/**
 * Every set code (or "-") each product signature is sold under, across the WHOLE catalogue: a listing that does not name a set may
 * take a product that does only when no other set (or no unnamed product) shares the signature ("Ultra Ball Tin" exists for
 * Pokémon GO and for several years: an unnamed listing is none of them in particular).
 */
export function sweepSignatureSets(rows: readonly PlanRow[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.productId)) continue;
    seen.add(r.productId);
    const type = typeOfLabel(r.typeLabel);
    if (!type || TYPE_BY_KEY.get(type)!.kind === "set") continue;
    const s = signatures(r.groupKey, r.name, type);
    if (!s) continue;
    for (const sig of s.sigs) {
      const k = sigKey(type, sig);
      const v = out.get(k) ?? new Set<string>();
      v.add(s.set);
      out.set(k, v);
    }
  }
  return out;
}

/** The products listed in a marketplace's regions (a ProductStat row in AU or NZ makes an EBAY_AU product). */
export function buildSweepIndex(rows: readonly PlanRow[], marketplace: MarketplaceId, vocab: Map<TypeKey, Set<string>>, sigSets: Map<string, Set<string>> = sweepSignatureSets(rows)): SweepIndex {
  const byKey = new Map<string, SweepProduct>();
  const byType = new Map<TypeKey, SweepProduct[]>();
  const products: SweepProduct[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (marketplaceOfMarket(r.market) !== marketplace || seen.has(r.productId)) continue;
    const type = typeOfLabel(r.typeLabel);
    if (!type) continue;
    seen.add(r.productId);
    const kind = TYPE_BY_KEY.get(type)!.kind;
    if (kind === "set" || r.groupKey.startsWith("upc|")) {
      const p: SweepProduct = { productId: r.productId, name: r.name, type, groupKey: r.groupKey, set: "-", sigs: [] };
      products.push(p);
      byKey.set(r.groupKey, p);
      continue;
    }
    const s = signatures(r.groupKey, r.name, type);
    if (!s || !s.sigs.length) continue; // a product with no identifying word cannot be told apart on eBay
    const p: SweepProduct = { productId: r.productId, name: r.name, type, groupKey: r.groupKey, set: s.set, sigs: s.sigs };
    products.push(p);
    byKey.set(r.groupKey, p);
    const list = byType.get(type) ?? [];
    list.push(p);
    byType.set(type, list);
  }
  return { marketplace, products, byKey, byType, vocab, sigSets };
}

// ─── Matching ──────────────────────────────────────────────────────────────────

/**
 * Listings the sweep never hands to a product, on top of what identify() and SEALED_NOISE refuse (tested on the accent-folded
 * title): Japanese product naming ("Pokemon Card Game MEGA Expansion Pack … Box", "Premium Trainer Box"), several units
 * ("Mini Tins (10-Pack)", "Full Set", "All 3", "Lot"), part of a product ("Missing Promo", "Coin Only", "No Packs"), a variant
 * left to chance ("One Variation Chosen At Random", "Assorted") and damage notes.
 */
const SWEEP_REJECT = new RegExp(
  [
    "\\bexpansion\\s+pack\\b|\\bhigh\\s+class\\s+pack\\b|\\bconstructed\\s+(?:deck|starter)\\b|\\bpokemon\\s+card(?:\\s+game)?\\s*[:\\-]?\\s*(?:mega|scarlet|sword|sun|xy|151)\\b|\\bpremium\\s+trainer\\s+box\\b",
    "\\btins\\b[^()]{0,40}\\(\\s*\\d+\\s*-?\\s*(?:pack|pk)s?\\s*\\)|\\b(?:full|complete|whole)\\s+set\\b|\\ball\\s+(?:[2-9]|three|four|five|six|eight|nine|ten)\\b|\\b(?:set|bundle|lot)\\s+of\\b|\\blots?\\b",
    "\\b(?:missing|without|w/o|removed|incomplete|partial|contents)\\b|\\b(?:coins?|promos?|cards?|pins?|tin|box|packs?|figure|jumbo|oversized?)\\s+only\\b|\\bno\\s+(?:packs?|boosters?|promos?|cards?|coins?)\\b",
    "\\brandom\\b|\\bassorted\\b|\\bvariation\\b|\\bchosen\\b|\\bvarious\\b|\\bstyles?\\s+may\\s+vary\\b|\\bmystery\\b",
    "\\bdamage[ds]?\\b|\\bcrushed\\b|\\btorn\\b|\\bresealed\\b|\\bunsealed\\b|\\bempty\\b",
  ].join("|"),
  "i",
);

// Words a listing may carry beyond its product's own without becoming another product: seller filler, promo-card finishes,
// shipping talk, abbreviations of the product line, and the words of set names (the set is already compared by its code).
// Never the words that tell products apart (KEEP_SHORT in sealed-title.ts) or a Pokémon a set happens to be named after.
const FILLER = new Set(
  (
    "coin coins holo holos cosmos foil foils promo promos card cards express post posted postage delivery hand ships ship shipping " +
    "fast available fresh tracked mint condition perfect great excellent boxed packaging " +
    "brand authentic genuine official uk usa us au aus canada eu eur gb english eng tcg ccg sealed new"
  ).split(" "),
);
const NEVER_FILLER = new Set(["ex", "v", "gx", "mega", "mini", "super", "vmax", "vstar", "pikachu", "arceus", "mew", "mewtwo", "charizard", "eevee", "go"]);
const fold = (t: string) => normalizeTitle(t).toLowerCase();
const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Every specific set's name, longest first ("Prismatic Evolutions" before "Evolutions").
const SET_NAMES = SETS.filter((x) => !x.generic)
  .map((x) => fold(x.name))
  .sort((a, b) => b.length - a.length);
const SET_NAME_RE = new RegExp(`\\b(?:${SET_NAMES.map(escapeRe).join("|")})\\b`, "g");

/** The words of every set a title names in full ("Black Bolt White Flare" → black, bolt, white, flare): filler for THAT listing only. */
export function setWordsIn(title: string): Set<string> {
  const out = new Set<string>();
  for (const m of fold(title).matchAll(SET_NAME_RE)) for (const w of m[0].split(/[^a-z0-9]+/)) if (w && !NEVER_FILLER.has(w)) out.add(w);
  return out;
}

/** May a listing carry this word beyond its product's words? (`setWords`: the words of the sets this listing names.) */
export const isFiller = (w: string, setWords: ReadonlySet<string> = new Set()) => !NEVER_FILLER.has(w) && (EBAY_NOISE.has(w) || FILLER.has(w) || setWords.has(w));

// A booster pack product is ONE pack: "5 Booster Packs", "Booster Pack x10", "(10 Packs)", "Packs" are lots of it.
const SEVERAL_PACKS = /\b(?:[2-9]|[1-9]\d)\s*(?:x\s*)?(?:sleeved\s+)?(?:booster\s+)?packs?\b|\(\s*\d+\s*packs?\s*\)|\bpacks\b|\bx\s*\d+\b|\b\d+\s*x\b/i;
// A box or ETB "Case Fresh" is one box from a case, not the case.
const CASE_FRESH = /\bcase[\s-]*fresh\b|\bfresh\s+(?:from|out\s+of)\s+(?:a\s+)?case\b|\bfrom\s+(?:an?\s+)?(?:sealed\s+)?case\b/i;
const CASE_TYPES = new Set<TypeKey>(["booster-box-case", "etb-case", "booster-bundle-case"]);

export type MatchMiss = "rejected" | "no-product" | "ambiguous";

/** The product a listing title IS, in this marketplace's index, or why not. */
export function matchListing(title: string, index: SweepIndex): { product: SweepProduct } | { miss: MatchMiss } {
  if (SWEEP_REJECT.test(fold(title))) return { miss: "rejected" };
  const id = sealedIdentity(title, false);
  if (!id) return { miss: "rejected" };
  if ((id.type === "booster-pack" || id.type === "sleeved-booster") && SEVERAL_PACKS.test(fold(title))) return { miss: "rejected" };
  if (CASE_TYPES.has(id.type) && CASE_FRESH.test(fold(title))) return { miss: "rejected" };
  const exact = index.byKey.get(id.groupKey);
  if (exact) return { product: exact };
  const kind = TYPE_BY_KEY.get(id.type)?.kind;
  if (kind === "set" || id.groupKey.startsWith("upc|")) return { miss: "no-product" };
  const parts = groupParts(id.groupKey);
  if (!parts) return { miss: "no-product" };
  const have = new Set(parts.tokens);
  const vocab = index.vocab.get(id.type) ?? new Set<string>();
  const setWords = setWordsIn(title);
  let best: SweepProduct | null = null;
  let bestScore = -1;
  let tie = false;
  for (const p of index.byType.get(id.type) ?? []) {
    // A listing that names a set is only that set's product. One that names none may take a product that has a set only when no other
    // set (and no unnamed product) shares the product's words.
    if (parts.set !== "-" && p.set !== parts.set) continue;
    let score = -1;
    for (const sig of p.sigs) {
      if (!sig.every((w) => have.has(w))) continue;
      if (parts.set === "-" && p.set !== "-" && (index.sigSets.get(sigKey(id.type, sig))?.size ?? 1) > 1) continue;
      const own = new Set(sig);
      // Every other word of the listing must name nothing: a word that identifies another product of this type makes it that product.
      if ([...have].some((w) => !own.has(w) && vocab.has(w) && !isFiller(w, setWords))) continue;
      score = Math.max(score, sig.length);
    }
    if (score < 0) continue;
    if (score > bestScore) {
      best = p;
      bestScore = score;
      tie = false;
    } else if (score === bestScore && best && best.productId !== p.productId) tie = true;
  }
  if (!best) return { miss: "no-product" };
  if (tie) return { miss: "ambiguous" };
  return { product: best };
}

/** eBay conditions that are not a sealed product in its wrapper. */
const NOT_NEW = /\b(?:used|pre-?owned|open(?:ed)?\s*box|new\s*other|like\s*new|very\s*good|good|acceptable|refurb\w*|neuwertig|sonstige|gebraucht|occasion|usato|usado|gebruikt|for\s*parts)\b/i;

// ─── The collector ─────────────────────────────────────────────────────────────

export interface SweepStats {
  pages: number;
  listings: number;
  valid: number;
  matched: number;
  /** why the valid ones did not match */
  miss: Record<MatchMiss | "floor" | "condition", number>;
}

export const emptyStats = (): SweepStats => ({ pages: 0, listings: 0, valid: 0, matched: 0, miss: { rejected: 0, "no-product": 0, ambiguous: 0, floor: 0, condition: 0 } });

export class SweepCollector {
  readonly stats = emptyStats();
  private readonly got = new Map<string, Map<string, FeedItem>>();
  constructor(
    readonly index: SweepIndex,
    private readonly now: number,
    /** diagnostics only (the probe): called for every valid listing with what happened to it */
    private readonly onListing?: (title: string, outcome: { product: SweepProduct } | { miss: MatchMiss | "floor" | "condition" }) => void,
  ) {}

  /** One page of raw itemSummaries. Returns how many listings it GAINED (accepted for a product that had fewer than GAIN_TARGET). */
  addPage(raw: readonly unknown[]): number {
    const mp = this.index.marketplace;
    this.stats.pages++;
    let gain = 0;
    for (const r of raw) {
      this.stats.listings++;
      const it = baseItem(r, mp, this.now, "item");
      if (!it) continue;
      this.stats.valid++;
      const m = matchListing(it.title, this.index);
      if ("miss" in m) {
        this.stats.miss[m.miss]++;
        this.onListing?.(it.title, m);
        continue;
      }
      if (it.condition && NOT_NEW.test(it.condition)) {
        this.stats.miss.condition++;
        this.onListing?.(it.title, { miss: "condition" });
        continue;
      }
      if (Number(it.price.value) < typeFloor(m.product.type, mp)) {
        this.stats.miss.floor++;
        this.onListing?.(it.title, { miss: "floor" });
        continue;
      }
      this.onListing?.(it.title, m);
      const mine = this.got.get(m.product.productId) ?? new Map<string, FeedItem>();
      if (mine.has(it.id)) continue;
      if (mine.size < GAIN_TARGET) gain++;
      mine.set(it.id, it);
      this.got.set(m.product.productId, mine);
      this.stats.matched++;
    }
    return gain;
  }

  /** Each product's feed: its listings, de-duplicated by id and photo, LOWEST PRICE FIRST, at most SWEEP_KEEP. */
  feeds(): Map<string, FeedItem[]> {
    const out = new Map<string, FeedItem[]>();
    for (const [productId, items] of this.got) out.set(productId, lowestPriceFirst([...items.values()], SWEEP_KEEP));
    return out;
  }
}

// ─── Paging ────────────────────────────────────────────────────────────────────

/** A query's search spec at an offset, for one marketplace: "Pokemon <q>", 200 a page, the lowest price floor of its types. */
export function sweepSpec(q: SweepQuery, marketplace: MarketplaceId, offset: number): SearchSpec {
  const floor = Math.min(...q.types.map((t) => typeFloor(t, marketplace)));
  return { q: `Pokemon ${q.q}`, marketplace, limit: SWEEP_PAGE, minPrice: floor, ref: feedReference(marketplace, "item"), offset };
}

export interface QueryProgress {
  key: string;
  pages: number;
  total: number | null;
  gained: number;
  stopped: "end" | "dry" | "depth" | "budget" | "error" | null;
}

export type FetchPage = (spec: SearchSpec) => Promise<{ items: unknown[]; total: number | null }>;

/**
 * Page every query of a marketplace, round-robin (page 1 of each, then page 2 of each that is still gaining…), until the
 * marketplace's budget is spent or every query has run dry, reached the end of its results or eBay's 10,000-deep limit.
 * Each query is paged in order (its next page needs the last one's answer); up to `concurrency` queries are in flight at once.
 * `fetchPage` makes the (reserved) call; an exception it throws ends that query ("error") and, when `isFatal` says so (or there is
 * no `isFatal`), the sweep; `shouldStop()` true (the run is over: a 429, the cap, the breaker) ends every query before its next page.
 */
export async function sweepMarketplace(
  collector: SweepCollector,
  budget: number,
  fetchPage: FetchPage,
  opts: { concurrency: number; queries?: readonly SweepQuery[]; shouldStop?: () => boolean; isFatal?: (e: unknown) => boolean },
): Promise<QueryProgress[]> {
  const queries = opts.queries ?? SWEEP_QUERIES;
  const mp = collector.index.marketplace;
  const progress: QueryProgress[] = queries.map((q) => ({ key: q.key, pages: 0, total: null, gained: 0, stopped: null }));
  let left = Math.max(0, Math.floor(budget));
  const dry = queries.map(() => 0);
  // Round-robin by "fewest pages so far": the next free query with the fewest pages goes next.
  const busy = new Set<number>();
  let fatal = false; // set by the first fatal error: the other workers take no further page
  const pickNext = (): number | null => {
    let best: number | null = null;
    for (let i = 0; i < queries.length; i++) {
      if (busy.has(i) || progress[i].stopped) continue;
      if (best == null || progress[i].pages < progress[best].pages) best = i;
    }
    return best;
  };
  async function worker(): Promise<void> {
    for (;;) {
      if (fatal || opts.shouldStop?.()) return;
      const i = pickNext();
      if (i == null) return;
      const p = progress[i];
      if (left <= 0) {
        p.stopped = "budget";
        continue;
      }
      const offset = p.pages * SWEEP_PAGE;
      if (offset + SWEEP_PAGE > MAX_SEARCH_DEPTH) {
        p.stopped = "depth";
        continue;
      }
      left--;
      busy.add(i);
      let page: { items: unknown[]; total: number | null };
      try {
        page = await fetchPage(sweepSpec(queries[i], mp, offset));
      } catch (e) {
        busy.delete(i);
        p.stopped = "error"; // this query ends; a fatal error (the run is over) ends them all
        if (!opts.isFatal || opts.isFatal(e)) {
          fatal = true;
          throw e;
        }
        continue;
      }
      busy.delete(i);
      p.pages++;
      if (page.total != null) p.total = page.total;
      const gain = collector.addPage(page.items);
      p.gained += gain;
      dry[i] = gain > 0 ? 0 : dry[i] + 1;
      const end = page.items.length < SWEEP_PAGE || (p.total != null && (p.pages * SWEEP_PAGE >= p.total));
      if (end) p.stopped = "end";
      else if (p.pages >= SWEEP_MIN_PAGES && dry[i] >= DRY_PAGES) p.stopped = "dry";
    }
  }
  const n = Math.max(1, Math.min(opts.concurrency, queries.length));
  const results = await Promise.allSettled(Array.from({ length: n }, () => worker()));
  const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed) throw failed.reason;
  for (const p of progress) if (!p.stopped) p.stopped = left <= 0 ? "budget" : "end";
  return progress;
}

/**
 * How a sweep budget is shared between marketplaces: by how many products each lists × its audience weight (MARKET_WEIGHT: the US
 * first), with a floor so a small one still gets a few pages.
 */
export function marketplaceShares(indexes: readonly SweepIndex[], budget: number, minShare = 0.08): Map<MarketplaceId, number> {
  const w = (x: SweepIndex) => x.products.length * MARKET_WEIGHT[x.marketplace];
  const total = indexes.reduce((a, x) => a + w(x), 0);
  const out = new Map<MarketplaceId, number>();
  if (!total || budget <= 0) {
    for (const x of indexes) out.set(x.marketplace, 0);
    return out;
  }
  const raw = indexes.map((x) => Math.max(minShare, w(x) / total));
  const sum = raw.reduce((a, b) => a + b, 0);
  indexes.forEach((x, i) => out.set(x.marketplace, Math.floor((budget * raw[i]) / sum)));
  return out;
}
