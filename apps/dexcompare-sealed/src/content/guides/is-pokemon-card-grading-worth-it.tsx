// Guide: is grading a Pokémon card worth it? A method, not a verdict: DexCompare has no single-card prices, no grading fees and no
// population data, so the guide never quotes any of them. It explains what grading costs, the break-even graded price and the
// weighted average outcome across grades with ONE clearly labelled hypothetical example in round, currency-neutral numbers, and
// pairs with the grading value calculator (src/content/tools). The live block is what the region's packs cost today (data.ts
// cheapestPerPackByType, as the cheapest-packs guide): the cost of opening packs in hope of a card worth grading, against buying
// the single. Selling fees only through lib/fees.ts (FEES_CHECKED, presets for AU and US only), always with "confirm in Seller Hub".
import Link from "next/link";
import type { ProductCardData } from "@/lib/data";
import { schedulesFor, FEES_CHECKED } from "@/lib/fees";
import { money } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { TYPE_BY_LABEL } from "@/lib/sealed-title";
import type { GuideData } from "./data";
import { newestReleased } from "./facts";
import { GUIDE_BY_SLUG } from "./index";
import {
  CheapestBadge,
  Checklist,
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

const GUIDE = GUIDE_BY_SLUG.get("is-pokemon-card-grading-worth-it")!;

const tool = (r: RegionInfo, slug: "grading-value-calculator" | "selling-fee-calculator" | "value-checker" | "trade-calculator") => `/${r.region}/tools/${slug}`;

/** The cards with a pack count, cheapest per pack first. */
function ranked(cards: readonly ProductCardData[]): { p: ProductCardData; packs: number; perPack: number }[] {
  return cards
    .map((p) => ({ p, ...perPackOf(p) }))
    .filter((x): x is { p: ProductCardData; packs: number; perPack: number } => x.packs != null && x.perPack != null)
    .sort((a, b) => a.perPack - b.perPack);
}

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const rows = ranked(data.cards);
  const top = rows[0] ?? null;
  const newest = newestReleased(data.today, 3);
  const ebayPresets = schedulesFor(r.market).length > 0;

  return {
    intro: (
      <Lede>
        Grading a Pokémon card is worth it only when the graded price you can <strong>realistically sell for</strong>, after every cost, beats what the same card sells for
        ungraded. Most of the work is finding two honest numbers and doing one sum. Here’s how, with a worked example and a calculator that does the arithmetic for you.
      </Lede>
    ),
    sections: [
      {
        id: "what-it-costs",
        title: "What grading costs you",
        body: (
          <>
            <Prose>
              <p>
                Grading means sending a card to a company that checks it, gives it a grade on a scale and seals it in a labelled plastic case, often called a slab. PSA, Beckett
                (BGS) and CGC are well-known examples. Each has its own scale, its own service levels and its own price list, and those change, so check the current list of the
                company and service you would actually use.
              </p>
              <p>Whichever company you choose, the costs come in the same five places:</p>
            </Prose>
            <Checklist
              items={[
                <>
                  <strong>The grading fee.</strong> It usually depends on the service level and, at many companies, on the value you declare for the card.
                </>,
                <>
                  <strong>Postage and insurance, both ways.</strong> Tracked, insured shipping to the grader and back again. Add any membership or handling charge too.
                </>,
                <>
                  <strong>Selling fees on the graded sale.</strong> A marketplace takes a share of a bigger sale price, so the fee grows with the grade.
                </>,
                <>
                  <strong>Time.</strong> The card is away for weeks or months, and your money is tied up in it the whole time.
                </>,
                <>
                  <strong>The grade itself.</strong> You don’t choose it. A lower grade than you hoped can leave the slab worth less than the raw card was.
                </>,
              ]}
            />
            <Prose>
              <p>
                Selling the card raw has only one of those costs: the selling fee. That is the number grading has to beat.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "break-even",
        title: "The break-even graded price",
        body: (
          <>
            <Prose>
              <p>
                The break-even price is the graded sale price that leaves you exactly what selling the card raw would. Below it, grading cost you money. Above it, grading paid.
                The sum is short:
              </p>
              <ul>
                <li>
                  <strong>Raw:</strong> what you keep is the raw price, less the selling fee.
                </li>
                <li>
                  <strong>Graded:</strong> what you keep is the graded price, less the selling fee, less the grading fee, postage and insurance.
                </li>
                <li>
                  <strong>Break-even:</strong> the graded price at which those two are equal.
                </li>
              </ul>
              <p>
                <strong>An example, not a price.</strong> Say a card sells for 100 raw, in whatever currency you sell in. Say your selling fee is 10% (a round number for the
                example, not any marketplace’s rate), and grading, postage and insurance come to 45 all told. Selling raw leaves you 90. Graded, you need a sale that still leaves
                90 after the 45 of costs, so 135 after fees, which is a sale price of 150. The card has to sell for half as much again once it’s graded just to match selling it
                as it is.
              </p>
              <p>
                That gap is the point. A card that sells for a little more graded than raw is usually better sold raw, because the costs sit in between. The{" "}
                <Link href={tool(r, "grading-value-calculator")}>grading value calculator</Link> works out the break-even price from your own numbers.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "every-grade",
        title: "Plan for every grade, not the best one",
        body: (
          <>
            <Prose>
              <p>
                The break-even price tells you what the card must reach. Whether it will depends on the grade it gets, and a card that looks perfect to you may not grade that
                way. So work out what each likely grade would leave you, then weigh each by how likely you honestly think it is. The result is a weighted average outcome: what
                grading leaves you across all the grades you could get.
              </p>
              <p>
                <strong>Continuing the example, still not a price.</strong> Say the top grade sells for 300, the next grade down for 140 and a lower grade for 90. After the same
                10% fee and 45 of costs, those leave you 225, 81 and 36. If you think the chances are one in four for the top grade, half for the next and one in four for the
                lower one, the weighted average is about 106: a little better than the 90 from selling raw. Now be less hopeful: one in ten for the top grade, six in ten for the
                next and three in ten for the lower. The average falls to about 82, and selling raw wins.
              </p>
              <p>
                Same card, same prices, different answer. Only your guess about the grade changed. That is why the decision rests on looking hard at the card before you send
                it, and why a card that only pays off at the very top grade is a gamble, not a plan. The calculator shows each grade’s result and the weighted average side by side,
                so that kind of card is easy to spot.
              </p>
            </Prose>
            <NextLinks links={[{ href: tool(r, "grading-value-calculator"), label: "Grading value calculator", icon: "arrow-right" }]} />
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
                Many cards worth grading come out of packs, and it’s tempting to keep opening in the hope of one. Before you do, compare two prices: what a pack costs, and what
                the card you want costs as a single, raw or already graded. Here’s the cheapest price per pack in {r.inName} right now, by product, from any set that’s out.
              </p>
            </Prose>
            <LiveBlock
              r={r}
              checked={data.checked}
              footer={
                <Link href={`/${r.region}/cheapest-packs`} prefetch={false} className="font-semibold text-brand hover:underline">
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
                          <ProductTh r={r} label={t?.plural ?? p.productType} p={p} badge={i === 0 ? <CheapestBadge /> : undefined} />
                          <span className="text-xs text-muted">
                            {set && (
                              <>
                                <Link href={setHref(r, set)} prefetch={false} className="hover:text-brand hover:underline">
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
                        <span key="p">{money(p.lowestPriceCents, r.market)}</span>,
                        <span key="n">{packs}</span>,
                        <span key="pp" className="font-semibold">
                          {money(perPack, r.market)}
                        </span>,
                      ],
                    };
                  })}
                />
              ) : (
                <p className="text-sm text-muted">No product with a fixed pack count is in stock at the stores we compare in {r.inName} right now.</p>
              )}
            </LiveBlock>
            <p className="text-xs leading-5 text-muted">{PACK_SOURCE}</p>
            <Prose>
              {top ? (
                <p>
                  Every pack you open towards a card costs at least <strong>{money(top.perPack, r.market)}</strong> in {r.inName} today. Take the price of the single you’re
                  after, in the grade you want, and divide it by that figure: the answer is how many of the cheapest packs the card is worth. If you would open more than that,
                  buying the single is the cheaper way to own it.
                </p>
              ) : (
                <p>
                  The check works the same whenever you make it: take the price of the single you’re after, in the grade you want, and divide it by the cheapest price per
                  pack you can find. The answer is how many packs the card is worth.
                </p>
              )}
              <p>
                Opening packs is fun in its own right, and nobody can tell you what a given pack holds. Just count it as the fun, not as the route to a particular card. Packs
                come in <Link href={typeHref(r, "booster-pack")}>loose booster packs</Link>, <Link href={typeHref(r, "booster-box")}>booster boxes</Link> and{" "}
                <Link href={typeHref(r, "etb")}>Elite Trainer Boxes</Link>, among others; the newest sets out are below.
              </p>
            </Prose>
            <SetChips r={r} listed={data.listedSets} sets={newest} />
          </>
        ),
      },
      {
        id: "find-the-numbers",
        title: "Finding the raw and graded prices",
        body: (
          <>
            <Prose>
              <p>
                The calculator is only as good as the prices you give it. For both numbers, use <strong>recent sold listings</strong>, not asking prices. A listing that hasn’t
                sold tells you what one seller hopes for; a sale tells you what a buyer paid.
              </p>
              <p>
                Match the card exactly. The same Pokémon from a different set, a reverse holo instead of a holo, a stamped promo, a first edition or a different language is a
                different card with a different price. Once graded, the company and the grade become part of the card’s identity too: a card in one company’s top grade and the
                same card in another company’s top grade sell as two separate things, and so does every grade below. Compare like with like.
              </p>
              <p>
                For the raw price, match the condition as well. A raw card listed as near mint and one with worn corners are not the same sale. Take several recent sales, set
                aside any that look unusual, and use the middle one rather than the best. Our{" "}
                <Link href={guideHref(r, "how-to-check-pokemon-card-value")}>guide to checking a card’s value</Link> goes through it step by step.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "before-you-send",
        title: "Check the card before you send it",
        body: (
          <>
            <Prose>
              <p>Your guess at the grade is the number that moves the answer most. Look at the card under a bright light, out of its sleeve, before you decide.</p>
            </Prose>
            <Checklist
              items={[
                <>
                  <strong>Centring:</strong> are the borders even on all four sides, front and back?
                </>,
                <>
                  <strong>Corners:</strong> sharp, or rounded, bent or white at the tips?
                </>,
                <>
                  <strong>Edges:</strong> any whitening, chips or roughness along the back edges?
                </>,
                <>
                  <strong>Surface:</strong> tilt it under the light for scratches, dents, print lines and marks on the holo.
                </>,
                <>
                  <strong>Be strict.</strong> Grade it lower than your first impression. If you’re unsure, plan around the lower grade in the calculator.
                </>,
              ]}
            />
            <Note>Keep a card you plan to grade in a soft sleeve inside a rigid holder from the moment it leaves the pack. Handling marks don’t come off.</Note>
          </>
        ),
      },
      {
        id: "decide",
        title: "Grade, sell raw, or keep it?",
        body: (
          <Decisions
            rows={[
              {
                when: "Graded sales sit well above your break-even in more than one grade",
                then: <>Grading looks worth it on the numbers. Check the weighted average in the calculator with honest odds before you post the card.</>,
              },
              {
                when: "It only pays at the top grade",
                then: <>That’s a gamble on one outcome. Unless the card is flawless under a bright light, selling raw is usually the safer sum.</>,
              },
              {
                when: "Graded and raw prices are close",
                then: <>Sell it raw. The grading costs sit between the two prices and leave you with less.</>,
              },
              {
                when: "You’re keeping it for your collection",
                then: <>The sums matter less. A slab protects the card and confirms it’s genuine, and that can be reason enough, as long as you know what it costs.</>,
              },
              {
                when: "You want to trade it",
                then: (
                  <>
                    Agree a value with the other trader first, raw or graded, then add both sides up in the <Link href={tool(r, "trade-calculator")}>trade calculator</Link>.
                  </>
                ),
              },
            ]}
          />
        ),
      },
      {
        id: "selling-fees",
        title: "Selling fees: the cost people forget",
        body: (
          <>
            <Prose>
              <p>
                The selling fee is charged on the whole sale, so it comes out of both the raw and the graded sale, and it takes more from the bigger one. Use the rate you
                actually pay in both columns of the sum, and include any postage the fee is charged on.
              </p>
              <p>
                The <Link href={tool(r, "selling-fee-calculator")}>selling fee calculator</Link> works out what a sale leaves you after fees and postage.{" "}
                {ebayPresets ? (
                  <>
                    For {r.inName} it has presets with eBay’s published rates, checked on {formatRelease(FEES_CHECKED)}. Your own rate depends on your plan and store, so
                    confirm it in your Seller Hub before you rely on it.
                  </>
                ) : (
                  <>Choose Custom and type the rate your marketplace charges you, as shown in your seller account (on eBay, your Seller Hub), since rates vary by seller.</>
                )}
              </p>
              <p>
                Want a reality check on sealed product instead? The <Link href={tool(r, "value-checker")}>value checker</Link> shows what stores in {r.inName} charge for a
                booster box, Elite Trainer Box or bundle today.
              </p>
            </Prose>
          </>
        ),
      },
      whereToBuy(r, {
        tcg: { query: "Booster Pack", label: "Pokémon booster packs" },
        links: [
          { href: `/${r.region}/cheapest-packs`, label: "Cheapest per pack" },
          { href: guideHref(r, "cheapest-way-to-buy-pokemon-packs"), label: "The cheapest way to buy packs" },
        ],
      }),
    ],
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
