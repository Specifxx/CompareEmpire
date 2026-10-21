// Guide: the weekly market wrap. A written, recurring digest of Pokémon sealed in the region, every week-dependent word of it computed
// from data.today and the live data, so the page is true every week without an edit: the week (the Monday of data.today's week), the
// sets releasing in the next 45 days and out in the last 30 (lib/deals.ts setsAround, as /<region>/this-week), the cheapest box, ETB and
// bundle of each today, the products under the median of 3+ stores today (lib/deals.ts dealPct) and the products DexCompare first
// tracked in the last 14 days. DexCompare keeps no price history: nothing here says a price moved, only what is true today. It links the
// digest (/this-week), the deals page and the release calendar rather than copying them.
import Link from "next/link";
import { CALENDAR_TYPES, type ProductCardData } from "@/lib/data";
import { dealPct, DEAL_MAX_RATIO, DEAL_MIN_STORES, JUST_RELEASED_DAYS, NEW_DAYS, SOON_DAYS } from "@/lib/deals";
import { money, plural, relativeDay } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import type { PokemonSet } from "@/lib/sets";
import { toolHref } from "../tools";
import type { GuideData } from "./data";
import { fixedPacks, newestReleased, packsBySeries, upcomingSets } from "./facts";
import { GUIDE_BY_SLUG } from "./index";
import {
  cheapestPerPack,
  GuideBody,
  guideHref,
  Lede,
  LiveBlock,
  linesFor,
  NextLinks,
  Note,
  perPackOf,
  PriceTable,
  ProductTh,
  Prose,
  SetChips,
  SetGroup,
  SetTitle,
  setHref,
  setOf,
  StackTable,
  typeHref,
  whereText,
  whereToBuy,
  type BodyProps,
  type GuideOutline,
  type PriceLine,
} from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("pokemon-tcg-market-wrap")!;

/** The Monday of the week `today` (YYYY-MM-DD, UTC) falls in. */
export function weekOf(today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * 86400_000).toISOString().slice(0, 10);
}

/** A product type as a sentence says it: "booster box", "Elite Trainer Box", "booster bundle". */
const said = (label: string) => (label === "Elite Trainer Box" ? label : label.toLowerCase());

/** One set's sentence: which of its box, ETB and bundle is the cheapest per pack today, or why there is nothing to say. */
export function setLine(s: PokemonSet, lines: PriceLine[], open: number, upcoming: boolean, r: RegionInfo): string {
  const priced = lines.filter((l) => l.p);
  if (!open && !priced.length)
    return upcoming
      ? `No store we compare in ${r.inName} has ${s.name} open for pre-order today.`
      : `Nothing from ${s.name} is in stock at a store we compare in ${r.inName} today.`;
  const floor = cheapestPerPack(lines);
  const best = floor != null ? priced.find((l) => perPackOf(l.p!).perPack === floor) : null;
  const count = !open ? "" : upcoming ? `${plural(open, "product")} open for pre-order in ${r.inName} today. ` : `${plural(open, "product")} in stock in ${r.inName} today. `;
  if (!best) return `${count}None of its booster box, Elite Trainer Box or booster bundle is ${upcoming ? "open for pre-order" : "in stock"} right now.`;
  if (priced.length === 1) return `${count}Of its headline products only the ${said(best.label)} is ${upcoming ? "open" : "in stock"}, at ${money(floor, r.market)} a pack.`;
  return `${count}Of its headline products, the ${said(best.label)} is the cheapest per pack right now, at ${money(floor, r.market)}.`;
}

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const today = data.today;
  const all = data.sets.map(setOf).filter((s): s is NonNullable<typeof s> => !!s);
  const soon = all.filter((s) => s.releaseDate > today);
  const recent = all.filter((s) => s.releaseDate <= today);
  const later = upcomingSets(today).filter((s) => !soon.some((x) => x.code === s.code));
  const nextLater = soon.length ? null : later[0] ?? null;
  const newest = newestReleased(today, 4);
  const deals = data.deals;
  const fresh = data.fresh;
  const topDeal = deals.length ? deals.reduce((a, b) => (dealPct(b) > dealPct(a) ? b : a)) : null;
  const bar = Math.round((1 - DEAL_MAX_RATIO) * 100);
  const us = r.market === "US";
  const box = fixedPacks("booster-box");
  const bundle = fixedPacks("booster-bundle");
  const [etbNow] = packsBySeries("etb");
  const tools = { value: toolHref(r.region, "value-checker"), trade: toolHref(r.region, "trade-calculator") };
  const preorder = (p: ProductCardData) => !!p.releaseDate && p.releaseDate > today;

  const setGroup = (s: PokemonSet, upcoming: boolean) => {
    const lines = linesFor(data.bySet[s.code], CALENDAR_TYPES, s, upcoming);
    const open = data.openCount[s.code] ?? 0;
    return (
      <SetGroup key={s.code} title={<SetTitle r={r} set={s} today={today} extra={<> · {relativeDay(s.releaseDate, today)}</>} />}>
        <p className="mb-2 text-[15px] leading-6 text-ink/90">{setLine(s, lines, open, upcoming, r)}</p>
        {lines.some((l) => l.p) && (
          <PriceTable r={r} caption={`${s.name} in ${r.inName} today: the cheapest booster box, Elite Trainer Box and booster bundle`} lines={lines} whereHead={upcoming ? "Open at" : "In stock at"} />
        )}
      </SetGroup>
    );
  };

  return {
    intro: (
      <>
        <p className="eyebrow mb-3">
          Week of <time dateTime={weekOf(today)}>{formatRelease(weekOf(today))}</time>
        </p>
        <Lede>
          Here’s Pokémon sealed in {r.inName} as it stands today, {formatRelease(today)}:{" "}
          {soon.length ? <>{plural(soon.length, "set")} releasing in the next {SOON_DAYS} days</> : <>no set releasing in the next {SOON_DAYS} days</>},{" "}
          {recent.length ? <>{plural(recent.length, "set")} out in the last {JUST_RELEASED_DAYS} days</> : <>none out in the last {JUST_RELEASED_DAYS} days</>},{" "}
          {deals.length ? <>products priced under the median of {r.adjective} stores</> : <>no product {bar}% under the median of {r.adjective} stores</>} and{" "}
          {fresh.length ? <>products we’ve started tracking</> : <>nothing newly tracked</>}. Every number is today’s. We keep no price history, so this wrap tells you
          where things stand, not how they got there.
        </Lede>
      </>
    ),
    sections: [
      {
        id: "at-a-glance",
        title: "This week at a glance",
        body: (
          <Prose>
            <ul>
              <li>
                <strong>Next release:</strong>{" "}
                {soon[0] ? (
                  <>
                    <Link href={setHref(r, soon[0])}>{soon[0].name}</Link>, {relativeDay(soon[0].releaseDate, today)} ({formatRelease(soon[0].releaseDate)}).
                    {soon.length > 1 && <> After it, {soon.slice(1).map((s) => s.name).join(", ")} in the same {SOON_DAYS}-day window.</>}
                  </>
                ) : nextLater ? (
                  <>
                    nothing in the next {SOON_DAYS} days. The next announced set is <Link href={setHref(r, nextLater)}>{nextLater.name}</Link>, due{" "}
                    {formatRelease(nextLater.releaseDate)}.
                  </>
                ) : (
                  <>no announced set is waiting for release right now.</>
                )}
              </li>
              <li>
                <strong>Just out:</strong>{" "}
                {recent[0] ? (
                  <>
                    <Link href={setHref(r, recent[0])}>{recent[0].name}</Link>, released {relativeDay(recent[0].releaseDate, today)}
                    {recent.length > 1 && <>, and {recent.slice(1).map((s) => s.name).join(", ")} before it</>}.
                  </>
                ) : (
                  <>no set came out in the last {JUST_RELEASED_DAYS} days{newest[0] && <>. The newest is <Link href={setHref(r, newest[0])}>{newest[0].name}</Link>, released {formatRelease(newest[0].releaseDate)}</>}.</>
                )}
              </li>
              <li>
                <strong>Under the median today:</strong>{" "}
                {topDeal ? (
                  <>
                    led by {topDeal.name}, {dealPct(topDeal)}% under the median of {plural(topDeal.inStockStores, "store")}. The list below shows{" "}
                    {deals.length === 1 ? "it" : `the ${deals.length} furthest under`}.
                  </>
                ) : (
                  <>nothing clears the bar right now.</>
                )}
              </li>
              <li>
                <strong>Newly tracked:</strong>{" "}
                {fresh.length ? <>{plural(fresh.length, "product")} we first listed in the last {NEW_DAYS} days and can buy today.</> : <>nothing in the last {NEW_DAYS} days.</>}
              </li>
            </ul>
            <p>The sections below take each in turn, with the products and prices behind them.</p>
          </Prose>
        ),
      },
      {
        id: "releasing-soon",
        title: `Releasing in the next ${SOON_DAYS} days`,
        live: true,
        body: (
          <>
            <Prose>
              <p>
                A set that isn’t out yet can still be bought: stores take pre-orders before the release date. Here’s each set due in the next {SOON_DAYS} days, how many
                of its products {r.adjective} stores have open for pre-order today, and the cheapest booster box, Elite Trainer Box and booster bundle among them.
              </p>
            </Prose>
            {soon.length ? (
              <LiveBlock r={r} checked={data.checked}>
                {soon.map((s) => setGroup(s, true))}
              </LiveBlock>
            ) : (
              <Note>
                No set releases in the next {SOON_DAYS} days.
                {nextLater ? (
                  <>
                    {" "}
                    The next one on the calendar is <Link href={setHref(r, nextLater)}>{nextLater.name}</Link>, on {formatRelease(nextLater.releaseDate)}.
                  </>
                ) : null}{" "}
                New sets go on the <Link href={`/${r.region}/releases`}>release calendar</Link> as soon as they’re added.
              </Note>
            )}
            <Prose>
              <p>
                Release dates are the English-language dates from The Pokémon Company, and stores may ship a few days either side. Before you pre-order, read{" "}
                <Link href={guideHref(r, "how-to-preorder-pokemon-tcg")}>how to pre-order Pokémon TCG sets</Link>: it lists what to check before you pay.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "just-released",
        title: `Out in the last ${JUST_RELEASED_DAYS} days`,
        live: true,
        body: (
          <>
            <Prose>
              <p>
                For each set out in the last {JUST_RELEASED_DAYS} days, here’s how many of its products are in stock in {r.inName} today, and the cheapest booster box,
                Elite Trainer Box and booster bundle of it, with the price per pack of each. The cheapest per pack in each set is marked.
              </p>
            </Prose>
            {recent.length ? (
              <LiveBlock r={r} checked={data.checked}>
                {recent.map((s) => setGroup(s, false))}
              </LiveBlock>
            ) : (
              <Note>
                No set came out in the last {JUST_RELEASED_DAYS} days. The newest sets already out are below, each with every {r.adjective} store’s price on its page.
              </Note>
            )}
            {!recent.length && <SetChips r={r} sets={newest} />}
            <p className="text-xs leading-5 text-muted">
              Each store’s listed price, excluding shipping. Per pack: a booster box holds {box} packs, an Elite Trainer Box {etbNow.packs} in the newest sets and a
              booster bundle {bundle}, as recorded in our data from the publisher’s product listings.
            </p>
          </>
        ),
      },
      {
        id: "under-the-median",
        title: "Under the median today",
        live: true,
        body: (
          <>
            <Prose>
              <p>
                A product makes this list when its cheapest in-stock price is at least {bar}% under the median price of the {DEAL_MIN_STORES} or more {r.adjective}{" "}
                stores that have it in stock today. It’s the same bar as the “below the median” badge on every product card.
                {us && " In the US the cheapest price can be a TCGplayer seller’s, while the median is the stores’."}
              </p>
            </Prose>
            <LiveBlock
              r={r}
              checked={data.checked}
              footer={
                <Link href={`/${r.region}/deals`} prefetch={false} className="font-semibold text-brand hover:underline">
                  All of today’s deals, by product type →
                </Link>
              }
            >
              {deals.length ? (
                <StackTable
                  caption={`Pokémon sealed priced under the median of ${r.adjective} stores today`}
                  head={["Product", "Cheapest", "Median", "Under by"]}
                  rows={deals.map((p) => ({
                    key: p.slug,
                    th: <ProductTh r={r} label={p.productType} p={p} />,
                    cells: [
                      <span key="c" className="font-semibold">{money(p.lowestPriceCents, r.market)}</span>,
                      <span key="m">{money(p.medianOpenCents, r.market)}</span>,
                      <span key="u" className="text-muted">{dealPct(p)}% · {plural(p.inStockStores, "store")}</span>,
                    ],
                  }))}
                />
              ) : (
                <p className="text-[15px] leading-6 text-muted">
                  No product is {bar}% under the median of {DEAL_MIN_STORES} or more {r.adjective} stores today.
                </p>
              )}
            </LiveBlock>
            <Prose>
              <p>
                {deals.length ? (
                  <>
                    A price well under the median means one store is asking less than most for the same product today. It says nothing about where the price goes
                    next. Before you buy, check the store’s delivery cost, which can close the gap, and check the shrink-wrap when it arrives:{" "}
                    <Link href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>how to avoid resealed product</Link> says what to look for.
                  </>
                ) : (
                  <>
                    An empty list means the stores agree closely on price today. The cheapest way to buy packs is still worth checking: the{" "}
                    <Link href={`/${r.region}/cheapest-packs`}>cheapest packs page</Link> ranks every product by price per pack.
                  </>
                )}
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "newly-tracked",
        title: "Newly tracked",
        live: true,
        body: (
          <>
            <Prose>
              <p>
                These are products DexCompare first saw in the last {NEW_DAYS} days that a store has open today. That isn’t the same as a new release: a store may
                simply have listed an older product we hadn’t seen before. A pre-order is marked as one.
              </p>
            </Prose>
            <LiveBlock r={r} checked={data.checked}>
              {fresh.length ? (
                <StackTable
                  caption={`Pokémon sealed first tracked by DexCompare in ${r.inName} in the last ${NEW_DAYS} days`}
                  head={["Product", "Cheapest", "Open at"]}
                  rows={fresh.map((p) => ({
                    key: p.slug,
                    th: <ProductTh r={r} label={preorder(p) ? `${p.productType} · pre-order` : p.productType} p={p} />,
                    cells: [<span key="c" className="font-semibold">{money(p.lowestPriceCents, r.market)}</span>, <span key="w" className="text-muted">{whereText(p)}</span>],
                  }))}
                />
              ) : (
                <p className="text-[15px] leading-6 text-muted">DexCompare hasn’t started tracking anything new in {r.inName} in the last {NEW_DAYS} days.</p>
              )}
            </LiveBlock>
          </>
        ),
      },
      {
        id: "how-to-use",
        title: "How to use this wrap",
        body: (
          <Prose>
            <p>
              <strong>Compare per pack, within a set.</strong> A <Link href={typeHref(r, "booster-box")}>booster box</Link>, an{" "}
              <Link href={typeHref(r, "etb")}>Elite Trainer Box</Link> and a <Link href={typeHref(r, "booster-bundle")}>booster bundle</Link> hold different numbers of
              packs, so their prices only line up once you divide. The tables above do it. An ETB’s per-pack price includes its sleeves, dice and promo:{" "}
              <Link href={guideHref(r, "pokemon-booster-box-vs-etb-value")}>booster box vs ETB, set by set</Link> works out what those extras cost.
            </p>
            <p>
              <strong>Count the stores.</strong> One store with a low price and nobody else in stock is a different situation from ten stores close together. Each
              product’s page shows every {r.adjective} store’s price side by side.
            </p>
            <p>
              <strong>Check a price you’ve been quoted.</strong> If a friend, a local shop or a marketplace seller offers you a box, the{" "}
              <Link href={tools.value}>value checker</Link> shows the cheapest in-stock store price, the median and the price per pack today. Swapping sealed product
              instead? The <Link href={tools.trade}>trade calculator</Link> adds up both sides.
            </p>
            <p>
              <strong>Add shipping.</strong> Every price here is the store’s listed price, excluding delivery, so two stores a little apart on price can swap places once
              postage is in.
            </p>
          </Prose>
        ),
      },
      {
        id: "every-week",
        title: "The wrap, every week",
        body: (
          <>
            <Prose>
              <p>
                This page rebuilds itself from the day’s data, so the sets, products and prices on it are always today’s, and the week at the top is always this week. For
                the full lists behind it, see the weekly digest, the deals page and the release calendar. The newest sets out, each with every product and price:
              </p>
            </Prose>
            <SetChips r={r} sets={newest} />
            <NextLinks
              links={[
                { href: `/${r.region}/this-week`, label: "This week in sealed", icon: "calendar" },
                { href: `/${r.region}/deals`, label: "Today’s deals", icon: "tag" },
                { href: `/${r.region}/releases`, label: "Release calendar", icon: "calendar" },
                { href: `/${r.region}/cheapest-packs`, label: "Cheapest per pack", icon: "search" },
              ]}
            />
          </>
        ),
      },
      whereToBuy(r, {
        tcg: soon[0] ? { query: soon[0].name, label: soon[0].name } : recent[0] ? { query: recent[0].name, label: recent[0].name } : { query: "", label: "Pokémon sealed product" },
        links: [
          { href: `/${r.region}/this-week`, label: "This week in sealed" },
          { href: `/${r.region}/releases`, label: "Release calendar" },
        ],
      }),
    ],
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody guide={GUIDE} r={r} outline={outline(r, data)} />;
}
