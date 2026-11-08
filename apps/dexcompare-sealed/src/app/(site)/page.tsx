import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { RegionSuggest } from "@/components/RegionSuggest";
import { SoftSideAds } from "@/components/SideAds";
import { tcgplayerTiles, type TcgplayerTile } from "@/lib/data";
import { HomeRegionGrid } from "@/components/HomeRegionGrid";
import { LatestGuides } from "@/components/LatestGuides";
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

// Rendered per request and kept by Vercel's CDN for a day (next.config.js CDN_PAGES), never at build: the page carries
// the default region's five most-stocked products (lib/picks.ts), read from the public data files, so a crawler's first fetch has them. It reads no cookie, header or session: one copy for all.
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
  const railTiles = await tcgplayerTiles().catch((): TcgplayerTile[] => []);
  // The default region's five, from the public data files: the server HTML is already filled. A failed read renders the page without them.
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

      {/* The owner's short landing page (2026-10-25): one paragraph on how it is fair, the region's five, the hot buttons, the
          footer. The long text, the FAQ, the regions and what we compare live on /about; the guides on each region's guides index;
          the market reports and the sister sites on each region home. Everything here is server-rendered. */}
      <section className="page" aria-labelledby="fair-h">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="fair-h" className="sr-only">
            How {SITE_NAME} ranks stores
          </h2>
          <p className="text-[15px] leading-7 text-muted">
            Every product&rsquo;s stores are ranked by price and stock only: in stock first, cheapest first, each store&rsquo;s own price in your currency.
            No store pays to be listed or to rank, and every affiliate link is marked.{" "}
            <Link href="/about" className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-2 hover:text-brand sm:min-h-0">
              How it works
            </Link>
          </p>
        </div>
      </section>

      <div className="mb-10 mt-10">
        <HomeRegionGrid initial={picks} preorder={preorder} />
      </div>

      {/* The newest guides (2026-11-03): one link from the landing page to every new set guide, server-rendered for crawlers. */}
      <section className="page mb-12" aria-labelledby="guides-h">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h2 id="guides-h" className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            New Pokémon TCG set guides
          </h2>
          <Link href={`/${X_DEFAULT_REGION}/guides`} prefetch={false} className="text-sm font-semibold text-brand hover:underline">
            All guides →
          </Link>
        </div>
        <LatestGuides region={X_DEFAULT_REGION} />
      </section>
      {/* The side rails from 1280px, browser-only, in the visitor's region (components/SideAds.tsx; owner 2026-11-06: "the home page must have this as well"). */}
      <SoftSideAds tiles={railTiles} />
    </div>
  );
}
