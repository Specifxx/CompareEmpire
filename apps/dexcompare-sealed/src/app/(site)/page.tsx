import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { SoftSideAds } from "@/components/SideAds";
import { FEATURE_MIN_USD_CENTS } from "@/lib/feature-floor";
import { tcgplayerTiles, type TcgplayerTile } from "@/lib/data";
import { HomeRegionGrid } from "@/components/HomeRegionGrid";
import { RegionChips } from "@/components/RegionChips";
import { regionPicks } from "@/lib/picks";
import { REGION_LIST, X_DEFAULT_REGION } from "@/lib/regions";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { SITE_NAME, SITE_URL, sectionHref } from "@/lib/site";
import { STORES } from "@/lib/stores";
import { ChristmasGifts } from "@/components/season/ChristmasGifts";
import { Hero, riseAt, type Way } from "@/components/home/Hero";
import { SoftWaysIn } from "@/components/home/SoftWaysIn";
import { PopularPages } from "@/components/home/PopularPages";

// Rendered per request and kept by Vercel's CDN for a day (next.config.js CDN_PAGES), never at build: the page carries
// the default region's ten most-stocked products (lib/picks.ts), read from the public data files, so a crawler's first fetch has them. It reads no cookie, header or session: one copy for all.
export const dynamic = "force-dynamic";

const TITLE = `${SITE_NAME} — Pokémon sealed prices & stock from ${STORES.length} stores`;
const DESCRIPTION = `Compare Pokémon sealed prices and stock across ${STORES.length} independent stores in ${REGION_LIST.length} regions. Booster boxes, ETBs and more, cheapest in stock first.`;

/**
 * The landing page's metadata. hreflang: the seven region homes, and x-default this page, the region chooser that every region
 * home names as its own x-default (seo.ts regionAlternates): the return links. `absolute`: the layout's "%s | DexCompare" template
 * would brand it twice. The share card is the site's (app/opengraph-image.tsx).
 */
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
    languages: { ...Object.fromEntries(REGION_LIST.map((r) => [r.hreflang, `${SITE_URL}/${r.region}`])), "x-default": `${SITE_URL}/` },
  },
  openGraph: { url: SITE_URL, siteName: SITE_NAME, type: "website", title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// The hero's ways in, built for the default region (SoftWaysIn moves them to the visitor's): six tiles, never products.
const HERO_LINKS: Way[] = [
  { href: sectionHref(X_DEFAULT_REGION, "boosterBoxes"), label: "Booster boxes", icon: "box" },
  { href: sectionHref(X_DEFAULT_REGION, "etbs"), label: "Elite Trainer Boxes", icon: "etb" },
  { href: sectionHref(X_DEFAULT_REGION, "bundles"), label: "Booster bundles", icon: "bundle" },
  { href: sectionHref(X_DEFAULT_REGION, "japanese"), label: "Japanese boxes", icon: "japan" },
  { href: sectionHref(X_DEFAULT_REGION, "deals"), label: "Deals", icon: "tag" },
  { href: sectionHref(X_DEFAULT_REGION, "sets"), label: "All sets", icon: "sets" },
];

export default async function Landing() {
  // The phone dock's TCGplayer tiles, as on the region pages (this page is force-dynamic: read per request, never at build).
  const railTiles = await tcgplayerTiles({ minCents: FEATURE_MIN_USD_CENTS }).catch((): TcgplayerTile[] => []);
  // The default region's ten, from the public data files: the server HTML is already filled. A failed read renders the page without them.
  const picks = await regionPicks(X_DEFAULT_REGION).catch((e) => {
    console.error("[landing] data read failed", e);
    return [];
  });
  return (
    <div>
      {/* The hero (owner, 2026-11-13: "get rid of the products on the hero"; it reverses the 2026-11-08 featured cards): the words,
          the search, the region row and six ways in, centred. Same h1, same search form. Nothing else lives here: no creators badge,
          no stat chips, no product. The Christmas gift guide is its one small line, in season. */}
      <Hero>
        <ChristmasGifts />
        <h1 className="hero-h1 rise-solid">
          Pokémon sealed, in stock, <span className="text-brand">cheapest first.</span>
        </h1>
        <p className="hero-sub rise" style={riseAt(1)}>
          {STORES.length} independent stores in {REGION_LIST.length} regions, read about twice a day. Free, no sign-up.
        </p>
        {/* The 404's search markup: a plain GET form, so it works without script. SoftWaysIn points it at the visitor's region. */}
        <div className="hero-search rise" style={riseAt(2)}>
          <form id="landing-search" action={`/${X_DEFAULT_REGION}/sealed`} method="get" role="search" className="flex items-center gap-2 border p-1.5">
            <Icon name="search" size={20} className="shrink-0 text-faint" />
            <input name="q" type="search" placeholder="Search a set or product" aria-label="Search sealed products" className="min-w-0 flex-1 bg-transparent py-1.5 outline-none placeholder:text-faint" />
            <button type="submit" className="btn-primary min-h-11 px-6">
              Search
            </button>
          </form>
        </div>
        {/* The region row, with flags (owner, 2026-11-02): picks in place, like the header's switcher. */}
        <RegionChips className="rise mt-6 justify-center" style={riseAt(3)} />
        <SoftWaysIn formId="landing-search" links={HERO_LINKS} />
      </Hero>

      {/* The owner's trim (2026-11-13): no Premium promo, no explainer paragraph and no guides list here; the space goes to
          products, ten of the region's most stocked. The explanation is on /about, Premium on /premium, the guides on
          each region's guides index. Everything here is server-rendered. */}
      <div className="reveal mb-16 mt-6 sm:mt-10">
        <HomeRegionGrid initial={picks} />
      </div>

      <PopularPages />

      {/* The phone dock (below 1280px, after a scroll), browser-only, in the visitor's region (components/SideAds.tsx; the side rails
          that shared the file were removed 2026-11-13; owner 2026-11-06: "the home page must have this as well"). */}
      <SoftSideAds tiles={railTiles} />
    </div>
  );
}
