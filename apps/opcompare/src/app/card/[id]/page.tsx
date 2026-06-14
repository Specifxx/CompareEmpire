import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CardImage } from "@/components/CardImage";
import { DomainBadge, RarityBadge, VariantBadge, OvernumberedBadge, PromoBadge, SignatureBadge } from "@/components/Badge";
import { isOvernumbered, isSignature } from "@/lib/constants";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { CollectionButton } from "@/components/CollectionButton";
import { CardViewBeacon } from "@/components/CardViewBeacon";
import { CardTile, type CardTileData } from "@/components/CardTile";
import { PriceChart, changeOver, type PricePoint } from "@/components/PriceChart";
import { cardTileSelect } from "@/lib/cards";
import { formatMoney, timeAgo } from "@/lib/format";
import { effectiveShippingCents, shippingPolicyUrl } from "@/lib/retailers";
import { affiliateUrl, ebaySearchUrl } from "@/lib/affiliate";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES, pickPrice, marketGuideCents } from "@/lib/country";
import { OutboundLink } from "@/components/OutboundLink";
import { AdSlot } from "@/components/AdSlot";
import { ADSENSE_SLOTS } from "@/lib/ads";
import { TcgplayerAd } from "@/components/TcgplayerAd";
import { EbayAd } from "@/components/EbayAd";

// ISR while AU-only; dynamic per-request once NZ mode is enabled (cookie-driven).
export const revalidate = 180;

// Accept either the slug ("vayne-hunter-sfd-223-221") or the legacy cuid.
const whereParam = (p: string) => ({ OR: [{ slug: p }, { id: p }] });

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const card = await prisma.card.findFirst({
    where: whereParam(params.id),
    select: { slug: true, name: true, setName: true, setCode: true, collectorNumber: true, lowestPriceCents: true, lowestPriceCentsNz: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true, imageUrl: true, imageThumbUrl: true },
  });
  if (!card) notFound(); // real 404 — metadata resolves before streaming

  // MARKET-NEUTRAL metadata: Googlebot crawls from US IPs, so cookie-derived
  // copy ("price in the United States") would be what gets indexed for every
  // market — fragmented snippets at 20k-page scale. Neutral title also stays
  // under the ~60-char SERP truncation point.
  const title = `${card.name} (${card.setCode} ${card.collectorNumber}) — One Piece Card Price`;
  const description = `Compare live prices for ${card.name}, One Piece ${card.setName} ${card.collectorNumber}, across stores in Australia, New Zealand, the US and the UK — find the cheapest place to buy.`;
  const image = card.imageUrl ?? card.imageThumbUrl ?? undefined;

  return {
    title,
    description,
    alternates: { canonical: `/card/${card.slug ?? params.id}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function CardPage({ params }: { params: { id: string } }) {
  const country = getCountry();
  const info = COUNTRIES[country];
  const fmt = (cents: number) => formatMoney(cents, info.currency);
  const card = await prisma.card.findFirst({
    where: whereParam(params.id),
    include: {
      // Only the selected market's store listings (AU stores + eBay AU, or NZ stores).
      retailerPrices: { where: { country }, orderBy: { priceCents: "asc" } },
    },
  });

  if (!card) notFound();

  // Daily cheapest-price snapshots (AU market) for the trend chart, plus every
  // other printing of this card (same name, different set/number) so collectors
  // can compare reprints — e.g. Base Set vs Classic Collection.
  const [historyRows, otherPrints] = await Promise.all([
    // Trend history for the VISITOR'S market (each market priced in its own currency).
    prisma.priceHistory.findMany({
      where: { cardId: card.id, country },
      orderBy: { day: "asc" },
      select: { day: true, lowestPriceCents: true },
      take: 365,
    }),
    card.nameNormalized
      ? prisma.card.findMany({
          where: { nameNormalized: card.nameNormalized, id: { not: card.id } },
          orderBy: [{ lowestPriceCents: { sort: "asc", nulls: "last" } }],
          select: cardTileSelect(country),
          take: 12,
        })
      : Promise.resolve([]),
  ]);
  const history: PricePoint[] = historyRows.map((h) => ({ day: h.day, cents: h.lowestPriceCents }));
  // Now per-market — the 7-day trend applies to whichever market the visitor is in.
  const weekChange = changeOver(history, 7);

  const lowestPrice = pickPrice(card, country);

  // Split the catalogue MARKET GUIDE (an estimate, e.g. AU where TCGplayer doesn't
  // ship) from real, buyable store listings. The guide is shown as a labelled
  // reference with no buy link; real stores are what we rank and link to.
  const all = card.retailerPrices.map((p) => {
    const ship = effectiveShippingCents(p.shippingCents); // number | null (null = unknown)
    return { ...p, ship, delivered: p.priceCents + (ship ?? 0), isGuide: p.retailer.startsWith("marketguide") };
  });
  const guide = all.filter((p) => p.isGuide).sort((a, b) => a.priceCents - b.priceCents)[0] ?? null;
  const storeRows = all.filter((p) => !p.isGuide).sort((a, b) => a.delivered - b.delivered);
  const prices = storeRows.filter((p) => p.inStock);
  const outOfStock = storeRows.filter((p) => !p.inStock);

  // One Piece cards span a big condition range (NM → damaged). Build the cheapest
  // in-stock price PER GRADE from the store listings, so buyers see the whole spectrum.
  const GRADES: { code: string; label: string }[] = [
    { code: "NM", label: "Near Mint" },
    { code: "LP", label: "Lightly Pl." },
    { code: "MP", label: "Mod. Pl." },
    { code: "HP", label: "Heavily Pl." },
    { code: "DMG", label: "Damaged" },
  ];
  const byGrade = new Map<string, number>();
  for (const p of prices) {
    const cp = p.conditionPrices as Record<string, number> | null;
    if (cp && typeof cp === "object") {
      for (const [g, c] of Object.entries(cp)) {
        if (typeof c === "number" && c > 0 && (byGrade.get(g) == null || c < byGrade.get(g)!)) byGrade.set(g, c);
      }
    } else if (p.condition) {
      const cur = byGrade.get(p.condition);
      if (cur == null || p.priceCents < cur) byGrade.set(p.condition, p.priceCents);
    }
  }
  const hasSpectrum = byGrade.size > 0;

  const minPrice = (rows: typeof prices) =>
    rows.reduce<number | null>((m, p) => (m == null || p.priceCents < m ? p.priceCents : m), null);
  const cheapestStandard = minPrice(prices.filter((p) => !p.isFoil));
  const cheapestFoil = minPrice(prices.filter((p) => p.isFoil));
  // Headline = cheapest REAL store price. Prefer the STANDARD (non-foil) printing;
  // fall back to foil, then the recompute. We never want to show a foil price under
  // a "Standard from" label, so the label below is derived from which one we used.
  // (NB: many One Piece chase cards exist ONLY as foil — TCGplayer marks them
  // foilOnly — so we must NOT null those out; we just label them correctly.)
  const headlineCents = cheapestStandard ?? cheapestFoil ?? lowestPrice ?? null;
  const headlineIsFoil = cheapestStandard == null && cheapestFoil != null;
  const headlineLabel = headlineIsFoil
    ? "✦ Foil from"
    : cheapestFoil != null
    ? "Standard from"
    : "Cheapest price";

  // The market-price guide for this market: the imported guide row where one
  // exists (AU), else the card's USD guide converted at an indicative rate.
  const guideCents = guide?.priceCents ?? marketGuideCents(card.marketPriceCents, country);
  // A REAL guide comes from TCGplayer's market price; otherwise it's a seed-time
  // rarity/age heuristic — be honest about which it is rather than implying data.
  const guideIsReal = card.marketPriceSource === "TCGplayer";
  const guideSource = guideIsReal ? "TCGplayer" : "rough estimate";

  // Whether this market's comparison includes an eBay listing. The daily eBay
  // quota rotates through the catalogue, so plenty of cards haven't been checked
  // recently — for those we offer an affiliate-tagged eBay search instead of
  // silently looking like eBay has nothing.
  const hasEbay = storeRows.some((p) => p.retailer.startsWith("ebay"));
  const ebaySearchHref = ebaySearchUrl(`one piece ${card.name} ${card.collectorNumber.split("/")[0]}`, country);

  // Structured data so Google can show a rich price snippet ("$X, N stores").
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: card.name,
    category: "Trading Card",
    description: `${card.name} — One Piece ${card.setName} (${card.setCode}) ${card.collectorNumber}. Compare ${info.adjective} prices.`,
    // Legitimate enrichment only — never fabricated ratings/reviews (Google
    // penalises self-serving review markup; the GSC "missing aggregateRating/
    // review" notes are optional-field suggestions, safe to leave).
    brand: { "@type": "Brand", name: "One Piece Card Game" },
    sku: `${card.setCode}-${card.collectorNumber}`,
    ...(card.imageUrl ? { image: card.imageUrl } : {}),
    ...(prices.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: info.currency,
            // Min/max of ACTUAL item prices (prices is sorted by delivered cost,
            // so its last element isn't necessarily the highest item price).
            lowPrice: (Math.min(...prices.map((p) => p.priceCents)) / 100).toFixed(2),
            highPrice: (Math.max(...prices.map((p) => p.priceCents)) / 100).toFixed(2),
            offerCount: prices.length,
            availability: "https://schema.org/InStock",
            // Honest expiry: prices refresh with the daily import.
            priceValidUntil: new Date(Date.now() + 86400e3).toISOString().slice(0, 10),
          },
        }
      : {}),
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CardViewBeacon idOrSlug={card.slug ?? card.id} cardId={card.id} />
      <Link href="/browse" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        ← Back to database
      </Link>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Card visual */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="card-surface mx-auto max-w-[320px] p-4">
            <CardImage card={card} full className="aspect-[5/7] w-full" />
          </div>
        </div>

        {/* Details + price comparison */}
        <div className="min-w-0">
          <div className="card-surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              <DomainBadge domain={card.domain} />
              <RarityBadge rarity={card.rarity} />
              <span className="chip bg-ink-800 text-slate-300">{card.type}</span>
              <VariantBadge variant={card.variant} />
              <SignatureBadge show={isSignature(card.collectorNumber)} />
              <OvernumberedBadge show={isOvernumbered(card.collectorNumber)} />
              <PromoBadge show={card.isPromo} />
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {(() => {
                  const logo = POKEMON_SETS.find((s) => s.code === card.setCode)?.logo;
                  return logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt={card.setName} className="mt-1 h-9 w-auto max-w-[88px] object-contain" />
                  ) : null;
                })()}
                <div>
                  <h1 className="text-2xl font-extrabold text-white">{card.name}</h1>
                  <p className="mt-1 text-xs text-slate-500">
                    {card.setName} · {card.collectorNumber}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <WishlistButton cardId={card.id} variant="full" />
                <ShareButton />
                <CollectionButton cardId={card.id} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label={headlineLabel} value={headlineCents != null ? fmt(headlineCents) : "—"} highlight />
              {/* Separate foil metric only when the headline is the STANDARD price
                  (otherwise the headline already IS the foil price — no duplicate). */}
              {!headlineIsFoil && cheapestFoil != null && <Metric label="✦ Foil from" value={fmt(cheapestFoil)} highlight />}
              <Metric label="Compared at" value={`${prices.length} ${prices.length === 1 ? "store" : "stores"}`} />
              {weekChange != null && Math.abs(weekChange) >= 0.05 ? (
                <Metric label="7-day trend" value={`${weekChange > 0 ? "▲" : "▼"} ${Math.abs(weekChange).toFixed(1)}%`} />
              ) : (
                card.might != null && <Metric label="HP" value={String(card.might)} />
              )}
              <Metric label="Rarity" value={card.rarity} />
            </div>

            {/* Cheapest price by condition — the full NM → damaged spectrum. */}
            {hasSpectrum && (
              <div className="mt-4">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cheapest by condition</div>
                <div className="grid grid-cols-5 gap-2">
                  {GRADES.map((g) => {
                    const v = byGrade.get(g.code);
                    return (
                      <div key={g.code} className={`rounded-lg p-2 text-center ${v != null ? "bg-ink-900" : "bg-ink-900/40"}`}>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{g.label}</div>
                        <div className={`text-sm font-bold ${v != null ? "text-white" : "text-slate-600"}`}>{v != null ? fmt(v) : "—"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Market-price GUIDE — always shown with its source. A sales-based
                reference, never the headline/cheapest price (that's store-only).
                Real guides come from TCGplayer; otherwise it's a rough estimate. */}
            {guideCents != null && (
              <div className="mt-4 rounded-lg border border-dashed border-ink-600 bg-ink-900/50 p-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-slate-200">
                    {guideIsReal ? "Market price guide" : "Rough estimate"}: {fmt(guideCents)}
                  </span>
                  <span className="text-xs text-slate-500">
                    source: {guideSource}
                    {guideIsReal && country !== "US" ? " (USD market price, converted)" : ""}
                    {guideIsReal && card.marketPriceUpdatedAt ? ` · updated ${timeAgo(card.marketPriceUpdatedAt)}` : ""}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {!guideIsReal
                    ? `We don't have live market data for this card yet, so this is a rough estimate from its rarity and age — treat it as a ballpark only.`
                    : prices.length === 0
                    ? `A guide from recent sales, not a buyable listing — no ${info.adjective} store stocks this card yet.`
                    : `A guide from recent sales, not a buyable listing. The ${info.adjective} store prices below are what you can actually pay — note the market guide can sometimes be cheaper than any store here (and vice versa).`}
                </p>
              </div>
            )}
          </div>

          {/* Price-over-time chart from the daily snapshots (the visitor's market). */}
          {history.length > 0 && (
            <PriceChart
              points={history}
              title="Price trend"
              note={`Cheapest ${info.adjective} price (${info.currency}), snapshotted daily`}
            />
          )}

          {/* Price comparison */}
          <div className="card-surface mt-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-700 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-bold text-white">
                  Price comparison <span className="text-slate-500">({prices.length})</span>
                </h2>
                {prices.length > 1 && prices[prices.length - 1].priceCents > prices[0].priceCents && (
                  <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold text-brand-400">
                    Save {fmt(prices[prices.length - 1].priceCents - prices[0].priceCents)} vs the priciest seller
                  </span>
                )}
              </div>
              {prices[0] && (
                <span className="text-xs text-slate-500">updated {timeAgo(prices[0].lastSeen)}</span>
              )}
            </div>

            {prices.length === 0 && outOfStock.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                <p className="font-semibold text-white">{guideCents != null ? "No store listings yet" : "No prices found yet"}</p>
                <p className="mt-1">
                  {guideCents != null
                    ? `The market price above is a guide only. No ${info.adjective} store we track stocks this card right now.`
                    : "We haven't matched this card to a store listing. Check back soon — our price feeds refresh regularly."}
                </p>
                {/* No local stockist → point buyers at the deepest market that will
                    have it. Affiliate-tagged search for the visitor's marketplace. */}
                <OutboundLink
                  href={ebaySearchHref}
                  retailer="ebay_search"
                  country={country}
                  className="btn-primary mt-4 inline-flex"
                >
                  Search this card on eBay{country === "NZ" ? " AU (ships to NZ)" : ""} →
                </OutboundLink>
                <p className="mt-2 text-[11px] text-slate-600">
                  Check the listing is the English print and the condition you want before buying.
                </p>
              </div>
            ) : prices.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                <p className="font-semibold text-white">Currently sold out everywhere</p>
                <p className="mt-1">
                  {outOfStock.length} {info.adjective} {outOfStock.length === 1 ? "store has" : "stores have"} listed
                  this card but it&apos;s out of stock right now. See them below.
                </p>
                <OutboundLink
                  href={ebaySearchHref}
                  retailer="ebay_search"
                  country={country}
                  className="btn-ghost mt-3 inline-flex"
                >
                  Search this card on eBay{country === "NZ" ? " AU (ships to NZ)" : ""} →
                </OutboundLink>
              </div>
            ) : (
              <ul className="divide-y divide-ink-800">
                {prices.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 hover:bg-ink-900/50 sm:flex-nowrap sm:p-4"
                  >
                    <div className="w-5 shrink-0 text-center text-sm font-bold text-slate-500 sm:w-6">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white">{p.retailerName}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        {p.isFoil && <span className="chip bg-gold/15 font-semibold text-gold">✦ Foil</span>}
                        {p.condition && <span className="chip bg-ink-800 text-slate-300">{p.condition}</span>}
                        <span className="text-brand-400">● In stock</span>
                        <span>
                          {p.ship == null ? "postage at checkout" : p.ship === 0 ? "free postage" : `+ ${fmt(p.ship)} postage`}
                        </span>
                        {p.ship == null && shippingPolicyUrl(p.retailer) && (
                          <a
                            href={shippingPolicyUrl(p.retailer)!}
                            target="_blank"
                            rel="nofollow noopener noreferrer"
                            className="text-slate-400 underline decoration-dotted underline-offset-2 hover:text-slate-200"
                          >
                            shipping policy ↗
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`text-lg font-bold ${i === 0 ? "text-accent" : "text-white"}`}>
                        {fmt(p.priceCents)}
                      </div>
                      {p.ship != null && (
                        <div className="text-[11px] text-slate-400">≈ {fmt(p.delivered)} delivered</div>
                      )}
                    </div>
                    {/* Full-width below the row on phones; inline button on sm+. */}
                    <OutboundLink
                      href={affiliateUrl(p.url)}
                      retailer={p.retailer}
                      country={country}
                      className="btn-primary order-last w-full basis-full justify-center sm:order-none sm:w-auto sm:basis-auto"
                    >
                      View deal →
                    </OutboundLink>
                  </li>
                ))}
              </ul>
            )}

            {/* eBay is monetised via affiliate SEARCH only on these sites: we do NOT call
                eBay's Browse API here (that daily quota is reserved for our sister sites
                RiftCompare & DexCompare), so we never show a stale eBay price — we send
                the click straight to an affiliate-tagged eBay search instead. */}
            {prices.length > 0 && !hasEbay && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-800 bg-ink-900/40 px-4 py-3">
                <div className="min-w-0 text-xs text-slate-400">
                  <div className="font-semibold text-slate-200">Also check eBay</div>
                  <span>We don&apos;t track live eBay prices here, but eBay is the largest marketplace for singles — new, used & graded. Search it directly:</span>
                </div>
                <OutboundLink
                  href={ebaySearchHref}
                  retailer="ebay_search"
                  country={country}
                  className="btn-primary shrink-0"
                >
                  Search this card on eBay{country === "NZ" ? " AU" : ""} →
                </OutboundLink>
              </div>
            )}

            {outOfStock.length > 0 && (
              <div className="border-t border-ink-800">
                <div className="bg-ink-900/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Out of stock ({outOfStock.length}) · last listed price
                </div>
                <ul className="divide-y divide-ink-800">
                  {outOfStock.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 opacity-60 sm:flex-nowrap sm:p-4">
                      <div className="w-5 shrink-0 text-center text-slate-600 sm:w-6">—</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-slate-300">{p.retailerName}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          {p.condition && <span className="chip bg-ink-800 text-slate-400">{p.condition}</span>}
                          <span className="text-slate-500">● Out of stock</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-lg font-bold text-slate-400 line-through">{fmt(p.priceCents)}</div>
                      </div>
                      <OutboundLink
                        href={affiliateUrl(p.url)}
                        retailer={p.retailer}
                        country={country}
                        className="btn-ghost order-last w-full basis-full justify-center sm:order-none sm:w-auto sm:basis-auto"
                      >
                        Check →
                      </OutboundLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="border-t border-ink-800 p-3 text-center text-[11px] text-slate-600">
              Prices are collected from public store listings and may change. OPCompare
              may earn a commission on some outbound links.
            </p>
          </div>

          {/* TCGplayer affiliate banner — pays commission on click-through
              purchases, so it gets the prime spot under the price table. */}
          <TcgplayerAd size="rect" mobile="rect" country={country} className="mt-6" />

          {/* Contextual eBay banner — searches for THIS card (new, used & graded);
              the most relevant eBay placement converts far better than a generic one. */}
          <EbayAd size="leaderboard" country={country} query={`${card.name} ${card.collectorNumber.split("/")[0]}`} className="mt-4" />

          {/* In-content ad below the price comparison — the highest-traffic surface.
              Renders nothing until a slot id is configured (Auto ads fill it meanwhile). */}
          <AdSlot slot={ADSENSE_SLOTS.card} className="mt-6" height={120} />
        </div>
      </div>

      {/* Other printings — the same card in other sets (reprints, promos, alt
          numbers), so collectors can compare which printing is cheapest. */}
      {otherPrints.length > 0 && (
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-white">Other printings of {card.name}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              The same card from other sets and promos — sometimes a different printing is far cheaper.
            </p>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {(otherPrints as CardTileData[]).map((c) => (
              <div key={c.id} className="w-36 shrink-0 sm:w-44">
                <CardTile card={c} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-ink-900 p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${highlight ? "text-accent" : "text-white"}`}>{value}</div>
    </div>
  );
}
