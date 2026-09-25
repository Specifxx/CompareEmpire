// Store title → Pokémon sealed product identity.
//
// Every price on the site passes through identify(). It answers three questions
// about a store's product title, in order, and refuses rather than guesses:
//
//   1. Is this English Pokémon SEALED product? (not a single, a graded slab, an
//      accessory, another game, another language, or a store-made bundle)
//   2. What type of product is it? (booster box, ETB, tin, …)
//   3. Which product is it, across stores? (the groupKey)
//
// Wrongly merging two products is worse than failing to merge them: a merge
// puts a $30 tin's price on a $150 collection's page as its "cheapest". So
// identity is strict. Set products ("Surging Sparks Elite Trainer Box") are
// identified by set + type and dropped when the set can't be read. Everything
// else (collections, tins, blisters, decks) is identified by type + set + the
// distinctive words in its title (usually the featured Pokémon), so two stores'
// different wordings merge and two different tins never do.
//
// Pure module (no DB, no fetch) so it is unit-tested directly
// (tests/sealed-title.test.ts) and shared by the importer and the store probe.
import { SETS, type PokemonSet } from "./sets";

// ── product types ────────────────────────────────────────────────────────────

export type TypeKey =
  | "booster-box"
  | "booster-box-case"
  | "etb"
  | "pc-etb"
  | "etb-case"
  | "booster-bundle"
  | "booster-bundle-case"
  | "build-battle"
  | "build-battle-stadium"
  | "sleeved-booster"
  | "booster-pack"
  | "upc"
  | "collection"
  | "tin"
  | "blister"
  | "deck";

export interface ProductTypeInfo {
  key: TypeKey;
  label: string; // singular, as it reads in a product name
  plural: string; // for headings and category pages
  slug: string; // URL segment for /<region>/type/<slug>
  // "set": one product per set (identity = set + type).
  // "multi": several products per set (identity also needs the title's words).
  kind: "set" | "multi";
  // Lowest believable price, in US cents, converted per market (FLOOR_FX). A
  // listing below it is a $1 deposit variant, a single card or a mis-listing.
  floorUsdCents: number;
}

export const PRODUCT_TYPES: ProductTypeInfo[] = [
  { key: "booster-box", label: "Booster Box", plural: "Booster Boxes", slug: "booster-boxes", kind: "set", floorUsdCents: 7000 },
  { key: "etb", label: "Elite Trainer Box", plural: "Elite Trainer Boxes", slug: "elite-trainer-boxes", kind: "set", floorUsdCents: 2500 },
  { key: "pc-etb", label: "Pokémon Center Elite Trainer Box", plural: "Pokémon Center Elite Trainer Boxes", slug: "pokemon-center-elite-trainer-boxes", kind: "set", floorUsdCents: 4000 },
  { key: "booster-bundle", label: "Booster Bundle", plural: "Booster Bundles", slug: "booster-bundles", kind: "set", floorUsdCents: 1500 },
  { key: "upc", label: "Ultra-Premium Collection", plural: "Ultra-Premium Collections", slug: "ultra-premium-collections", kind: "multi", floorUsdCents: 5000 },
  { key: "collection", label: "Collection", plural: "Collections & Boxes", slug: "collections", kind: "multi", floorUsdCents: 800 },
  { key: "tin", label: "Tin", plural: "Tins", slug: "tins", kind: "multi", floorUsdCents: 400 },
  { key: "build-battle", label: "Build & Battle Box", plural: "Build & Battle Boxes", slug: "build-and-battle-boxes", kind: "set", floorUsdCents: 1000 },
  { key: "build-battle-stadium", label: "Build & Battle Stadium", plural: "Build & Battle Stadiums", slug: "build-and-battle-stadiums", kind: "set", floorUsdCents: 3000 },
  { key: "blister", label: "Blister", plural: "Blister Packs", slug: "blisters", kind: "multi", floorUsdCents: 500 },
  { key: "sleeved-booster", label: "Sleeved Booster", plural: "Sleeved Boosters", slug: "sleeved-boosters", kind: "set", floorUsdCents: 300 },
  { key: "booster-pack", label: "Booster Pack", plural: "Booster Packs", slug: "booster-packs", kind: "set", floorUsdCents: 250 },
  { key: "deck", label: "Deck", plural: "Decks", slug: "decks", kind: "multi", floorUsdCents: 500 },
  { key: "booster-box-case", label: "Booster Box Case", plural: "Booster Box Cases", slug: "booster-box-cases", kind: "set", floorUsdCents: 40000 },
  { key: "etb-case", label: "Elite Trainer Box Case", plural: "Elite Trainer Box Cases", slug: "elite-trainer-box-cases", kind: "set", floorUsdCents: 20000 },
  { key: "booster-bundle-case", label: "Booster Bundle Case", plural: "Booster Bundle Cases", slug: "booster-bundle-cases", kind: "set", floorUsdCents: 8000 },
];

export const TYPE_BY_KEY = new Map(PRODUCT_TYPES.map((t) => [t.key, t]));
export const TYPE_BY_SLUG = new Map(PRODUCT_TYPES.map((t) => [t.slug, t]));
export const TYPE_BY_LABEL = new Map(PRODUCT_TYPES.map((t) => [t.label, t]));

/** Display order: the order PRODUCT_TYPES is written in (chase products first). */
export function typeRank(label: string): number {
  const i = PRODUCT_TYPES.findIndex((t) => t.label === label);
  return i < 0 ? 99 : i;
}

// Rough units-per-USD, used ONLY to scale the per-type price floors into each
// market's currency. Never used to show a price: every price on the site is
// the store's own, in the store's own currency.
const FLOOR_FX: Record<string, number> = { AU: 1.5, NZ: 1.65, US: 1, UK: 0.78, CA: 1.37, EU: 0.9, SG: 1.3 };

export function floorCents(type: TypeKey, market: string): number {
  const t = TYPE_BY_KEY.get(type);
  if (!t) return 0;
  return Math.round(t.floorUsdCents * (FLOOR_FX[market] ?? 1));
}

// ── normalisation ────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", ndash: "–", mdash: "—", eacute: "é", rsquo: "’", lsquo: "‘" };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

/** Lowercase-insensitive working form: entities decoded, accents folded, dashes and brackets spaced. */
export function normalizeTitle(title: string): string {
  return decodeEntities(title)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // é → e (Pokémon → Pokemon)
    .replace(/[‐-―]/g, " - ")
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ── gates ────────────────────────────────────────────────────────────────────

const POKEMON_WORD = /\bpokemon\b|\bpkmn\b|\bptcg\b/i;

// Other games' sealed product, misfiled in a store's Pokémon collection.
const OTHER_GAME =
  /\b(one\s*piece|lorcana|magic\s*the\s*gathering|\bmtg\b|yu-?gi-?oh|digimon|dragon\s*ball|flesh\s*(?:and|&)\s*blood|star\s*wars|weiss\s*schwarz|union\s*arena|gundam|riftbound|league\s*of\s*legends|sorcery|metazoo|grand\s*archive|battle\s*spirits|cardfight|vanguard|final\s*fantasy|disney|marvel|dc\s*comics|naruto|hololive|shadowverse|altered|topps|panini|nba|nfl|ufc|wwe)\b/i;

// Not English. CJK script anywhere, a language word, or a bracketed language
// code ("(JP)", "[DE]"). Bare two-letter codes are only trusted in brackets or
// after a dash at the end — "IT" and "ES" are also English words.
const FOREIGN =
  /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0e00-\u0e7f]|\b(japanese|japan|jpn|korean|kor|chinese|chn|chs|cht|simplified|traditional|mandarin|cantonese|jp|kr|cn|thai|indonesian|german|deutsch|deutsche|french|francais|italian|italiano|spanish|espanol|portuguese|portugues|dutch|nederlands|polish|polski|asia|asian)\b|[([](?:jp|jpn|kr|kor|cn|sc|tc|th|id|de|ger|fr|fra|it|ita|es|spa|pt|nl|pl)[)\]]|\s-\s*(?:jp|jpn|kr|cn|de|fr|it|es|pt|nl|pl)\s*$/i;

// Singles, slabs and anything that isn't a factory-sealed product.
const NOT_SEALED =
  /\b\d{1,3}[a-z]?\s*\/\s*\d{2,3}\b|\b[a-z]{1,4}\d{1,3}\s*\/\s*[a-z]{0,4}\d{2,3}\b|\b(?:ultra|secret|holo|illustration|hyper|double|shiny|amazing|radiant)\s*rare\b|\breverse\s*holo\b|\bfull\s*art\b|\b(psa|cgc|bgs|beckett|ace\s*grading|tag\s*grading|graded|slab|slabbed)\b|\bgem\s*mint\b|\bsingles\b|\bsingle\s*cards?\b|\bnear\s*mint\b|\blightly\s*played\b|\b(nm|lp|mp|hp)\b(?!\s*-?\s*\d)|\bopened\b|\bempty\b|\bbox\s*only\b|\bcase\s*only\b|\bwrappers?\b|\bdamaged\b|\bdented\b|\bcrushed\b|\bimperfect\b|\bresealed\b|\brepack(?:ed|s)?\b|\bmystery\b|\blucky\s*(?:dip|bag|box)\b|\bgrab\s*bag\b|\bcustom\b|\bproxy\b|\blive\s*break\b|\bbreaks?\b|\brip\s*(?:&|and)\s*ship\b|\b\d+\s*-?\s*cards?\s*(?:box|lot|hit|pack|bundle)\b|\bvalue\s*(?:lot|box|pack)\b|\bhit\s*pack\b|\bpound\s*of\b|\bmoonshot\b|\bgod\s*pack\b|\bcodes?\b|\bptcgl\b|\bptcgo\b|\bonline\b|\bdigital\b/i;

// Accessories and merchandise. Hard exclusions: a title naming one of these is
// never the sealed product itself ("Elite Trainer Box Sleeves" is sleeves).
const ACCESSORY =
  /\bsleeves\b|\bdeck\s*shields?\b|\bdeck\s*(?:box|case|protectors?)\b|\bcard\s*(?:case|holder|protectors?|saver)\b|\btop\s*-?\s*loaders?\b|\bplay\s*-?\s*mats?\b|\bportfolio\b|\balbums?\b|\bstorage\b|\bacrylic\b|\bprotectors?\b|\bmagnetic\b|\buv\s*(?:case|protection|resistant)\b|\bdisplay\s*(?:stand|frame)\b|\bcarry(?:ing)?\s*case\b|\bdice\b|\bdamage\s*counters?\b|\bplush(?:ie)?s?\b|\bfunko\b|\blego\b|\bmega\s*construx\b|\bkeychains?\b|\blanyards?\b|\bbackpacks?\b|\bt-?\s*shirts?\b|\bhoodie\b|\bmug\b|\bpuzzle\b|\bnintendo\b|\bswitch\b|\bvideo\s*game\b|\bstickers?\s*(?:book|sheet|pack)\b|\bbooster\s*box\s*protector\b/i;
// "Binder" is an accessory unless it's the sealed Binder Collection.
const BINDER = /\bbinder\b/i;

// Store-made multiples ("3x Elite Trainer Box", "Booster Pack x5", "set of 4",
// "combo"): priced for several units, so never comparable with one.
const MULTIPLE =
  /^\s*[2-9]\d?\s*x\b|\bx\s*[2-9]\d?\s*\)?\s*$|[([]\s*[2-9]\d?\s*x\s*[)\]]|[([]\s*x\s*[2-9]\d?\s*[)\]]|\bset\s*of\s*[2-9]|\blots?\s*of\b|\bbundle\s*deal\b|\bcombo\b|\bbulk\b|\bjob\s*lot\b|\bart\s*(?:bundle|set)\b/i;

// ── set detection ────────────────────────────────────────────────────────────

interface SetMatcher {
  set: PokemonSet;
  re: RegExp;
  len: number;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nameRe(name: string): string {
  return escapeRe(normalizeTitle(name))
    .replace(/&/g, "(?:&|and)")
    .replace(/'/g, "'?")
    .replace(/\s+/g, "[\\s:\\-]*");
}

const GENERIC_TAIL =
  "(?=(?:\\s*(?:me|sv|swsh|sm)\\s*-?\\s*0?1\\b)?\\s*(?:[:|-]\\s*)?(?:base\\b|booster|elite|etb|trainer|build|sleeved|blister|checklane|two|three|\\d\\s*-?\\s*pack|packs?\\b|display|bundle|case|premium|collection|tin|mini|ultra|\\(|\\[|$))";

let MATCHERS: { specific: SetMatcher[]; generic: SetMatcher[] } | null = null;

function matchers() {
  if (MATCHERS) return MATCHERS;
  const specific: SetMatcher[] = [];
  const generic: SetMatcher[] = [];
  for (const set of SETS) {
    // A series-named set only counts when nothing but a product word follows
    // it: "Mega Evolution Elite Trainer Box" is the Mega Evolution set, but
    // "Mega Evolution: Pitch Black Booster Box" is Pitch Black — and if Pitch
    // Black weren't in SETS yet, it must come out as "no set", never as the
    // series' first set.
    const tail = set.generic ? GENERIC_TAIL : "";
    const sources = [`\\b${nameRe(set.name)}\\b${tail}`, ...(set.aliases ?? [])];
    const re = new RegExp(sources.map((s) => `(?:${s})`).join("|"), "i");
    (set.generic ? generic : specific).push({ set, re, len: set.name.length });
  }
  // Longest name first, so "Prismatic Evolutions" beats "Evolutions".
  specific.sort((a, b) => b.len - a.len);
  MATCHERS = { specific, generic };
  return MATCHERS;
}

/**
 * The set a title names, or null. Series-named sets ("Scarlet & Violet") are
 * only returned when no other set matches, because every set in a series is
 * sold as "Scarlet & Violet—<set>".
 */
export function detectSet(title: string): PokemonSet | null {
  const t = normalizeTitle(title);
  const m = matchers();
  for (const s of m.specific) if (s.re.test(t)) return s.set;
  for (const s of m.generic) if (s.re.test(t)) return s.set;
  return null;
}

// ── classification ───────────────────────────────────────────────────────────

/** The product type a title describes, or null when it isn't one we compare. */
export function classify(title: string): TypeKey | null {
  const t = normalizeTitle(title).toLowerCase();
  const etb = /elite\s*trainer\s*box(?:es)?|\betbs?\b|\btrainer\s*box\b/.test(t);
  const bundle = /booster\s*bundle/.test(t);
  const box = /booster\s*(?:box|display)|display\s*box|\b36\s*(?:booster\s*)?packs?\b/.test(t);
  const caseWord = /\bcase\b|\bcases\b/.test(t);

  // Wholesale displays of small products (10 tins, 24 sleeved packs, …). Real
  // products, but priced per display, and rarely stocked by more than one store.
  if (/\b(?:sleeved|blister|tin|tins|build\s*(?:&|and|n)?\s*battle|collection|checklane)\b[^|]*\b(?:display|case)\b/.test(t) && !etb && !bundle && !/booster\s*box/.test(t)) {
    return null;
  }

  // Half boxes and "enhanced" displays are different pack counts from the
  // set's real booster box, so they can't share its price.
  if (/\bhalf\s*(?:booster\s*)?(?:box|display)\b|\benhanced\s*(?:booster\s*)?(?:box|display)\b/.test(t)) return null;

  if (caseWord) {
    if (etb) return "etb-case";
    if (bundle) return "booster-bundle-case";
    if (box || /\bdisplay\b|booster\s*case/.test(t)) return "booster-box-case";
    return null;
  }
  if (etb) return /pokemon\s*center|\bpc\b/.test(t) ? "pc-etb" : "etb";
  if (box) return "booster-box";
  if (bundle) return "booster-bundle";
  if (/build\s*(?:&|and|n)?\s*battle\s*stadium/.test(t)) return "build-battle-stadium";
  if (/build\s*(?:&|and|n)?\s*battle|pre-?release\s*(?:kit|box|pack)/.test(t)) return "build-battle";
  if (/ultra\s*-?\s*premium/.test(t)) return "upc";
  if (/\bmini\s*tins?\b|\btins?\b/.test(t)) return "tin";
  // "Tech Sticker Blister Collection" is the Tech Sticker Collection, sold in a
  // blister: the product's own name wins over its packaging.
  if (/\bcollections?\b/.test(t)) return "collection";
  // "Sleeved Blister" is a sleeved booster on a blister card, not a 3-pack.
  if (/\bsleeved\b/.test(t)) return "sleeved-booster";
  if (/\bblisters?\b|\bcheck\s*-?\s*lane\b|\b[23]\s*-?\s*(?:booster\s*)?packs?\b|\b(?:two|three)\s*-?\s*(?:booster\s*)?packs?\b/.test(t)) return "blister";
  if (/battle\s*deck|league\s*battle|theme\s*deck|starter\s*deck|trainer\s*kit|battle\s*academy|world\s*championships?\s*deck|\bdecks?\b/.test(t)) return "deck";
  if (
    /\bcollections?\b|\bex\s*box\b|\bv\s*box\b|\bvmax\s*box\b|\bvstar\s*box\b|\bgx\s*box\b|premium\s*box|special\s*box|surprise\s*box|\bcalendar\b|trainer'?s\s*toolkit|gift\s*box|\bchest\b/.test(
      t,
    )
  ) {
    return "collection";
  }
  if (/booster\s*packs?|\bboosters?\b|\bpacks?\b/.test(t)) return "booster-pack";
  // Any other named box ("Morpeko V Union Box", "Paldea Box", "Let's Play
  // Box") is a collection-style product.
  if (/\bbox(?:es)?\b|\bbox\s*sets?\b/.test(t)) return "collection";
  // A bare display ("Surging Sparks Display") is a booster box.
  if (/\bdisplay\b/.test(t)) return "booster-box";
  return null;
}

// ── identity ─────────────────────────────────────────────────────────────────

// Words that say nothing about WHICH product a title is. Removed before the
// remaining words become the identity of a collection, tin, blister or deck.
const NOISE = new Set(
  (
    "pokemon pkmn ptcg tcg trading card cards game games the a an of and with w for to on by from english eng en " +
    "sealed new brand box boxes official product products pre order preorder preorders presale release released releases date " +
    "dated in stock instock limited edition series sv swsh sm xy me promo promos exclusive au us uk nz ca eu sg australian " +
    "version ver wave restock item items collection collections premium special tin tins blister blisters booster boosters " +
    "pack packs deck decks kit display factory retail genuine authentic sale free shipping ship ships only each piece pcs " +
    "includes including contains featuring feat ft tcgp store online available now coming soon assorted random varies various design designs styles style choice two three four bundle"
  ).split(" "),
);
// Kept: they distinguish real products (mini tin ≠ tin, checklane ≠ 3-pack,
// super-premium ≠ premium, ex ≠ V).
const KEEP_SHORT = new Set(["ex", "v", "gx", "mega", "mini", "super"]);
// Words that describe a KIND of product rather than which one it is. A title
// whose only remaining words are these ("Pokémon Mini Tin", "Poster
// Collection") could be any of a dozen products, so without a set it is too
// vague to merge with anything.
const DESCRIPTORS = new Set(
  (
    "ex v gx vmax vstar mega mini super ultra stacking figure figures poster pin pins binder sticker stickers tech " +
    "surprise accessory pouch checklane holiday advent calendar toolkit trainer trainers gift chest battle league " +
    "academy starter theme kit portfolio lunch"
  ).split(" "),
);

function signatureTokens(title: string, set: PokemonSet | null): string[] {
  let t = normalizeTitle(title).toLowerCase();
  if (set) {
    const m = matchers();
    const own = [...m.specific, ...m.generic].find((x) => x.set.code === set.code);
    if (own) t = t.replace(new RegExp(own.re.source, "gi"), " ");
  }
  // Series prefixes and bracketed store notes ("(Release 12/9)", "[Limit 1]").
  t = t
    .replace(/scarlet\s*(?:&|and)\s*violet|sword\s*(?:&|and)\s*shield|sun\s*(?:&|and)\s*moon|mega\s*evolution/g, " ")
    .replace(/check\s*-?\s*lane/g, "checklane")
    // Set codes stores prefix titles with: "ME02", "SV4.5", "SWSH12.5", "(SV8)".
    .replace(/\b(?:me|sv|swsh|sm|xy|s)\s*-?\s*\d{1,2}(?:\.\d|pt\d|a)?\b/g, " ")
    .replace(/\b(?:release|releases|releasing|ships?|shipping|limit|max|eta|due|arriving)\b[^)\]]*[)\]]/g, " ")
    .replace(/[^a-z0-9]+/g, " ");
  const out = new Set<string>();
  for (const w of t.split(" ")) {
    if (!w || NOISE.has(w)) continue;
    if (/^\d+$/.test(w) && !/^(?:19|20)\d\d$/.test(w)) continue; // counts, not identity; keep years
    if (w.length < 2 && !KEEP_SHORT.has(w)) continue;
    out.add(w);
  }
  return [...out].sort();
}

export interface SealedIdentity {
  groupKey: string;
  type: TypeKey;
  typeLabel: string;
  set: PokemonSet | null;
  name: string; // display name for a NEW product row
  slugBase: string; // preferred slug for a NEW product row
}

export type Rejection =
  | "foreign"
  | "not-sealed"
  | "accessory"
  | "multiple"
  | "not-pokemon"
  | "unclassified"
  | "no-set"
  | "vague";

export function slugify(s: string): string {
  return normalizeTitle(s)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

/** The store's title, tidied into a product name (for collections, tins, …). */
export function cleanName(title: string): string {
  let t = decodeEntities(title).replace(/\s+/g, " ").trim();
  t = t
    .replace(/^\s*(?:the\s+)?pok[eé]mon\s*(?:tcg|trading\s*card\s*game)?\s*[:\-–—|]?\s*/i, "")
    .replace(/^\s*(?:tcg|ptcg)\s*[:\-–—|]\s*/i, "")
    // A leading set code or series name: "(SV4.5) …", "ME02 - …", "Scarlet & Violet - …".
    .replace(/^\s*[([]?\s*(?:me|sv|swsh|sm|xy)\s*-?\s*\d{1,2}(?:\.\d|pt\d)?\s*[)\]]?\s*[:\-–—|]?\s*/i, "")
    .replace(/^\s*(?:scarlet\s*(?:&|and)\s*violet|sword\s*(?:&|and)\s*shield|sun\s*(?:&|and)\s*moon|mega\s*evolution|xy)\s*(?:\d{1,2}(?:\.\d)?)?\s*[:\-–—|]\s*/i, "")
    .replace(/\s*[([]\s*(?:english|eng|en|sealed|new)\s*[)\]]\s*/gi, " ")
    .replace(/\s*[([][^)\]]*(?:pre-?order|release|ships?|eta|limit|arriv)[^)\]]*[)\]]\s*/gi, " ")
    .replace(/\s*[-–—|:]\s*(?:english|sealed|pre-?order|new)\s*$/i, "")
    .replace(/\*+[^*]*\*+/g, " ")
    .replace(/\bpre-?order\b[:\s-]*/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:\-–—|]+|[\s:\-–—|]+$/g, "")
    .trim();
  return t.length >= 4 ? t : decodeEntities(title).trim();
}

/**
 * Identify a store title as a comparable Pokémon sealed product.
 *
 * `strict` is for titles read from a collection that isn't Pokémon-specific
 * ("pre-orders", "booster-boxes"): those must say "Pokémon" outright, since a
 * set name alone could be another game's.
 */
export function identify(title: string, opts: { strict?: boolean } = {}): SealedIdentity | Rejection {
  const t = normalizeTitle(title);
  if (!t) return "unclassified";
  if (FOREIGN.test(t)) return "foreign";
  if (NOT_SEALED.test(t)) return "not-sealed";
  if (ACCESSORY.test(t)) return "accessory";
  if (BINDER.test(t) && !/binder\s*collection/i.test(t)) return "accessory";
  if (MULTIPLE.test(t)) return "multiple";

  // In a store's Pokémon collection the collection itself says it's Pokémon
  // (stores routinely drop the word: "Charizard ex Premium Collection"). In any
  // other collection the title must say so.
  if (OTHER_GAME.test(t)) return "not-pokemon";
  if (opts.strict && !POKEMON_WORD.test(t)) return "not-pokemon";
  const set = detectSet(t);

  const type = classify(t);
  if (!type) return "unclassified";
  const info = TYPE_BY_KEY.get(type)!;

  if (info.kind === "set") {
    if (!set) return "no-set";
    return {
      groupKey: `${set.code}|${type}`,
      type,
      typeLabel: info.label,
      set,
      name: `${set.name} ${info.label}`,
      slugBase: slugify(`${set.slug} ${info.label}`),
    };
  }

  const tokens = signatureTokens(t, set);
  if (!set && !tokens.some((w) => !DESCRIPTORS.has(w))) return "vague";
  const name = cleanName(title);
  return {
    groupKey: `${type}|${set?.code ?? "-"}|${tokens.join("-")}`,
    type,
    typeLabel: info.label,
    set,
    name,
    slugBase: slugify(name),
  };
}

export function isIdentity(x: SealedIdentity | Rejection): x is SealedIdentity {
  return typeof x === "object";
}
