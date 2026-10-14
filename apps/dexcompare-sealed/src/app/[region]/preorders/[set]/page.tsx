import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { Ago } from "@/components/Ago";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { OfferTable } from "@/components/OfferTable";
import { Empty, Section } from "@/components/Section";
import { lastCheckedAt, setOfferGroups, type SetOfferGroup } from "@/lib/data";
import { cardOpen } from "@/lib/compact";
import { money, plural, relativeDay, timeAgo } from "@/lib/format";
import { packsForLabel, perPackCents } from "@/lib/packs";
import { guideShowsMsrp, preorderGuideBySlug, type PreorderGuide } from "@/lib/preorder-guides";
import { formatRelease, isPreorderSet } from "@/lib/release";
import { regionOrNotFound, type RegionInfo } from "@/lib/regions";
import { RRP_NOTE, usMsrpCents } from "@/lib/rrp";
import { offerStock } from "@/lib/sealed-offers";
import { jsonLd, pageMeta, regionAlternates } from "@/lib/seo";
import { TYPE_BY_KEY, TYPE_BY_LABEL } from "@/lib/sealed-title";
import { type PokemonSet } from "@/lib/sets";
import { SITE_URL } from "@/lib/site";

// ─────────────────────────────────────────────────────────────────────────────
// /<region>/preorders/<set> — the same box, at every store, before it ships.
// ─────────────────────────────────────────────────────────────────────────────
// Ported from Rift Compare's /radiance-preorders (its biggest pre-release
// landing page). Pre-order is the one window where the product is identical at
// every store (nobody has opened one), so price is the only variable, and the
// spread between stores is at its widest.
//
// EVERY PRICE HERE IS A PRE-ORDER, and the page says so in the heading, on each
// row (StockPill "Pre-order") and in its structured data (schema.org PreOrder,
// never InStock). A set is a pre-order until its lib/sets.ts releaseDate
// (isPreorderSet): from release day this page says the set is out, points at the
// set page, is noindexed and leaves the sitemap — it retires itself.
//
// The facts (dates, contents) are lib/preorder-guides.ts's, sourced and dated;
// US MSRP is lib/rrp.ts's and printed on the US page only, as everywhere else.
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

type Params = { params: { region: string; set: string } };

const getGroups = cache((market: RegionInfo["market"], setCode: string) => setOfferGroups(market, setCode));

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const r = regionOrNotFound(params.region);
  const found = preorderGuideBySlug(params.set);
  if (!found) return {};
  const { set } = found;
  const pre = isPreorderSet(set.code);
  return pageMeta({
    title: `${set.name} pre-order prices in ${r.name}: booster box & ETB`,
    description: pre
      ? `Pokémon ${set.name} pre-orders at every ${r.adjective} store we track — booster boxes, Elite Trainer Boxes and bundles, cheapest first in ${r.currency}. Out ${formatRelease(set.releaseDate)}.`
      : `Pokémon ${set.name} released on ${formatRelease(set.releaseDate)}. See live ${set.name} sealed prices across ${r.adjective} stores.`,
    path: `/${r.region}/preorders/${set.slug}`,
    // Every region's copy carries the facts, the dates and that market's price
    // lists, so all seven are advertised while the set is upcoming.
    alternates: pre ? regionAlternates(r.region, `/preorders/${set.slug}`) : undefined,
    image: set.logo,
    noindex: !pre,
  });
}

/** The cheapest open offer of a product, from its ranked offers (open first, cheapest first). */
function cheapestOpen(g: SetOfferGroup, now: number) {
  const o = g.offers[0];
  return o && offerStock(o, now) === "open" ? o : null;
}

function faqs(set: PokemonSet, guide: PreorderGuide, r: RegionInfo) {
  const boxMsrp = r.market === "US" ? usMsrpCents("booster-box", set.code) : null;
  const etb = guide.products.find((p) => p.type === "etb");
  return [
    {
      q: `When does Pokémon ${set.name} release?`,
      a: `${formatRelease(set.releaseDate)} in English, per The Pokémon Company.${guide.prereleaseFrom ? ` Prerelease events at participating stores start ${formatRelease(guide.prereleaseFrom)}` : ""}${guide.liveDate ? `${guide.prereleaseFrom ? ", and" : ""} Pokémon TCG Live gets the set on ${formatRelease(guide.liveDate)}` : ""}${guide.prereleaseFrom || guide.liveDate ? "." : ""} Stores may ship pre-orders a few days either side of the street date.`,
    },
    {
      q: `How much does a ${set.name} booster box cost to pre-order?`,
      a: `Each store sets its own pre-order price, and they differ more before release than at any other time, because nothing has shipped and every store is picking an opening number. This page lists every ${r.adjective} store we track that is taking ${set.name} pre-orders, cheapest first, in ${r.currency}.${boxMsrp ? ` The Pokémon Company's US list price for the 36-pack booster display is ${money(boxMsrp, "US")}.` : ""}`,
    },
    {
      q: "Is it cheaper to pre-order or to wait until release?",
      a: "It depends what you want. Sealed product usually sits at or near its list price during pre-orders and can climb at launch if demand outruns a store's allocation; single cards are almost always cheapest a few weeks after release, once supply settles. If you want to open product, pre-ordering at a fair price is reasonable; if you want particular cards, waiting for singles is usually cheaper.",
    },
    {
      q: "Are pre-order prices final?",
      a: "No. A pre-order price is what the store asks today, and stores change them before release, up or down, as their allocation firms up; a store can also cut or delay an allocation. We read the stores about twice a day, and nothing here is a promise from the store or from us. Confirm the price and the store's pre-order terms at checkout.",
    },
    ...(etb
      ? [
          {
            q: `What comes in the ${set.name} Elite Trainer Box?`,
            a: `${etb.contents.replace(/^./, (c) => c.toUpperCase())}, as The Pokémon Company announced it for the set.`,
          },
        ]
      : []),
    {
      q: "Do these prices include shipping?",
      a: "No. They are each store's listed item price in its own currency. A sealed box ships as a parcel, so check the store's checkout for postage before comparing two close prices.",
    },
  ];
}

export default async function PreorderPage({ params }: Params) {
  const r = regionOrNotFound(params.region);
  const found = preorderGuideBySlug(params.set);
  if (!found) notFound();
  const { guide, set } = found;
  const pre = isPreorderSet(set.code);
  const [groups, checked] = await Promise.all([pre ? getGroups(r.market, set.code) : Promise.resolve([]), lastCheckedAt(r.market)]);
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const listed = groups.filter((g) => g.offers.length > 0);
  const open = listed.filter((g) => cardOpen(g.product));
  const FAQS = faqs(set, guide, r);
  const path = `/${r.region}/preorders/${set.slug}`;

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${set.name} pre-order prices in ${r.name}`,
      url: `${SITE_URL}${path}`,
    },
    // PreOrder availability, never InStock: none of this has shipped.
    ...(open.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Pokémon ${set.name} pre-orders in ${r.name}`,
            url: `${SITE_URL}${path}`,
            itemListElement: open.slice(0, 30).map((g, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Product",
                name: g.product.name,
                url: `${SITE_URL}/${r.region}/p/${g.product.slug}`,
                ...(g.product.imageUrl ? { image: g.product.imageUrl } : {}),
                offers: {
                  "@type": "AggregateOffer",
                  availability: "https://schema.org/PreOrder",
                  priceCurrency: r.currency,
                  lowPrice: ((g.product.lowestPriceCents ?? 0) / 100).toFixed(2),
                  offerCount: g.offers.filter((o) => offerStock(o, now) === "open").length,
                },
              },
            })),
          },
        ]
      : []),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { href: `/${r.region}/releases`, label: "Releases" }, { label: `${set.name} pre-orders` }]} />

      <span className="inline-flex rounded-full bg-pre-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-pre">
        {pre ? `Pre-order · releases ${formatRelease(set.releaseDate)}` : `Released ${formatRelease(set.releaseDate)}`}
      </span>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        Pokémon {set.name} pre-order prices in {r.name}
      </h1>
      {pre ? (
        <p className="mt-2 max-w-2xl text-muted">
          {guide.fullName} is out {relativeDay(set.releaseDate, today)}, so every store is picking its own opening price — and they pick very different
          ones. Below is every {set.name} product {r.adjective} stores we track are taking pre-orders on, each with its stores cheapest first, in{" "}
          {r.currency}.
          {checked && (
            <>
              {" "}
              Prices checked <Ago iso={checked.toISOString()} initial={timeAgo(checked)} />.
            </>
          )}
        </p>
      ) : (
        <p className="mt-2 max-w-2xl text-muted">
          {set.name} has released, so its products are priced alongside every other set:{" "}
          <Link href={`/${r.region}/sets/${set.slug}`} prefetch={false} className="font-semibold text-brand hover:underline">
            see live {set.name} prices in {r.name}
          </Link>
          .
        </p>
      )}

      {pre && open.length > 0 && <AtAGlance r={r} groups={open} now={now} />}

      {pre &&
        (listed.length ? (
          <Section title={`${set.name} pre-orders by product`} kicker={`${plural(listed.length, "product")} listed in ${r.name}`}>
            <div className="grid gap-8">
              {listed.map((g) => (
                <ProductPrices key={g.product.slug} g={g} r={r} guide={guide} />
              ))}
            </div>
            <p className="mt-4 max-w-3xl text-xs text-muted">
              Every price on this page is a pre-order: the product ships on or after {formatRelease(set.releaseDate)}. Sold-out rows are stores whose
              pre-order allocation has gone; they stay listed so you can see who had it.
            </p>
          </Section>
        ) : (
          <Section title={`No ${set.name} pre-orders in ${r.name} yet`}>
            <Empty>
              We list pre-orders as soon as the stores we track publish them, and none have appeared in {r.name} yet. This page fills in on its own
              — nothing here is ever an estimate or a placeholder price.{" "}
              <Link href={`/${r.region}/sealed`} prefetch={false} className="font-semibold text-brand hover:underline">
                Sealed you can buy today
              </Link>
            </Empty>
          </Section>
        ))}

      <Section title={`What each ${set.name} product is`} kicker={`${guide.cardCount} · headlined by ${guide.headliners[0]}`}>
        <p className="max-w-3xl text-sm text-muted">
          Stores list the same product under different names, so here is what is in each box. Contents are from The Pokémon Company&rsquo;s
          announcement{r.market === "US" ? "; list prices are TPCi's US MSRP" : ""}.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {guide.products.map((p) => {
            const t = TYPE_BY_KEY.get(p.type);
            const msrp = r.market === "US" && p.msrp !== false ? usMsrpCents(p.type, set.code) : null;
            return (
              <div key={p.type} className="card p-4">
                <dt className="font-semibold">{t?.label ?? p.type}</dt>
                {msrp != null && <dd className="mt-0.5 text-xs font-semibold text-pre">US MSRP {money(msrp, "US")}</dd>}
                <dd className="mt-1.5 text-sm leading-6 text-muted">{p.contents}.</dd>
              </div>
            );
          })}
        </dl>
        {r.market === "US" && <p className="mt-3 text-xs text-muted">{RRP_NOTE}</p>}
      </Section>

      {pre && (
        <Section title={`When to pre-order ${set.name} — and when to wait`}>
          <div className="card max-w-3xl p-6 text-sm leading-6 text-muted">
            <p>
              Two dates move these prices before release.
              {guide.prereleaseFrom && (
                <>
                  {" "}
                  <strong className="text-ink">Prerelease events start {formatRelease(guide.prereleaseFrom)}</strong> at participating stores, which is
                  when the first {set.name} cards change hands and the chase cards get a price.
                </>
              )}{" "}
              Then <strong className="text-ink">{formatRelease(set.releaseDate)} is release day</strong>, when pre-orders ship and stores without an
              allocation start listing what they could get.
            </p>
            <ul className="mt-4 grid gap-2">
              <li>
                <strong className="text-ink">Want to open product?</strong> Pre-ordering is reasonable, because allocation — not price — is what runs
                out. The spread between the cheapest and dearest store above is the whole case for comparing first: it is the same sealed box
                either way.
              </li>
              <li>
                <strong className="text-ink">Want particular cards?</strong> Waiting is usually cheaper. Singles are at their most volatile around
                Prerelease and release week, when supply is a handful of opened boxes, and they typically settle a few weeks after release.
              </li>
              <li>
                <strong className="text-ink">Ordering from a store you haven&rsquo;t used?</strong> Read its pre-order terms before you pay: when it
                charges, whether it ships on release day, and what happens if its allocation is cut.
              </li>
            </ul>
            <p className="mt-4">
              We don&rsquo;t forecast prices and won&rsquo;t tell you the number is going up. What this page can tell you is what every store we
              track is asking right now, in your currency.
            </p>
          </div>
        </Section>
      )}

      <Section title={`${set.name} key dates`}>
        <ul className="card max-w-3xl divide-y divide-line">
          {guide.prereleaseFrom && <DateRow label="Prerelease events begin" iso={guide.prereleaseFrom} today={today} />}
          {guide.liveDate && <DateRow label="Pokémon TCG Live" iso={guide.liveDate} today={today} />}
          <DateRow label="Release (English)" iso={set.releaseDate} today={today} />
        </ul>
      </Section>

      <div className="mt-10 flex flex-wrap gap-2 text-sm">
        <Link href={`/${r.region}/sets/${set.slug}`} prefetch={false} className="chip py-2">
          All {set.name} products
        </Link>
        <Link href={`/${r.region}/releases`} prefetch={false} className="chip py-2">
          Pokémon release calendar
        </Link>
        <Link href={`/${r.region}/type/booster-boxes`} prefetch={false} className="chip py-2">
          Booster boxes in stock
        </Link>
        <Link href={`/${r.region}/type/elite-trainer-boxes`} prefetch={false} className="chip py-2">
          Elite Trainer Boxes in stock
        </Link>
      </div>

      <section className="mt-14 max-w-3xl" aria-labelledby="faq">
        <h2 id="faq" className="font-display text-2xl font-bold tracking-tight sm:text-[28px]">
          Frequently asked questions
        </h2>
        <div className="mt-5 grid gap-3">
          {FAQS.map((f) => (
            <details key={f.q} className="card p-5">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-2 text-sm leading-6 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-8 max-w-3xl text-xs text-faint">
        Sources, checked {formatRelease(guide.checked)}:{" "}
        {guide.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && " · "}
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
              {s.label}
            </a>
          </span>
        ))}
        .
      </p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
    </div>
  );
}

function DateRow({ label, iso, today }: { label: string; iso: string; today: string }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right">
        <time dateTime={iso} className="font-semibold">
          {formatRelease(iso)}
        </time>{" "}
        <span className="text-xs text-faint">({relativeDay(iso, today)})</span>
      </span>
    </li>
  );
}

/** One row per product: its cheapest pre-order, per pack where the pack count is fixed, and how many stores have it open. */
function AtAGlance({ r, groups, now }: { r: RegionInfo; groups: SetOfferGroup[]; now: number }) {
  return (
    <div className="card mt-6 overflow-hidden">
      <table className="w-full text-sm">
        <caption className="sr-only">Cheapest pre-order per product</caption>
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-semibold">Product</th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">Cheapest pre-order</th>
            <th scope="col" className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Per pack</th>
            <th scope="col" className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Stores</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {groups.map((g) => {
            const best = cheapestOpen(g, now);
            const packs = packsForLabel(g.product.productType, g.product.setCode, g.product.name);
            const perPack = best ? perPackCents(best.priceCents, packs) : null;
            return (
              <tr key={g.product.slug}>
                <th scope="row" className="px-4 py-2.5 text-left font-medium">
                  <a href={`#${g.product.slug}`} className="hover:text-brand">
                    {g.product.name}
                  </a>
                </th>
                <td className="tabular px-4 py-2.5 text-right font-semibold">{best ? money(best.priceCents, r.market) : "—"}</td>
                <td className="tabular hidden px-4 py-2.5 text-right text-muted sm:table-cell">{perPack != null ? money(perPack, r.market) : "—"}</td>
                <td className="tabular hidden px-4 py-2.5 text-right text-muted sm:table-cell">
                  {g.product.inStockStores}
                  {g.product.marketplaceOpen ? " + TCGplayer" : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProductPrices({ g, r, guide }: { g: SetOfferGroup; r: RegionInfo; guide: PreorderGuide }) {
  const type = TYPE_BY_LABEL.get(g.product.productType);
  const packs = packsForLabel(g.product.productType, g.product.setCode, g.product.name);
  const msrp = r.market === "US" && type && guideShowsMsrp(guide, type.key) ? usMsrpCents(type.key, guide.setCode) : null;
  const stores = g.offers.filter((o) => !o.marketplace).length;
  return (
    <section id={g.product.slug} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-xl font-bold">
          <Link href={`/${r.region}/p/${g.product.slug}`} prefetch={false} className="hover:text-brand">
            {g.product.name}
          </Link>
        </h3>
        <span className="text-sm text-muted">
          {g.product.inStockStores
            ? `Pre-order open at ${plural(g.product.inStockStores, "store")}${g.product.marketplaceOpen ? " + TCGplayer" : ""}`
            : g.product.marketplaceOpen
              ? `On TCGplayer${stores ? "; sold out at every store" : ""}`
              : "Sold out everywhere we track"}
          {msrp != null && ` · US MSRP ${money(msrp, "US")}`}
        </span>
      </div>
      <OfferTable offers={g.offers} region={r.region} preorder packs={packs} placement="preorders" />
    </section>
  );
}
