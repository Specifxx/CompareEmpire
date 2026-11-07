// Guide: Pokémon TCG Black Friday 2026 (2026-11-07). The dates, then the newest released sets' headline products in the region
// today (cheapest store and the middle store price, the same read as the resealed guide but up to three sets), as the prices to
// read a Black Friday price against, and the checks before buying. The deals themselves are /<region>/black-friday and
// /<region>/cyber-monday. No claim about what will be cheaper on the day: we only know what stores ask today.
import Link from "next/link";
import { CALENDAR_TYPES } from "@/lib/data";
import { money } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { TYPE_BY_LABEL } from "@/lib/sealed-title";
import type { GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import { Checklist, GuideBody, guideHref, Lede, LiveBlock, linesFor, ProductTh, Prose, SetTitle, setOf, StackTable, whereText, whereToBuy, type BodyProps, type GuideOutline } from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("pokemon-black-friday-2026")!;

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const bf = `/${r.region}/black-friday`;
  const cm = `/${r.region}/cyber-monday`;
  const sets = data.sets.map(setOf).filter((s): s is NonNullable<typeof s> => !!s);
  return {
    intro: (
      <Lede>
        Black Friday is Friday 27 November 2026 and Cyber Monday is Monday 30 November. Before the week starts, it pays to know what the newest Pokémon sets’ booster boxes,
        Elite Trainer Boxes and bundles cost in {r.inName} today, so a Black Friday price can be checked against the cheapest store and the going price, not against a sticker.
      </Lede>
    ),
    sections: [
      {
        id: "deals",
        title: "Where the Black Friday deals are",
        body: (
          <Prose>
            <p>
              Our <Link href={bf}>Pokémon Black Friday deals</Link> page lists the sealed product the cheapest store in {r.inName} sells well under the other stores today, rebuilt
              every day through the week, and <Link href={cm}>Cyber Monday deals</Link> does the same for the Monday. This guide is the reference to read them against.
            </p>
          </Prose>
        ),
      },
      {
        id: "prices",
        title: "The prices to compare with",
        live: true,
        body: (
          <>
            <Prose>
              <p>Each of the newest sets’ headline products in {r.inName} right now: the cheapest store, and the middle price of all the stores that have it in stock.</p>
            </Prose>
            {sets.map((set) => {
              const lines = linesFor(data.bySet[set.code], CALENDAR_TYPES, set);
              return (
                <LiveBlock key={set.code} r={r} checked={data.checked} title={<SetTitle r={r} set={set} today={data.today} />}>
                  <StackTable
                    caption={`${set.name}: the cheapest and the middle store price of its booster box, Elite Trainer Box and booster bundle in ${r.inName} today`}
                    head={["Product", "Cheapest", "Middle price", "In stock at"]}
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
              );
            })}
          </>
        ),
      },
      {
        id: "checks",
        title: "Five checks before you pay",
        body: (
          <Checklist
            items={[
              <>
                <strong>Compare with the cheapest store today</strong>, not with a struck-through price or the RRP: a sticker can sit against a price no store charges.
              </>,
              <>
                <strong>Add the delivery.</strong> A box a little cheaper with paid shipping can cost more than one with free shipping over a threshold.
              </>,
              <>
                <strong>Check it is in stock.</strong> A low price on a pre-order or a backorder ships later, or not at all.
              </>,
              <>
                <strong>Be careful with a box far under every store:</strong> it is more often a different product, a foreign-language box or a resealed one. See{" "}
                <Link href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>how to avoid resealed Pokémon product</Link>.
              </>,
              <>
                <strong>Read a code’s terms:</strong> stores often leave booster boxes and pre-orders out of site-wide codes.
              </>,
            ]}
          />
        ),
      },
      whereToBuy(r, {
        tcg: { query: "Booster Box", label: "Pokémon booster boxes" },
        links: [
          { href: bf, label: "Black Friday deals" },
          { href: cm, label: "Cyber Monday deals" },
        ],
      }),
    ],
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
