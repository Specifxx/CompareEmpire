// Guide: how to check a Pokémon card's value. DexCompare has no single-card prices, so for singles the guide teaches the method
// (identify the exact card, its condition, recent sold listings, the middle sale, not asking prices) and never quotes a price. For
// sealed product it shows the method on the site's own data: today's deals (data.deals, lib/deals.ts: the cheapest in-stock price
// under the median of three or more stores) and the newest released set's cheapest box, ETB and bundle with their median
// (ProductStat.medianOpenCents), read the way the value checker reads a price: under the cheapest store, between the cheapest and
// the median, or above the median. Pairs with the value checker, trade calculator and grading value calculator (src/content/tools).
import Link from "next/link";
import { CALENDAR_TYPES } from "@/lib/data";
import { dealPct } from "@/lib/deals";
import { money, plural } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { TYPE_BY_LABEL } from "@/lib/sealed-title";
import type { GuideData } from "./data";
import { newestReleased } from "./facts";
import { GUIDE_BY_SLUG } from "./index";
import {
  Checklist,
  Decisions,
  GuideBody,
  guideHref,
  Lede,
  LiveBlock,
  linesFor,
  NextLinks,
  Note,
  ProductTh,
  Prose,
  SetChips,
  SetTitle,
  setOf,
  StackTable,
  typeHref,
  whereText,
  whereToBuy,
  type BodyProps,
  type GuideOutline,
} from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("how-to-check-pokemon-card-value")!;

const tool = (r: RegionInfo, slug: "grading-value-calculator" | "selling-fee-calculator" | "value-checker" | "trade-calculator") => `/${r.region}/tools/${slug}`;

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const set = data.sets.map(setOf).find((s) => !!s) ?? null;
  const lines = set ? linesFor(data.bySet[set.code], CALENDAR_TYPES, set) : [];
  const priced = lines.filter((l) => l.p && l.p.medianOpenCents != null);
  const example = data.deals.find((p) => p.medianOpenCents != null && p.lowestPriceCents != null) ?? priced[0]?.p ?? null;
  const newest = newestReleased(data.today, 3);

  return {
    intro: (
      <Lede>
        A Pokémon card is worth what the <strong>same card, in the same condition, recently sold for</strong>, not what sellers are asking. For sealed product, the
        reference is what stores charge today. Here’s how to check both, step by step, with today’s store prices in {r.inName} to show how a price is read.
      </Lede>
    ),
    sections: [
      {
        id: "sold-not-asking",
        title: "Value is a sold price, not an asking price",
        body: (
          <Prose>
            <p>
              Search any card and the first prices you see are listings: what sellers would like to get. Some of those listings sit unsold for months because the price is too
              high. A few are priced by people who haven’t checked. Neither tells you what a buyer will pay.
            </p>
            <p>
              A <strong>sold</strong> listing does. It’s a price someone agreed to, for a card you can see, on a known day. Several recent sales of the same card, in the same
              condition, give you a range, and the middle of that range is the most honest single figure you can use. The highest sale is the one everyone remembers, and the
              one you should be most wary of.
            </p>
            <p>
              The same idea works for sealed product, with one difference: booster boxes, Elite Trainer Boxes and bundles are sold new by stores, so there’s a live market of
              store prices to compare against. That’s what DexCompare shows, and what the live block below uses.
            </p>
          </Prose>
        ),
      },
      {
        id: "identify",
        title: "1. Identify exactly which card you have",
        body: (
          <>
            <Prose>
              <p>Two cards with the same Pokémon on them can sell for very different prices. Before you look up anything, pin down every detail that makes a card distinct:</p>
            </Prose>
            <Checklist
              items={[
                <>
                  <strong>The set and number.</strong> Printed at the bottom of the card, with the set symbol. The same artwork can appear in more than one set.
                </>,
                <>
                  <strong>The variant.</strong> Holo, reverse holo or non-holo; a full art or alternate art version; a different border or finish.
                </>,
                <>
                  <strong>Edition and stamps.</strong> First edition marks, promo stamps and event stamps each make a separate card.
                </>,
                <>
                  <strong>The language.</strong> English, Japanese and other printings are priced separately. Search in the right one.
                </>,
                <>
                  <strong>Raw or graded.</strong> For a graded card, the grading company and the grade are part of what it is. Compare it only with sales of the same grade
                  from the same company.
                </>,
              ]}
            />
          </>
        ),
      },
      {
        id: "condition",
        title: "2. Judge the condition honestly",
        body: (
          <Prose>
            <p>
              For a raw card, condition moves the price more than almost anything else. Sellers describe it in grades of wear, from near mint through lightly played and
              moderately played down to heavily played or damaged. The words vary from one marketplace to the next, so read how each one defines them.
            </p>
            <p>
              Take the card out of its sleeve and look at it under a bright light. Check the corners for rounding or white tips, the back edges for whitening, and tilt the
              surface for scratches, dents and print lines. Then search for sales in the condition you actually see, not the one you hope for. If the card is clean enough that
              you’re wondering about grading, the <Link href={guideHref(r, "is-pokemon-card-grading-worth-it")}>grading guide</Link> shows how to check whether it pays.
            </p>
          </Prose>
        ),
      },
      {
        id: "sold-listings",
        title: "3. Find recent sold listings",
        body: (
          <>
            <Checklist
              items={[
                <>
                  <strong>Filter to sold items.</strong> On eBay, the Sold items filter shows listings that sold; card marketplaces often show a card’s recent sales on its own
                  page.
                </>,
                <>
                  <strong>Match the card and the condition.</strong> Set, number, variant, language and condition, or company and grade for a slab. Skip lots and bundles of
                  several cards.
                </>,
                <>
                  <strong>Look at several sales.</strong> One sale can be a mistake or a bidding war. Five or more recent sales give you a range.
                </>,
                <>
                  <strong>Use the middle, not the top.</strong> Set aside anything far from the rest, and take the middle sale: the median.
                </>,
                <>
                  <strong>Check the dates and the postage.</strong> Recent sales count for more than old ones, and a low price with high postage is not a low price.
                </>,
              ]}
            />
            <Note>DexCompare compares sealed product only, so it has no single-card prices. For a single, sold listings are the reference to use.</Note>
          </>
        ),
      },
      {
        id: "sealed-today",
        title: "4. For sealed product: today’s store price against the median",
        live: true,
        body: (
          <>
            <Prose>
              <p>
                Sealed product has a better reference than past sales: what stores are asking right now. The cheapest store in stock tells you what you could pay today; the
                median, the middle price of the stores that have it in stock, tells you what most of them ask. Here are the products in {r.inName} whose cheapest store sits
                well under the median today.
              </p>
            </Prose>
            <LiveBlock
              r={r}
              checked={data.checked}
              footer={
                <Link href={`/${r.region}/deals`} prefetch={false} className="font-semibold text-brand hover:underline">
                  Every deal today →
                </Link>
              }
            >
              {data.deals.length ? (
                <StackTable
                  caption={`Products whose cheapest store price is under the median of the stores that have them in ${r.inName} today`}
                  head={["Product", "Cheapest", "Median", "Under the median"]}
                  rows={data.deals.map((p) => ({
                    key: p.slug,
                    type: TYPE_BY_LABEL.get(p.productType)?.key,
                    th: (
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <ProductTh r={r} label={p.productType} p={p} />
                        <span className="text-xs text-muted">{whereText(p)}</span>
                      </span>
                    ),
                    cells: [
                      <span key="c" className="font-semibold">{money(p.lowestPriceCents, r.market)}</span>,
                      <span key="m">{money(p.medianOpenCents, r.market)}</span>,
                      <span key="d" className="text-open">{dealPct(p)}% under</span>,
                    ],
                  }))}
                />
              ) : (
                <p className="text-sm text-muted">
                  No product’s cheapest store sits well under the median of three or more stores in {r.inName} right now. The table below still shows the newest set’s prices.
                </p>
              )}
            </LiveBlock>
            {set && (
              <LiveBlock r={r} checked={data.checked} title={<SetTitle r={r} set={set} today={data.today} />}>
                <StackTable
                  caption={`${set.name}: the cheapest and the median store price of its booster box, Elite Trainer Box and booster bundle in ${r.inName} today`}
                  head={["Product", "Cheapest", "Median", "In stock at"]}
                  rows={lines.map((l) => ({
                    key: l.label,
                    type: TYPE_BY_LABEL.get(l.label)?.key,
                    th: <ProductTh r={r} label={l.label} p={l.p} />,
                    cells: l.p
                      ? [
                          <span key="c" className="font-semibold">{money(l.p.lowestPriceCents, r.market)}</span>,
                          <span key="m">{l.p.medianOpenCents != null ? money(l.p.medianOpenCents, r.market) : "—"}</span>,
                          <span key="w" className="text-muted">{whereText(l.p)}</span>,
                        ]
                      : [<span key="m" className="text-faint">{l.missing}</span>, <span key="a" className="text-faint">—</span>, <span key="b" className="text-faint">—</span>],
                  }))}
                />
              </LiveBlock>
            )}
            <Prose>
              {example && example.medianOpenCents != null ? (
                <p>
                  Here’s how the <Link href={tool(r, "value-checker")}>value checker</Link> reads a price you’ve been offered, using{" "}
                  <Link href={`/${r.region}/p/${example.slug}`}>{example.name}</Link> today. Below <strong>{money(example.lowestPriceCents, r.market)}</strong>, you’d pay less
                  than at any store we compare that has it in stock{example.inStockStores > 0 ? ` (${plural(example.inStockStores, "store")} right now)` : ""}. Between that
                  and <strong>{money(example.medianOpenCents, r.market)}</strong>, it’s cheaper than most stores ask. Above the median, more than half the stores ask less, and
                  you could buy it new for less elsewhere.
                </p>
              ) : (
                <p>
                  The <Link href={tool(r, "value-checker")}>value checker</Link> reads a price you’ve been offered in three bands: below the cheapest store in stock, you’d pay
                  less than anywhere we compare; between the cheapest and the median, it’s cheaper than most stores ask; above the median, more than half the stores ask less.
                </p>
              )}
              <p>
                A price far under every store’s deserves care rather than excitement: check the seller and the shrink-wrap first. The{" "}
                <Link href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>guide to resealed product</Link> says what to look for. You can browse by product type too:{" "}
                <Link href={typeHref(r, "booster-box")}>booster boxes</Link>, <Link href={typeHref(r, "etb")}>Elite Trainer Boxes</Link> and{" "}
                <Link href={typeHref(r, "booster-bundle")}>booster bundles</Link>, or the newest sets:
              </p>
            </Prose>
            <SetChips r={r} listed={data.listedSets} sets={newest} />
          </>
        ),
      },
      {
        id: "selling-vs-buying",
        title: "5. Know which side of the sale you’re on",
        body: (
          <Prose>
            <p>
              The value of a card depends on what you’re doing with it. If you’re buying, the cheapest sensible price you can find is the number that matters. If you’re selling,
              it’s what a buyer will pay, less what the sale costs you: the marketplace’s fees, the postage and the packaging. Those can take a real share of a small sale.
            </p>
            <p>
              The <Link href={tool(r, "selling-fee-calculator")}>selling fee calculator</Link> shows what a sale leaves you after fees and postage. Your fee depends on your
              account, so confirm your rate in your seller account (on eBay, your Seller Hub) before you price anything big. For sealed product you’re selling, the value checker
              shows what stores ask today, which is the price most buyers will compare yours with.
            </p>
          </Prose>
        ),
      },
      {
        id: "using-the-value",
        title: "6. Put the number to work",
        body: (
          <>
            <Decisions
              rows={[
                {
                  when: "Trading cards with someone",
                  then: (
                    <>
                      Agree a value for each card from sold listings, then add up both sides in the <Link href={tool(r, "trade-calculator")}>trade calculator</Link>. It shows
                      the gap in money and as a percentage, so a small one is easy to settle.
                    </>
                  ),
                },
                {
                  when: "A shop offers store credit",
                  then: (
                    <>
                      Shops usually offer a percentage of what they think a card sells for. Set that rate in the trade calculator to see what your cards become in credit, and
                      compare it with selling them yourself.
                    </>
                  ),
                },
                {
                  when: "Thinking about grading",
                  then: (
                    <>
                      You need two values: the raw price and the price in each grade. The <Link href={tool(r, "grading-value-calculator")}>grading value calculator</Link> turns
                      them into a break-even graded price.
                    </>
                  ),
                },
                {
                  when: "Buying a sealed product",
                  then: (
                    <>
                      Search it in the <Link href={tool(r, "value-checker")}>value checker</Link> and compare the cheapest store and the median with the price you’re offered.
                    </>
                  ),
                },
              ]}
            />
            <NextLinks
              links={[
                { href: tool(r, "value-checker"), label: "Value checker", icon: "search" },
                { href: tool(r, "trade-calculator"), label: "Trade calculator", icon: "arrow-right" },
                { href: tool(r, "grading-value-calculator"), label: "Grading value calculator", icon: "arrow-right" },
              ]}
            />
          </>
        ),
      },
      {
        id: "mistakes",
        title: "Common mistakes when valuing a card",
        body: (
          <Prose>
            <ul>
              <li>
                <strong>Quoting the highest listing.</strong> An asking price isn’t a sale, and the highest one is the least likely to sell.
              </li>
              <li>
                <strong>Mixing up versions.</strong> A reverse holo priced as a holo, a later printing priced as a first edition, or a Japanese card priced as an English one.
              </li>
              <li>
                <strong>Ignoring condition.</strong> A near mint sale isn’t the reference for a card with worn corners.
              </li>
              <li>
                <strong>Comparing graded with raw.</strong> A slab’s price says nothing about the same card ungraded, and one company’s grade isn’t another’s.
              </li>
              <li>
                <strong>Forgetting the costs.</strong> Fees and postage come out of every sale, and grading adds its own on top.
              </li>
              <li>
                <strong>Treating today’s price as permanent.</strong> Prices move. A value is a check made on a day, so check again before a big trade or sale.
              </li>
            </ul>
          </Prose>
        ),
      },
      whereToBuy(r, {
        tcg: { query: "Elite Trainer Box", label: "Pokémon Elite Trainer Boxes" },
        links: [
          { href: guideHref(r, "how-to-avoid-resealed-pokemon-products"), label: "Avoid resealed product" },
          { href: guideHref(r, "is-pokemon-card-grading-worth-it"), label: "Is grading worth it?" },
        ],
      }),
    ],
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
