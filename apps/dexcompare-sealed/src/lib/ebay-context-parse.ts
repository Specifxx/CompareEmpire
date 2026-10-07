// The server half of the context whitelist (the browser's half is ebay-context.ts): turns a
// `c` query value into a ParsedContext, or null. Kept apart because it needs sets.ts and
// sealed-title.ts (30 KB gzip-heavy tables) which the browser must not download.
//
// The route is not an open proxy. A request names a REGION (one of the seven) and a
// CONTEXT from the fixed list below; each context is mapped, on the server, to
// hard-coded queries. No user text ever reaches eBay.
//
//   home | generic | sealed | store | releases      generic chase cards
//   set:<slug>        a slug in sets.ts             that set's chase cards
//   type:<slug>       a slug in PRODUCT_TYPES       generic chase cards (type-agnostic)
//   product:<code>    a set code in sets.ts, or "none"   the product's set's chase cards
//
// A set context is only a SET context when "chase cards from <set>" is true of what eBay
// would return: a set that has not been released has no cards yet (anything listed is a
// custom or mislabelled item), and a set whose name is also its series' name ("Scarlet &
// Violet", "Mega Evolution": sets.ts `generic`) matches cards of every set in the series.
// Both degrade to the generic chase context, with no set name (so the heading is the
// generic one too).
import { isPreorderSet } from "./release";
import { TYPE_BY_SLUG } from "./sealed-title";
import { SET_BY_CODE, SET_BY_SLUG, type PokemonSet } from "./sets";

export type ContextKind = "home" | "generic" | "sealed" | "store" | "releases" | "set" | "type" | "product";

export interface ParsedContext {
  /** The canonical request string ("set:surging-sparks"). */
  id: string;
  kind: ContextKind;
  /** The set this context is about (set and product pages), else null (also null for an unreleased or series-named set). */
  setCode: string | null;
  setName: string | null;
  /** Which hard-coded query set serves it: "generic", or "set:<code>". Contexts with the same key share one cache entry. */
  queryKey: string;
}

const SIMPLE = new Set<ContextKind>(["home", "generic", "sealed", "store", "releases"]);
const MAX_CONTEXT_LENGTH = 48;

// Sets named with a common word: a keyword search for "Evolutions", "Generations" or "Celebrations" returns cards of every set.
const COMMON_WORD_SETS = new Set(["xy12", "g1", "cel25"]);

/** Does "chase cards from <set>" describe what a keyword search for the set's name returns? */
export function hasSetChase(s: PokemonSet, now: Date = new Date()): boolean {
  return !s.generic && !COMMON_WORD_SETS.has(s.code) && !isPreorderSet(s.code, now);
}

function ofSet(id: string, kind: "set" | "product", s: PokemonSet, now: Date): ParsedContext {
  return hasSetChase(s, now) ? { id, kind, setCode: s.code, setName: s.name, queryKey: `set:${s.code}` } : { id, kind, setCode: null, setName: null, queryKey: "generic" };
}

/**
 * Parse a `c` query value. Only exact members of the whitelist parse; everything else
 * (odd slugs, "../", upper case, huge strings, non-strings) is null. Never throws.
 */
export function parseContext(raw: unknown, now: Date = new Date()): ParsedContext | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_CONTEXT_LENGTH) return null;
  if (!/^[a-z0-9][a-z0-9:-]*$/.test(raw)) return null;
  if (SIMPLE.has(raw as ContextKind)) return { id: raw, kind: raw as ContextKind, setCode: null, setName: null, queryKey: "generic" };
  const i = raw.indexOf(":");
  if (i < 0) return null;
  const kind = raw.slice(0, i);
  const arg = raw.slice(i + 1);
  if (kind === "set") {
    const s = SET_BY_SLUG.get(arg);
    return s ? ofSet(raw, "set", s, now) : null;
  }
  if (kind === "type") {
    return TYPE_BY_SLUG.has(arg) ? { id: raw, kind: "type", setCode: null, setName: null, queryKey: "generic" } : null;
  }
  if (kind === "product") {
    if (arg === "none") return { id: raw, kind: "product", setCode: null, setName: null, queryKey: "generic" };
    const s = SET_BY_CODE.get(arg);
    return s ? ofSet(raw, "product", s, now) : null;
  }
  return null;
}

/** The context string for a product page: its set's code, or "none". */
export function productContext(setCode: string | null | undefined): string {
  return setCode && SET_BY_CODE.has(setCode) ? `product:${setCode}` : "product:none";
}
