import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Ago } from "@/components/Ago";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EbayBanner, NoPreFooter } from "@/components/Ebay";
import { OutboundLink } from "@/components/OutboundLink";
import { pageHref, Pagination } from "@/components/Pagination";
import { StockPill } from "@/components/StockPill";
import { ebayLabel, REL_STORE, storeRetailer } from "@/lib/affiliate";
import { listHasRoomForFooter } from "@/lib/ebay-ads";
import { PAGE_SIZE, storeOffers, storeStat } from "@/lib/data";
import { money, timeAgo } from "@/lib/format";
import { thumb } from "@/lib/images";
import { regionOfMarket, type RegionInfo } from "@/lib/regions";
import { offerStock, offerStockLabel } from "@/lib/sealed-offers";
import { isPreorderSet } from "@/lib/release";
import { pageMeta } from "@/lib/seo";
import { isMarketplace, STORE_BY_KEY, storeHost, type StoreConfig } from "@/lib/stores";

// Shared by /[region]/stores/[store] (page 1) and …/page/[n]: a big store has
// 1,400 listings, so each page of 48 is its own cached render reading only its
// own rows (storeOffers pages in SQL). Same shape as the browse page.

// Independent stores only. TCGplayer is in STORE_BY_KEY (the importer reads it)
// but is a marketplace, not a store: it has no store page.
export function storeFor(key: string): StoreConfig | null {
  const s = STORE_BY_KEY.get(key);
  return s && !isMarketplace(s) ? s : null;
}

/** Page N from its URL segment, or a 404 for "0", "abc" or "1" (page 1 is the bare URL). */
export function pageNumber(n: string): number {
  if (!/^[1-9]\d{0,3}$/.test(n) || n === "1") notFound();
  return Number(n);
}

/** The store, if this region's: a store belongs to one region, and any other region's URL for it is a duplicate. */
export function storeInRegion(key: string, r: RegionInfo): StoreConfig {
  const s = storeFor(key);
  if (!s || regionOfMarket(s.market)?.region !== r.region) notFound();
  return s;
}

export function storeMeta(r: RegionInfo, s: StoreConfig, page: number): Metadata {
  return pageMeta({
    title: `${s.name} — Pokémon sealed stock & prices${page > 1 ? ` — page ${page}` : ""}`,
    description: `Pokémon booster boxes, ETBs and sealed product at ${s.name} (${storeHost(s)}), with stock and prices compared against other ${r.adjective} stores.`,
    path: pageHref(`/${r.region}/stores/${s.key}`, page),
  });
}

export async function StorePage({ r, s, page }: { r: RegionInfo; s: StoreConfig; page: number }) {
  const [offers, st] = await Promise.all([storeOffers(s.key, page), storeStat(s.key)]);
  const listed = Math.max(st?.listed ?? 0, offers.length);
  const pages = Math.max(1, Math.ceil(listed / PAGE_SIZE));
  if (page > 1 && !offers.length) notFound();
  const base = `/${r.region}/stores/${s.key}`;
  const now = Date.now();
  return (
    <div className="page py-8">
      <Breadcrumbs
        items={[
          { href: `/${r.region}`, label: r.name },
          { href: `/${r.region}/stores`, label: "Stores" },
          page > 1 ? { href: base, label: s.name } : { label: s.name },
          ...(page > 1 ? [{ label: `Page ${page}` }] : []),
        ]}
      />
      <div className="card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <div className="eyebrow">
            {r.flag} {r.name} · prices in {r.currency}
          </div>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{s.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {st?.inStock ?? 0} Pokémon sealed products in stock · {listed} listed · last read{" "}
            {st?.lastOkAt ? <Ago iso={st.lastOkAt.toISOString()} initial={timeAgo(st.lastOkAt)} /> : "not yet"}
            {pages > 1 && ` · page ${page} of ${pages}`}
          </p>
          {st?.dormant && (
            <p className="mt-2 max-w-xl text-sm text-muted">
              None of these listings is shown as in stock: the store had none in stock when we last read it, or its &ldquo;in stock&rdquo;
              prices sat far below every other store&rsquo;s and were not trusted. It is treated as dormant: its listings stay on product
              pages, marked sold out, but it no longer counts towards how many stores list a product.
            </p>
          )}
        </div>
        <OutboundLink href={s.base} rel={REL_STORE} retailer={storeRetailer(s.name, s.market)} placement="store-page" className="btn-ghost shrink-0">
          Visit {storeHost(s)} <span aria-hidden="true">↗</span>
        </OutboundLink>
      </div>
      {!listHasRoomForFooter(offers.length) && <NoPreFooter />}
      <EbayBanner
        region={r.region}
        variant="section"
        placement="store-banner"
        title="Looking for something else? Search eBay"
        text={`Search Buy It Now listings for Pokémon sealed on ${ebayLabel(r.region)}.`}
        className="mt-6"
      />
      {offers.length ? (
        <div className="card mt-6 overflow-hidden">
          <ul className="divide-y divide-line">
            {offers.map((o) => {
              const state = offerStock(o, now);
              const pre = isPreorderSet(o.product.setCode);
              return (
                <li key={o.product.slug} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-raised">
                    {o.product.imageUrl && (
                      <img src={thumb(o.product.imageUrl, 120)!} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-full w-full object-contain p-1" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/${r.region}/p/${o.product.slug}`} prefetch={false} className="line-clamp-2 font-semibold hover:text-brand sm:line-clamp-1">
                      {o.product.name}
                    </Link>
                    <div className="text-xs text-muted">{o.product.productType}</div>
                  </div>
                  {/* Stacked on phones, so the name keeps the row's width. */}
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
                    <StockPill state={state} preorder={pre}>
                      {offerStockLabel(state, pre)}
                    </StockPill>
                    <div className={`tabular text-right font-display font-bold sm:w-24 ${state === "open" ? "" : "text-faint"}`}>{money(o.priceCents, s.market)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="card mt-6 px-6 py-10 text-center text-muted">
          {st?.lastError ? "We couldn't read this store's listings on the last check." : "No Pokémon sealed listings found at this store yet."}
        </div>
      )}
      <Pagination base={base} page={page} pages={pages} />
      <p className="mt-4 text-xs text-muted">In stock first, then cheapest first. Prices are the store&rsquo;s own, in {r.currency}, and exclude shipping.</p>
    </div>
  );
}
