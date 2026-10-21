// Guide: Chaos Rising (me4) against Perfect Order (me3). Both sets' cheapest open booster box, Elite Trainer Box and booster bundle in
// the region today with the price per pack (packs.ts) and store counts, which set is cheaper per pack today (computed: named only when
// the numbers say so, "too close to call" within CLOSE_PCT, or "only one has it"), each set's open sealed line-up by product type,
// how to choose (no claims about cards or future worth), box vs ETB vs bundle within each set, the value checker and trade calculator,
// and the sets either side in the series (sets.ts). US MSRP in the US only, with RRP_NOTE.
import Link from "next/link";
import { CALENDAR_TYPES, type ProductCardData } from "@/lib/data";
import { money, plural } from "@/lib/format";
import { packsFor } from "@/lib/packs";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { usMsrpCents } from "@/lib/rrp";
import { TYPE_BY_LABEL } from "@/lib/sealed-title";
import { SETS, type PokemonSet } from "@/lib/sets";
import type { GuideData } from "./data";
import { andList, seriesPacks } from "./facts";
import { GUIDE_BY_SLUG } from "./index";
import {
  cheapestPerPack,
  Decisions,
  GuideBody,
  guideHref,
  Lede,
  LiveBlock,
  linesFor,
  MsrpNote,
  NextLinks,
  Note,
  PACK_SOURCE,
  perPackOf,
  PriceTable,
  Prose,
  SetChips,
  SetGroup,
  SetTitle,
  setHref,
  setOf,
  StackTable,
  typeHref,
  whereToBuy,
  type BodyProps,
  type GuideOutline,
  type GuideSection,
  type PriceLine,
} from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("pokemon-chaos-rising-vs-perfect-order")!;
const CODES = ["me4", "me3"] as const;
const LINK = "font-semibold text-brand hover:underline";

/** Two prices per pack this close (percent of the higher) are "too close to call". */
export const CLOSE_PCT = 3;

/** "US stores and TCGplayer" / "Australian stores": who the live prices come from. */
const storesPhrase = (r: RegionInfo) => (r.market === "US" ? "US stores and TCGplayer" : `${r.adjective} stores`);

/** A type label inside a sentence: "booster box", "booster bundle", but "Elite Trainer Box" keeps its capitals. */
const inline = (label: string) => (label === "Elite Trainer Box" || label.startsWith("Pokémon") ? label : label.toLowerCase());

/** Whole days from one ISO date to a later one. */
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400_000);

/** One side of the comparison: a set, its box/ETB/bundle lines and its cheapest pack among them. */
interface Side {
  set: PokemonSet;
  lines: PriceLine[];
  best: { p: ProductCardData; perPack: number } | null;
}

function sideOf(set: PokemonSet, data: GuideData): Side {
  const lines = linesFor(data.bySet[set.code], CALENDAR_TYPES, set, set.releaseDate > data.today);
  const floor = cheapestPerPack(lines);
  const hit = floor == null ? null : lines.find((l) => l.p && perPackOf(l.p).perPack === floor)?.p ?? null;
  return { set, lines, best: hit && floor != null ? { p: hit, perPack: floor } : null };
}

/** Which of two per-pack prices is lower, or "close" within CLOSE_PCT, or null when either is missing. */
export function cheaperOf(a: number | null, b: number | null): "a" | "b" | "close" | null {
  if (a == null || b == null) return null;
  const hi = Math.max(a, b);
  if (Math.abs(a - b) * 100 <= hi * CLOSE_PCT) return "close";
  return a < b ? "a" : "b";
}

/** The headline sentence: which set's cheapest pack is cheaper today, only as far as the numbers say. */
export function verdict(a: Side, b: Side, r: Pick<RegionInfo, "market" | "inName">): string {
  if (!a.best && !b.best) return `Neither set has a booster box, Elite Trainer Box or booster bundle in stock in ${r.inName} right now, so there’s no price per pack to compare today.`;
  if (!a.best || !b.best) {
    const only = (a.best ? a : b) as Side & { best: NonNullable<Side["best"]> };
    const other = a.best ? b : a;
    return `Only ${only.set.name} has a booster box, ETB or bundle in stock in ${r.inName} right now: its cheapest pack is ${money(only.best.perPack, r.market)}, in its ${inline(only.best.p.productType)}. ${other.set.name} has none in stock to compare.`;
  }
  const c = cheaperOf(a.best.perPack, b.best.perPack);
  if (c === "close") {
    return `Too close to call today: the cheapest pack is ${money(a.best.perPack, r.market)} in ${a.set.name} and ${money(b.best.perPack, r.market)} in ${b.set.name}, within ${CLOSE_PCT}% of each other.`;
  }
  const [win, lose] = c === "a" ? [a, b] : [b, a];
  const w = win.best!;
  const l = lose.best!;
  return `${win.set.name} is cheaper per pack today: ${money(w.perPack, r.market)} in its ${inline(w.p.productType)}, against ${money(l.perPack, r.market)} in ${lose.set.name}’s ${inline(l.p.productType)}, ${money(l.perPack - w.perPack, r.market)} a pack less.`;
}

/** A set's open products grouped by type: how many are open and the cheapest, most products first. */
function lineup(products: readonly ProductCardData[] | undefined): { type: string; count: number; from: number | null }[] {
  const acc = new Map<string, { type: string; count: number; from: number | null }>();
  for (const p of products ?? []) {
    const row = acc.get(p.productType) ?? { type: p.productType, count: 0, from: null };
    row.count++;
    if (p.lowestPriceCents != null && (row.from == null || p.lowestPriceCents < row.from)) row.from = p.lowestPriceCents;
    acc.set(p.productType, row);
  }
  return [...acc.values()].sort((x, y) => y.count - x.count || x.type.localeCompare(y.type));
}

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const given = data.sets.map(setOf).filter((s): s is PokemonSet => !!s);
  const sets = given.length === 2 ? given : CODES.map(setOf).filter((s): s is PokemonSet => !!s);
  const [newer, older] = [...sets].sort((x, y) => y.releaseDate.localeCompare(x.releaseDate));
  const A = sideOf(newer, data);
  const B = sideOf(older, data);
  const sides = [A, B];
  const gap = daysBetween(older.releaseDate, newer.releaseDate);
  const box = packsFor("booster-box", newer.code);
  const etb = seriesPacks("etb", newer.series) ?? packsFor("etb", newer.code);
  const bundle = packsFor("booster-bundle", newer.code);
  const open = (s: PokemonSet) => data.openCount[s.code] ?? data.bySet[s.code]?.length ?? 0;

  // The series around the two: the set before the older one and after the newer one (sets.ts order).
  const series = SETS.filter((s) => s.series === newer.series).sort((x, y) => x.releaseDate.localeCompare(y.releaseDate));
  const before = series[series.findIndex((s) => s.code === older.code) - 1] ?? null;
  const after = series[series.findIndex((s) => s.code === newer.code) + 1] ?? null;
  const later = series.filter((s) => s.releaseDate > newer.releaseDate);

  /** Per type, the head-to-head: each set's price per pack and which is cheaper. */
  const h2h = CALENDAR_TYPES.map((label) => {
    const a = A.lines.find((l) => l.label === label)!;
    const b = B.lines.find((l) => l.label === label)!;
    const pa = a.p ? perPackOf(a.p).perPack : null;
    const pb = b.p ? perPackOf(b.p).perPack : null;
    return { label, a, b, pa, pb, c: cheaperOf(pa, pb) };
  });
  const anyPriced = h2h.some((x) => x.pa != null || x.pb != null);
  const cell = (l: PriceLine, pp: number | null) =>
    l.p ? (
      <span className="flex flex-col">
        <span className="font-semibold">{pp != null ? money(pp, r.market) : "—"} a pack</span>
        <span className="text-xs text-muted">
          {money(l.p.lowestPriceCents, r.market)} · {plural(l.p.inStockStores, "store")}
        </span>
      </span>
    ) : (
      <span className="text-faint">{l.missing ?? "None right now"}</span>
    );
  const said = (c: ReturnType<typeof cheaperOf>, onlyA: boolean, onlyB: boolean) =>
    c === "a" ? A.set.name : c === "b" ? B.set.name : c === "close" ? "Too close to call" : onlyA ? `Only ${A.set.name} in stock` : onlyB ? `Only ${B.set.name} in stock` : "Neither in stock";

  /** Within one set: which of its box, ETB and bundle is cheapest per pack today, in a sentence. */
  const withinSet = (s: Side): string => {
    const priced = s.lines.filter((l) => l.p && perPackOf(l.p).perPack != null).map((l) => ({ label: l.label, pp: perPackOf(l.p!).perPack! }));
    if (!priced.length) return `${s.set.name} has no booster box, ETB or bundle in stock in ${r.inName} right now.`;
    if (priced.length === 1) return `In ${s.set.name}, only the ${inline(priced[0].label)} is in stock right now, at ${money(priced[0].pp, r.market)} a pack.`;
    const sorted = [...priced].sort((x, y) => x.pp - y.pp);
    const rest = sorted.slice(1).map((x) => `${money(x.pp, r.market)} in the ${inline(x.label)}`);
    return `In ${s.set.name}, the ${inline(sorted[0].label)} is the cheapest per pack today at ${money(sorted[0].pp, r.market)}, against ${andList(rest)}.`;
  };

  const boxNote = [newer, older].filter((s) => s.noBoosterBox);
  const msrp = r.market === "US" ? { box: usMsrpCents("booster-box", newer.code), etb: usMsrpCents("etb", newer.code), bundle: usMsrpCents("booster-bundle", newer.code) } : null;
  const median = A.lines.find((l) => l.p?.medianOpenCents != null && l.p.inStockStores >= 2)?.p ?? B.lines.find((l) => l.p?.medianOpenCents != null && l.p.inStockStores >= 2)?.p ?? null;
  const cheaperSide = A.best && B.best ? cheaperOf(A.best.perPack, B.best.perPack) : null;

  const sections: GuideSection[] = [
    {
      id: "side-by-side",
      title: `Chaos Rising vs Perfect Order prices in ${r.inName} today`,
      live: true,
      body: (
        <>
          <Prose>
            <p>
              Here is each set’s cheapest booster box, Elite Trainer Box and booster bundle in stock at {storesPhrase(r)} right now, what each works out to per pack, and how
              many stores have it. Within each set, the product with the cheapest pack is marked.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {sides.map((s) => (
              <SetGroup key={s.set.code} title={<SetTitle r={r} set={s.set} today={data.today} />}>
                <PriceTable r={r} caption={`${s.set.name}: the cheapest booster box, Elite Trainer Box and booster bundle in ${r.inName} today, with the price per pack`} lines={s.lines} />
              </SetGroup>
            ))}
          </LiveBlock>
          <Prose>
            <p>
              <strong>{verdict(A, B, r)}</strong>
            </p>
            {anyPriced && (
              <p>
                The head-to-head below lines up the same product from each set. A gap of {CLOSE_PCT}% or less is called too close to call: a different store, a shipping
                charge or a discount code would easily cover it.
              </p>
            )}
          </Prose>
          {anyPriced && (
            <div className="card my-6 px-4 py-2 sm:px-5 sm:py-3">
              <StackTable
                caption={`${A.set.name} against ${B.set.name} in ${r.inName} today: the price per pack of each product, and which is cheaper`}
                head={["Product", A.set.name, B.set.name, "Cheaper per pack"]}
                rows={h2h.map((x) => ({
                  key: x.label,
                  type: TYPE_BY_LABEL.get(x.label)?.key,
                  th: <span className="font-semibold text-ink">{x.label}</span>,
                  cells: [cell(x.a, x.pa), cell(x.b, x.pb), <span key="c" className="font-semibold">{said(x.c, x.pa != null, x.pb != null)}</span>],
                }))}
              />
            </div>
          )}
          <p className="text-xs leading-5 text-muted">
            Each store’s listed price, excluding shipping. The price per pack is the whole product divided by its packs; an ETB’s extras aren’t priced in. {PACK_SOURCE}{" "}
            <Link href={`/${r.region}/cheapest-packs`} prefetch={false} className={LINK}>
              Every set, by price per pack →
            </Link>
          </p>
        </>
      ),
    },
    {
      id: "line-up",
      title: `What each set has in stock in ${r.inName}`,
      live: true,
      body: (
        <>
          <Prose>
            <p>
              The box, ETB and bundle are only part of a set’s sealed range. Here is everything from each set that’s open in {r.inName} today
              {r.market === "US" ? " (in stock at a store, or on TCGplayer)" : " (in stock at one store at least)"}, by product type, with the lowest price of each.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {sides.map((s) => {
              const rows = lineup(data.bySet[s.set.code]);
              return (
                <SetGroup key={s.set.code} title={<SetTitle r={r} set={s.set} today={data.today} extra={<> · {plural(open(s.set), "product")} open</>} />}>
                  {rows.length === 0 ? (
                    <p className="text-sm leading-6 text-muted">Nothing from {s.set.name} is in stock in {r.inName} right now. Its set page lists every product, sold out included.</p>
                  ) : (
                    <StackTable
                      caption={`${s.set.name}: open sealed products in ${r.inName} today, by type`}
                      head={["Product type", "Open", "From"]}
                      rows={rows.map((row) => {
                        const t = TYPE_BY_LABEL.get(row.type);
                        return {
                          key: row.type,
                          type: t?.key,
                          th: t ? (
                            <Link href={typeHref(r, t.key)} prefetch={false} className="font-semibold text-ink hover:text-brand hover:underline">
                              {row.type}
                            </Link>
                          ) : (
                            <span className="font-semibold text-ink">{row.type}</span>
                          ),
                          cells: [<span key="n">{row.count}</span>, <span key="f">{row.from != null ? money(row.from, r.market) : "—"}</span>],
                        };
                      })}
                    />
                  )}
                </SetGroup>
              );
            })}
          </LiveBlock>
          <Prose>
            <p>
              {open(A.set) === 0 && open(B.set) === 0 ? (
                <>Neither set has anything open in {r.inName} right now.</>
              ) : open(A.set) === open(B.set) ? (
                <>
                  Both sets have {plural(open(A.set), "product")} open today.
                </>
              ) : (
                <>
                  {open(A.set) > open(B.set) ? A.set.name : B.set.name} has more open today ({plural(Math.max(open(A.set), open(B.set)), "product")}, against{" "}
                  {Math.min(open(A.set), open(B.set))}).
                </>
              )}{" "}
              {open(A.set) + open(B.set) > 0 && <>More products open means more choice of store and of format. </>}Tins, collections and
              other boxes hold packs too, but how many varies from product to product, so they get no price per pack here: check each product’s page for what it holds.
            </p>
          </Prose>
        </>
      ),
    },
    {
      id: "the-two-sets",
      title: "The two sets at a glance",
      body: (
        <>
          <Prose>
            <p>
              Both are {newer.series} sets. <strong>{older.name}</strong> was released on {formatRelease(older.releaseDate)}, and <strong>{newer.name}</strong> followed on{" "}
              {formatRelease(newer.releaseDate)}, {plural(gap, "day")} later.{" "}
              {boxNote.length === 0 ? (
                <>
                  Both were sold as a {box}-pack booster box as well as an Elite Trainer Box and a booster bundle, so the same three products line up against each other
                  above.
                </>
              ) : (
                <>{andList(boxNote.map((s) => s.name))} {boxNote.length === 1 ? "was" : "were"} sold without a booster box, so only the ETB and the bundle line up.</>
              )}
            </p>
            <p>
              Stores price each set on its own, so one shop can be the cheapest for {newer.name} and not for {older.name}. That’s why the tables above take each set’s
              cheapest price from whichever store has it, rather than one store’s shelf, and why it pays to compare before you buy either.
            </p>
          </Prose>
          <SetChips r={r} sets={[newer, older]} />
        </>
      ),
    },
    {
      id: "how-to-choose",
      title: "How to choose between them",
      body: (
        <>
          <Prose>
            <p>
              We don’t rank sets by their cards or guess what either will be worth later. What we can tell you is what each costs today, and that’s often enough to decide.
            </p>
          </Prose>
          <Decisions
            rows={[
              {
                when: "You want the cheaper pack today",
                then: A.best && B.best && cheaperSide !== "close" ? (
                  <>
                    {cheaperSide === "a" ? A.set.name : B.set.name}, going by today’s prices above. Check the shipping on the store you’d buy from: it can close a small gap.
                  </>
                ) : A.best && B.best ? (
                  <>Today it’s too close to call. Pick the set you prefer, or the store with the cheaper shipping.</>
                ) : (
                  <>Only one set, or neither, has a priced pack in stock right now. See the tables above.</>
                ),
              },
              { when: "You want the newer set", then: <>{newer.name}: released {formatRelease(newer.releaseDate)}.</> },
              {
                when: "You already have one of them",
                then: <>The other, if you want to collect the series. A bundle of each set is a smaller step than a box of each.</>,
              },
              {
                when: "You’re buying a gift or starting to play",
                then: (
                  <>
                    An Elite Trainer Box of either: {etb} packs plus sleeves, energy cards, dice and a storage box. Compare the two sets’ ETB rows in the head-to-head above.
                  </>
                ),
              },
              {
                when: "You can’t decide",
                then: <>A booster bundle of each: {bundle} packs apiece, so you can open both sets without buying a box of either.</>,
              },
            ]}
          />
        </>
      ),
    },
    {
      id: "box-etb-bundle",
      title: "Booster box, ETB or bundle in each set",
      body: (
        <>
          <Prose>
            <p>
              Within a set, the three products differ in packs and extras: a booster box holds {box} packs, an Elite Trainer Box {etb} with its accessories, and a booster
              bundle {bundle}. Which one gives the cheapest pack depends on what stores charge today, and it isn’t always the box.
            </p>
            <ul>
              {sides.map((s) => (
                <li key={s.set.code}>{withinSet(s)}</li>
              ))}
            </ul>
            <p>
              The box makes sense when you want lots of packs of one set. The ETB suits a player or a gift, and the bundle is the smallest outlay to try a set. The{" "}
              <Link href={guideHref(r, "booster-box-vs-etb-vs-booster-bundle")}>box, ETB and bundle guide</Link> covers the differences, and{" "}
              <Link href={guideHref(r, "pokemon-booster-box-vs-etb-value")}>box vs ETB, set by set</Link> compares the two for every recent set.
            </p>
            {msrp?.box != null && msrp.etb != null && msrp.bundle != null && (
              <p>
                In the US, the MSRP of a {newer.series} booster box is {money(msrp.box, "US")}, an Elite Trainer Box {money(msrp.etb, "US")} and a booster bundle{" "}
                {money(msrp.bundle, "US")}, for both sets. Stores set their own prices, above or below those.
              </p>
            )}
          </Prose>
          {msrp?.box != null && <MsrpNote />}
        </>
      ),
    },
    {
      id: "check-a-price",
      title: "Checking a price you were offered",
      body: (
        <>
          <Prose>
            <p>
              Someone offering you a {A.set.name} or {B.set.name} box at a market stall, in a group chat or on a marketplace? Search it in the <strong>value checker</strong>.
              It shows the cheapest price at a store with it in stock in {r.inName} today, the median of those stores, and the price per pack. Type in the price you were
              offered to see where it sits.
            </p>
            {median?.medianOpenCents != null && (
              <p>
                For example, the cheapest {median.name} is {money(median.lowestPriceCents, r.market)} today, and the median of the {plural(median.inStockStores, "store")}{" "}
                with it in stock is {money(median.medianOpenCents, r.market)}. An offer at or under the cheapest store is worth a look; one far below every store deserves a
                closer look at the seller and the wrap.
              </p>
            )}
          </Prose>
          <NextLinks
            links={[
              { href: `/${r.region}/tools/value-checker`, label: "Value checker", icon: "search" },
              { href: guideHref(r, "how-to-avoid-resealed-pokemon-products"), label: "Avoiding resealed product", icon: "arrow-right" },
            ]}
          />
        </>
      ),
    },
    {
      id: "trading",
      title: "Trading one set for the other",
      body: (
        <>
          <Prose>
            <p>
              Swapping a {A.set.name} ETB for a {B.set.name} one, or sealed product for cards? The <strong>trade calculator</strong> adds up both sides. Use today’s cheapest
              in-stock price of each sealed product as its value, from the tables above or the value checker, so both traders work from the same numbers. The calculator
              shows the difference in {r.currency} and as a percentage, and which side is ahead.
            </p>
            <p>
              Because the two sets’ products are priced differently today, an even swap of one ETB for the other isn’t necessarily even in money. The head-to-head above
              shows by how much.
            </p>
          </Prose>
          <NextLinks links={[{ href: `/${r.region}/tools/trade-calculator`, label: "Trade calculator", icon: "arrow-right" }]} />
          <Note>The tools report what stores ask today. Neither they nor this guide say what a product will be worth later.</Note>
        </>
      ),
    },
    {
      id: "series",
      title: "The sets either side",
      body: (
        <>
          <Prose>
            <p>
              {before ? (
                <>
                  Before {older.name} came <Link href={setHref(r, before)}>{before.name}</Link> ({formatRelease(before.releaseDate)})
                  {before.noBoosterBox && <>, sold without a booster box</>}.{" "}
                </>
              ) : null}
              {after ? (
                <>
                  After {newer.name}, <Link href={setHref(r, after)}>{after.name}</Link> {after.releaseDate <= data.today ? "was released" : "releases"} on{" "}
                  {formatRelease(after.releaseDate)}.{" "}
                </>
              ) : null}
              {later.length > 1 && (
                <>
                  The series continues with {andList(later.slice(1).map((s) => `${s.name} (${s.releaseDate <= data.today ? "out" : "releases"} ${formatRelease(s.releaseDate)})`))}.{" "}
                </>
              )}
              The <Link href={guideHref(r, "pokemon-mega-evolution-sealed-price-guide")}>{newer.series} price guide</Link> puts every set in the series side by side, with
              its cheapest pack today.
            </p>
          </Prose>
          <SetChips r={r} sets={[...series].reverse()} />
        </>
      ),
    },
    whereToBuy(r, {
      tcg: { query: newer.series, label: `${newer.series} sealed` },
      links: [
        { href: setHref(r, newer), label: `All ${newer.name} products` },
        { href: setHref(r, older), label: `All ${older.name} products` },
      ],
    }),
  ];

  return {
    intro: (
      <Lede>
        {newer.name} and {older.name} are two {newer.series} sets released {plural(gap, "day")} apart. {verdict(A, B, r)} Below: each set’s booster box, Elite Trainer Box
        and bundle at {storesPhrase(r)}, what each pack costs, and how many stores have them.
      </Lede>
    ),
    sections,
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody guide={GUIDE} r={r} outline={outline(r, data)} />;
}
