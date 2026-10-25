// The homepages' market report (lib/market-report.ts): server components, so every sentence and every product link is in the
// initial HTML. RegionReport closes a region home; RegionsCompared sets the seven regions side by side after it.
import Link from "next/link";
import type { ProductCardData } from "@/lib/data";
import { money, plural } from "@/lib/format";
import { perPackSentence, preorderSentence, rangeSentence, spreadSentence, stockSentence, type MarketReport, type TypeRange } from "@/lib/market-report";
import { formatRelease } from "@/lib/release";
import type { RegionInfo } from "@/lib/regions";
import { TYPE_BY_LABEL } from "@/lib/sealed-title";

const href = (r: RegionInfo, p: Pick<ProductCardData, "slug">) => `/${r.region}/p/${p.slug}`;
const typeHref = (r: RegionInfo, label: string) => {
  const t = TYPE_BY_LABEL.get(label);
  return t ? `/${r.region}/type/${t.slug}` : `/${r.region}/sealed`;
};
const where = (p: ProductCardData) => (p.inStockStores > 0 ? `in stock at ${plural(p.inStockStores, "store")}${p.marketplaceOpen ? " + TCGplayer" : ""}` : "on TCGplayer");
const A = "font-semibold text-ink underline underline-offset-2 hover:text-brand";

function ProductLinks({ r, items }: { r: RegionInfo; items: { p: ProductCardData; note: string }[] }) {
  return (
    <ul className="mt-2 grid gap-1.5 text-[15px] leading-6">
      {items.map(({ p, note }) => (
        <li key={`${p.slug}-${note}`}>
          <Link href={href(r, p)} prefetch={false} className={A}>
            {p.name} price in {r.inName}
          </Link>{" "}
          <span className="text-muted">
            · {note}: {money(p.lowestPriceCents, r.market)}, {where(p)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TypeBlock({ r, t }: { r: RegionInfo; t: TypeRange }) {
  const plural = TYPE_BY_LABEL.get(t.label)?.plural ?? t.label;
  const spread = spreadSentence(t);
  const items = [
    { p: t.cheapest, note: "cheapest" },
    ...(t.perPack && t.perPack.p.slug !== t.cheapest.slug ? [{ p: t.perPack.p, note: `cheapest per pack (${money(t.perPack.cents, r.market)} a pack)` }] : []),
    ...(t.dearest.slug !== t.cheapest.slug ? [{ p: t.dearest, note: "dearest" }] : []),
  ];
  return (
    <div>
      <h3 className="font-display text-lg font-bold">
        {plural} in {r.inName}: price range today
      </h3>
      <p className="mt-1.5 text-[15px] leading-7 text-muted">
        {rangeSentence(t, r)} {spread}
      </p>
      <ProductLinks r={r} items={items} />
      <p className="mt-2 text-sm">
        <Link href={typeHref(r, t.label)} prefetch={false} className="font-semibold text-brand hover:underline">
          Every {plural.toLowerCase().startsWith("elite") ? plural : plural.toLowerCase()} in stock in {r.inName}, cheapest first →
        </Link>
      </p>
    </div>
  );
}

/** A region home's report: "this week" in the region, in sentences and links. */
export function RegionReport({ rep }: { rep: MarketReport }) {
  const { r } = rep;
  if (!rep.types.length) return null;
  const pp = perPackSentence(rep.types, r);
  const stock = stockSentence(rep.stock, r);
  const pre = preorderSentence(rep.preorder, r);
  return (
    <section className="mt-16" aria-labelledby="report-h" data-market-report={r.region}>
      <div className="eyebrow mb-1">From today&rsquo;s prices</div>
      <h2 id="report-h" className="font-display text-2xl font-bold tracking-tight sm:text-[28px]">
        Pokémon sealed prices in {r.inName} this week
      </h2>
      <p className="mt-3 max-w-3xl text-[15px] leading-7 text-muted">
        We read {plural(rep.overview.stores, `${r.adjective} store`)} with Pokémon sealed listed. Between them they list {rep.overview.products.toLocaleString("en")} sealed products, and{" "}
        {rep.overview.inStock.toLocaleString("en")} of those can be bought today. Every figure below is the cheapest in-stock price at a single store, in {r.currency},
        before shipping.
      </p>
      <div className="mt-6 grid max-w-3xl gap-8">
        {rep.types.map((t) => (
          <TypeBlock key={t.label} r={r} t={t} />
        ))}
        {pp && (
          <div>
            <h3 className="font-display text-lg font-bold">The cheapest way to buy packs in {r.inName} this week</h3>
            <p className="mt-1.5 text-[15px] leading-7 text-muted">
              {pp} A price per pack is the product&rsquo;s price divided by its packs; an Elite Trainer Box&rsquo;s also pays for its sleeves, dice and storage box.
            </p>
          </div>
        )}
        {rep.newestBox && (
          <div>
            <h3 className="font-display text-lg font-bold">The newest set&rsquo;s booster box</h3>
            <p className="mt-1.5 text-[15px] leading-7 text-muted">
              The newest released set with a booster box in stock in {r.inName} is {rep.newestBox.set.name}, out since {formatRelease(rep.newestBox.set.releaseDate)}. Its
              cheapest box is {money(rep.newestBox.p.lowestPriceCents, r.market)} today, {where(rep.newestBox.p)}.{" "}
              <Link href={href(r, rep.newestBox.p)} prefetch={false} className={A}>
                Compare every store&rsquo;s {rep.newestBox.p.name} price
              </Link>
              .
            </p>
          </div>
        )}
        {pre && rep.preorder && (
          <div>
            <h3 className="font-display text-lg font-bold">On pre-order: {rep.preorder.set.name}</h3>
            <p className="mt-1.5 text-[15px] leading-7 text-muted">{pre}</p>
            <ProductLinks r={r} items={rep.preorder.lines.map((p) => ({ p, note: "pre-order from" }))} />
            <p className="mt-2 text-sm">
              <Link href={`/${r.region}/preorders/${rep.preorder.set.slug}`} prefetch={false} className="font-semibold text-brand hover:underline">
                {rep.preorder.set.name} pre-orders, store by store →
              </Link>
            </p>
          </div>
        )}
        {stock && rep.stock && (
          <div>
            <h3 className="font-display text-lg font-bold">How stock moved this week</h3>
            <p className="mt-1.5 text-[15px] leading-7 text-muted">{stock}</p>
            {rep.stock.cameIn.length > 0 && (
              <>
                <p className="mt-2 text-sm text-muted">Boxes, ETBs and bundles that came into stock in that time:</p>
                <ProductLinks r={r} items={rep.stock.cameIn.slice(0, 6).map((p) => ({ p, note: "from" }))} />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** The landing page: the seven regions side by side (each in its own currency: no conversion), then one paragraph per region. */
export function RegionsCompared({ reports }: { reports: MarketReport[] }) {
  const live = reports.filter((x) => x.types.length);
  if (!live.length) return null;
  const pick = (rep: MarketReport, label: string) => rep.types.find((t) => t.label === label) ?? null;
  const most = live.reduce((a, b) => (b.overview.inStock > a.overview.inStock ? b : a));
  const fewest = live.reduce((a, b) => (b.overview.inStock < a.overview.inStock ? b : a));
  const preSet = live.find((x) => x.preorder)?.preorder?.set ?? null;
  return (
    <section className="page mt-14" aria-labelledby="regions-compared-h" data-regions-compared="">
      <div className="mx-auto max-w-3xl">
        <h2 id="regions-compared-h" className="font-display text-2xl font-bold tracking-tight">
          Pokémon booster box and ETB prices this week, region by region
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          Each region is priced in its own currency, so the figures below are not converted: a booster box costs what its stores charge there. {most.r.name} has the most sealed
          product in stock today ({most.overview.inStock.toLocaleString("en")} products across {plural(most.overview.stores, "store")}){most !== fewest ? `, and ${fewest.r.name} the least (${fewest.overview.inStock.toLocaleString("en")} across ${plural(fewest.overview.stores, "store")})` : ""}. Every
          price is a single store&rsquo;s own listing, before shipping.
        </p>
        <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Cheapest in-stock booster box, Elite Trainer Box and booster bundle in each region today</caption>
            <thead className="bg-raised text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">Region</th>
                <th scope="col" className="px-3 py-2">Booster box from</th>
                <th scope="col" className="hidden px-3 py-2 sm:table-cell">ETB from</th>
                <th scope="col" className="hidden px-3 py-2 sm:table-cell">Bundle from</th>
                <th scope="col" className="px-3 py-2">In stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {live.map((rep) => {
                const cell = (label: string) => {
                  const t = pick(rep, label);
                  return t ? (
                    <Link href={href(rep.r, t.cheapest)} prefetch={false} className="font-semibold text-ink hover:text-brand">
                      {money(t.cheapest.lowestPriceCents, rep.r.market)}
                    </Link>
                  ) : (
                    <span className="text-faint">—</span>
                  );
                };
                return (
                  <tr key={rep.r.region}>
                    <th scope="row" className="px-3 py-2 font-semibold">
                      <Link href={`/${rep.r.region}`} prefetch={false} className="hover:text-brand">
                        {rep.r.name}
                      </Link>
                    </th>
                    <td className="tabular px-3 py-2">{cell("Booster Box")}</td>
                    <td className="tabular hidden px-3 py-2 sm:table-cell">{cell("Elite Trainer Box")}</td>
                    <td className="tabular hidden px-3 py-2 sm:table-cell">{cell("Booster Bundle")}</td>
                    <td className="tabular px-3 py-2 text-muted">{rep.overview.inStock.toLocaleString("en")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-8 grid gap-7">
          {live.map((rep) => {
            const box = pick(rep, "Booster Box");
            const etb = pick(rep, "Elite Trainer Box");
            const pp = perPackSentence(rep.types, rep.r);
            return (
              <div key={rep.r.region}>
                <h3 className="font-display text-lg font-bold">
                  <Link href={`/${rep.r.region}`} prefetch={false} className="hover:text-brand">
                    Pokémon sealed in {rep.r.inName}
                  </Link>
                </h3>
                <p className="mt-1.5 text-[15px] leading-7 text-muted">
                  {box ? rangeSentence(box, rep.r) : ""} {etb ? rangeSentence(etb, rep.r) : ""} {pp}
                </p>
                <ProductLinks r={rep.r} items={[...(box ? [{ p: box.cheapest, note: "cheapest booster box" }] : []), ...(etb ? [{ p: etb.cheapest, note: "cheapest ETB" }] : [])]} />
              </div>
            );
          })}
        </div>
        {preSet && (
          <div className="mt-10">
            <h3 className="font-display text-lg font-bold">{preSet.name} pre-order prices by region</h3>
            <p className="mt-1.5 text-[15px] leading-7 text-muted">
              {preSet.name} releases on {formatRelease(preSet.releaseDate)}. These are the cheapest pre-orders open today; a store&rsquo;s pre-order price can change before
              release day, and some charge at order, others at dispatch.
            </p>
            <ul className="mt-3 grid gap-1.5 text-[15px] leading-6">
              {live
                .filter((x) => x.preorder?.set.code === preSet.code)
                .map((rep) => (
                  <li key={rep.r.region}>
                    <span className="font-semibold">{rep.r.name}:</span>{" "}
                    {rep.preorder!.lines.map((p, i) => (
                      <span key={p.slug}>
                        {i > 0 && ", "}
                        <Link href={href(rep.r, p)} prefetch={false} className="underline underline-offset-2 hover:text-brand">
                          {p.name}
                        </Link>{" "}
                        <span className="text-muted">from {money(p.lowestPriceCents, rep.r.market)}</span>
                      </span>
                    ))}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

