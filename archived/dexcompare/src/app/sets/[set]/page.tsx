import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SetCardGrid } from "@/components/SetCardGrid";
import { SetCompletion } from "@/components/SetCompletion";
import { SealedTile } from "@/components/SealedTile";
import { cardTileSelect } from "@/lib/cards";
import { priceField, DEFAULT_COUNTRY, COUNTRIES } from "@/lib/country";
import { SETS, setBySlug } from "@/lib/constants";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import { getSealedGroups } from "@/lib/sealed-import";
import { SITE_URL } from "@/lib/site";

// Rendered on the AU baseline server-side (country-neutral copy); the card tiles
// localise each visitor's price client-side from the three price columns in the
// card data. (The root layout is cookie-free, so this is genuine ISR — a stale
// comment here previously claimed otherwise and nearly misled a rebuild.)
export const revalidate = 86400;

// How many cards the grid renders. Was 400 — no set page needs 400
// server-rendered tiles (that's ~4× the payload and ~4× the row read for a grid
// nobody scrolls to the bottom of). The full set stays one click away via
// /browse?set=<code>, and the copy below reports the REAL total from a cheap
// count() so a truncated grid never misstates the set size.
const GRID_LIMIT = 100;

// Fixed prewarm head — NEVER scale this with the catalogue (173 sets today).
// The rest are generated on first request and then ISR-cached (dynamicParams
// defaults to true).
const PREWARM_SETS = 24;

// THE cache fix for this route: without `generateStaticParams` Next 14 never
// registers a dynamic route for ISR, so `revalidate` above was a silent no-op
// and every single request re-rendered this page against Postgres (it appeared
// in neither `routes` nor `dynamicRoutes` in .next/prerender-manifest.json).
// Declaring it — even when it returns [] — makes the route's ISR eligibility
// explicit, and the build then fails loudly if a dynamic API (cookies/headers/
// searchParams) ever creeps into the render. Mirrors card/[id].
//
// Params come from the DB (busiest sets first) rather than the static SETS list
// on purpose: it prewarms the sets that actually get traffic, AND it means a
// build with an unreachable database prerenders NOTHING instead of failing on
// the first page whose queries throw — the catch below returns [] and every set
// page is then generated on demand.
export async function generateStaticParams() {
  try {
    const busiest = await prisma.card.groupBy({
      by: ["setCode"],
      where: { hasLivePrice: true },
      _count: { setCode: true },
      orderBy: { _count: { setCode: "desc" } },
      take: PREWARM_SETS,
    });
    return busiest.flatMap((g) => {
      const slug = SETS.find((s) => s.code === g.setCode)?.slug;
      return slug ? [{ set: slug }] : [];
    });
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { set: string } }): Promise<Metadata> {
  const set = setBySlug(params.set);
  // The whole site renders dynamically (the layout reads the country cookie), so
  // notFound() can't return a hard 404 here; mark unknown slugs noindex so Google
  // never indexes the soft-404 (nothing links to them anyway).
  if (!set) notFound(); // real 404 — metadata resolves before streaming
  // Market-neutral title (no country) so it ranks globally; the page itself is
  // tailored to the visitor's market.
  const title = `Pokémon ${set.name} Cards — Cheapest Prices`;
  const description = `Every Pokémon ${set.name} card compared across stores — cheapest prices, full card list, and values, updated daily.`;
  return {
    title: { absolute: `${title} | DexCompare` },
    description,
    keywords: [
      `Pokémon ${set.name}`,
      `Pokémon ${set.name} prices`,
      `Pokémon ${set.name} card list`,
      `${set.name} card prices`,
      `cheapest Pokémon ${set.name} cards`,
      `Pokémon ${set.name} value`,
    ],
    alternates: { canonical: `/sets/${set.slug}` },
    openGraph: { title: `${title} | DexCompare`, description, url: `${SITE_URL}/sets/${set.slug}` },
  };
}

export default async function SetPage({ params }: { params: { set: string } }) {
  const set = setBySlug(params.set);
  if (!set) notFound();

  // Full catalogue record (series, release date) — SETS strips these, but they
  // give each of the 173 set pages unique, set-specific copy instead of a
  // paragraph that varies only by name.
  const meta = POKEMON_SETS.find((s) => s.code === set.code);
  const released = meta?.releaseDate
    ? new Date(meta.releaseDate.replace(/\//g, "-")).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const country = DEFAULT_COUNTRY; // AU baseline; client tiles localise the price

  // First GRID_LIMIT cards by collector number + the real set size. The count is
  // an index-only aggregate (cheap) and keeps the copy/FAQ honest when the grid
  // is truncated.
  const [cards, totalCards, priced] = await Promise.all([
    prisma.card.findMany({
      where: { setCode: set.code },
      orderBy: [{ collectorNumber: "asc" }],
      select: cardTileSelect(country),
      take: GRID_LIMIT,
    }),
    prisma.card.count({ where: { setCode: set.code } }),
    // Priced across the WHOLE set (was counted over the fetched page only, which
    // undercounted as soon as the grid truncated). AU baseline column, matching
    // pickPrice(card, DEFAULT_COUNTRY).
    prisma.card.count({ where: { setCode: set.code, [priceField(country)]: { not: null } } }),
  ]);
  const truncated = totalCards > cards.length;

  const otherSets = SETS.filter((s) => s.slug !== set.slug && !s.comingSoon);

  // Sealed products (booster boxes, ETBs, etc.) for this set — cross-links the
  // singles database to the sealed-product database, which today only links
  // the other way (sealed/[slug] already points back to sets/[set]).
  const sealed = set.comingSoon
    ? []
    : (await getSealedGroups(DEFAULT_COUNTRY)).filter((g) => g.setCode === set.code).slice(0, 4);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Database", item: `${SITE_URL}/browse` },
      { "@type": "ListItem", position: 3, name: set.name, item: `${SITE_URL}/sets/${set.slug}` },
    ],
  };
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Pokémon ${set.name} Card Prices & List`,
    url: `${SITE_URL}/sets/${set.slug}`,
    description: `Live prices for every Pokémon ${set.name} card.`,
    isPartOf: { "@type": "WebSite", name: "DexCompare", url: SITE_URL },
  };

  const faqs = set.comingSoon
    ? [
        {
          q: `When does Pokémon ${set.name} come out?`,
          a: `Pokémon ${set.name} hasn't released yet. DexCompare will list every ${set.name} card with live prices the moment the set drops — bookmark this page and check back soon.`,
        },
        {
          q: `How will I know when ${set.name} prices are live?`,
          a: `We update our price feeds daily. As soon as ${set.name} singles are stocked by stores we track, their prices will appear here automatically.`,
        },
      ]
    : [
        {
          q: `How many cards are in Pokémon ${set.name}?`,
          a: `Pokémon ${set.name} has ${totalCards} cards in our database${priced > 0 ? `, and ${priced} of them have live store prices right now` : ""}. Click any card to compare prices across stores and find the cheapest place to buy.`,
        },
        {
          q: `Where can I buy ${set.name} singles cheapest?`,
          a: `DexCompare compares live prices for every ${set.name} single across multiple ${["AU"].includes(DEFAULT_COUNTRY) ? "Australian" : ""} stores and ranks them by total delivered cost — so you always see the cheapest option including postage. Click any card to see the full store comparison.`,
        },
        {
          q: `How often do ${set.name} prices update?`,
          a: `Prices are refreshed with every import run — typically daily. Each store listing is checked for availability and current price, so you're always seeing the latest.`,
        },
        {
          q: `Are ${set.name} cards worth buying?`,
          a: `Value depends on the card's rarity, condition, and how much you're paying vs the market price. DexCompare shows you a TCGplayer market-price guide alongside live store prices so you can judge whether a listing is fairly priced before you buy.`,
        },
      ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="flex flex-col gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, collection, faqSchema]) }} />

      {/* Breadcrumb + hero */}
      <div>
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-300">Home</Link>
          <span>/</span>
          <Link href="/browse" className="hover:text-slate-300">Database</Link>
          <span>/</span>
          <span className="text-slate-300">{set.name}</span>
        </nav>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
          Pokémon {set.name} — card prices &amp; full list
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          {set.comingSoon ? (
            <>Pokémon <strong className="text-slate-200">{set.name}</strong>{released && meta ? <> releases on {released} as part of the {meta.series} series</> : <> isn&apos;t out yet</>}. This page will list every {set.name} card with live prices the moment it releases — check back soon.</>
          ) : (
            <>Browse all {totalCards} Pokémon <strong className="text-slate-200">{set.name}</strong> cards{released && meta ? <> from the <strong className="text-slate-200">{meta.series}</strong> series (released {released})</> : null} and compare live prices across stores to find the cheapest singles. {priced.toLocaleString()} cards are priced right now, updated daily — switch your country at the top to see local prices.</>
          )}
        </p>
      </div>

      {/* Collection progress for this set (renders only once the visitor owns a card) */}
      {cards.length > 0 && <SetCompletion cardIds={cards.map((c) => c.id)} setName={set.name} />}

      {/* Card grid */}
      {set.comingSoon || cards.length === 0 ? (
        <div className="card-surface grid place-items-center p-16 text-center text-slate-400">
          <div>
            <p className="text-lg font-semibold text-white">{set.name} cards aren&apos;t available yet</p>
            <p className="mt-1 text-sm">We&apos;ll have the full list with live prices as soon as the set drops.</p>
            <Link href="/browse" className="btn-primary mt-4">Browse released sets</Link>
          </div>
        </div>
      ) : (
        <div>
          <SetCardGrid cards={cards} />
          {/* The grid renders the first GRID_LIMIT cards by collector number; be
              explicit about it and hand the rest to /browse (which paginates)
              rather than server-rendering hundreds of tiles nobody scrolls to. */}
          {truncated && (
            <p className="mt-4 text-center text-sm text-slate-400">
              Showing the first {cards.length} of {totalCards} {set.name} cards.{" "}
              <Link href={`/browse?set=${set.code}`} className="text-brand-400 hover:underline">
                Browse every {set.name} card →
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Sealed products for this set — booster boxes, ETBs, etc. */}
      {sealed.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{set.name} sealed products</h2>
            <Link href={`/sealed?set=${set.code}`} className="text-sm text-brand-400 hover:text-brand-300">
              All {set.name} sealed →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {sealed.map((g) => (
              <SealedTile key={g.slug} group={g} currency={COUNTRIES[DEFAULT_COUNTRY].currency} />
            ))}
          </div>
        </section>
      )}

      {/* Internal links to the other sets (crawl + UX) */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Other Pokémon sets</h2>
        <div className="flex flex-wrap gap-2">
          {otherSets.map((s) => (
            <Link key={s.slug} href={`/sets/${s.slug}`} className="chip border border-ink-700 px-3 py-1.5 text-sm hover:border-brand-500">
              {s.name}
            </Link>
          ))}
          <Link href="/browse" className="chip border border-ink-700 px-3 py-1.5 text-sm hover:border-brand-500">All cards →</Link>
        </div>
      </section>

      {/* Keyword-relevant copy for search */}
      {!set.comingSoon && (
        <section className="card-surface p-6">
          <h2 className="text-xl font-extrabold text-white">About Pokémon {set.name}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            {set.name} is a set in the Pokémon Trading Card Game. DexCompare tracks live prices
            for every {set.name} card across stores so you can find the cheapest place
            to buy {set.name} singles — whether you&apos;re chasing a specific card or completing the set.
            Click any card to see every store&apos;s price ranked by total delivered cost.
          </p>
        </section>
      )}

      {/* FAQ — visible content backing the FAQPage structured data above. */}
      <section className="card-surface p-6">
        <h2 className="text-lg font-extrabold text-white">Pokémon {set.name} — FAQ</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold text-white">{f.q}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
