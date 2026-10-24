// Guide: eBay Australia against Australian stores, for buyers and for sellers. AU only. The live block is the newest released set the
// Australian stores have in stock: its cheapest box, ETB and bundle with the middle price of the stores that have each
// (ProductStat.medianOpenCents), the yardstick for an eBay listing. Every fee figure comes from lib/fees.ts (the AU schedules, the day
// they were checked, eBay's page) and every worked example is computed here with sellingFees() and money(), never typed by hand. No
// postage prices beyond the labelled example input, no claims about what eBay's buyer protection covers beyond pointing to eBay's terms,
// no store-credit rates (they are each store's own).
import Link from "next/link";
import { toolHref } from "@/content/tools";
import { CALENDAR_TYPES } from "@/lib/data";
import { FEE_BY_KEY, FEES_CHECKED, scheduleText, sellingFees } from "@/lib/fees";
import { money } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { TYPE_BY_LABEL } from "@/lib/sealed-title";
import { storesInMarket } from "@/lib/stores";
import type { GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import {
  Checklist,
  Decisions,
  GuideBody,
  guideHref,
  Lede,
  linesFor,
  LiveBlock,
  NextLinks,
  Note,
  ProductTh,
  Prose,
  setHref,
  setOf,
  SetTitle,
  StackTable,
  typeHref,
  whereText,
  whereToBuy,
  type BodyProps,
  type GuideOutline,
} from "./kit";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const GUIDE = GUIDE_BY_SLUG.get("ebay-vs-australian-stores-pokemon-fees")!;

const FREE = FEE_BY_KEY.get("ebay-au-free")!;
const STANDARD = FEE_BY_KEY.get("ebay-au-standard")!;

/** The worked examples: an item price and the postage charged to the buyer, in cents. Inputs, labelled as examples in the copy. */
const EXAMPLES = [
  { key: "etb", label: "An Elite Trainer Box", itemCents: 6000, postageCents: 1200 },
  { key: "box", label: "A booster box", itemCents: 25000, postageCents: 1200 },
] as const;

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const m = (cents: number) => money(cents, r.market);
  const count = storesInMarket(r.market).length;
  const set = data.sets.map(setOf).find((s) => !!s) ?? null;
  const lines = set ? linesFor(data.bySet[set.code], CALENDAR_TYPES, set) : [];
  const yard = lines.find((l) => l.p && l.p.lowestPriceCents != null && l.p.medianOpenCents != null) ?? null;
  const checked = formatRelease(FEES_CHECKED);
  const examples = EXAMPLES.map((e) => ({ ...e, free: sellingFees(e.itemCents, e.postageCents, FREE), std: sellingFees(e.itemCents, e.postageCents, STANDARD) }));
  const [etb, box] = examples;
  const source = (
    // Not an affiliate link: eBay's own fee page, the source of every figure (tests/guides.test.ts exempts eBay's help pages).
    <a href={STANDARD.source} rel="nofollow noopener noreferrer" target="_blank">
      eBay Australia’s “Selling fees” page
    </a>
  );

  return {
    intro: (
      <Lede>
        Buying on eBay Australia can be cheaper than a store, or dearer once postage is added; selling there can cost you nothing in fees, or more than a store would pay
        you. Here’s how to work out which, with <strong>today’s prices from {count} Australian stores</strong> as the yardstick and eBay’s published fees, checked{" "}
        {checked}.
      </Lede>
    ),
    sections: [
      {
        id: "yardstick",
        title: "The yardstick: what Australian stores charge today",
        live: true,
        body: (
          <>
            <Prose>
              <p>
                Before you judge an eBay price, know the going rate. Here are the newest set’s headline products in Australia right now: the cheapest store, and the middle price
                of all the stores that have each one in stock.
              </p>
            </Prose>
            <LiveBlock r={r} checked={data.checked} title={set ? <SetTitle r={r} set={set} today={data.today} /> : undefined}>
              {set ? (
                <StackTable
                  caption={`${set.name}: the cheapest and the middle store price of its booster box, Elite Trainer Box and booster bundle in Australia today`}
                  head={["Product", "Cheapest store", "Middle price", "In stock at"]}
                  rows={lines.map((l) => ({
                    key: l.label,
                    type: TYPE_BY_LABEL.get(l.label)?.key,
                    th: <ProductTh r={r} label={l.label} p={l.p} />,
                    cells: l.p
                      ? [
                          <span key="c" className="font-semibold">{m(l.p.lowestPriceCents ?? 0)}</span>,
                          <span key="m">{l.p.medianOpenCents != null ? m(l.p.medianOpenCents) : "—"}</span>,
                          <span key="w" className="text-muted">{whereText(l.p)}</span>,
                        ]
                      : [<span key="m" className="text-faint">{l.missing}</span>, <span key="a" className="text-faint">—</span>, <span key="b" className="text-faint">—</span>],
                  }))}
                />
              ) : (
                <p className="text-sm text-muted">None in stock right now.</p>
              )}
            </LiveBlock>
            <Prose>
              {yard?.p ? (
                <p>
                  Take the {yard.label === "Elite Trainer Box" ? "Elite Trainer Box" : yard.label.toLowerCase()}: the cheapest Australian store asks{" "}
                  {m(yard.p.lowestPriceCents!)} today and the middle price is {m(yard.p.medianOpenCents!)}. An eBay listing for the same product only saves you money if its
                  price <strong>plus postage</strong> comes in under {m(yard.p.lowestPriceCents!)} plus that store’s own delivery charge.
                </p>
              ) : (
                <p>
                  When several stores have a product in stock, its page shows their middle price. That, and the cheapest store’s price plus its delivery charge, is what an
                  eBay listing has to beat.
                </p>
              )}
              <p>
                Store prices here include GST and exclude shipping.{" "}
                {set ? (
                  <>
                    The <Link href={setHref(r, set)}>{set.name} set page</Link> has every product from the set, and each product page ranks every store that stocks it.
                  </>
                ) : (
                  <>Each product page ranks every Australian store that stocks it.</>
                )}
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "buying",
        title: "Buying: an eBay listing against a store",
        body: (
          <Prose>
            <p>An eBay price and a store price aren’t quite the same thing. Line them up on these points before you decide:</p>
            <ul>
              <li>
                <strong>Postage.</strong> Our store prices leave shipping out, and so does an eBay headline price. Compare the total of each: item plus delivery to your
                postcode.
              </li>
              <li>
                <strong>GST.</strong> Australian stores show prices with Australia’s standard 10% GST included. On eBay, check the total at checkout, especially from a seller
                overseas, where import charges may apply.
              </li>
              <li>
                <strong>Where it ships from.</strong> An item located overseas can take weeks and is harder to return. eBay shows the item’s location on every listing.
              </li>
              <li>
                <strong>New or not.</strong> Store listings we compare are new, sealed, English-language product. An eBay listing can be anything: read the condition and the
                description, not just the title.
              </li>
            </ul>
            <p>
              Older sets are where eBay earns its place. Once a product is out of print and no Australian store lists it, private sellers may be the only source. For a current{" "}
              <Link href={typeHref(r, "booster-box")}>booster box</Link>, <Link href={typeHref(r, "etb")}>Elite Trainer Box</Link> or{" "}
              <Link href={typeHref(r, "booster-bundle")}>booster bundle</Link>, check the stores first.
            </p>
          </Prose>
        ),
      },
      {
        id: "protection",
        title: "Buyer protection and seller ratings",
        body: (
          <>
            <Prose>
              <p>
                eBay runs its own buyer protection for items that don’t arrive or don’t match the listing, which it calls the eBay Money Back Guarantee. Read eBay’s terms for
                what it covers and how long you have to make a claim before you rely on it, and keep the whole conversation and payment on eBay. A store, for its part, is a
                business bound by Australian Consumer Law, and a card payment gives you a way to dispute a charge either way.
              </p>
            </Prose>
            <Checklist
              items={[
                <>
                  <strong>Check the seller’s feedback</strong>: the score, the percentage positive, and recent comments on sealed product in particular.
                </>,
                <>
                  <strong>Check the photos</strong> show the actual item, from more than one side, not only the publisher’s product image.
                </>,
                <>
                  <strong>Check the exact product</strong>: the set, the type and the language, in the title and in the item specifics.
                </>,
                <>
                  <strong>Check the returns terms</strong> on the listing, and whether the seller accepts returns at all.
                </>,
                <>
                  <strong>Check a price far under the stores’</strong> twice. The <Link href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>resealed product
                  guide</Link> says what to look for.
                </>,
              ]}
            />
          </>
        ),
      },
      {
        id: "selling-fees",
        title: "Selling: eBay Australia’s fees",
        body: (
          <>
            <Prose>
              <p>
                If you’re on the other side, the fee you pay depends on who you are as a seller. These are eBay Australia’s published rates, as we read them on {checked} from{" "}
                {source}:
              </p>
              <ul>
                <li>
                  <strong>{FREE.who}</strong> {cap(scheduleText(FREE, m))}.
                </li>
                <li>
                  <strong>Sellers registered outside Australia, without a Pro plan:</strong> {scheduleText(STANDARD, m)}.
                </li>
                <li>
                  <strong>Pro plans:</strong> the rate depends on the plan and the category, so there is no single figure to print. In the calculator, choose Custom and enter
                  the rate from your Seller Hub.
                </li>
              </ul>
              <p>
                eBay charges its percentage on the total the buyer pays, which includes the postage you charge, not just the item price. Fees change and promotions come and
                go, so <strong>confirm your own rate in Seller Hub</strong> before you price anything big.
              </p>
            </Prose>
            <NextLinks links={[{ href: toolHref(r.region, "selling-fee-calculator"), label: "Open the selling fee calculator", icon: "tag" }]} />
          </>
        ),
      },
      {
        id: "worked-examples",
        title: "Two worked examples",
        body: (
          <>
            <Prose>
              <p>
                Say you sell an Elite Trainer Box for {m(etb.itemCents)} and a booster box for {m(box.itemCents)}, charging the buyer {m(etb.postageCents)} postage on each (an
                example figure: use your own). Here is what eBay takes under each published schedule.
              </p>
            </Prose>
            <div className="card my-6 px-4 py-2 sm:px-5 sm:py-3">
              <StackTable
                caption="eBay Australia's fees on two example sales, under the free-selling schedule and the schedule for sellers registered outside Australia"
                head={["Sale", "Buyer pays", "Fees: free selling", "Fees: registered outside Australia"]}
                rows={examples.map((e) => ({
                  key: e.key,
                  th: (
                    <span className="font-semibold text-ink">
                      {e.label} at {m(e.itemCents)}
                    </span>
                  ),
                  cells: [
                    <span key="t">{m(e.free.totalCents)}</span>,
                    <span key="f" className="font-semibold">{m(e.free.feesCents)}</span>,
                    <span key="s" className="font-semibold">
                      {m(e.std.feesCents)} <span className="font-normal text-muted">({e.std.effectivePct.toFixed(1)}%)</span>
                    </span>,
                  ],
                }))}
              />
            </div>
            <Prose>
              <p>
                On the Elite Trainer Box, the buyer pays {m(etb.std.totalCents)}. A seller registered outside Australia pays {m(etb.std.variableCents)} as a percentage plus{" "}
                {m(etb.std.orderCents)} for the order, {m(etb.std.feesCents)} in all, and eBay passes on {m(etb.std.afterFeesCents)}. On the booster box the buyer pays{" "}
                {m(box.std.totalCents)}, the fees come to {m(box.std.feesCents)} and {m(box.std.afterFeesCents)} is left. An Australia-based seller under the threshold keeps
                the whole {m(etb.free.afterFeesCents)} and {m(box.free.afterFeesCents)}.
              </p>
              <p>
                Either way, that isn’t profit yet. Take off what the postage really costs you, the packaging, and what you paid for the item. The{" "}
                <Link href={toolHref(r.region, "selling-fee-calculator")}>selling fee calculator</Link> does all of that in one go, with these presets or your own rate.
              </p>
            </Prose>
            <Note>
              Fees from {source}, checked {checked}. Your own rate can differ with your plan, category and any listing upgrades: confirm it in Seller Hub.
            </Note>
          </>
        ),
      },
      {
        id: "sell-to-a-store",
        title: "Selling to a store: credit or cash",
        body: (
          <>
            <Prose>
              <p>
                Some card stores buy sealed product and cards, or take them as a trade-in. A store pays less than it will sell the item for, because it has to sell it again; the
                offer is often higher in store credit than in cash. Each store sets its own rates, so ask for both figures.
              </p>
              <p>
                To compare an offer with an eBay sale, put the store’s offer in the{" "}
                <Link href={toolHref(r.region, "trade-calculator")}>trade calculator</Link>, which works out what a credit percentage is worth, and the same item in the selling
                fee calculator. The <Link href={toolHref(r.region, "value-checker")}>value checker</Link> gives you the price to start from: what Australian stores ask for the
                same sealed product today.
              </p>
            </Prose>
            <Decisions
              rows={[
                {
                  when: "A store is the better route",
                  then: (
                    <>
                      When you want it done today, when you’ll spend the credit at that store anyway, or when the item is small enough that postage and packing eat most of an
                      eBay sale. No listing, no buyer questions, no parcel that might go missing.
                    </>
                  ),
                },
                {
                  when: "eBay is the better route",
                  then: (
                    <>
                      When what eBay leaves you after fees and real postage is clearly more than the store’s offer, and you don’t mind the time it takes to list, answer questions
                      and post the item.
                    </>
                  ),
                },
                {
                  when: "Selling to a friend",
                  then: (
                    <>
                      No fees on either side. Agree on a price from the cheapest store and the middle price, and meet in person so nothing needs posting.
                    </>
                  ),
                },
              ]}
            />
          </>
        ),
      },
      whereToBuy(r, {
        links: [
          { href: guideHref(r, "where-to-buy-pokemon-cards-australia"), label: "Where to buy in Australia" },
          { href: guideHref(r, "how-to-check-pokemon-card-value"), label: "Check a card’s value" },
        ],
      }),
    ],
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
