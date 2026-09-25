import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Ago } from "@/components/Ago";
import { StockPill } from "@/components/StockPill";
import { REL_STORE } from "@/lib/affiliate";
import { storeOffers, storeStat } from "@/lib/data";
import { money, timeAgo } from "@/lib/format";
import { thumb } from "@/lib/images";
import { REGIONS, regionOfMarket, type Region } from "@/lib/regions";
import { offerStock, offerStockLabel } from "@/lib/sealed-offers";
import { isPreorderSet } from "@/lib/release";
import { pageMeta } from "@/lib/seo";
import { STORE_BY_KEY, storeHost } from "@/lib/stores";

export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export function generateMetadata({ params }: { params: { region: Region; store: string } }): Metadata {
  const s = STORE_BY_KEY.get(params.store);
  const r = s ? regionOfMarket(s.market) : null;
  if (!s || !r) return {};
  return pageMeta({
    title: `${s.name} — Pokémon sealed stock & prices`,
    description: `Pokémon booster boxes, ETBs and sealed product at ${s.name} (${storeHost(s)}), with stock and prices compared against other ${r.adjective} stores.`,
    path: `/${r.region}/stores/${s.key}`,
  });
}

export default async function StorePage({ params }: { params: { region: Region; store: string } }) {
  const s = STORE_BY_KEY.get(params.store);
  if (!s) notFound();
  const r = regionOfMarket(s.market)!;
  // A store belongs to one region; any other region's URL for it is a duplicate.
  if (r.region !== params.region) notFound();
  const [offers, st] = await Promise.all([storeOffers(s.key), storeStat(s.key)]);
  const now = Date.now();
  const openCount = offers.filter((o) => offerStock(o, now) === "open").length;
  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: REGIONS[r.region].name }, { href: `/${r.region}/stores`, label: "Stores" }, { label: s.name }]} />
      <div className="card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <div className="eyebrow">
            {r.flag} {r.name} · prices in {r.currency}
          </div>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{s.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {openCount} Pokémon sealed products in stock · {offers.length} listed · last read{" "}
            {st?.lastOkAt ? <Ago iso={st.lastOkAt.toISOString()} initial={timeAgo(st.lastOkAt)} /> : "not yet"}
          </p>
        </div>
        <a href={s.base} target="_blank" rel={REL_STORE} className="btn-ghost shrink-0">
          Visit {storeHost(s)} ↗
        </a>
      </div>
      {offers.length ? (
        <div className="card mt-6 overflow-hidden">
          <ul className="divide-y divide-line">
            {offers.map((o) => {
              const state = offerStock(o, now);
              const pre = isPreorderSet(o.product.setCode);
              return (
                <li key={o.product.slug} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-raised">
                    {o.product.imageUrl && <img src={thumb(o.product.imageUrl, 120)!} alt="" loading="lazy" className="h-full w-full object-contain p-1" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/${r.region}/p/${o.product.slug}`} className="line-clamp-1 font-semibold hover:text-brand">
                      {o.product.name}
                    </Link>
                    <div className="text-xs text-faint">{o.product.productType}</div>
                  </div>
                  <StockPill state={state} preorder={pre}>
                    {offerStockLabel(state, pre)}
                  </StockPill>
                  <div className={`tabular w-24 text-right font-display font-bold ${state === "open" ? "" : "text-faint"}`}>{money(o.priceCents, s.market)}</div>
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
    </div>
  );
}
