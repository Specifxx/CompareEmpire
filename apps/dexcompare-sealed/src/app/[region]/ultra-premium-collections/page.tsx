import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { Ago } from "@/components/Ago";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EbayStrip } from "@/components/EbayStrip";
import { HubFaqSection } from "@/components/HubSummary";
import { ProductGrid } from "@/components/ProductGrid";
import { Section } from "@/components/Section";
import { whereToBuy } from "@/content/guides/kit";
import { lastCheckedAt, type ProductCardData } from "@/lib/data";
import { money, plural, timeAgo } from "@/lib/format";
import { titleText } from "@/lib/hub-copy";
import { typePageData } from "@/lib/hub-data";
import { regionOrNotFound } from "@/lib/regions";
import { UPC_NAMES } from "@/lib/sealed-title";
import { itemListJsonLd, jsonLd, pageMeta, regionAlternates } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import type { Market } from "@/lib/regions";
import type { HubFaq } from "@/lib/hub-summary";

// /<region>/ultra-premium-collections: the Pokémon Ultra-Premium Collection (UPC) hub (2026-11-13, owner: "not a guide, a hub like
// Rift Compare's"). The newest two boxes, 30th Celebration Day and Night, side by side with their store counts; every curated UPC in
// stock below, cheapest first, sold out after; what the publisher says is inside; a short FAQ. Reads the type page's one capped query
// (the same cache key as /type/ultra-premium-collections) and shows only the twelve curated UPC names (lib/sealed-title.ts UPC_NAMES),
// never a store-noise duplicate. Own share card (app/og/upc). Rendered per request and kept by the CDN like every page.
export const dynamic = "force-dynamic";

const LABEL = "Ultra-Premium Collection";
const DAY = "30th Celebration Ultra-Premium Collection (Day)";
const NIGHT = "30th Celebration Ultra-Premium Collection (Night)";
const PATH = "/ultra-premium-collections";
const getData = cache((market: Market) => typePageData(market, LABEL));

const curated = (xs: ProductCardData[]) => xs.filter((p) => UPC_NAMES.includes(p.name));

export async function generateMetadata({ params }: { params: { region: string } }): Promise<Metadata> {
  const r = regionOrNotFound(params.region);
  const d = await getData(r.market);
  const open = curated(d.open);
  if (!open.length && !curated(d.sold).length) notFound();
  const from = open[0]?.lowestPriceCents ?? null;
  const title = "Pokémon Ultra-Premium Collection (UPC) prices";
  return {
    ...pageMeta({
      title: titleText(title),
      description: `Every Pokémon Ultra-Premium Collection, including the 30th Celebration Day and Night boxes, compared across ${r.adjective} stores${from != null ? `, from ${money(from, r.market)}` : ""} today.`,
      path: `/${r.region}${PATH}`,
      alternates: regionAlternates(r.region, PATH),
      image: `${SITE_URL}/og/upc`,
    }),
    title,
  };
}

export default async function UpcHub({ params }: { params: { region: string } }) {
  const r = regionOrNotFound(params.region);
  const [d, checked] = await Promise.all([getData(r.market), lastCheckedAt(r.market)]);
  const open = curated(d.open);
  const sold = curated(d.sold);
  if (!open.length && !sold.length) notFound();
  const day = [...open, ...sold].find((p) => p.name === DAY) ?? null;
  const night = [...open, ...sold].find((p) => p.name === NIGHT) ?? null;
  const m = (c: number | null | undefined) => money(c ?? null, r.market);
  const us = r.market === "US";
  const path = `/${r.region}${PATH}`;
  const from = open[0] ?? null;

  const faq: HubFaq[] = [
    {
      q: "What is a Pokémon Ultra-Premium Collection (UPC)?",
      a: "An Ultra-Premium Collection is the Pokémon TCG's top-end collector box: dozens of booster packs, foil promo cards and premium extras such as a playmat, card sleeves and a metal coin. The list above is every one we track.",
    },
    {
      q: `What is the cheapest Ultra-Premium Collection in ${r.inName} today?`,
      a: from ? `The cheapest one in stock in ${r.inName} right now is the ${from.name} at ${m(from.lowestPriceCents)}, before shipping.` : `None is in stock in ${r.inName} right now; the sold out boxes are listed on this page.`,
    },
    {
      q: "What is the difference between the Day and Night 30th Celebration UPC?",
      a: "ICv2 and Cardlines describe them as the same box in different artwork: Day features Espeon and Night features Umbreon, each with its own Pikachu ex and Espeon ex or Umbreon ex foil promo. Some retailers sell them as styles may vary, so check the listing says which one you get.",
    },
    {
      q: "What is inside the 30th Celebration Ultra-Premium Collection?",
      a: "Per ICv2 and Cardlines: 29 regular 30th Celebration booster packs plus one Classic Collection booster, two foil promo cards, a playmat, 65 card sleeves, a deck box, a metal coin, six damage counter dice and a Pokémon TCG Live code card.",
    },
    ...(us
      ? [
          {
            q: "What was the list price of the 30th Celebration UPC?",
            a: "ICv2 reported a US list price of $179.99 a box. Store prices on this page are each store's own price for the box today, before shipping.",
          },
        ]
      : []),
  ];

  const ld = [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: `Pokémon Ultra-Premium Collection prices in ${r.name}`, url: `${SITE_URL}${path}` },
    itemListJsonLd({ name: `Pokémon Ultra-Premium Collections in ${r.inName}`, path, items: [...open, ...sold].map((p) => ({ path: `/${r.region}/p/${p.slug}`, name: p.name })) }),
  ];

  const featured = [
    { label: "Day", art: "Espeon", p: day, img: "/upc/day.jpg" },
    { label: "Night", art: "Umbreon", p: night, img: "/upc/night.jpg" },
  ];

  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { label: "Ultra-Premium Collections" }]} />
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Pokémon Ultra-Premium Collection (UPC) prices in {r.inName}</h1>
      <p className="mt-2 max-w-2xl text-muted">
        The top-end Pokémon collector boxes, every one compared across {r.adjective} stores{us ? " and TCGplayer" : ""}, cheapest first, in {r.currency} before shipping.
        {checked && (
          <>
            {" "}
            Prices checked <Ago iso={checked.toISOString()} initial={timeAgo(checked)} />.
          </>
        )}
      </p>
      <p className="mt-2 text-sm text-muted">
        <b className="text-ink">{open.length}</b> in stock{from && <> from {m(from.lowestPriceCents)}</>}
        {sold.length > 0 && <> · {plural(sold.length, "box", "boxes")} sold out everywhere</>}
      </p>

      <Section id="30th-celebration" title="30th Celebration: Day vs Night" kicker="The newest UPCs">
        <div className="grid gap-4 sm:grid-cols-2">
          {featured.map(({ label, art, p, img }) => (
            <div key={label} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`30th Celebration Ultra-Premium Collection, ${label} box with ${art}`} width={814} height={476} loading="lazy" className="aspect-[814/476] w-full object-cover" />
              <div className="p-4">
                <div className="eyebrow">{label} · {art}</div>
                <div className="mt-1 font-display text-2xl font-extrabold">{p && p.lowestPriceCents ? <>From {m(p.lowestPriceCents)}</> : "Sold out right now"}</div>
                <div className="mt-1 text-sm text-muted">
                  {p ? (p.inStockStores > 0 ? `In stock at ${plural(p.inStockStores, "store")}${p.marketplaceOpen ? " and TCGplayer" : ""}` : p.marketplaceOpen ? "On TCGplayer" : "No store has it today") : "Not listed here"}
                </div>
                {p && (
                  <Link href={`/${r.region}/p/${p.slug}`} prefetch={false} className="btn-primary mt-3 min-h-11 w-full justify-center">
                    Compare {plural(p.listedStores, "store")} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
          ICv2 reported the 30th Celebration UPCs reaching retail on 6 November 2026. Per ICv2 and Cardlines each box holds 29 regular boosters plus one Classic Collection booster, two foil promos, a playmat, 65 sleeves, a deck box, a metal coin and dice. Some retailers sell them as styles may vary, so check which box the listing says you get.
        </p>
      </Section>

      <Section id="in-stock" title="Every UPC in stock" kicker="Cheapest first">
        {open.length ? (
          <ProductGrid products={open} region={r.region} eager={4} />
        ) : (
          <p className="text-sm text-muted">No Ultra-Premium Collection is in stock in {r.inName} right now.</p>
        )}
      </Section>

      <div className="mt-10">
        <EbayStrip
          region={r.region}
          context="type:ultra-premium-collections"
          placement="listings-type"
          headings={{ type: "Ultra-Premium Collections on eBay", sealed: "Sealed Pokémon on eBay" }}
          search={{ kind: "sealed", query: LABEL, label: "Search Ultra-Premium Collections on eBay" }}
        />
      </div>

      {sold.length > 0 && (
        <Section id="sold-out" title="Sold out everywhere" kicker="Listed, but nothing in stock today">
          <ProductGrid products={sold} region={r.region} />
        </Section>
      )}

      <section className="mt-14 max-w-3xl" aria-labelledby="buy-checks">
        <h2 id="buy-checks" className="font-display text-2xl font-bold tracking-tight">
          Before you buy a UPC
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-7 text-muted">
          <li>Check the exact product: Day or Night, English, and not a single card, an empty box or a repack with a similar name.</li>
          <li>Add the store&rsquo;s delivery cost, and look for a returns policy and real contact details if you haven&rsquo;t bought there before.</li>
          <li>
            When it arrives, check the shrink-wrap before you open it:{" "}
            <Link href={`/${r.region}/guides/how-to-avoid-resealed-pokemon-products`} className="font-semibold text-brand hover:underline">
              how to avoid resealed products
            </Link>
            .
          </li>
        </ul>
        <p className="mt-4 text-sm">
          <Link href={`/${r.region}/type/ultra-premium-collections`} prefetch={false} className="font-semibold text-brand hover:underline">
            Browse the Ultra-Premium Collections type page →
          </Link>
        </p>
      </section>

      <div className="mt-8 max-w-3xl">{whereToBuy(r, { tcg: { query: "Pokemon Ultra Premium Collection", label: "Pokémon Ultra-Premium Collections" } }).body}</div>

      <HubFaqSection faq={faq} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
    </div>
  );
}
