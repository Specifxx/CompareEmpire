// Guide: Jensen Huang left NVIDIA. What happens to Pokémon card prices? (owner, 2026-11-19: "a very creative article … how Jensen
// Huang leaving NVIDIA can affect the TCG market and Pokémon cards"). A news-led explainer: the one confirmed fact (he resigned as
// chief executive on 12 Nov 2026; Al Jazeera, linked), why a chip company's boss could matter to sealed Pokémon at all, what our
// own daily price history shows across the week before and the week after, and three clearly labelled what-if scenarios with no
// numbers in them.
//
// THE NUMBERS. WEEK_BEFORE / WEEK_AFTER are fixed, dated facts computed once on 2026-11-19 from data/public/price-history.json
// (the cheapest in-stock price per product per market, change-points; scripts used the value in force at 00:00 UTC of each day):
// 4 → 11 Nov and 11 → 19 Nov, every product with a price at both ends. "Within 1%" = |change| ≤ 1%, "up/down" = more than 5%.
// They are a record of those two weeks, not a live claim, so they never change; the live block is today's price per pack
// (data.ts, as the grading guide). Nothing here says what prices WILL do; the scenarios say what each would look like on the site.
// Nothing about his private life beyond "the company gave no reason": allegations are not ours to repeat.
import Link from "next/link";
import type { ProductCardData } from "@/lib/data";
import { money } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { TYPE_BY_LABEL } from "@/lib/sealed-title";
import type { GuideData } from "./data";
import { newestReleased } from "./facts";
import { GUIDE_BY_SLUG } from "./index";
import {
  CheapestBadge,
  Decisions,
  GuideBody,
  guideHref,
  Lede,
  LiveBlock,
  NextLinks,
  Note,
  PACK_SOURCE,
  perPackOf,
  ProductTh,
  Prose,
  SetChips,
  setHref,
  setOf,
  StackTable,
  typeHref,
  whereText,
  whereToBuy,
  type BodyProps,
  type GuideOutline,
} from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("jensen-huang-nvidia-pokemon-card-prices")!;

const SOURCE =
  "https://www.aljazeera.com/news/2026/11/12/why-did-nvidia-ceo-jensen-huang-resign-and-who-is-colette-kress";

interface Week {
  /** Products with a price at both ends of the week. */
  n: number;
  /** Moved 1% or less. */
  flat: number;
  /** Up more than 5%. */
  up: number;
  /** Down more than 5%. */
  down: number;
}

/** 4 → 11 Nov 2026 and 11 → 19 Nov 2026, per market, from price-history.json (see the header). */
export const WEEKS: readonly {
  market: string;
  name: string;
  before: Week;
  after: Week;
}[] = [
  {
    market: "US",
    name: "United States",
    before: { n: 2353, flat: 1625, up: 198, down: 247 },
    after: { n: 2351, flat: 1574, up: 251, down: 245 },
  },
  {
    market: "CA",
    name: "Canada",
    before: { n: 1879, flat: 1643, up: 89, down: 88 },
    after: { n: 1878, flat: 1612, up: 82, down: 135 },
  },
  {
    market: "AU",
    name: "Australia",
    before: { n: 616, flat: 496, up: 33, down: 58 },
    after: { n: 613, flat: 509, up: 42, down: 40 },
  },
  {
    market: "UK",
    name: "United Kingdom",
    before: { n: 577, flat: 525, up: 18, down: 18 },
    after: { n: 486, flat: 378, up: 58, down: 31 },
  },
];

/** US booster boxes alone, the same two weeks. */
export const US_BOXES = {
  before: { n: 50, flat: 33, up: 2, down: 5 },
  after: { n: 49, flat: 22, up: 7, down: 8 },
} as const;

const pct = (k: number, n: number) => `${Math.round((100 * k) / n)}%`;
const weekCell = (w: Week) => (
  <span>
    {pct(w.flat, w.n)} <span className="text-xs text-muted">within 1%</span>
    <span className="block text-xs text-muted">
      {w.up} up, {w.down} down (of {w.n.toLocaleString("en-US")})
    </span>
  </span>
);

/** The cards with a pack count, cheapest per pack first (as the grading guide). */
function ranked(
  cards: readonly ProductCardData[],
): { p: ProductCardData; packs: number; perPack: number }[] {
  return cards
    .map((p) => ({ p, ...perPackOf(p) }))
    .filter(
      (x): x is { p: ProductCardData; packs: number; perPack: number } =>
        x.packs != null && x.perPack != null,
    )
    .sort((a, b) => a.perPack - b.perPack);
}

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const rows = ranked(data.cards);
  const top = rows[0] ?? null;
  const newest = newestReleased(data.today, 3);
  const us = WEEKS[0];
  const tools = {
    value: `/${r.region}/tools/value-checker`,
    trade: `/${r.region}/tools/trade-calculator`,
  };

  return {
    intro: (
      <Lede>
        On 12 November 2026, Jensen Huang stepped down as chief executive of
        NVIDIA, the company whose chips power the AI boom. Within hours,
        collectors were asking a strange question:{" "}
        <strong>
          does the man in the leather jacket leaving his job change what a
          Pokémon booster box costs?
        </strong>{" "}
        We took the question seriously, followed the money from graphics cards
        to card shops, then checked {us.after.n.toLocaleString("en-US")} US
        sealed Pokémon prices from our own daily records. The short answer: not
        so far. The long answer is more interesting.
      </Lede>
    ),
    sections: [
      {
        id: "what-happened",
        title: "What actually happened",
        body: (
          <>
            <Prose>
              <p>
                Jensen Huang co-founded NVIDIA in 1993 and ran it as chief
                executive for 33 years, turning a maker of graphics cards for
                video games into one of the most valuable companies in the
                world. On Thursday 12 November 2026 he resigned as chief
                executive and left the board. NVIDIA did not give a reason. Its
                chief financial officer, Colette Kress, became interim chief
                executive while the board looks for a permanent one, and
                NVIDIA’s shares were down more than 14% at one point that day
                before recovering some of the ground, according to{" "}
                <a href={SOURCE} target="_blank" rel="noopener noreferrer">
                  Al Jazeera’s report
                </a>
                .
              </p>
              <p>
                That is all we state as fact here. Everything below is about
                Pokémon cards: how a story like this could reach them, what our
                prices did, and what you would see on DexCompare if it ever did.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "from-gpus-to-booster-boxes",
        title:
          "From graphics cards to booster boxes: four ways it could reach your binder",
        body: (
          <>
            <Prose>
              <p>
                A chip company and a children’s card game look like they live on
                different planets. They have more in common than you’d think:
                both were hard to buy in the early 2020s, both were snapped up
                by resellers, and both are bought by a lot of the same people.
                Here are the four roads a shock at NVIDIA could travel to reach
                a Pokémon product page.
              </p>
              <ol>
                <li>
                  <strong>The wealth road.</strong> A lot of people hold NVIDIA
                  shares, directly or through retirement funds and tech-heavy
                  index funds. When a share price falls, some of them feel
                  poorer and spend less on things they want rather than need.
                  Sealed Pokémon is very much a want. If the fall were deep and
                  lasting, you would expect the most expensive products (cases,
                  premium collections, older boxes) to feel it first, because
                  those are the buys people put off.
                </li>
                <li>
                  <strong>The mood road.</strong> Markets run on feelings as
                  much as numbers. A famous founder leaving suddenly can make
                  people jumpy about everything that rose with the AI boom, and
                  some collectors treat sealed product the same way they treat
                  shares. Jumpy holders list more; more listings at once can
                  mean lower asks.
                </li>
                <li>
                  <strong>The scalper road.</strong> The years when graphics
                  cards sold out in seconds were the same years Pokémon restocks
                  did, and the reseller toolkit (bots, queues, many accounts)
                  worked on both. When one market cools, some of that energy
                  looks for the next one. If GPU reselling ever stops paying, a
                  few more bots in Pokémon queues is a plausible side effect. It
                  cuts the other way too: a new chip shortage would pull them
                  back.
                </li>
                <li>
                  <strong>The nostalgia road.</strong> This one is softer.
                  Huang’s company started out making graphics for video games,
                  the same world Pokémon grew up in. The people who bought
                  GeForce cards for games in the 2000s are the same age group
                  now buying the booster boxes they couldn’t afford as kids. A
                  headline doesn’t change that habit.
                </li>
              </ol>
              <p>
                Every one of those roads is real. The question is whether
                anything actually travelled down them in the week after the
                news. Unlike most takes on this, we can check.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "what-our-prices-did",
        title: "What our prices did: the week before against the week after",
        body: (
          <>
            <Prose>
              <p>
                DexCompare records the cheapest in-stock price of every sealed
                Pokémon product, in every market we cover, once a day. So we put
                the week before the news (4 to 11 November) beside the week
                after it (11 to 19 November) and counted, for every product with
                a price at both ends of each week, how many moved by 1% or less,
                how many went up by more than 5% and how many went down by more
                than 5%.
              </p>
            </Prose>
            <div className="card my-6 overflow-hidden p-4 sm:p-5">
              <StackTable
                caption="Sealed Pokémon products by market: share whose cheapest in-stock price moved 1% or less, and counts up or down by more than 5%, 4 to 11 November and 11 to 19 November 2026"
                head={["Market", "4 to 11 Nov", "11 to 19 Nov"]}
                rows={WEEKS.map((w) => ({
                  key: w.market,
                  th: <span className="font-semibold">{w.name}</span>,
                  cells: [
                    <span key="b">{weekCell(w.before)}</span>,
                    <span key="a">{weekCell(w.after)}</span>,
                  ],
                }))}
              />
              <p className="mt-3 text-xs leading-5 text-muted">
                Source: DexCompare’s daily record of the cheapest in-stock store
                price per product, as it stood at the start of each day (UTC).
                Each store’s own price, excluding shipping. A product counts
                only when it had a price at both ends of the week.
              </p>
            </div>
            <Prose>
              <p>
                <strong>
                  In the United States, the biggest market we track, the week
                  after looked like the week before.
                </strong>{" "}
                {pct(us.before.flat, us.before.n)} of products barely moved in
                the first week and {pct(us.after.flat, us.after.n)} in the
                second. Roughly as many went down by more than 5% (
                {us.before.down} before, {us.after.down} after), and a few more
                went up ({us.before.up} before, {us.after.up} after). If a wave
                of nervous holders had been dumping product, the “down” column
                is where it would show. It didn’t move.
              </p>
              <p>
                Australia tells the same story, and so does Canada, where most
                prices held within 1% in both weeks and the moves that did
                happen leaned slightly cheaper ({WEEKS[1].after.down} down
                against {WEEKS[1].after.up} up), the opposite of panic buying.
                The United Kingdom moved more in the second week, but it also
                had a price at both ends for fewer products ({WEEKS[3].after.n}{" "}
                against {WEEKS[3].before.n}), which is what it looks like when
                stores sell out or stop listing items, and the cheapest
                remaining price is a higher one. That is a stock story, not a
                chip story.
              </p>
              <p>
                Booster boxes are the product most likely to react to money
                moods, so we looked at US boxes on their own. In the week
                before, {US_BOXES.before.flat} of {US_BOXES.before.n} barely
                moved; in the week after, {US_BOXES.after.flat} of{" "}
                {US_BOXES.after.n} did, with {US_BOXES.after.up} up and{" "}
                {US_BOXES.after.down} down by more than 5%. More boxes moved, in
                both directions almost equally. A shock pushes prices one way;
                this pushed them both ways at once, which is what ordinary
                store-by-store price changes look like.
              </p>
            </Prose>
            <Note>
              A week is a short window and a correlation is not a cause. What
              these numbers show is the absence of a visible shock in sealed
              Pokémon store prices in the week after the news, not that one
              could never come.
            </Note>
          </>
        ),
      },
      {
        id: "three-what-ifs",
        title: "Three what-ifs (a thought experiment, not a forecast)",
        body: (
          <>
            <Prose>
              <p>
                Nobody knows what NVIDIA’s next year looks like, and we won’t
                pretend to. What we can do is describe what each kind of future
                would look like on the pages you already use, so you can spot it
                yourself. None of these is a prediction, and none comes with a
                number.
              </p>
            </Prose>
            <Decisions
              rows={[
                {
                  when: "1. The shrug",
                  then: (
                    <>
                      A new chief executive is named, the company carries on and
                      the story fades. Pokémon prices keep following what they
                      always follow: set releases, reprints, stock and the
                      holiday sales. This is what our first week of data looks
                      like.
                    </>
                  ),
                },
                {
                  when: "2. The tech chill",
                  then: (
                    <>
                      Uncertainty spreads to other AI-boom shares for months and
                      people feel poorer. You’d see it first in the expensive
                      end: cases and premium collections sitting in stock
                      longer, more stores listing them, and their cheapest price
                      creeping down on the product page’s price chart. Packs and
                      tins, the pocket-money end, would barely notice.
                    </>
                  ),
                },
                {
                  when: "3. The scalper switch",
                  then: (
                    <>
                      If reselling chips stops paying, some of that crowd and
                      their bots drift to the next thing that sells out. You’d
                      see new sets selling out faster at launch and pre-orders
                      closing sooner, while older product stays where it is.
                      Price alerts matter most in this world, because the good
                      prices last minutes, not days.
                    </>
                  ),
                },
              ]}
            />
            <Prose>
              <p>
                There is a fourth future in which none of this matters, because
                the biggest driver of Pokémon prices has always been The Pokémon
                Company itself: how much of a set it prints, and whether it
                prints more. A reprint announcement moves a box far more than
                any boardroom in California.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "pack-cost",
        title: "What a pack costs today",
        live: true,
        body: (
          <>
            <Prose>
              <p>
                Whatever the headlines do, this is the number that decides what
                you pay. Here’s the cheapest price per pack in {r.inName} right
                now, by product, from any set that’s out.
              </p>
            </Prose>
            <LiveBlock
              r={r}
              checked={data.checked}
              footer={
                <Link
                  href={`/${r.region}/cheapest-packs`}
                  prefetch={false}
                  className="font-semibold text-brand hover:underline"
                >
                  Every set, by price per pack →
                </Link>
              }
            >
              {rows.length ? (
                <StackTable
                  caption={`The lowest price per pack of each product type in ${r.inName} today`}
                  head={["Product", "Price", "Packs", "Per pack"]}
                  rows={rows.map(({ p, packs, perPack }, i) => {
                    const t = TYPE_BY_LABEL.get(p.productType);
                    const set = p.setCode ? setOf(p.setCode) : null;
                    return {
                      key: p.productType,
                      type: t?.key,
                      highlight: i === 0,
                      th: (
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <ProductTh
                            r={r}
                            label={t?.plural ?? p.productType}
                            p={p}
                            badge={i === 0 ? <CheapestBadge /> : undefined}
                          />
                          <span className="text-xs text-muted">
                            {set && (
                              <>
                                <Link
                                  href={setHref(r, set)}
                                  prefetch={false}
                                  className="hover:text-brand hover:underline"
                                >
                                  {set.name}
                                </Link>{" "}
                                ·{" "}
                              </>
                            )}
                            {whereText(p)}
                          </span>
                        </span>
                      ),
                      cells: [
                        <span key="p">
                          {money(p.lowestPriceCents, r.market)}
                        </span>,
                        <span key="n">{packs}</span>,
                        <span key="pp" className="font-semibold">
                          {money(perPack, r.market)}
                        </span>,
                      ],
                    };
                  })}
                />
              ) : (
                <p className="text-sm text-muted">
                  No product with a fixed pack count is in stock at the stores
                  we compare in {r.inName} right now.
                </p>
              )}
            </LiveBlock>
            <p className="text-xs leading-5 text-muted">{PACK_SOURCE}</p>
            <Prose>
              {top ? (
                <p>
                  The cheapest pack in {r.inName} today costs{" "}
                  <strong>{money(top.perPack, r.market)}</strong>. No chip
                  company’s share price is in that number: it is what a store is
                  asking right now, and it is the same whoever runs NVIDIA.
                </p>
              ) : (
                <p>
                  Check back after the next price check: the table fills in as
                  soon as a store we compare has a product with a fixed pack
                  count in stock.
                </p>
              )}
            </Prose>
            <SetChips r={r} listed={data.listedSets} sets={newest} />
          </>
        ),
      },
      {
        id: "watch-it-yourself",
        title: "How to watch for it yourself",
        body: (
          <>
            <Prose>
              <p>
                You don’t need to follow chip news to know if it ever reaches
                your hobby. Three habits do the job:
              </p>
              <ul>
                <li>
                  <strong>Read the chart, not the headline.</strong> Every
                  product page has a daily price chart from our records. A story
                  that matters shows up there as a line that keeps going one way
                  for weeks, not a wobble for a day.
                </li>
                <li>
                  <strong>Set a price alert on what you want.</strong> Pick the
                  price you’d happily pay and we’ll email you when a store we
                  compare reaches it. That works in every one of the futures
                  above.
                </li>
                <li>
                  <strong>Check the whole market before you buy.</strong> The{" "}
                  <Link href={tools.value}>value checker</Link> shows what
                  stores in {r.inName} charge for a product today, and the{" "}
                  <Link href={`/${r.region}/price-moves`}>price moves</Link>{" "}
                  page lists what changed most this week.
                </li>
              </ul>
              <p>
                Buying soon? Our{" "}
                <Link href={guideHref(r, "pokemon-black-friday-2026")}>
                  Black Friday guide
                </Link>{" "}
                covers the sales that are about to start, and the{" "}
                <Link href={guideHref(r, "pokemon-tcg-market-wrap")}>
                  weekly market wrap
                </Link>{" "}
                says where Pokémon sealed stands each week. If you’re swapping
                cards rather than buying, the{" "}
                <Link href={tools.trade}>trade calculator</Link> keeps both
                sides fair.
              </p>
            </Prose>
            <NextLinks
              links={[
                {
                  href: typeHref(r, "booster-box"),
                  label: `Booster boxes in ${r.inName}`,
                  icon: "arrow-right",
                },
                {
                  href: `/${r.region}/price-moves`,
                  label: "This week’s price moves",
                  icon: "arrow-right",
                },
              ]}
            />
          </>
        ),
      },
      {
        id: "who-wrote-this",
        title: "Who wrote this",
        body: (
          <Prose>
            <p>
              Written by Bill and George, the two people who run DexCompare. We
              are collectors, not financial advisers: this article is about what
              our price records show, and nothing in it is advice to buy, hold
              or sell anything. Every price figure on this page comes from our
              own daily records of store prices; the news facts come from the
              report linked above. Our names in the byline lead to who we are
              and how we compare prices.
            </p>
          </Prose>
        ),
      },
      whereToBuy(r, {
        tcg: { query: "Booster Box", label: "Pokémon booster boxes" },
        links: [
          { href: `/${r.region}/cheapest-packs`, label: "Cheapest per pack" },
          {
            href: guideHref(r, "cheapest-pokemon-booster-box"),
            label: "The cheapest booster box",
          },
        ],
      }),
    ],
  };
}

export function Body({ r, data }: BodyProps) {
  return (
    <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />
  );
}
