// Which eBay listings are NOT one unit of a sealed product: shared by the importer (ebay-normalise.ts, ebay-sweep.ts) and the
// website's read path (ebay-read.ts drops a stored row that today's rules refuse). Pure; imports only the title normaliser, so the
// route's chain stays free of the importer's modules (tests/ebay-api.test.ts).
import { normalizeTitle, type TypeKey } from "./sealed-title";

const CASE_TYPES = new Set<TypeKey>(["booster-box-case", "etb-case", "booster-bundle-case"]);

/**
 * Listings never handed to a product (the catalogue sweep AND the per-product searches), on top of what identify() and SEALED_NOISE refuse (tested on the accent-folded
 * title): Japanese product naming ("Pokemon Card Game MEGA Expansion Pack … Box", "Premium Trainer Box"), several units
 * ("Mini Tins (10-Pack)", "Full Set", "All 3", "Lot"), part of a product ("Missing Promo", "Coin Only", "No Packs"), a variant
 * left to chance ("One Variation Chosen At Random", "Assorted") and damage notes.
 */
const LISTING_REJECT = new RegExp(
  [
    "\\bexpansion\\s+pack\\b|\\bhigh\\s+class\\s+pack\\b|\\bconstructed\\s+(?:deck|starter)\\b|\\bpokemon\\s+card(?:\\s+game)?\\s*[:\\-]?\\s*(?:mega|scarlet|sword|sun|xy|151)\\b|\\bpremium\\s+trainer\\s+box\\b",
    "\\btins\\b[^()]{0,40}\\(\\s*\\d+\\s*-?\\s*(?:pack|pk)s?\\s*\\)|\\b(?:full|complete|whole)\\s+set\\b|\\ball\\s+(?:[2-9]|three|four|five|six|eight|nine|ten)\\b|\\b(?:set|bundle|lot)\\s+of\\b|\\blots?\\b",
    // the contents of a product, not the product: "3 Promo Packs From Elite Trainer Box", "Energy Cards from ETB", "pulled from a booster box"
    "\\bfrom\\s+(?:an?\\s+|the\\s+)?(?:[\\w'&-]+\\s+){0,4}?(?:elite\\s+trainer\\s+box(?:es)?|etbs?|box(?:es)?|bundles?|collections?|tins?|upcs?|displays?|blisters?)\\b|\\b(?:elite\\s+trainer\\s+box|etb|collection|tin|bundle|box|blister)\\s+promo\\b|\\b\\d{1,3}\\s*/\\s*\\d{2,3}\\b|\\bpromo\\s+packs?\\b|\\benergy\\s+(?:packs?|cards?)\\b|\\bpulled\\s+from\\b",
    "\\b(?:missing|without|w/o|removed|incomplete|partial|contents)\\b|\\b(?:coins?|promos?|cards?|pins?|tin|box|packs?|figure|jumbo|oversized?|posters?|sleeves?|playmats?|dice|binders?|energy|codes?|art|artwork|stickers?|patch(?:es)?)\\s+only\\b|\\bonly\\s+(?:the\\s+)?(?:poster|coin|pin|promo|sleeves?|playmat|dice|binder|box|tin)\\b|\\bno\\s+(?:packs?|boosters?|promos?|cards?|coins?)\\b",
    "\\brandom\\b|\\bassorted\\b|\\bvariation\\b|\\bchosen\\b|\\bvarious\\b|\\bstyles?\\s+may\\s+vary\\b|\\bmystery\\b|\\byou\\s+choose\\b|\\bchoose\\s+(?:your|one|from|between)\\b|\\bpick\\s+(?:your|one|from)\\b|\\byour\\s+choice\\b",
    "\\bdamage[ds]?\\b|\\bcrushed\\b|\\btorn\\b|\\bresealed\\b|\\bunsealed\\b|\\bempty\\b",
  ].join("|"),
  "i",
);

const foldTitle = (t: string) => normalizeTitle(t).toLowerCase();

/** Is this listing refused whatever product it is for (LISTING_REJECT, on the accent-folded title)? */
export function refusedListing(title: string): boolean {
  return LISTING_REJECT.test(foldTitle(title));
}

// A booster pack product is ONE pack: "5 Booster Packs", "Booster Pack x10", "(10 Packs)", "Packs" are lots of it.
const SEVERAL_PACKS = /\b(?:[2-9]|[1-9]\d)\s*(?:x\s*)?(?:sleeved\s+)?(?:booster\s+)?packs?\b|\(\s*\d+\s*packs?\s*\)|\bpacks\b|\bx\s*\d+\b|\b\d+\s*x\b/i;
// "151 ETB SEALED w/ case", "Booster Box with acrylic case": one item in a protector, not the case of six or ten.
const WITH_A_CASE = /\b(?:w\/|with|in|\+|and|plus)\s*(?:an?\s+)?(?:acrylic|protective|magnetic|plastic|hard)?\s*(?:case|protector)\b|\b(?:acrylic|protective|magnetic)\s+case\b/i;
const NOT_PC = /\bnon[\s-]*(?:pokemon[\s-]*cent(?:er|re)|pc)\b|\bnot\s+(?:a\s+|the\s+)?(?:pokemon[\s-]*cent(?:er|re)|pc)\b/i;
// A box or ETB "Case Fresh" is one box from a case, not the case.
const CASE_FRESH = /\bcase[\s-]*fresh\b|\bfresh\s+(?:from|out\s+of)\s+(?:a\s+)?case\b|\bfrom\s+(?:an?\s+)?(?:sealed\s+)?case\b/i;

/** Is this listing, read as `type`, not one unit of that type: a multi-pack lot of a pack, a "case fresh" box for a case, sleeved boosters for a bundle? */
export function refusedForType(title: string, type: TypeKey): boolean {
  const t = foldTitle(title);
  if ((type === "booster-pack" || type === "sleeved-booster") && SEVERAL_PACKS.test(t)) return true;
  if (CASE_TYPES.has(type) && (CASE_FRESH.test(t) || WITH_A_CASE.test(t))) return true;
  // "151 Elite Trainer Box, Non-Pokemon Center": the regular ETB, whatever "Pokemon Center" made the classifier read.
  if (type === "pc-etb" && NOT_PC.test(t)) return true;
  // "Sleeved Booster Bundle 4 Arts" is four sleeved boosters, not the 6-pack Booster Bundle.
  return type === "booster-bundle" && /\bsleeved\b/.test(t);
}

