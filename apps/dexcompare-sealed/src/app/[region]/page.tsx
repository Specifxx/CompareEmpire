import { WeeklyDropsBox } from "@/components/WeeklyDropsBox";
import { weeklyBoxLive } from "@/lib/weekly-box";
import { ALERT_SITE_KEY } from "@/lib/alert-feed";
import Link from "next/link";
import { SiteReviews } from "@/components/site-reviews/SiteReviews";
import { inSeason } from "@/lib/black-friday";
import { CORE_SALES, salesInSeason } from "@/lib/sale-seasons";
import { PreorderBanner } from "@/components/PreorderBanner";
import { cache } from "react";
import type { Metadata } from "next";
import { Ago } from "@/components/Ago";
import { RecentlyViewed } from "@/components/Recent";
import { firstHotSet, hotSetHighlight, NoPreFooter } from "@/components/Ebay";
import { EbayStrip } from "@/components/EbayStrip";
import { HubFaqSection, HubSummaryText } from "@/components/HubSummary";
import { hubSummary } from "@/lib/hub-summary";
import { Icon, type IconName } from "@/components/Icon";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductRail } from "@/components/ProductRail";
import { SearchBox } from "@/components/SearchBox";
import { HeroCards, type HeroCard } from "@/components/home/HeroCards";
import { HeroSparks } from "@/components/HeroSparks";
import { RegionChips } from "@/components/RegionChips";
import { Empty, Section } from "@/components/Section";
import { LatestGuides } from "@/components/LatestGuides";
import { StockPill } from "@/components/StockPill";
import { homeRails, regionOverview, tcgplayerTiles, type ProductCardData } from "@/lib/data";
import { TcgplayerStrip } from "@/components/TcgplayerStrip";
import { dealsCopy, dealsInMarket, fitTitle, homeCopy, nearestRegion, stockLabel } from "@/lib/deals";
import { cardOpen } from "@/lib/compact";
import { money, plural, timeAgo } from "@/lib/format";
import { thumb } from "@/lib/images";
import { hotPicks } from "@/lib/hot-picks";
import { FEATURE_MIN_USD_CENTS, featured as featuredByPrice, featureWorthy, priciestFirst } from "@/lib/feature-floor";
import { COUNTRY_GUIDE } from "@/content/guides/country-prices";
import { openPreorderGuides } from "@/lib/preorder-guides";
import { featureOrder, isPreorderSet, formatRelease } from "@/lib/release";
import { REGION_LIST, REGIONS, regionOrNotFound, type Market, type RegionInfo } from "@/lib/regions";
import { ogCardImage, pageMeta, regionAlternates } from "@/lib/seo";
import { PRODUCT_TYPES } from "@/lib/sealed-title";
import { SET_BY_CODE, SETS, type PokemonSet } from "@/lib/sets";
import { stockHeadline } from "@/lib/stock";
import { olderInStockData } from "@/lib/stock-data";
import { StockRow } from "@/components/StockRow";
import { storesInMarket } from "@/lib/stores";
import { loadMarketReport } from "@/lib/market-report";
import { RegionReport, RegionsCompared } from "@/components/MarketReport";
import { CompareOtherTcgs } from "@/components/CompareOtherTcgs";
import { SetIndex } from "@/components/SetIndex";
import { setCountsGrouped, typeLabelsInMarket } from "@/lib/hub-data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CreatorsCornerBadge } from "@/components/creators/CreatorsCornerBadge";
import { Flag } from "@/components/Flag";
import { FeaturedAds } from "@/components/FeaturedAds";
import { HypeNow } from "@/components/HypeNow";
import { PremiumSlides } from "@/components/premium/PremiumSlides";

// Rendered per request and kept by Vercel's CDN for a day (next.config.js, CDN_PAGES), never ISR: an ISR write
// costs about twenty renders, and the data only changes with a release, which empties the CDN anyway.
export const dynamic = "force-dynamic";

// The overview's counts go into the description ("1,591 in stock today") and the hero's trust line: one read, shared.
const getOverview = cache((market: Market) => regionOverview(market));

export async function generateMetadata({ params }: { params: { region: string } }): Promise<Metadata> {
  const r = regionOrNotFound(params.region);
  const n = storesInMarket(r.market).length;
  const overview = await getOverview(r.market);
  const meta = pageMeta({
    title: homeCopy.title(r, n),
    description: homeCopy.description(r, n, overview.inStock),
    path: `/${r.region}`,
    alternates: regionAlternates(r.region, ""),
  });
  return {
    ...meta,
    title: fitTitle(homeCopy.title(r, n)),
    // The region's own share card (app/og/[region]): what a link to /au or /us shows on Reddit, Discord or X.
    openGraph: { ...meta.openGraph, images: [ogCardImage(`/og/${r.region}`, `DexCompare: Pokémon sealed prices across ${n} ${r.adjective} stores`)] },
  };
}

const QUICK_TYPES = ["booster-boxes", "elite-trainer-boxes", "booster-bundles", "collections", "ultra-premium-collections", "tins", "booster-packs", "blisters"];

export default async function RegionHome({ params }: { params: { region: string } }) {
  const r = regionOrNotFound(params.region);
  const [{ boxes, etbs, preorders, latestSets: bySet }, overview, allDeals, report, older, setCounts, listedTypes, tcgTiles] = await Promise.all([
    homeRails(r.market),
    getOverview(r.market),
    dealsInMarket(r.market, { take: 24 }),
    loadMarketReport(r.market),
    olderInStockData(r.market).catch(() => []),
    setCountsGrouped(r.market),
    typeLabelsInMarket(r.market),
    tcgplayerTiles({ take: 12, minCents: FEATURE_MIN_USD_CENTS }).catch(() => []),
  ]);
  // The seven regions side by side, moved here from the landing page (2026-10-25).
  const reports = await Promise.all(REGION_LIST.map((x) => (x.region === r.region ? report : loadMarketReport(x.market)))).catch(() => [report]);
  // The soonest upcoming set with a pre-order page: the rail's "see all" goes there.
  const preorderGuide = openPreorderGuides()[0] ?? null;
  const storeCount = storesInMarket(r.market).length;
  // The newest released set leads, the set on pre-order second (release.ts featureOrder): a pre-order is never the top card.
  const latestSets = featureOrder(SETS.filter((s) => bySet.has(s.code)).slice(0, 4).map((s) => s.code)).map((c) => SET_BY_CODE.get(c)!);
  // The owner's most wanted set that is out (lib/popular.ts HOT_SETS: 30th Celebration first) gets the sealed strip's highlighted
  // eBay button, "Shop 30th Celebration on eBay": inside that strip's own top line, so the page keeps its two units.
  const hotHighlight = hotSetHighlight(firstHotSet());
  // The deals rail and the pre-order grid feature the dearer products (lib/feature-floor.ts, owner 2026-11-12): deals by the biggest saving
  // in money; the pre-order grid keeps every pre-order only when none clears the floor.
  const deals = priciestFirst(allDeals.filter((p) => featureWorthy(p.lowestPriceCents, r.market)), r.market, (p) => (p.medianOpenCents ?? 0) - (p.lowestPriceCents ?? 0)).slice(0, 8);
  const preorderShelf = (() => {
    const top = featuredByPrice(preorders, r.market, (p) => p.lowestPriceCents, 8);
    return top.length ? top : preorders;
  })();
  const hot = hotPicks(preorders, boxes, undefined, r.market);
  // The hero's two cards: the hot picks in their own order (lib/hot-picks.ts), the ones with a photo first.
  const heroCards: HeroCard[] = [...hot.filter((p) => p.imageUrl), ...hot.filter((p) => !p.imageUrl)].slice(0, 2).map((p) => ({
    slug: p.slug,
    name: p.name,
    type: p.productType,
    img: p.imageUrl,
    cents: p.lowestPriceCents,
    stores: p.inStockStores || p.listedStores,
    median: p.medianOpenCents,
    pre: isPreorderSet(p.setCode),
  }));
  // The server-rendered summary and FAQ (SEO-1, 2026-11-10): today's numbers from the rails above (the newest boxes and ETBs in stock)
  // and the market overview; the cheapest named is the cheapest of those, never claimed for the whole market.
  const summary = hubSummary({
    r,
    subject: "newest booster boxes and Elite Trainer Boxes",
    countSubject: "Pokémon sealed products",
    products: [...boxes, ...etbs],
    complete: false,
    openTotal: overview.inStock,
    storeCount,
    tcgplayer: r.market === "US",
  });
  const other = REGIONS[nearestRegion(r.region)];
  const preorderLink = { href: `/${r.region}/releases`, label: "Pre-orders" };

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line bg-surface">
        {/* The living background (owner, 2026-11-03): motes that part around the pointer, sparks on a click. */}
        <HeroSparks />
        <div className="page relative grid gap-8 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(340px,480px)] lg:items-center lg:gap-10">
          <div className="min-w-0">
            <Breadcrumbs items={[{ href: "/", label: "DexCompare" }, { label: r.name }]} />
            {/* The creators hub, above the fold on every region home too (owner, 2026-11-03); a pill under the breadcrumb on a phone. */}
            <CreatorsCornerBadge className="sm:right-6 sm:top-8" />
            <div className="eyebrow">
              <Flag code={r.short} /> {r.name} · prices in {r.currency}
            </div>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Compare Pokémon booster box &amp; ETB prices in <span className="text-brand">{r.inName}</span>
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Today&rsquo;s prices and stock from {plural(storeCount, `${r.adjective} store`)}
              {r.market === "US" && " and TCGplayer"}, cheapest first.
            </p>
            <div className="mt-6 max-w-2xl">
              <SearchBox region={r.region} size="lg" />
            </div>
            <RegionChips region={r.region} className="mt-4" />
            {/* One sideways row at every width (calm palette, 2026-11-12): wrapped, the thirteen chips were five rows of the hero on a
                desktop. Every link is still in the HTML, and the sidebar lists the same types. */}
            <nav aria-label="Shop by type" className="scroller mt-4 gap-2">
              <Link href={`/${r.region}/deals`} prefetch={false} className="chip min-h-10 font-semibold">
                <Icon name="tag" size={16} className="text-muted" /> Deals
              </Link>
              <Link href={`/${r.region}/back-in-stock`} prefetch={false} className="chip min-h-10 font-semibold">
                <Icon name="check" size={16} className="text-muted" /> Back in stock
              </Link>
              <Link href={`/${r.region}/out-of-print`} prefetch={false} className="chip min-h-10">
                Older sets in stock
              </Link>
              <Link href={`/${r.region}/price-moves`} prefetch={false} className="chip min-h-10">
                Price moves
              </Link>
              <Link href={`/${r.region}/charts`} prefetch={false} className="chip min-h-10">
                Weekly chart
              </Link>
              {QUICK_TYPES.map((slug) => {
                const t = PRODUCT_TYPES.find((x) => x.slug === slug)!;
                return (
                  <Link key={slug} href={`/${r.region}/type/${slug}`} prefetch={false} className="chip min-h-10">
                    {t.plural}
                  </Link>
                );
              })}
            </nav>
            {/* The stat line as chips (2026-11-08, the KaeYoung / ScentCompare hero). */}
            <p className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="hero-stat">
                <span className="h-2 w-2 shrink-0 rounded-full bg-open" aria-hidden="true" />
                <b className="tabular">{storeCount.toLocaleString("en")}</b> stores
              </span>
              <span className="hero-stat">
                <b className="tabular">{overview.inStock.toLocaleString("en")}</b> in stock
              </span>
              {/* A live <time>: the page is cached for a day, so a fixed "3 hours ago" would freeze. */}
              <span className="hero-stat">checked {overview.lastChecked ? <Ago iso={overview.lastChecked.toISOString()} initial={timeAgo(overview.lastChecked)} /> : "twice a day"}</span>
            </p>
          </div>
          {heroCards.length > 0 && (
            <aside aria-labelledby="hot-now">
              <h2 id="hot-now" className="eyebrow mb-3">
                Hot right now
              </h2>
              {/* Two big product cards (owner, 2026-11-08: "feature some products on the hero", as KaeYoung and ScentCompare do). */}
              <HeroCards cards={heroCards} region={r.region} />
            </aside>
          )}
        </div>
      </section>

      {/* The page carries two strips of its own (sealed, chase cards): no third one above the footer. */}
      <NoPreFooter />
      <div className="page">
        {/* The next set on pre-order, when there is one: its hub, the page people compare pre-orders on (components/PreorderBanner). */}
        <div className="mt-8 grid gap-3">
          <PreorderBanner region={r.region} />
          {inSeason(new Date().toISOString().slice(0, 10)) && (
            <Link
              href={`/${r.region}/black-friday`}
              prefetch={false}
              className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-shadow hover:shadow-lift"
            >
              <span>
                <span className="font-display text-lg font-bold">Black Friday deals in {r.inName}</span>
                <span className="block text-sm text-muted">Every product furthest under the median store price today, biggest gap first.</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-brand-strong">See the deals →</span>
            </Link>
          )}
          {salesInSeason(CORE_SALES, new Date().toISOString().slice(0, 10)).map((sale) => (
            <Link
              key={sale.slug}
              href={`/${r.region}/${sale.slug}`}
              prefetch={false}
              className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-shadow hover:shadow-lift"
            >
              <span>
                <span className="font-display text-lg font-bold">{sale.linkLabel} in {r.inName}</span>
                <span className="block text-sm text-muted">Every product furthest under the median store price today, biggest gap first.</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-brand-strong">See the deals →</span>
            </Link>
          ))}
        </div>
        <PremiumSlides className="mt-8" />
        <HypeNow region={r.region} />
        {/* Paid featured listings (lib/featured-ads.ts): drawn in the browser from RiftCompare's feed, nothing when there are none. */}
        <FeaturedAds region={r.market} className="mt-8" />
        {deals.length > 0 && (
          <Section title={dealsCopy.rail} kicker={dealsCopy.railKicker} href={`/${r.region}/deals`} linkLabel="All deals">
            <ProductRail products={deals} region={r.region} eager={4} label={dealsCopy.rail} />
          </Section>
        )}

        {/* The weekly price-drops email, one field (components/WeeklyDropsBox.tsx, 2026-11-12). */}
        {weeklyBoxLive() && <WeeklyDropsBox site={ALERT_SITE_KEY} region={r.market} siteName="DexCompare" placement="home" className="mt-10 max-w-2xl" buttonClassName="btn-primary" />}
        {/* The page's first eBay unit, under the deals rail: sealed listings as an image strip (imported from eBay once a day, fetched in the
            browser once it is near the viewport), with the owner's hot set as its highlighted button; with none to list, the compact CTA row.
            The chase-card strip follows the booster-box rail, far enough down that the two never share a phone screen. */}
        <EbayStrip region={r.region} context="sealed" placement="listings-home-sealed" className="mt-14" search={{ kind: "sealed", query: "" }} highlight={hotHighlight} />

        {latestSets.length > 0 && (
          <Section title="Latest sets" kicker="New & upcoming" href={`/${r.region}/sets`} linkLabel="All sets">
            <div className="grid gap-4 md:grid-cols-2">
              {latestSets.map((s) => (
                <SetCard key={s.code} r={r} s={s} items={bySet.get(s.code) ?? []} />
              ))}
            </div>
          </Section>
        )}

        {preorders.length > 0 && (
          <Section
            title="Open for pre-order"
            kicker="Upcoming sets"
            href={preorderGuide ? `/${r.region}/preorders/${preorderGuide.set.slug}` : `/${r.region}/releases`}
            linkLabel={preorderGuide ? `Compare ${preorderGuide.set.name} pre-orders` : "Release calendar"}
          >
            <ProductGrid products={preorderShelf} region={r.region} />
          </Section>
        )}

        <Section title="New Pokémon set guides" kicker="Sets, chase cards and mechanics" href={`/${r.region}/guides`} linkLabel="All guides">
          <LatestGuides region={r.region} />
        </Section>

        <Section title="Booster boxes in stock" kicker="Newest sets first" href={`/${r.region}/type/booster-boxes`}>
          {boxes.length ? (
            <ProductGrid products={boxes} region={r.region} />
          ) : (
            <Empty actions={[preorderLink, { href: `/${r.region}/type/booster-boxes`, label: "All booster boxes" }, { href: `/${other.region}/type/booster-boxes`, label: `Booster boxes in ${other.inName}` }]}>
              No booster boxes in stock right now.
            </Empty>
          )}
          <p className="mt-4 text-sm text-muted">
            How do booster box prices in {r.inName} compare with the other six markets?{" "}
            <Link href={COUNTRY_GUIDE.path} prefetch={false} className="font-semibold text-brand hover:underline">
              Booster box prices by country →
            </Link>
          </p>
        </Section>

        {/* The second unit: chase cards, after the booster-box rail (a viewport and more below the sealed strip). */}
        <EbayStrip region={r.region} context="chase" placement="listings-home" className="mt-14" search={{ kind: "card", query: "" }} />

        <Section title="Elite Trainer Boxes in stock" kicker="Newest sets first" href={`/${r.region}/type/elite-trainer-boxes`}>
          {etbs.length ? (
            <ProductGrid products={etbs} region={r.region} />
          ) : (
            <Empty actions={[preorderLink, { href: `/${r.region}/type/elite-trainer-boxes`, label: "All ETBs" }, { href: `/${other.region}/type/elite-trainer-boxes`, label: `ETBs in ${other.inName}` }]}>
              No Elite Trainer Boxes in stock right now.
            </Empty>
          )}
        </Section>

        {/* Real sealed products on TCGplayer (2026-10-28), after the ETB rail: well below the comparison above it. */}
        <TcgplayerStrip tiles={tcgTiles} region={r.region} placement="tcgplayer-strip-home" title="Pokémon sealed on TCGplayer" className="mt-14" />

        <RegionReport rep={report} />
        <RegionsCompared reports={reports} />
        {older.length > 0 && (
          <Section title="Older sets still in stock" kicker="Released 18+ months ago" href={`/${r.region}/out-of-print`} linkLabel="All older sets in stock">
            <p className="-mt-2 mb-4 max-w-2xl text-sm text-muted">
              Booster boxes, Elite Trainer Boxes and bundles from older sets that {r.adjective} stores, often local game stores, still have on the shelf. Today&rsquo;s stock and price only; older product&rsquo;s prices can move.
            </p>
            <ol className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))]">
              {older.slice(0, 4).map((g) => (
                <li key={g.set.code}>
                  <StockRow p={g.items[0]} r={r} />
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Every set listed here, so every set page is two clicks from the landing page and its products three (2026-10-25). */}
        <SetIndex r={r} counts={setCounts} types={listedTypes} />
        <HowItWorks r={r} stores={storeCount} />
        <section aria-labelledby="today-h" className="mt-16 max-w-3xl">
          <h2 id="today-h" className="font-display text-xl font-bold tracking-tight">
            Pokémon sealed prices in {r.inName} today
          </h2>
          <HubSummaryText title={`Pokémon sealed prices in ${r.inName} today`} paragraphs={summary.paragraphs} />
        </section>
        <HubFaqSection faq={summary.faq} />
        {/* The site's own star score and approved reviews (owner, 2026-11-03), loaded in the browser; nothing until there is a rating. */}
        <SiteReviews />
        <CompareOtherTcgs />
        {/* The visitor's own recently viewed products, from this browser's storage: rendered at the end, so nothing above moves. */}
        <RecentlyViewed region={r.region} />

        {overview.products === 0 && (
          <div className="mt-10">
            <Empty actions={[{ href: `/${other.region}`, label: `DexCompare ${other.name}` }]}>We&rsquo;re still reading {r.adjective} stores for the first time. Check back shortly.</Empty>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A latest-set card: its header links to the set (the logo, or, for a set with none yet, its booster box or ETB on a plate), and each
 * headline product is its own row linking to its page.
 */
function SetCard({ r, s, items: all }: { r: RegionInfo; s: PokemonSet; items: ProductCardData[] }) {
  const order = ["Booster Box", "Elite Trainer Box", "Booster Bundle"];
  const items = all
    .filter((p) => p.productType !== "Pokémon Center Elite Trainer Box")
    .sort((a, b) => order.indexOf(a.productType) - order.indexOf(b.productType))
    .slice(0, 3);
  const pre = isPreorderSet(s.code);
  const art = s.logo ? null : thumb(all.find((p) => p.imageUrl && (p.productType === "Booster Box" || p.productType === "Elite Trainer Box"))?.imageUrl, 200);
  return (
    <div className="card flex flex-col overflow-hidden">
      <Link href={`/${r.region}/sets/${s.slug}`} prefetch={false} className="group flex min-h-[4.5rem] items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-raised sm:px-5">
        <span className="flex min-w-0 items-center gap-3">
          {s.logo ? (
            <img src={s.logo} alt={`${s.name} logo`} width={96} height={40} className="h-10 w-24 shrink-0 object-contain" loading="lazy" decoding="async" />
          ) : art ? (
            <span className="plate flex h-12 w-12 shrink-0 items-center justify-center">
              <img src={art} alt={s.name} width={48} height={48} className="h-full w-full object-contain p-1" loading="lazy" decoding="async" />
            </span>
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-display font-bold text-brand-strong">{s.name.slice(0, 1)}</span>
          )}
          <span className="min-w-0">
            <span className="block font-display text-lg font-bold leading-tight group-hover:text-brand">{s.name}</span>
            <span className="block text-xs text-faint">
              {pre ? "Releases" : "Released"} {formatRelease(s.releaseDate)}
            </span>
          </span>
        </span>
        {pre ? (
          <span className="sp sp-pre shrink-0">Pre-order</span>
        ) : (
          <Icon name="arrow-right" size={18} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
        )}
      </Link>
      <ul className="divide-y divide-line border-t border-line">
        {items.length ? (
          items.map((p) => (
            <li key={p.slug}>
              <Link href={`/${r.region}/p/${p.slug}`} prefetch={false} className="flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-raised sm:px-5">
                <span className="text-muted">{p.productType}</span>
                <span className="tabular text-right font-semibold">
                  {cardOpen(p) ? (
                    <>
                      <span className="block text-xs font-normal text-muted sm:inline sm:text-sm">
                        {stockLabel(p)}
                        <span className="hidden sm:inline font-normal text-faint"> · </span>
                      </span>
                      {money(p.lowestPriceCents, r.market)}
                    </>
                  ) : (
                    <span className="text-faint">{stockHeadline(p).text}</span>
                  )}
                </span>
              </Link>
            </li>
          ))
        ) : (
          <li>
            <Link href={`/${r.region}/sets/${s.slug}`} prefetch={false} className="flex min-h-11 items-center px-4 py-2.5 text-sm text-muted hover:bg-raised sm:px-5">
              See every {s.name} product
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}

function HowItWorks({ r, stores }: { r: RegionInfo; stores: number }) {
  const steps: { icon: IconName; t: string; d: React.ReactNode }[] = [
    {
      icon: "store",
      t: "We read the stores",
      d: (
        <>
          Twice a day, the sealed Pokémon listings of{" "}
          <Link href={`/${r.region}/stores`} prefetch={false} className="font-medium text-brand-strong underline-offset-2 hover:underline">
            {plural(stores, `${r.adjective} store`)}
          </Link>
          {r.market === "US" ? " and TCGplayer’s sellers" : ""}, in {r.currency}.
        </>
      ),
    },
    { icon: "check", t: "You see who has it", d: "Every product page lists who carries it, in stock or sold out, cheapest in-stock price first." },
    { icon: "arrow-right", t: "You buy from the store", d: "Click through and buy on the store’s own page. No store pays to rank higher." },
  ];
  return (
    <section className="mt-16" aria-labelledby="how">
      <h2 id="how" className="font-display text-xl font-bold tracking-tight">
        How DexCompare works
      </h2>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((s) => (
          <li key={s.t} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
              <Icon name={s.icon} size={18} />
            </span>
            <div>
              <h3 className="font-display font-bold">{s.t}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
