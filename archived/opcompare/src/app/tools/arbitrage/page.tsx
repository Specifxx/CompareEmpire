import type { Metadata } from "next";
import Link from "next/link";
import { getArbitrage, getArbSources, TCGPLAYER_FEE, type ArbSort } from "@/lib/arbitrage";
import { parsePageNum } from "@/lib/cards";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";
import { formatMoney } from "@/lib/format";
import { OutboundLink } from "@/components/OutboundLink";
import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";
import { ArbitrageFilters } from "@/components/ArbitrageFilters";
import { CardQuickLink } from "@/components/CardQuickLink";
import type { CardTileData } from "@/components/CardTile";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

// Sorted/paginated/store-filtered views are query-string permutations of one
// page — and `buy` is a CSV of store keys, so the combination space is
// effectively unbounded. Keep every permutation out of the index (canonical
// always points at the bare path) so crawl budget goes to real content.
// Same pattern as /browse and /sealed.
export function generateMetadata({
  searchParams,
}: {
  searchParams: { sort?: string; page?: string; buy?: string };
}): Metadata {
  const isPermutation = Boolean(searchParams.buy || searchParams.sort) || parsePageNum(searchParams.page) > 1;
  return {
    title: { absolute: "One Piece Card Arbitrage — Flip to TCGplayer | OPCompare" },
    description:
      "Find One Piece cards selling below their TCGplayer market price: buy cheap from a store, resell at market for a profit, ranked by profit and margin with fees included. Updated daily. Free.",
    alternates: { canonical: "/tools/arbitrage" },
    ...(isPermutation ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: "One Piece Card Arbitrage — Flip to TCGplayer", url: `${SITE_URL}/tools/arbitrage` },
  };
}

const PAGE_SIZE = 25;
const FLIP_SORTS: { key: ArbSort; label: string }[] = [
  { key: "profit", label: "Most profit" },
  { key: "margin", label: "Best margin" },
];

// The "🛒 Cheapest on eBay" view was retired: it read real live eBay Browse
// API data, and this app's eBay quota is committed to TCGplayer-flip pricing
// only now (TCGplayer's market price is refreshed for every matched card, so
// it needs no per-card API call). A card with no eBay match in the price
// table already offers a plain, no-quota EPN search link — that's the eBay
// surface this tool leans on now, not a live "cheapest on eBay" scan.
export default async function ArbitragePage({
  searchParams,
}: {
  searchParams: { sort?: string; page?: string; buy?: string };
}) {
  const country = getCountry();
  const info = COUNTRIES[country];
  const sources = getArbSources(country);
  // BUY side = the tracked local retail stores only. TCGplayer is the sell
  // venue here, so it doesn't belong in the default buy set.
  const storeKeys = sources.filter((s) => !s.isEbay && !s.isTcgplayer).map((s) => s.key);
  const tcg = sources.find((s) => s.isTcgplayer);
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  return (
    <div className="mx-auto max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "One Piece Card Arbitrage — Flip to TCGplayer",
            url: `${SITE_URL}/tools/arbitrage`,
            applicationCategory: "UtilityApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: info.currency },
          }),
        }}
      />
      <div className="mb-4">
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-300">Home</Link>
          <span>/</span>
          <span className="text-slate-300">Arbitrage</span>
        </nav>
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">💱 Arbitrage — Flip to TCGplayer</h1>
      </div>

      {/* Every buy figure in the table below is an affiliate link. The sell side
          (TCGplayer's market price) is a reference valuation, not a live quote —
          see the caveat paragraph below; it's never sourced from eBay. */}
      <AffiliateDisclosure variant="block" className="mb-4" />

      {!tcg ? (
        <div className="card-surface grid place-items-center p-12 text-center text-sm text-slate-400">
          This tool isn&apos;t available in {info.place} yet.
        </div>
      ) : (
        await FlipView({ country, info, sort: searchParams.sort === "margin" ? "margin" : "profit", page, buy: searchParams.buy, sources, sellKey: tcg.key, storeKeys })
      )}
    </div>
  );
}

// ── Flip view (buy store → sell TCGplayer) ────────────────────────────────────────────
async function FlipView({
  country,
  info,
  sort,
  page,
  buy: buyParam,
  sources,
  sellKey,
  storeKeys,
}: {
  country: ReturnType<typeof getCountry>;
  info: (typeof COUNTRIES)[keyof typeof COUNTRIES];
  sort: ArbSort;
  page: number;
  buy?: string;
  sources: ReturnType<typeof getArbSources>;
  sellKey: string;
  storeKeys: string[];
}) {
  const buy = buyParam ? buyParam.split(",").map((s) => s.trim()).filter(Boolean) : storeKeys;
  const sell = [sellKey];
  const data = await getArbitrage(country, { buy, sort, sell, page, pageSize: PAGE_SIZE });
  const href = (p: number) => `/tools/arbitrage?buy=${buy.join(",")}&sort=${sort}&page=${p}`;
  const sortHref = (s: ArbSort) => `/tools/arbitrage?buy=${buy.join(",")}&sort=${s}&page=1`;

  return (
    <>
      <p className="mb-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        Buy a card cheap from a {info.adjective} store and resell it at the{" "}
        <strong className="text-slate-200">TCGplayer</strong> market price for a profit. Net is after an estimated{" "}
        {Math.round(TCGPLAYER_FEE * 100)}% TCGplayer seller fee; postage and your time aren&apos;t included.
      </p>
      <p className="mb-4 text-xs text-slate-500">
        TCGplayer is the default sell side because its market price is refreshed for every card we match, so coverage is
        far wider than eBay&apos;s (which we can only sample within a daily API quota).
        {country !== "US" && (
          <>
            {" "}TCGplayer prices are USD converted to {info.currency} at an indicative rate — treat them as a valuation
            guide, not a live {info.adjective} offer.
          </>
        )}
      </p>

      <div className="card-surface mb-4 flex flex-wrap items-end justify-between gap-4 p-4">
        <ArbitrageFilters sources={sources} buy={buy} sell={sell} sort={sort} />
        <SortTabs sorts={FLIP_SORTS} active={sort} hrefFor={sortHref} />
      </div>

      {data.items.length === 0 ? (
        <Empty>No profitable arbitrage for these sources right now in {info.place}. Try widening the buy side.</Empty>
      ) : (
        <>
          <div className="card-surface overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-ink-700 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">Card</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Buy</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Sell</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Net profit</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {data.items.map((it) => (
                  <tr key={it.card.id} className="hover:bg-ink-900/50">
                    <CardCell card={it.card} />
                    <td className="px-2 py-2 text-right">
                      <OutboundLink href={it.buyUrl} retailer={it.buyStore} country={country} className="num font-semibold text-white hover:text-brand-400">
                        {formatMoney(it.buyCents, info.currency)}
                      </OutboundLink>
                      <div className="truncate text-[10px] text-slate-500" title={it.buyStoreName}>{it.buyStoreName}</div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <OutboundLink href={it.sellUrl} retailer={sellKey} country={country} className="num font-semibold text-slate-200 hover:text-brand-400">
                        {formatMoney(it.sellCents, info.currency)}
                      </OutboundLink>
                      <div className="text-[10px] text-slate-400">{it.sellName}</div>
                    </td>
                    <td className="num px-2 py-2 text-right font-bold text-up">+{formatMoney(it.netCents, info.currency)}</td>
                    <td className="num px-4 py-2 text-right font-semibold text-up">{it.marginPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager total={data.total} page={data.page} pageCount={data.pageCount} hrefFor={href} unit="opportunities" />
        </>
      )}
    </>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────────────
function CardCell({ card }: { card: CardTileData }) {
  return (
    <td className="px-4 py-2">
      <CardQuickLink card={card} className="flex items-center gap-2.5">
        {card.imageThumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageThumbUrl} alt="" width={28} height={39} loading="lazy" className="h-10 w-7 shrink-0 rounded-sm object-cover" />
        )}
        <span className="min-w-0">
          <span className="block truncate font-semibold text-white">{card.name}</span>
          <span className="block text-[11px] text-slate-500">{card.setCode} · {card.collectorNumber}</span>
        </span>
      </CardQuickLink>
    </td>
  );
}

function SortTabs<T extends string>({ sorts, active, hrefFor }: { sorts: { key: T; label: string }[]; active: T; hrefFor: (s: T) => string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sort</div>
      <div className="mt-0.5 flex gap-1">
        {sorts.map((s) => (
          <Link
            key={s.key}
            href={hrefFor(s.key)}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${active === s.key ? "bg-brand-500/20 text-brand-200" : "bg-ink-900 text-slate-400 hover:text-white"}`}
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card-surface grid place-items-center p-12 text-center text-sm text-slate-400">{children}</div>;
}

function Pager({ total, page, pageCount, hrefFor, unit }: { total: number; page: number; pageCount: number; hrefFor: (p: number) => string; unit: string }) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-xs text-slate-500">{total} {unit} · page {page} of {pageCount}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={hrefFor(page - 1)} className="btn-ghost text-sm">← Prev</Link>}
        {page < pageCount && <Link href={hrefFor(page + 1)} className="btn-ghost text-sm">Next →</Link>}
      </div>
    </div>
  );
}
