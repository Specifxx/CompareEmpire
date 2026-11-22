// Guide: the Delta Reign Elite Trainer Box (2026-11-23; the queries "delta reign etb", "delta reign elite trainer box restock",
// "delta reign etb wave 2"). After release the set's ETB sold out at many stores and several opened listings for a later shipment
// ("Wave 2 Pre-Order", "Wave 3", "ships in 2-4 weeks"). This guide reads the ETB's own store rows in the region (data.ts: the same
// read the product page makes) and splits them: in stock to ship now, and later-shipment pre-orders, judged ONLY from the store's
// own listing title (laterShipment below). Each market's headline beside it, in its own currency, never converted.
// No sales numbers, no forecast of when stock returns, no history claim (copy-rules.ts): every number is today's.
import Link from "next/link";
import { money, plural } from "@/lib/format";
import type { OfferView } from "@/lib/data";
import { REGIONS, type RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { usMsrpCents } from "@/lib/rrp";
import { TYPE_ABOUT } from "@/lib/type-about";
import { toolHref } from "../tools";
import type { GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import {
  Checklist,
  GuideBody,
  guideHref,
  Lede,
  LiveBlock,
  MsrpNote,
  NextLinks,
  Note,
  PACK_SOURCE,
  perPackOf,
  productHref,
  Prose,
  setHref,
  setOf,
  StackTable,
  typeHref,
  whereText,
  whereToBuy,
  type BodyProps,
  type GuideOutline,
  type GuideSection,
} from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("delta-reign-elite-trainer-box")!;
const LINK = "font-semibold text-brand hover:underline";
const CODE = "me6";
const ETB_SLUG = "delta-reign-elite-trainer-box";
/** How many store rows each table shows: the cheapest, then "every store" on the product page. */
const ROWS = 10;
/** The regions side by side: the US first (owner, 2026-11-22), then Canada, the UK and Australia, then the rest. */
const REGION_ORDER = ["US", "CA", "UK", "AU", "NZ", "EU", "SG"] as const;

/**
 * A listing the store itself sells as a LATER shipment: its title names a wave ("Wave 2"), a "ships in" window or a restock, or it
 * still says pre-order without naming the set's first release day (6 November). Read from the store's own words only; a title that
 * says nothing is stock to ship now.
 */
export function laterShipment(title: string): { later: boolean; wave: number | null } {
  const wave = /\bwave\s*(\d)\b/i.exec(title);
  if (wave) return { later: true, wave: Number(wave[1]) };
  if (/\bships?\s+in\s+\d|\brestock/i.test(title)) return { later: true, wave: null };
  const pre = /\bpre-?\s?order/i.test(title);
  const launch = /\bnov(?:ember)?\.?\s*0?6\b|\b0?6(?:th)?\s+nov|\brelease\s+date/i.test(title);
  return { later: pre && !launch, wave: null };
}

export function splitOffers(offers: readonly OfferView[]): { now: OfferView[]; later: (OfferView & { wave: number | null })[] } {
  const open = offers.filter((o) => o.inStock && !o.marketplace).sort((a, b) => a.priceCents - b.priceCents);
  const now: OfferView[] = [];
  const later: (OfferView & { wave: number | null })[] = [];
  for (const o of open) {
    const l = laterShipment(o.title);
    if (l.later) later.push({ ...o, wave: l.wave });
    else now.push(o);
  }
  return { now, later };
}

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const set = setOf(CODE)!;
  const out = set.releaseDate <= data.today;
  const open = data.bySet[CODE] ?? [];
  const etb = open.find((p) => p.productType === "Elite Trainer Box") ?? null;
  const pcEtb = open.find((p) => p.productType === "Pokémon Center Elite Trainer Box") ?? null;
  const box = open.find((p) => p.productType === "Booster Box") ?? null;
  const bundle = open.find((p) => p.productType === "Booster Bundle") ?? null;
  const pack = open.find((p) => p.productType === "Booster Pack") ?? null;
  const m = (c: number | null | undefined) => money(c ?? null, r.market);
  const product = data.product ?? null;
  const { now, later } = splitOffers(product?.offers ?? []);
  const listed = product?.offers.length ?? 0;
  const etbHref = productHref(r, { slug: product?.slug ?? ETB_SLUG });
  const etbPP = etb ? perPackOf(etb) : null;
  const packs = etbPP?.packs ?? null;
  const per = (cents: number) => (packs ? m(Math.round(cents / packs)) : "—");
  const us = r.market === "US";
  const msrp = us ? usMsrpCents("etb", CODE) : null;
  const median = now.length >= 3 ? now[Math.floor((now.length - 1) / 2)].priceCents : null;
  const elsewhere = REGION_ORDER.filter((mk) => mk !== r.market)
    .map((mk) => ({ mk, info: Object.values(REGIONS).find((x) => x.market === mk)!, s: product?.stats.find((x) => x.market === mk) ?? null }))
    .filter((x) => x.s && x.s.listedStores > 0);

  const storeRows = (rows: readonly (OfferView & { wave?: number | null })[], laterTable: boolean) =>
    rows.slice(0, ROWS).map((o, i) => ({
      key: `${o.store}-${i}`,
      highlight: i === 0,
      th: <span className="font-semibold text-ink">{o.storeName}</span>,
      cells: [
        <span key="p" className="font-semibold">
          {m(o.priceCents)}
        </span>,
        <span key="pp" className="text-muted">
          {per(o.priceCents)}
        </span>,
        ...(laterTable
          ? [
              <span key="w" className="text-muted">
                {o.wave ? `Wave ${o.wave} pre-order` : "Pre-order"}
              </span>,
            ]
          : []),
      ],
    }));

  const sections: GuideSection[] = [
    {
      id: "in-stock-today",
      title: `Where the Delta Reign ETB is in stock in ${r.inName}`,
      live: true,
      body: (
        <>
          <Prose>
            <p>
              The {plural(Math.min(ROWS, now.length) || 0, "cheapest store")} with the Delta Reign Elite Trainer Box in stock to ship now in {r.inName}, cheapest first, with
              the price per pack{packs ? ` for its ${packs} packs` : ""}. Listings that the store itself sells as a later shipment are in the next section, not here.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {now.length ? (
              <StackTable
                caption={`Delta Reign Elite Trainer Box: the cheapest stores with it in stock in ${r.inName} today`}
                head={["Store", "Price", "Per pack"]}
                rows={storeRows(now, false)}
              />
            ) : (
              <p className="text-sm text-muted">
                No {r.adjective} store we track lists the Delta Reign ETB in stock to ship now. A store can open a listing on any check; the product page lists every store
                that has listed it, sold out included.
              </p>
            )}
          </LiveBlock>
          <Prose>
            {now.length > 0 && (
              <p>
                Today the cheapest is <strong>{m(now[0].priceCents)}</strong> at {now[0].storeName}
                {packs ? <>, {per(now[0].priceCents)} a pack</> : null}. {plural(now.length, "store")} of the {plural(listed, `${r.adjective} store`)} that list it have it to
                ship now{median != null && <>, and the middle price among them is {m(median)}</>}. Prices exclude shipping, so add delivery before you compare two stores.
              </p>
            )}
            {msrp != null && (
              <p>
                The US MSRP of a Delta Reign Elite Trainer Box is {money(msrp, "US")}. Stores set their own prices, so today&rsquo;s sit above or below it.
              </p>
            )}
          </Prose>
          {msrp != null && <MsrpNote />}
          <p className="mt-3 text-sm">
            <Link href={etbHref} prefetch={false} className={LINK}>
              Every store&rsquo;s Delta Reign ETB price, sold out included →
            </Link>
          </p>
        </>
      ),
    },
    {
      id: "wave-pre-orders",
      title: "Restocks and wave pre-orders",
      live: true,
      body: (
        <>
          <Prose>
            <p>
              When a new set&rsquo;s first shipment sells out, some stores keep selling it as a pre-order for their next shipment from the distributor. The listing usually says
              so in its title: &ldquo;Wave 2 pre-order&rdquo;, &ldquo;Wave 3&rdquo;, &ldquo;ships in 2&ndash;4 weeks&rdquo;. You pay now, or reserve, and the store ships when that
              stock reaches it. Any date in the title is the store&rsquo;s own estimate.
            </p>
            <p>
              These are the {r.adjective} stores whose Delta Reign ETB listing says it is a later shipment today, cheapest first. We read only the store&rsquo;s own words; a
              listing that doesn&rsquo;t say is counted as stock to ship now.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {later.length ? (
              <StackTable
                caption={`Delta Reign Elite Trainer Box: stores taking orders for a later shipment in ${r.inName} today`}
                head={["Store", "Price", "Per pack", "Listing says"]}
                rows={storeRows(later, true)}
              />
            ) : (
              <p className="text-sm text-muted">
                No {r.adjective} store we track has a Delta Reign ETB listing marked as a wave pre-order or later shipment today. When one opens it shows here on the next
                check, about twice a day.
              </p>
            )}
          </LiveBlock>
          <Prose>
            {later.length > 0 && now.length > 0 && (
              <p>
                The cheapest later-shipment listing is {m(later[0].priceCents)} at {later[0].storeName}, against {m(now[0].priceCents)} for stock that ships now. A wave
                pre-order can be the cheaper way in, at the cost of waiting.
              </p>
            )}
            <p>Before you pre-order a restock, check:</p>
          </Prose>
          <Checklist
            items={[
              <>When the store takes payment: at order, or at dispatch.</>,
              <>What happens if its allocation is cut: a full refund, a partial order, or a longer wait.</>,
              <>Whether a per-customer limit applies, and whether two in one order changes the shipping.</>,
              <>
                That the listing is the English Elite Trainer Box, not the{" "}
                <Link href={guideHref(r, "pokemon-center-etb-vs-elite-trainer-box")}>Pokémon Center edition</Link> or a case of ten.
              </>,
              <>
                The rest of the checks are in <Link href={guideHref(r, "how-to-preorder-pokemon-tcg")}>how to pre-order Pokémon TCG</Link>.
              </>,
            ]}
          />
        </>
      ),
    },
    {
      id: "get-told",
      title: "Get told when it changes",
      body: (
        <>
          <Prose>
            <p>
              Stores open restock listings without notice. Three ways to hear about it without checking every store yourself:
            </p>
          </Prose>
          <Checklist
            items={[
              <>
                <strong>A price alert.</strong> On the <Link href={etbHref}>Delta Reign ETB page</Link>, the price alert button sends one email when the
                cheapest price in {r.inName} falls under the figure you set.
              </>,
              <>
                <strong>Discord and Telegram.</strong> The free <em>TCG Deals &amp; Restocks</em> server and channel post sealed restocks and deals from the stores we track,
                twice a day, each checked at the store first. The links are at the foot of this page.
              </>,
              <>
                <strong>This page.</strong> Both tables above are rebuilt from every store&rsquo;s own listing about twice a day.
              </>,
            ]}
          />
        </>
      ),
    },
    {
      id: "against-the-rest",
      title: "The ETB against the rest of Delta Reign",
      live: true,
      body: (
        <>
          <Prose>
            <p>
              An <Link href={typeHref(r, "etb")}>Elite Trainer Box</Link> is not the cheapest way to Delta Reign packs: you pay for the sleeves, dice, damage counters and
              storage box too. Here is what a pack costs in each of the set&rsquo;s main products in {r.inName} today.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            <StackTable
              caption={`Delta Reign: the cheapest in-stock price and price per pack of each main product in ${r.inName} today`}
              head={["Product", "Price", "Per pack", "In stock at"]}
              rows={[box, etb, pcEtb, bundle, pack]
                .filter((p): p is NonNullable<typeof p> => !!p)
                .map((p) => ({
                  key: p.slug,
                  highlight: p === etb,
                  th: (
                    <Link href={productHref(r, p)} prefetch={false} className="font-semibold text-ink hover:text-brand hover:underline">
                      {p.name}
                    </Link>
                  ),
                  cells: [
                    <span key="p" className="font-semibold">
                      {m(p.lowestPriceCents)}
                    </span>,
                    <span key="pp" className="text-muted">
                      {perPackOf(p).perPack != null ? m(perPackOf(p).perPack) : "—"}
                    </span>,
                    <span key="w" className="text-muted">
                      {whereText(p)}
                    </span>,
                  ],
                }))}
            />
          </LiveBlock>
          <Prose>
            <p>
              {TYPE_ABOUT["elite-trainer-boxes"]} {packs != null && <>Delta Reign&rsquo;s holds {packs} packs.</>} A{" "}
              <Link href={typeHref(r, "booster-box")}>booster box</Link> is the most packs in one product, and a{" "}
              <Link href={typeHref(r, "booster-bundle")}>booster bundle</Link> the fewest of the three. The full comparison is in{" "}
              <Link href={guideHref(r, "delta-reign-booster-box-vs-etb")}>Delta Reign booster box vs ETB</Link>, and the box&rsquo;s store-by-store prices are in{" "}
              <Link href={guideHref(r, "delta-reign-booster-box-price")}>the Delta Reign booster box price</Link>.
            </p>
          </Prose>
        </>
      ),
    },
    ...(elsewhere.length
      ? [
          {
            id: "other-regions",
            title: "The Delta Reign ETB in other regions",
            body: (
              <>
                <Prose>
                  <p>
                    The cheapest in-stock Delta Reign ETB in each other region we compare, in that region&rsquo;s own currency and never converted. It shows where stock
                    sits today; shipping and import charges usually make a local store the better buy.
                  </p>
                </Prose>
                <StackTable
                  caption="Delta Reign Elite Trainer Box: the cheapest in-stock price in each region today, in its own currency"
                  head={["Region", "From", "In stock at"]}
                  rows={elsewhere.map(({ mk, info, s }) => ({
                    key: mk,
                    th: <span className="font-semibold text-ink">{info.name}</span>,
                    cells: [
                      <span key="p" className="font-semibold">
                        {s!.inStockStores > 0 ? money(s!.lowestPriceCents, mk) : "—"}
                      </span>,
                      <span key="w" className="text-muted">
                        {s!.inStockStores > 0 ? plural(s!.inStockStores, "store") : `none of ${plural(s!.listedStores, "store")}`}
                      </span>,
                    ],
                  }))}
                />
              </>
            ),
          } satisfies GuideSection,
        ]
      : []),
    {
      id: "faq",
      title: "Delta Reign ETB questions",
      body: (
        <Prose>
          <h3 className="mt-2 font-bold text-ink">When did the Delta Reign Elite Trainer Box come out?</h3>
          <p>
            Delta Reign, the Mega Evolution series set, {out ? "came out" : "comes out"} in English on {formatRelease(set.releaseDate)}, and the Elite Trainer Box with it.
          </p>
          <h3 className="mt-4 font-bold text-ink">How many packs are in the Delta Reign ETB?</h3>
          <p>
            {packs != null ? <>{packs} Delta Reign booster packs, with sleeves, energy cards, dice, condition markers and a storage box.</> : <>See the product page for its contents.</>}{" "}
            {PACK_SOURCE}
          </p>
          <h3 className="mt-4 font-bold text-ink">Is the Delta Reign ETB in stock in {r.inName}?</h3>
          <p>
            {now.length ? (
              <>
                Yes, at {plural(now.length, "store")} as of the last check, from {m(now[0].priceCents)}.
              </>
            ) : (
              <>Not at any {r.adjective} store we track as of the last check.</>
            )}{" "}
            {later.length ? <>{plural(later.length, "more store")} {later.length === 1 ? "takes" : "take"} orders for a later shipment.</> : null}
          </p>
          <h3 className="mt-4 font-bold text-ink">What does &ldquo;Wave 2 pre-order&rdquo; mean?</h3>
          <p>
            The store sold its first shipment and is taking orders for its next one. It ships when that stock arrives; the timing in the listing is the store&rsquo;s
            estimate, not the publisher&rsquo;s.
          </p>
          <h3 className="mt-4 font-bold text-ink">Is the Pokémon Center ETB the same product?</h3>
          <p>
            No. The Pokémon Center edition is sold by the publisher&rsquo;s own store and holds more packs and extras; it has{" "}
            <Link href={guideHref(r, "pokemon-center-etb-vs-elite-trainer-box")}>its own comparison</Link>.
          </p>
          <h3 className="mt-4 font-bold text-ink">Should I open it or keep it sealed?</h3>
          <p>
            That is your call; this page compares prices today and makes no forecast. The <Link href={toolHref(r.region, "value-checker")}>value checker</Link> gives
            today&rsquo;s cheapest price of any sealed product here.
          </p>
        </Prose>
      ),
    },
    {
      id: "more-delta-reign",
      title: "More on Delta Reign",
      body: (
        <>
          <NextLinks
            links={[
              { href: setHref(r, set), label: "All Delta Reign sealed", icon: "tag" },
              { href: etbHref, label: "Delta Reign ETB: every store", icon: "store" },
              { href: guideHref(r, "delta-reign-chase-cards"), label: "Delta Reign chase cards", icon: "arrow-right" },
              { href: guideHref(r, "delta-reign-card-list"), label: "Delta Reign card list", icon: "arrow-right" },
              { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
              { href: toolHref(r.region, "trade-calculator"), label: "Trade calculator", icon: "arrow-right" },
            ]}
          />
          <Note>Prices are each store&rsquo;s listed price, excluding shipping, read about twice a day. {PACK_SOURCE}</Note>
        </>
      ),
    },
    whereToBuy(r, {
      tcg: { query: "Delta Reign Elite Trainer Box", label: "the Delta Reign ETB" },
      links: [
        { href: guideHref(r, "whats-in-a-pokemon-elite-trainer-box"), label: "What’s in an ETB" },
        { href: guideHref(r, "pokemon-mega-evolution-sealed-price-guide"), label: "Mega Evolution price guide" },
      ],
    }),
  ];

  return {
    intro: (
      <Lede>
        {now.length ? (
          <>
            The Delta Reign Elite Trainer Box is in stock at {plural(now.length, `${r.adjective} store`)} today, from <strong>{m(now[0].priceCents)}</strong>
            {packs ? <> ({per(now[0].priceCents)} a pack)</> : null}.{" "}
          </>
        ) : etb ? (
          <>
            The Delta Reign Elite Trainer Box costs from <strong>{m(etb.lowestPriceCents)}</strong> in {r.inName} today.{" "}
          </>
        ) : (
          <>No {r.adjective} store we track has the Delta Reign Elite Trainer Box to ship now. </>
        )}
        {later.length ? <>{plural(later.length, "more store")} {later.length === 1 ? "takes" : "take"} wave pre-orders for a later shipment. </> : null}
        Below: the cheapest in-stock stores, the restock listings, what a pack costs against the box and bundle, and the other regions.{" "}
        <Link href={setHref(r, set)} prefetch={false} className={LINK}>
          All Delta Reign →
        </Link>
      </Lede>
    ),
    sections,
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
