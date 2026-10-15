import Link from "next/link";
import type { Metadata } from "next";
import { Icon, type IconName } from "@/components/Icon";
import { RegionSuggest, SuggestedEbayStrip, SuggestedTypeLinks } from "@/components/RegionSuggest";
import { REGION_LIST, REGIONS, X_DEFAULT_REGION, type Region } from "@/lib/regions";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { SITE_NAME, SITE_URL, sectionHref, type SectionKey } from "@/lib/site";
import { STORES, storesInMarket } from "@/lib/stores";
import { PRODUCT_TYPES } from "@/lib/sealed-title";

// Fully static: counts come from the store registry, not the database, so
// this page costs nothing to serve and never depends on the database.

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

// Deep links into the two biggest regions, straight to the pages people come for. Static: no counts, no prices.
const POPULAR_REGIONS: Region[] = ["us", "au"];
const POPULAR_LINKS: { key: SectionKey; label: string }[] = [
  { key: "boosterBoxes", label: "Booster boxes" },
  { key: "etbs", label: "Elite Trainer Boxes" },
  { key: "deals", label: "Deals" },
  { key: "perPack", label: "Cheapest per pack" },
  { key: "releases", label: "Releases" },
  { key: "guides", label: "Guides" },
];

const HOW: { icon: IconName; t: string; d: string }[] = [
  { icon: "store", t: "The stores’ own prices", d: "Every price is a store’s own listing (in the US, also TCGplayer’s), in your currency, before shipping." },
  { icon: "clock", t: "Stock, with a timestamp", d: "Each listing says when we last read it. A store that hasn’t answered for three days is marked, never guessed." },
  { icon: "check", t: "Ranked by price and stock only", d: "Cheapest in stock first. No store pays to be listed or to rank, and every affiliate link is marked." },
];

export default function Landing() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-16 h-96 w-96 rounded-full bg-brand/15 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-spark/20 blur-3xl" />
        <div className="page relative pb-12 pt-8 text-center sm:pb-16 sm:pt-20">
          <p className="eyebrow hidden sm:block">Booster boxes · ETBs · bundles · collections · tins</p>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:mt-4 sm:text-6xl">
            Pokémon sealed, in stock, <span className="text-brand">cheapest first.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted sm:mt-6 sm:text-lg sm:leading-8">
            Prices and stock from {STORES.length} independent stores in {REGION_LIST.length} regions, read about twice a day. Free, no sign-up, and no store pays to be
            listed.
          </p>
          <div className="mt-6 flex h-12 justify-center sm:mt-8">
            <RegionSuggest formId="landing-search" />
          </div>
          {/* The 404's search markup: a plain GET form, so it works without script. RegionSuggest points it at the suggested region. */}
          <form
            id="landing-search"
            action={`/${X_DEFAULT_REGION}/sealed`}
            method="get"
            role="search"
            className="mx-auto mt-4 flex max-w-md items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-4 shadow-card focus-within:border-ink/40"
          >
            <Icon name="search" size={18} className="text-faint" />
            <input
              name="q"
              type="search"
              placeholder="Search a set or product"
              aria-label="Search sealed products"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-faint sm:text-sm"
            />
            <button type="submit" className="btn-ghost min-h-10 px-4">
              Search
            </button>
          </form>
        </div>
      </section>

      <section id="regions" className="page" aria-labelledby="regions-h">
        <h2 id="regions-h" className="mb-5 text-center font-display text-2xl font-bold tracking-tight">
          Choose your region
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {REGION_LIST.map((r) => {
            const n = storesInMarket(r.market).length;
            return (
              <li key={r.region} className="flex">
                <Link
                  href={`/${r.region}`}
                  className="card group flex flex-1 flex-col items-start gap-2 p-4 transition-all hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-lift"
                >
                  <span className="text-3xl leading-none" aria-hidden="true">
                    {r.flag}
                  </span>
                  <span>
                    <span className="block font-display text-[15px] font-bold leading-snug group-hover:text-brand">{r.name}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {n} stores · {r.currency}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="page mt-14" aria-labelledby="popular-h">
        <h2 id="popular-h" className="mb-5 font-display text-2xl font-bold tracking-tight">
          Popular right now
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {POPULAR_REGIONS.map((code) => {
            const r = REGIONS[code];
            return (
              <div key={code} className="card p-5">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                  <span aria-hidden="true">{r.flag}</span> {r.name}
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {POPULAR_LINKS.map((l) => (
                    <li key={l.key}>
                      <Link href={sectionHref(code, l.key)} prefetch={false} className="chip min-h-10" aria-label={`${l.label} in ${r.inName}`}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="page mt-14 text-center" aria-labelledby="compare-h">
        <h2 id="compare-h" className="eyebrow mb-3">
          What we compare
        </h2>
        <SuggestedTypeLinks types={PRODUCT_TYPES.slice(0, 13).map((t) => ({ slug: t.slug, label: t.plural }))} />
        <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-muted">
          English-language Pokémon TCG sealed product only. Singles, graded cards, Japanese product, accessories and store-made bundles are
          left out on purpose — <Link href="/about#refuse" className="underline underline-offset-2 hover:text-ink">what we refuse, and why</Link>.
        </p>
      </section>

      {/* The landing page's one eBay unit: the visitor's suggested region's eBay (the US until known, and with no suggestion), and it
          says which. Real listings imported once a day; with none, the compact CTA row. */}
      <section className="page mt-16" aria-label="Chase cards on eBay">
        <SuggestedEbayStrip />
      </section>

      <section className="page mt-14" aria-labelledby="how-h">
        <h2 id="how-h" className="sr-only">
          How it works
        </h2>
        <ul className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          {HOW.map((f) => (
            <li key={f.t} className="flex gap-4 sm:flex-col sm:gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong" aria-hidden="true">
                <Icon name={f.icon} size={22} />
              </span>
              <span>
                <span className="block font-display text-lg font-bold">{f.t}</span>
                <span className="mt-1 block text-sm leading-6 text-muted">{f.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
