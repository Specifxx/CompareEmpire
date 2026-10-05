import Link from "next/link";
import type { Metadata } from "next";
import { regionOrNotFound } from "@/lib/regions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AdPill, EbayBanner, EbaySearchLink, NoPreFooter } from "@/components/Ebay";
import { ListingsStrip } from "@/components/ListingsStrip";
import { Empty } from "@/components/Section";
import { calendarProducts, CALENDAR_TYPES, setCounts } from "@/lib/data";
import { ebayLabel } from "@/lib/affiliate";
import { releaseLinkIndexes } from "@/lib/ebay-ads";
import { money, plural, relativeDay } from "@/lib/format";
import { formatRelease } from "@/lib/release";
import { jsonLd, pageMeta, regionAlternates } from "@/lib/seo";
import { SETS, type PokemonSet } from "@/lib/sets";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400;

// How far back the calendar looks: a set is "new" for four months, long enough
// for the second wave and the pre-orders to settle into stock.
const RECENT_DAYS = 120;

export function generateMetadata({ params }: { params: { region: string } }): Metadata {
  const r = regionOrNotFound(params.region);
  return pageMeta({
    title: `Pokémon TCG release calendar — new & upcoming sets in ${r.name}`,
    description: `Upcoming and recent Pokémon TCG set releases with dates, and which ${r.adjective} stores have their booster boxes, ETBs and bundles in stock or on pre-order.`,
    path: `/${r.region}/releases`,
    alternates: regionAlternates(r.region, "/releases"),
  });
}

/** Sets released in the last RECENT_DAYS days or still to come, newest first (SETS is already newest first). */
function calendarSets(today: string, sets: PokemonSet[] = SETS): PokemonSet[] {
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - RECENT_DAYS * 86400_000).toISOString().slice(0, 10);
  return sets.filter((s) => s.releaseDate >= since);
}

export default async function ReleasesPage({ params }: { params: { region: string } }) {
  const r = regionOrNotFound(params.region);
  const today = new Date().toISOString().slice(0, 10);
  const sets = calendarSets(today);
  const [counts, cheapest] = await Promise.all([setCounts(r.market), calendarProducts(r.market, sets.map((s) => s.code))]);
  const upcoming = sets.filter((s) => s.releaseDate > today);
  const recent = sets.filter((s) => s.releaseDate <= today);

  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Pokémon TCG release calendar (${r.name})`,
    itemListElement: sets.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      url: `${SITE_URL}/${r.region}/sets/${s.slug}`,
    })),
  };

  // A search link on every sixth card (none in the last six, so none on a short calendar): see releaseLinkIndexes.
  const ebayAt = releaseLinkIndexes(upcoming.length + recent.length);
  const Row = ({ s, future, n }: { s: PokemonSet; future: boolean; n: number }) => {
    const c = counts.get(s.code);
    const picks = cheapest.get(s.code) ?? [];
    return (
      <li className="card flex flex-col gap-4 p-5 md:flex-row md:items-start md:gap-6">
        <div className="md:w-56 md:shrink-0">
          <div className={`text-sm font-semibold ${future ? "text-pre" : "text-open"}`}>
            {relativeDay(s.releaseDate, today).replace(/^./, (ch) => ch.toUpperCase())}
          </div>
          <time dateTime={s.releaseDate} className="mt-0.5 block font-display text-xl font-bold">
            {formatRelease(s.releaseDate)}
          </time>
          <div className="mt-1 text-xs text-muted">{s.series}</div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl font-bold leading-tight">
            <Link href={`/${r.region}/sets/${s.slug}`} prefetch={false} className="hover:text-brand">
              {s.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-muted">
            {c ? (
              <>
                {plural(c.products, "product")} listed in {r.name} ·{" "}
                <span className={c.inStock ? `font-semibold ${future ? "text-pre" : "text-open"}` : ""}>
                  {c.inStock} {future ? "open for pre-order" : "in stock"}
                </span>
              </>
            ) : (
              `No ${r.adjective} store we track lists it yet.`
            )}
          </p>
          {picks.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {CALENDAR_TYPES.map((t) => picks.find((p) => p.productType === t)).map(
                (p) =>
                  p && (
                    <li key={p.slug}>
                      <Link href={`/${r.region}/p/${p.slug}`} prefetch={false} className="chip py-2">
                        <span className="text-muted">{p.productType}</span>
                        <span className="tabular font-semibold">{money(p.lowestPriceCents, r.market)}</span>
                        <span className="text-xs text-muted">{p.inStockStores ? plural(p.inStockStores, "store") : "TCGplayer"}</span>
                      </Link>
                    </li>
                  ),
              )}
            </ul>
          )}
          {ebayAt.has(n) && (
            <div data-ad="releases-card" className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <AdPill />
              <EbaySearchLink region={r.region} query={s.name} placement="releases-card" className="font-semibold text-brand hover:underline">
                Search {s.name} on eBay <span aria-hidden="true">↗</span>
              </EbaySearchLink>
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { label: "Releases" }]} />
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Pokémon TCG release calendar</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Sets released in the last {RECENT_DAYS} days and the ones still to come, with what {r.adjective} stores have in stock or open for pre-order today.
        Release dates are the English-language dates from The Pokémon Company; stores may ship pre-orders a few days either side.
      </p>

      <section className="mt-10" aria-labelledby="upcoming">
        <h2 id="upcoming" className="mb-4 font-display text-2xl font-bold tracking-tight">
          Upcoming
        </h2>
        {upcoming.length ? (
          <ol className="grid gap-3">
            {[...upcoming].reverse().map((s, i) => (
              <Row key={s.code} s={s} future n={i} />
            ))}
          </ol>
        ) : (
          <Empty>No announced set is left to release. New ones appear here as soon as they are added.</Empty>
        )}
      </section>

      <section className="mt-12" aria-labelledby="recent">
        <h2 id="recent" className="mb-4 font-display text-2xl font-bold tracking-tight">
          Just released
        </h2>
        {recent.length ? (
          <ol className="grid gap-3">
            {recent.map((s, i) => (
              <Row key={s.code} s={s} future={false} n={upcoming.length + i} />
            ))}
          </ol>
        ) : (
          <Empty>Nothing released in the last {RECENT_DAYS} days.</Empty>
        )}
      </section>

      <p className="mt-8 text-sm text-muted">
        Older sets are on the{" "}
        <Link href={`/${r.region}/sets`} prefetch={false} className="font-semibold text-brand hover:underline">
          sets page
        </Link>
        .
      </p>
      {/* The page's closing banner stands in for the footer one, so two never sit back to back. */}
      <NoPreFooter />
      <ListingsStrip
        region={r.region}
        context="releases"
        variant="section"
        placement="listings-releases"
        className="mt-10"
        fallback={
          <EbayBanner
            region={r.region}
            variant="section"
            placement="releases-banner"
            title="Looking for a new set on eBay?"
            text={`Search Buy It Now listings for Pokémon sealed on ${ebayLabel(r.region)}.`}
          />
        }
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
    </div>
  );
}
