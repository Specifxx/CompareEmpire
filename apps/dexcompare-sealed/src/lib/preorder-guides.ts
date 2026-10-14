// The pre-order pages (/<region>/preorders/<set slug>): one per upcoming set
// that has been announced in enough detail to say what each product IS, not
// just what stores ask for it. Ported from Rift Compare's /radiance-preorders,
// which became that site's biggest pre-release landing page.
//
// Facts only, each from The Pokémon Company's own announcement (pokemon.com,
// press.pokemon.com) and dated: no prices here. The page's prices are the
// stores' live pre-order listings (ProductStat + Offer), and US MSRP comes from
// lib/rrp.ts like everywhere else — never typed twice.
//
// SELF-RETIRING: a guide's set is a pre-order only until its releaseDate in
// lib/sets.ts (isPreorderSet). From release day the page says it is out, points
// at the set page, drops out of the sitemap and is noindexed. A guide can then
// be deleted at leisure; nothing else depends on it.
import { SET_BY_CODE, SET_BY_SLUG, type PokemonSet } from "./sets";
import type { TypeKey } from "./sealed-title";

export interface PreorderProduct {
  /** The product type the importer files it under (lib/sealed-title.ts). */
  type: TypeKey;
  /** What is in the box, from TPCi's product listing. */
  contents: string;
  /**
   * false: don't print lib/rrp.ts's US MSRP for this product on the pre-order
   * page, because the set's own announcement gives a different list price and
   * neither is confirmed yet. Default: printed (US page only).
   */
  msrp?: false;
}

export interface PreorderGuide {
  setCode: string;
  /** "Mega Evolution—Delta Reign": the full English product-line name. */
  fullName: string;
  /** Prerelease events at participating stores (YYYY-MM-DD), when announced. */
  prereleaseFrom: string | null;
  /** Pokémon TCG Live, when announced (YYYY-MM-DD). */
  liveDate: string | null;
  /** "over 135 cards", as TPCi words it. */
  cardCount: string;
  /** The Pokémon the set is built around. */
  headliners: string[];
  products: PreorderProduct[];
  /** Where the facts above come from. */
  sources: { label: string; url: string }[];
  /** When the facts were last checked against the sources (YYYY-MM-DD). */
  checked: string;
}

export const PREORDER_GUIDES: PreorderGuide[] = [
  {
    // pokemon.com, "The Pokémon TCG: Mega Evolution—Delta Reign Expansion
    // Arrives November 6, 2026" (dates, card count, headliners) and the
    // product line-up as PokéGuardian reported it from TPCi's press kit
    // (ETB contents), read 2026-10-14. Pack counts per product are
    // lib/packs.ts's, not restated here.
    setCode: "me6",
    fullName: "Mega Evolution—Delta Reign",
    prereleaseFrom: "2026-10-24",
    liveDate: "2026-11-05",
    cardCount: "over 135 cards",
    headliners: ["Mega Rayquaza ex", "Mega Golurk ex", "Mega Malamar ex", "Mega Golisopod ex"],
    products: [
      { type: "booster-box", contents: "36 Delta Reign booster packs of 10 cards (the booster display)" },
      {
        type: "etb",
        contents:
          "9 booster packs, a full-art foil Kyogre promo, 65 card sleeves, 40 Energy cards, a player's guide, 6 damage-counter dice, a coin-flip die, a plastic coin, a collector's box with 6 dividers and a Pokémon TCG Live code card",
      },
      { type: "pc-etb", contents: "The Pokémon Center edition of the Elite Trainer Box, sold by Pokémon Center and resold by stores" },
      { type: "booster-bundle", contents: "6 booster packs" },
      // Reported at US$21.99 for this set; lib/rrp.ts's Mega Evolution tier says
      // $29.99. Not printed here until one is confirmed (rrp.ts left as it is).
      { type: "build-battle", contents: "Booster packs and a ready-to-play deck: the kit Prerelease events are played with", msrp: false },
      { type: "blister", contents: "1-pack and 3-pack blisters, plus checklane blisters" },
      { type: "sleeved-booster", contents: "One 10-card booster pack in a sleeve" },
      { type: "booster-pack", contents: "One 10-card booster pack" },
    ],
    sources: [
      {
        label: "pokemon.com: the Mega Evolution—Delta Reign expansion arrives November 6, 2026",
        url: "https://www.pokemon.com/us/news/the-pokemon-tcg-mega-evolution-delta-reign-expansion-arrives-november-6-2026",
      },
      { label: "PokéGuardian: Mega Evolution—Delta Reign revealed (product line-up)", url: "https://www.pokeguardian.com/3231721_pokemon-tcg-mega-evolution-delta-reign-revealed" },
    ],
    checked: "2026-10-14",
  },
];

const BY_CODE = new Map(PREORDER_GUIDES.map((g) => [g.setCode, g]));

/** US MSRP may be printed for this product type on the guide's page (see PreorderProduct.msrp). */
export function guideShowsMsrp(guide: PreorderGuide, type: TypeKey): boolean {
  return guide.products.find((p) => p.type === type)?.msrp !== false;
}

export function preorderGuide(setCode: string | null | undefined): PreorderGuide | null {
  return setCode ? BY_CODE.get(setCode) ?? null : null;
}

/** The guide and its set for a URL slug, or null (the page 404s). */
export function preorderGuideBySlug(slug: string): { guide: PreorderGuide; set: PokemonSet } | null {
  const set = SET_BY_SLUG.get(slug);
  const guide = set ? BY_CODE.get(set.code) : undefined;
  return set && guide ? { guide, set } : null;
}

/** The path under a region: /<region>/preorders/<set slug>. */
export function preorderPath(region: string, setCode: string): string | null {
  const set = BY_CODE.has(setCode) ? SET_BY_CODE.get(setCode) : undefined;
  return set ? `/${region}/preorders/${set.slug}` : null;
}

/** Guides whose set has not released yet (by lib/sets.ts), soonest release first. */
export function openPreorderGuides(today = new Date().toISOString().slice(0, 10)): { guide: PreorderGuide; set: PokemonSet }[] {
  return PREORDER_GUIDES.map((guide) => ({ guide, set: SET_BY_CODE.get(guide.setCode) }))
    .filter((x): x is { guide: PreorderGuide; set: PokemonSet } => !!x.set && x.set.releaseDate > today)
    .sort((a, b) => a.set.releaseDate.localeCompare(b.set.releaseDate));
}
