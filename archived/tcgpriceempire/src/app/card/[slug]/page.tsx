import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CardTile } from "@/components/CardTile";
import { OutboundLink } from "@/components/OutboundLink";
import { AdSlot } from "@/components/AdSlot";
import { ADSENSE_SLOTS } from "@/lib/ads";
import { affiliateUrl, amazonSearchUrl, ebaySearchUrl } from "@/lib/affiliate";
import { cardTileSelect } from "@/lib/cards";
import { GAMES, type GameKey } from "@/lib/games";
import { formatMoney, timeAgo } from "@/lib/format";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES, localApproxCents } from "@/lib/country";
import { getPriceHistory } from "@/lib/history";
import { PriceChart } from "@/components/PriceChart";
import { PriceAlertForm } from "@/components/PriceAlertForm";
import { WishlistButton } from "@/components/WishlistButton";
import { RecordView } from "@/components/RecordView";

// Per-request: the region cookie localises the marketplace links + copy.
export const dynamic = "force-dynamic";

async function getCard(slug: string) {
  return prisma.card.findUnique({
    where: { slug },
    include: { vendorPrices: { orderBy: { priceCents: "asc" } } },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const card = await getCard(params.slug);
  if (!card) return { title: "Card not found" };
  const game = GAMES[card.game as GameKey];
  const title = `${card.name} (${card.setName}) price — ${game?.short ?? "TCG"}`;
  const description = `Compare ${card.name} prices across TCGplayer, Cardmarket, eBay and more — live ${game?.short ?? "TCG"} market prices and the cheapest place to buy.`;
  return {
    title,
    description,
    alternates: { canonical: `/card/${card.slug}` },
    openGraph: { type: "website", title, description, ...(card.imageUrl ? { images: [card.imageUrl] } : {}) },
  };
}

// Vendor display order when prices tie (direct programs first).
const VENDOR_RANK: Record<string, number> = { tcgplayer: 0, cardmarket: 1, coolstuffinc: 2, ebay: 3, amazon: 4 };

export default async function CardPage({ params }: { params: { slug: string } }) {
  const card = await getCard(params.slug);
  if (!card) notFound();
  const game = GAMES[card.game as GameKey];
  if (!game) notFound();

  const country = getCountry();
  const info = COUNTRIES[country];
  const approxLocal = localApproxCents(card.marketPriceCents, country);

  const prices = [...card.vendorPrices].sort(
    (a, b) => a.priceCents - b.priceCents || (VENDOR_RANK[a.vendor] ?? 9) - (VENDOR_RANK[b.vendor] ?? 9)
  );
  const normal = prices.filter((p) => p.printing === "normal");
  const foil = prices.filter((p) => p.printing !== "normal");

  // Marketplace links localise to the visitor's region (eBay AU/UK/US, …).
  const ebayHref = ebaySearchUrl(`${card.name} ${card.setName} ${game.searchSuffix}`, country);
  const amazonHref = amazonSearchUrl(`${card.name} ${game.searchSuffix}`, country);

  const history = await getPriceHistory(card.id, 90).catch(() => []);

  // Related: same game + set, closest in value.
  const related = await prisma.card.findMany({
    where: { game: card.game, setName: card.setName, id: { not: card.id }, marketPriceCents: { not: null } },
    orderBy: { marketPriceCents: "desc" },
    take: 10,
    select: cardTileSelect,
  });

  const usd = prices.filter((p) => p.currency === "USD");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: card.name,
    category: `${game.name} ${card.kind === "sealed" ? "Sealed Product" : "Single Card"}`,
    ...(card.imageUrl ? { image: card.imageUrl } : {}),
    ...(usd.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: (Math.min(...usd.map((p) => p.priceCents)) / 100).toFixed(2),
            highPrice: (Math.max(...usd.map((p) => p.priceCents)) / 100).toFixed(2),
            offerCount: usd.length,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Records this card into the visitor's local recently-viewed rail. */}
      <RecordView
        slug={card.slug}
        name={card.name}
        imageUrl={card.imageUrl}
        game={card.game}
        marketPriceCents={card.marketPriceCents}
      />
      <Link href={`/${game.slug}`} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        ← {game.short} hub
      </Link>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Image */}
        <div className="md:w-72 md:shrink-0">
          <div
            className="card-surface grid aspect-[5/7] place-items-center overflow-hidden p-4"
            style={{ background: `radial-gradient(120% 80% at 50% 0%, ${game.color}1f, transparent 60%)` }}
          >
            {card.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.imageUrl} alt={card.name} className="max-h-full max-w-full rounded-lg object-contain" />
            ) : (
              <span className="text-sm font-bold text-slate-600">{card.name}</span>
            )}
          </div>
        </div>

        {/* Details + comparison */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-ink-800" style={{ color: game.color }}>
              {game.icon} {game.short}
            </span>
            {card.kind === "sealed" && <span className="chip bg-gold/15 text-gold">Sealed product</span>}
            {card.rarity && <span className="chip bg-ink-800 text-slate-300">{card.rarity}</span>}
          </div>
          <div className="mt-2 flex items-start justify-between gap-3">
            <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl">{card.name}</h1>
            <WishlistButton cardId={card.id} />
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {card.setName}
            {card.collectorNumber ? ` · #${card.collectorNumber}` : ""}
            {card.releaseDate ? ` · ${card.releaseDate.slice(0, 10)}` : ""}
          </p>

          {card.marketPriceCents != null && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Market price{card.marketPriceSource ? ` (${card.marketPriceSource})` : ""}
              </div>
              <div className="text-3xl font-extrabold text-accent">{formatMoney(card.marketPriceCents, "USD")}</div>
              {approxLocal != null && (
                <div className="mt-0.5 text-xs text-slate-500" title="Indicative conversion — vendors charge in their own currency">
                  ≈ {formatMoney(approxLocal, info.currency)} in {info.place}
                </div>
              )}
            </div>
          )}

          {/* Vendor comparison */}
          <section className="card-surface mt-5 overflow-hidden">
            <div className="border-b border-ink-700 p-4">
              <h2 className="font-bold text-white">Price comparison</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Each vendor in its own currency, cheapest first — click through to buy.
              </p>
            </div>
            {normal.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                <p className="font-semibold text-white">No vendor price on file for this one yet.</p>
                <p className="mt-1">eBay almost always has it:</p>
                <OutboundLink href={ebayHref} retailer="ebay_search" game={card.game} kind={card.kind} className="btn-primary mt-3 inline-flex">
                  Search on eBay →
                </OutboundLink>
              </div>
            ) : (
              <ul className="divide-y divide-ink-800">
                {normal.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{p.vendorName}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">updated {timeAgo(p.updatedAt)}</div>
                    </div>
                    <div className="text-right text-sm font-bold text-accent">{formatMoney(p.priceCents, p.currency)}</div>
                    <OutboundLink href={affiliateUrl(p.url, p.vendor)} retailer={p.vendor} game={card.game} kind={card.kind} className="btn-primary">
                      Buy →
                    </OutboundLink>
                  </li>
                ))}
              </ul>
            )}
            {foil.length > 0 && (
              <>
                <div className="border-t border-ink-700 bg-ink-900/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Foil / special printings
                </div>
                <ul className="divide-y divide-ink-800">
                  {foil.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">
                          {p.vendorName} <span className="text-xs font-normal text-gold">({p.printing})</span>
                        </div>
                      </div>
                      <div className="text-right text-sm font-bold text-accent">{formatMoney(p.priceCents, p.currency)}</div>
                      <OutboundLink href={affiliateUrl(p.url, p.vendor)} retailer={p.vendor} game={card.game} kind={card.kind} className="btn-ghost">
                        Buy →
                      </OutboundLink>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {/* Marketplace fallbacks — always available, affiliate-tagged. */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-800 bg-ink-900/40 px-4 py-3 text-xs text-slate-400">
              <span>Also check the open marketplaces:</span>
              <span className="flex gap-3">
                <OutboundLink href={ebayHref} retailer="ebay_search" game={card.game} kind={card.kind} className="font-semibold text-brand-400 hover:underline">
                  eBay →
                </OutboundLink>
                <OutboundLink href={amazonHref} retailer="amazon_search" game={card.game} kind={card.kind} className="font-semibold text-brand-400 hover:underline">
                  Amazon →
                </OutboundLink>
              </span>
            </div>
          </section>

          {/* Specialist deep-coverage cross-link (Pokémon → DexCompare, Riftbound → RiftCompare). */}
          {game.specialist && (
            <a
              href={game.specialist.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block rounded-xl border border-ink-700 bg-ink-900/60 p-4 transition-colors hover:border-brand-500/50"
            >
              <div className="text-sm font-semibold text-white">
                Shopping from Australia, NZ, the US or the UK?
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Our sister site {game.specialist.name} does {game.specialist.blurb} — store-level prices and stock →
              </p>
            </a>
          )}
        </div>
      </div>

      {/* Price history — daily market-price snapshots (fills in over time). */}
      {history.length >= 2 && (
        <section className="card-surface mt-6 overflow-hidden">
          <div className="border-b border-ink-700 p-4">
            <h2 className="font-bold text-white">Price history</h2>
            <p className="mt-0.5 text-xs text-slate-500">Daily market price (USD), tracked since the card joined the database.</p>
          </div>
          <div className="p-4">
            <PriceChart points={history} />
          </div>
        </section>
      )}

      {/* Price-drop alert — free email capture, no account. */}
      <div className="mt-6">
        <PriceAlertForm cardId={card.id} cardName={card.name} currentCents={card.marketPriceCents} />
      </div>

      <AdSlot slot={ADSENSE_SLOTS.card} height={120} className="mt-6" />

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-extrabold text-white">More from {card.setName}</h2>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {related.map((c) => (
              <div key={c.id} className="w-36 shrink-0 sm:w-44">
                <CardTile card={c} showGame={false} />
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-center text-[11px] text-slate-600">
        Prices come from public market data and refresh daily — always confirm on the vendor&apos;s site.
        TCGPriceEmpire may earn a commission on some outbound links.
      </p>
    </div>
  );
}
