import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { RegionSuggest } from "@/components/RegionSuggest";
import { SoftSideAds } from "@/components/SideAds";
import { FEATURE_MIN_USD_CENTS } from "@/lib/feature-floor";
import { tcgplayerTiles, type TcgplayerTile } from "@/lib/data";
import { HomeRegionGrid } from "@/components/HomeRegionGrid";
import { RegionChips } from "@/components/RegionChips";
import { regionPicks } from "@/lib/picks";
import { openPreorderGuides } from "@/lib/preorder-guides";
import { REGION_LIST, X_DEFAULT_REGION } from "@/lib/regions";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { SITE_NAME, SITE_URL, sectionHref } from "@/lib/site";
import { STORES } from "@/lib/stores";
import { GhostTeaser, HalloweenDecor } from "@/components/season/HalloweenDecor";
import { ChristmasGifts } from "@/components/season/ChristmasGifts";
import { CreatorsCornerBadge } from "@/components/creators/CreatorsCornerBadge";
import { SoftHeroCards } from "@/components/home/SoftHeroCards";
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

// The hero's shortcuts, built for the default region (RegionSuggest moves them to the visitor's).
const HERO_LINKS = [
  { href: sectionHref(X_DEFAULT_REGION, "boosterBoxes"), label: "Booster boxes" },
  { href: sectionHref(X_DEFAULT_REGION, "etbs"), label: "Elite Trainer Boxes" },
  { href: sectionHref(X_DEFAULT_REGION, "bundles"), label: "Booster bundles" },
  { href: sectionHref(X_DEFAULT_REGION, "japanese"), label: "Japanese boxes" },
  { href: sectionHref(X_DEFAULT_REGION, "deals"), label: "Deals" },
];

export default async function Landing() {
  // The side rails' TCGplayer tiles, as on the region pages (this page is force-dynamic: read per request, never at build).
  const railTiles = await tcgplayerTiles({ minCents: FEATURE_MIN_USD_CENTS }).catch((): TcgplayerTile[] => []);
  // The default region's ten, from the public data files: the server HTML is already filled. A failed read renders the page without them.
  const picks = await regionPicks(X_DEFAULT_REGION).catch((e) => {
    console.error("[landing] data read failed", e);
    return [];
  });
  const open = openPreorderGuides()[0];
  const preorder = open ? { slug: open.set.slug, name: open.set.name } : null;
  return (
    <div>
      {/* The full-width hero (owner, 2026-11-08: KaeYoung and ScentCompare's, "feature some products on the hero"): the words, region
          row, search and shortcuts on the left, two popular products on the right (under the words on a phone), in the visitor's
          region. Same h1, same links. */}
      <section>
        <div className="page relative grid gap-8 pb-10 pt-8 sm:pb-14 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(340px,480px)] lg:items-center lg:gap-10">
          {/* The creators hub, above the fold (owner, 2026-11-03): top-right corner from sm, a pill above the headline on a phone. */}
          <CreatorsCornerBadge />
          <HalloweenDecor />
          <GhostTeaser />
          <div className="min-w-0">
            <ChristmasGifts />
            <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Pokémon sealed, in stock, <span className="text-brand">cheapest first.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:mt-5 sm:text-lg">
              {STORES.length} independent stores in {REGION_LIST.length} regions, read about twice a day. Free, no sign-up.
            </p>
            {/* The region row, with flags (owner, 2026-11-02): picks in place, like the header's switcher. */}
            <RegionChips className="mt-6" />
            {/* The 404's search markup: a plain GET form, so it works without script. RegionSuggest points it at the visitor's region. */}
            <form
              id="landing-search"
              action={`/${X_DEFAULT_REGION}/sealed`}
              method="get"
              role="search"
              className="mt-5 flex max-w-xl items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-4 shadow-card focus-within:border-ink/40"
            >
              <Icon name="search" size={18} className="text-faint" />
              <input
                name="q"
                type="search"
                placeholder="Search a set or product"
                aria-label="Search sealed products"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-faint sm:text-sm"
              />
              <button type="submit" className="btn-primary min-h-11 px-5">
                Search
              </button>
            </form>
            {/* The shortcuts (owner, 2026-10-28): the most-used pages straight from the hero, in the visitor's region, instead of a
                "Continue to <region>" step before any navigation. */}
            <div className="mt-4 max-w-2xl">
              <RegionSuggest formId="landing-search" links={HERO_LINKS} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="hero-stat"><b className="tabular">{STORES.length}</b> stores</span>
              <span className="hero-stat"><b className="tabular">{REGION_LIST.length}</b> regions</span>
              <span className="hero-stat">Checked twice a day</span>
            </div>
          </div>
          <SoftHeroCards initial={picks} />
        </div>
      </section>

      {/* The owner's trim (2026-11-13): no Premium promo, no explainer paragraph and no guides list here; the space goes to
          products, ten of the region's most stocked instead of five. The explanation is on /about, Premium on /premium, the guides on
          each region's guides index (a hot button below). Everything here is server-rendered. */}
      <div className="mb-10 mt-10">
        <HomeRegionGrid initial={picks} preorder={preorder} />
      </div>

      <PopularPages />

      {/* The side rails from 1280px, browser-only, in the visitor's region (components/SideAds.tsx; owner 2026-11-06: "the home page must have this as well"). */}
      <SoftSideAds tiles={railTiles} />
    </div>
  );
}
