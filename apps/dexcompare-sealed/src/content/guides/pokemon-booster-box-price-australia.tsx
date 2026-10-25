// Guide: Pokémon booster box prices in Australia (SEO sprint, 2026-10-23; the query "pokemon booster box price australia"). AU only.
// Every open booster box at Australian stores today (data.ts openBoxes): the cheapest box of every set in stock, newest set first, the
// price per pack (packs.ts), the range and its middle, pre-orders apart, what an Australian price includes (the ACL's single-price rule:
// GST is in the listed price) and what to add (delivery), and the tools. Facts from sets.ts and packs.ts; every number is today's.
import Link from "next/link";
import { money, plural } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { toolHref } from "../tools";
import type { GuideData } from "./data";
import { fixedPacks } from "./facts";
import { GUIDE_BY_SLUG } from "./index";
import { BoxTable, boxRows, cheapestBySet, median } from "./booster-box-kit";
import { Checklist, Decisions, GuideBody, guideHref, Lede, LiveBlock, NextLinks, Note, PACK_SOURCE, Prose, SetChips, typeHref, whereToBuy, type BodyProps, type GuideOutline, type GuideSection } from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("pokemon-booster-box-price-australia")!;
const LINK = "font-semibold text-brand hover:underline";

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const all = boxRows(data.cards, data.today);
  const released = all.filter((x) => !x.preorder);
  const pre = cheapestBySet(all.filter((x) => x.preorder));
  const bySet = cheapestBySet(released);
  const m = (c: number | null | undefined) => money(c ?? null, r.market);
  const packs = fixedPacks("booster-box") ?? 36;
  const cheapest = released[0] ?? null;
  const dearest = released.length > 1 ? released[released.length - 1] : null;
  const mid = median(released.map((x) => x.p.lowestPriceCents!));
  const recent = bySet.slice(0, 6);
  const older = bySet.slice(6);
  const recentMid = median(recent.map((x) => x.p.lowestPriceCents!));
  const olderMid = median(older.map((x) => x.p.lowestPriceCents!));
  const wide = bySet.filter((x) => x.p.inStockStores >= 5);

  const sections: GuideSection[] = [
    {
      id: "prices-by-set",
      title: "Booster box prices in Australia, set by set",
      live: true,
      body: (
        <>
          <Prose>
            <p>
              Every Pokémon set with a booster box in stock at an Australian store today, newest set first, with that set&rsquo;s cheapest box. Each price is one store&rsquo;s own
              listed price in Australian dollars, before delivery. The last column says how many of the Australian stores we read have that box in stock: a price at one store is
              one shop&rsquo;s shelf, a price with ten stores beside it is a box you can shop around for.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {bySet.length ? (
              <BoxTable r={r} rows={bySet} caption="The cheapest in-stock booster box of each Pokémon set at Australian stores today, newest set first" />
            ) : (
              <p className="text-sm leading-6 text-muted">No booster box is in stock at an Australian store right now.</p>
            )}
          </LiveBlock>
          <Prose>
            {cheapest && (
              <p>
                The cheapest box in Australia today is the <Link href={`/${r.region}/p/${cheapest.p.slug}`}>{cheapest.p.name}</Link> at <strong>{m(cheapest.p.lowestPriceCents)}</strong>
                {cheapest.perPack != null && <> ({m(cheapest.perPack)} a pack)</>}.{" "}
                {dearest && mid != null && (
                  <>
                    Across all {plural(released.length, "box", "boxes")} in stock, prices run from there to {m(dearest.p.lowestPriceCents)} for the {dearest.p.name}, and the middle of the
                    range is {m(mid)}.
                  </>
                )}
              </p>
            )}
            {recentMid != null && olderMid != null && (
              <p>
                The six newest sets in the table have a middle price of {m(recentMid)} for their cheapest box; the older sets below them, {m(olderMid)}. Older sets are no longer
                printed, so their boxes are priced by what&rsquo;s left on Australian shelves.
              </p>
            )}
          </Prose>
          <SetChips r={r} listed={data.listedSets} sets={recent.map((x) => x.set)} />
        </>
      ),
    },
    {
      id: "what-the-price-includes",
      title: "What an Australian price includes, and what to add",
      body: (
        <Prose>
          <p>
            Australian stores must show a single total price, so the price you see already includes GST. What it doesn&rsquo;t include is delivery: a box is heavy enough that
            postage across the country can add a noticeable amount, and stores charge very differently for it. Some ship free over a threshold, some charge a flat rate, and some
            with a shopfront let you collect. Two boxes a few dollars apart can swap places once delivery is added, so check the checkout total before you decide.
          </p>
          <p>
            Every price here is in Australian dollars from an Australian store. We don&rsquo;t convert overseas prices, because an overseas box also carries international shipping
            and GST on the import, and its returns go overseas. The same box priced in all seven regions we cover, each in its own currency, is in our booster box prices by
            country guide, linked from every page&rsquo;s footer.
          </p>
          <p>
            A booster box holds {packs} packs of one set, so its price per pack is its price divided by {packs}. That is the number to hold up against a bundle, an Elite Trainer Box
            or loose packs of the same set; <Link href={guideHref(r, "cheapest-way-to-buy-pokemon-packs")}>the cheapest way to buy Pokémon packs</Link> does that comparison for every
            pack type in Australia today.
          </p>
        </Prose>
      ),
    },
    {
      id: "pre-orders",
      title: "Booster boxes on pre-order in Australia",
      live: true,
      body: (
        <>
          <Prose>
            <p>
              A set that isn&rsquo;t out yet is sold on pre-order: you pay now or at dispatch, and the box ships around release day. We keep those apart from the in-stock table above,
              because a pre-order price is a promise, not a box on a shelf.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {pre.length ? (
              <BoxTable r={r} rows={pre} caption="Pokémon booster boxes open for pre-order at Australian stores today" whereHead="Open at" />
            ) : (
              <p className="text-sm leading-6 text-muted">No booster box is open for pre-order at an Australian store right now.</p>
            )}
          </LiveBlock>
          <Prose>
            {pre[0] && (
              <p>
                {pre[0].set.name} releases on {formatRelease(pre[0].set.releaseDate)}. Its cheapest Australian pre-order is {m(pre[0].p.lowestPriceCents)} today, at{" "}
                {plural(pre[0].p.inStockStores, "store")}. Compare every store on the <Link href={`/${r.region}/preorders/${pre[0].set.slug}`}>{pre[0].set.name} pre-order page</Link>, and read{" "}
                <Link href={guideHref(r, "how-to-preorder-pokemon-tcg")}>how to pre-order Pokémon TCG sets</Link> before you pay.
              </p>
            )}
          </Prose>
        </>
      ),
    },
    {
      id: "which-box",
      title: "Which box suits what you want",
      body: (
        <>
          <Decisions
            rows={[
              {
                when: "The most packs for the money",
                then: (
                  <>
                    Start with the cheapest price per pack in the table, then check delivery. {cheapest?.perPack != null && <>Today that floor is {m(cheapest.perPack)} a pack.</>}
                  </>
                ),
              },
              {
                when: "A particular set",
                then: (
                  <>
                    Open its row: the product page lists every Australian store with that box, in stock first and cheapest first, with when each was last checked.
                  </>
                ),
              },
              {
                when: "Shopping around",
                then: wide.length ? (
                  <>
                    Sets with five or more stores in stock today: {wide.slice(0, 5).map((x, i) => (
                      <span key={x.p.slug}>
                        {i > 0 && ", "}
                        <Link href={`/${r.region}/p/${x.p.slug}`}>{x.set.name}</Link>
                      </span>
                    ))}
                    . More stores means more chance of a price or delivery offer that suits you.
                  </>
                ) : (
                  <>No box is in stock at five or more Australian stores today; most are held by a few shops.</>
                ),
              },
              {
                when: "A box to open with friends",
                then: (
                  <>
                    A box&rsquo;s {packs} packs split evenly between two, three, four or six people. Our <Link href={guideHref(r, "booster-box-vs-etb-vs-booster-bundle")}>box vs ETB vs bundle</Link>{" "}
                    guide covers the smaller options.
                  </>
                ),
              },
            ]}
          />
        </>
      ),
    },
    {
      id: "checks",
      title: "Before you buy",
      body: (
        <>
          <Checklist
            items={[
              <>Add delivery to your postcode before comparing two stores.</>,
              <>Check the listing is the English-language booster box of the set you want, not a booster bundle, a display of a different language or a case.</>,
              <>New to a store? Look for an ABN, a returns policy and contact details.</>,
              <>
                Check the shrink-wrap when it arrives: <Link href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>how to avoid resealed products</Link>.
              </>,
              <>
                Comparing with eBay? Add the postage and check the seller: <Link href={guideHref(r, "ebay-vs-australian-stores-pokemon-fees")}>eBay vs Australian stores</Link>.
              </>,
            ]}
          />
          <Prose>
            <p>
              Selling a box you bought, or trading it? The <strong>value checker</strong> shows the cheapest Australian in-stock price of any sealed product, and the{" "}
              <strong>selling-fee calculator</strong> shows what eBay keeps from a sale at that price.
            </p>
          </Prose>
          <NextLinks
            links={[
              { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
              { href: toolHref(r.region, "selling-fee-calculator"), label: "Selling-fee calculator", icon: "arrow-right" },
              { href: guideHref(r, "where-to-buy-pokemon-cards-australia"), label: "Where to buy in Australia", icon: "store" },
            ]}
          />
          <Note>
            Prices are each Australian store&rsquo;s listed price, excluding delivery, read about twice a day. {PACK_SOURCE}
          </Note>
        </>
      ),
    },
    whereToBuy(r, {
      links: [
        { href: typeHref(r, "booster-box"), label: "Every booster box in Australia" },
        { href: guideHref(r, "cheapest-pokemon-booster-box"), label: "The cheapest booster box" },
      ],
    }),
  ];

  return {
    intro: (
      <Lede>
        {cheapest ? (
          <>
            A Pokémon booster box costs from <strong>{m(cheapest.p.lowestPriceCents)}</strong> in Australia today (the {cheapest.p.name}), and {plural(bySet.length, "set")}{" "}
            {bySet.length === 1 ? "has" : "have"} a box in stock at Australian stores.{" "}
          </>
        ) : (
          <>No Pokémon booster box is in stock at an Australian store right now. </>
        )}
        Here is each set&rsquo;s cheapest box, its price per pack, the boxes on pre-order, and what to add before you compare.{" "}
        <Link href={`/${r.region}/type/booster-boxes`} prefetch={false} className={LINK}>
          All booster boxes in Australia →
        </Link>
      </Lede>
    ),
    sections,
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
