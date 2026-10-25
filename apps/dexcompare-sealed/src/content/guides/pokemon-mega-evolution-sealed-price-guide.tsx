// Guide: the Mega Evolution series hub. Every Mega Evolution set (sets.ts, released and upcoming, newest first) with its cheapest open
// booster box, Elite Trainer Box and booster bundle in the region today and the price per pack (packs.ts), the sets ranked by their
// cheapest pack, the sets in release order (sets.ts dates, the ones sold without a booster box), the series' pack counts (packs.ts via
// facts.ts), which product suits which goal, pre-ordering the next set (judged against data.today, never hard-coded), checks before
// buying an older set, and the value checker and trade calculator. US MSRP in the US only, with RRP_NOTE.
import Link from "next/link";
import { CALENDAR_TYPES, type ProductCardData } from "@/lib/data";
import { money, plural } from "@/lib/format";
import { packsFor } from "@/lib/packs";
import { preorderPath } from "@/lib/preorder-guides";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { usMsrpCents } from "@/lib/rrp";
import type { PokemonSet } from "@/lib/sets";
import { TYPE_ABOUT } from "@/lib/type-about";
import type { GuideData } from "./data";
import { andList, fixedPacks, packsBySeries, regularSet, seriesPacks, seriesPhrase, specialEtbSets } from "./facts";
import { GUIDE_BY_SLUG } from "./index";
import {
  Checklist,
  Decisions,
  FactRows,
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
  productHref,
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
  type GuideSection,
} from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("pokemon-mega-evolution-sealed-price-guide")!;
const SERIES = "Mega Evolution";
const TITLE_LINK = "underline decoration-line underline-offset-4 hover:text-brand hover:decoration-brand";
const LINK = "font-semibold text-brand hover:underline";

/** "US stores and TCGplayer" / "Australian stores": who the live prices come from. */
const storesPhrase = (r: RegionInfo) => (r.market === "US" ? "US stores and TCGplayer" : `${r.adjective} stores`);

/** A type label inside a sentence: "booster box", "booster bundle", but "Elite Trainer Box" keeps its capitals. */
const inline = (label: string) => (label === "Elite Trainer Box" ? label : label.toLowerCase());

/** Whole days from one ISO date to a later one. */
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400_000);

/** A set's cheapest pack today among its open box, ETB and bundle: the product and its price per pack, or null. */
export function bestPack(products: readonly ProductCardData[] | undefined): { p: ProductCardData; perPack: number } | null {
  let best: { p: ProductCardData; perPack: number } | null = null;
  for (const p of products ?? []) {
    if (!CALENDAR_TYPES.includes(p.productType)) continue;
    const { perPack } = perPackOf(p);
    if (perPack != null && (!best || perPack < best.perPack)) best = { p, perPack };
  }
  return best;
}

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const sets = data.sets.map(setOf).filter((s): s is PokemonSet => !!s && s.series === SERIES);
  const isOut = (s: PokemonSet) => s.releaseDate <= data.today;
  const released = sets.filter(isOut);
  const upcoming = sets.filter((s) => !isOut(s)).sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  const inOrder = [...sets].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  const first = inOrder[0] ?? null;
  const noBox = sets.filter((s) => s.noBoosterBox);

  // Pack counts: packs.ts, read through facts.ts (the series' ordinary set for the fixed counts).
  const regular = regularSet(SERIES);
  const box = fixedPacks("booster-box") ?? packsFor("booster-box", regular?.code ?? null);
  const bundle = fixedPacks("booster-bundle") ?? packsFor("booster-bundle", regular?.code ?? null);
  const etb = seriesPacks("etb", SERIES);
  const pcEtb = seriesPacks("pc-etb", SERIES);
  const bb = packsFor("build-battle", regular?.code ?? null);
  const etbRow = packsBySeries("etb").find((x) => x.series.includes(SERIES));
  const etbAlso = etbRow ? etbRow.series.filter((x) => x !== SERIES) : [];
  const specialEtb = specialEtbSets().filter((x) => x.set.series === SERIES);

  // The live picture: each released set's cheapest pack, ranked.
  const ranked = rankSets(released, data);
  const cheapest = ranked[0] ?? null;
  const dearest = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const quiet = released.filter((s) => !ranked.some((x) => x.set.code === s.code));
  const next = upcoming[0] ?? null;
  const nextLines = next ? (data.bySet[next.code] ?? []).filter((p) => CALENDAR_TYPES.includes(p.productType)) : [];
  const nextBest = next ? bestPack(data.bySet[next.code]) : null;
  const nextPre = next ? preorderPath(r.region, next.code) : null;
  const newest = released[0] ?? null;

  const sections: GuideSection[] = [
    {
      id: "prices-today",
      title: `Every Mega Evolution set’s prices in ${r.inName} today`,
      live: true,
      body: (
        <>
          <Prose>
            <p>
              Here is every {SERIES} set, newest first, with the cheapest booster box, Elite Trainer Box and booster bundle in stock at {storesPhrase(r)} right now. The
              last column says how many stores have that product in stock. In each set, the product with the cheapest pack is marked, so you can see at a glance which of
              the three is the better buy per pack in that set today.
            </p>
            {upcoming.length > 0 && (
              <p>
                {andList(upcoming.map((s) => s.name))} {upcoming.length === 1 ? "isn’t" : "aren’t"} out yet, so any price shown for {upcoming.length === 1 ? "it" : "them"} is a
                pre-order.
              </p>
            )}
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {sets.length === 0 ? (
              <p className="text-sm leading-6 text-muted">No {SERIES} set is listed right now.</p>
            ) : (
              sets.map((s) => {
                const pre = !isOut(s);
                return (
                  <SetGroup key={s.code} title={<SetTitle r={r} set={s} today={data.today} extra={pre ? <> · Pre-order</> : undefined} />}>
                    <PriceTable
                      r={r}
                      caption={`${s.name}: the cheapest booster box, Elite Trainer Box and booster bundle in ${r.inName} today, with the price per pack`}
                      lines={linesFor(data.bySet[s.code], CALENDAR_TYPES, s, pre)}
                      whereHead={pre ? "Open at" : "In stock at"}
                    />
                  </SetGroup>
                );
              })
            )}
          </LiveBlock>
          <p className="text-xs leading-5 text-muted">
            Each store’s listed price, excluding shipping. The price per pack is the whole product divided by its packs; an Elite Trainer Box’s sleeves, dice and promo
            aren’t priced in.{" "}
            <Link href={`/${r.region}/cheapest-packs`} prefetch={false} className={LINK}>
              Every set, by price per pack →
            </Link>
          </p>
        </>
      ),
    },
    {
      id: "cheapest-pack",
      title: "Mega Evolution sets ranked by their cheapest pack",
      live: true,
      body: (
        <>
          <Prose>
            <p>
              The same prices, put the other way round: each released set’s single cheapest pack today, whichever of the three products it comes in. This is the quickest
              way to see which {SERIES} set costs least to open in {r.inName} right now.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {ranked.length === 0 ? (
              <p className="text-sm leading-6 text-muted">
                No released {SERIES} set has a booster box, Elite Trainer Box or booster bundle in stock in {r.inName} right now. Each set’s page lists every product,
                sold out included.
              </p>
            ) : (
              <StackTable
                caption={`Released Mega Evolution sets in ${r.inName} today, ranked by their cheapest price per pack`}
                head={["Set", "Per pack", "Cheapest in", "In stock at"]}
                rows={ranked.map(({ set, p, perPack }) => ({
                  key: set.code,
                  th: (
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <Link href={setHref(r, set)} prefetch={false} className="font-semibold text-ink hover:text-brand hover:underline">
                        {set.name}
                      </Link>
                      <Link href={productHref(r, p)} prefetch={false} className="truncate text-xs font-medium text-brand underline-offset-2 hover:underline">
                        {p.name}
                      </Link>
                    </span>
                  ),
                  cells: [
                    <span key="pp" className="font-semibold">
                      {money(perPack, r.market)}
                    </span>,
                    <span key="t">{p.productType}</span>,
                    <span key="w" className="text-muted">
                      {whereText(p)}
                    </span>,
                  ],
                }))}
              />
            )}
          </LiveBlock>
          <Prose>
            {cheapest && dearest ? (
              <p>
                Today the cheapest {SERIES} pack is in <strong>{cheapest.set.name}</strong>: {money(cheapest.perPack, r.market)} a pack in its {inline(cheapest.p.productType)}
                , against {money(dearest.perPack, r.market)} for the dearest set’s cheapest pack, {dearest.set.name}. That gap is what stores charge today, not a verdict
                on the sets themselves, and it moves as stores sell through and new stock arrives.
              </p>
            ) : cheapest ? (
              <p>
                Only {cheapest.set.name} has a product with a price per pack in stock right now: {money(cheapest.perPack, r.market)} a pack in its{" "}
                {inline(cheapest.p.productType)}.
              </p>
            ) : null}
            {quiet.length > 0 && (
              <p>
                {andList(quiet.map((s) => s.name))} {quiet.length === 1 ? "has" : "have"} no booster box, ETB or bundle in stock in {r.inName} right now, so{" "}
                {quiet.length === 1 ? "it isn’t" : "they aren’t"} ranked.
              </p>
            )}
          </Prose>
        </>
      ),
    },
    {
      id: "the-sets",
      title: "The Mega Evolution sets, in release order",
      body: (
        <>
          <Prose>
            <p>
              The {SERIES} series {first ? <>began with the set of the same name on {formatRelease(first.releaseDate)}</> : <>is the Pokémon TCG’s newest series</>}. Its
              theme is the return of Mega Evolution to the game, with Mega Pokémon ex at the centre of it. {released.length > 0 && <>{plural(released.length, "set")} {released.length === 1 ? "is" : "are"} out so far</>}
              {upcoming.length > 0 && <>, and {plural(upcoming.length, "more", "more")} {upcoming.length === 1 ? "is" : "are"} announced</>}. In order:
            </p>
            <ul>
              {inOrder.map((s) => (
                <li key={s.code}>
                  <Link href={setHref(r, s)} prefetch={false}>
                    <strong>{s.name}</strong>
                  </Link>{" "}
                  — {isOut(s) ? "released" : "releases"} {formatRelease(s.releaseDate)}.{" "}
                  {s.generic && <>The series’ first set, which shares the series’ name: its set page lists only its own products. </>}
                  {s.noBoosterBox ? (
                    <>Sold without a booster box: its packs come in Elite Trainer Boxes, bundles and collections.</>
                  ) : isOut(s) ? (
                    <>A main set, sold as a booster box, an Elite Trainer Box and a booster bundle among other products.</>
                  ) : (
                    <>Not out yet: its set page shows what stores in {r.inName} have opened for pre-order.</>
                  )}
                  {!isOut(s) && (data.bySet[s.code]?.length ?? 0) > 0 && <> Open for pre-order in {r.inName} right now.</>}
                </li>
              ))}
            </ul>
            {noBox.length > 0 && (
              <p>
                A “booster box” of {andList(noBox.map((s) => s.name), "or")} is a lot a store has made up itself, not a sealed product from the publisher, so we don’t list it.
                For {noBox.length === 1 ? "that set" : "those sets"}, the Elite Trainer Box and the bundle are where the packs are.
              </p>
            )}
          </Prose>
          <SetChips r={r} listed={data.listedSets} sets={sets} />
        </>
      ),
    },
    {
      id: "pack-counts",
      title: "How many packs each Mega Evolution product holds",
      body: (
        <>
          <Prose>
            <p>
              Price per pack only works if you know the packs, and in the {SERIES} series the counts are simple: they don’t change from set to set
              {specialEtb.length > 0 && <> except for {andList(specialEtb.map((x) => x.set.name))}’s Elite Trainer Box</>}.
            </p>
          </Prose>
          <FactRows
            rows={[
              ...(box != null
                ? [
                    {
                      key: "booster-box",
                      type: "booster-box",
                      figure: box,
                      unit: "packs",
                      title: (
                        <Link href={typeHref(r, "booster-box")} className={TITLE_LINK}>
                          Booster box
                        </Link>
                      ),
                      body: <>{TYPE_ABOUT["booster-boxes"]} Not every set has one: see the list above.</>,
                    },
                  ]
                : []),
              ...(etb != null
                ? [
                    {
                      key: "etb",
                      type: "etb",
                      figure: etb,
                      unit: "packs",
                      title: (
                        <Link href={typeHref(r, "etb")} className={TITLE_LINK}>
                          Elite Trainer Box
                        </Link>
                      ),
                      body: (
                        <>
                          {TYPE_ABOUT["elite-trainer-boxes"]} In {SERIES} sets it’s {etb} packs{etbAlso.length > 0 && <>, as in {seriesPhrase(etbAlso)} sets</>}.
                        </>
                      ),
                    },
                  ]
                : []),
              ...(pcEtb != null
                ? [
                    {
                      key: "pc-etb",
                      type: "pc-etb",
                      figure: pcEtb,
                      unit: "packs",
                      title: (
                        <Link href={typeHref(r, "pc-etb")} className={TITLE_LINK}>
                          Pokémon Center ETB
                        </Link>
                      ),
                      body: TYPE_ABOUT["pokemon-center-elite-trainer-boxes"],
                    },
                  ]
                : []),
              ...(bundle != null
                ? [
                    {
                      key: "booster-bundle",
                      type: "booster-bundle",
                      figure: bundle,
                      unit: "packs",
                      title: (
                        <Link href={typeHref(r, "booster-bundle")} className={TITLE_LINK}>
                          Booster bundle
                        </Link>
                      ),
                      body: TYPE_ABOUT["booster-bundles"],
                    },
                  ]
                : []),
              ...(bb != null
                ? [
                    {
                      key: "build-battle",
                      type: "build-battle",
                      figure: bb,
                      unit: "packs",
                      title: (
                        <Link href={typeHref(r, "build-battle")} className={TITLE_LINK}>
                          Build & Battle Box
                        </Link>
                      ),
                      body: TYPE_ABOUT["build-and-battle-boxes"],
                    },
                  ]
                : []),
            ]}
          />
          <p className="text-xs leading-5 text-muted">
            {PACK_SOURCE} Every product’s count is in{" "}
            <Link href={guideHref(r, "how-many-packs-in-pokemon-products")} className="font-medium text-brand underline underline-offset-2">
              how many packs are in each product
            </Link>
            .
          </p>
          <Prose>
            <p>
              To work out a price per pack yourself, divide the price by the packs.{" "}
              {cheapest ? (
                <>
                  Today’s cheapest {SERIES} pack, for example, is {money(cheapest.p.lowestPriceCents, r.market)} for {cheapest.set.name}’s {inline(cheapest.p.productType)}{" "}
                  divided by its {perPackOf(cheapest.p).packs} packs: {money(cheapest.perPack, r.market)} a pack.
                </>
              ) : (
                <>An Elite Trainer Box at a given price costs that price divided by {etb ?? "its"} packs, before you count its extras.</>
              )}{" "}
              Do the same for any product a store or a friend offers you, and you can compare it with the tables above on equal terms.
            </p>
          </Prose>
          {r.market === "US" && regular && usMsrpCents("booster-box", regular.code) != null && (
            <>
              <Prose>
                <p>
                  In the US, the MSRP of a {SERIES} booster box is {money(usMsrpCents("booster-box", regular.code), "US")}, an Elite Trainer Box{" "}
                  {money(usMsrpCents("etb", regular.code), "US")} and a booster bundle {money(usMsrpCents("booster-bundle", regular.code), "US")}. Stores set their own
                  prices, so today’s can sit above or below those. The <Link href={guideHref(r, "pokemon-tcg-msrp")}>MSRP guide</Link> puts today’s prices beside them.
                </p>
              </Prose>
              <MsrpNote />
            </>
          )}
        </>
      ),
    },
    {
      id: "which-to-buy",
      title: "Which Mega Evolution product to buy for your goal",
      body: (
        <>
          <Prose>
            <p>
              No product is right for everyone. What suits you depends on how many packs you want, whether you’ll play, and how much you want to spend in one go. These are
              general pointers; the live tables above tell you what each costs today.
            </p>
          </Prose>
          <Decisions
            rows={[
              {
                when: "You want lots of packs from one set",
                then: (
                  <>
                    A booster box: {box} packs in one go
                    {noBox.length > 0 && <>, though {andList(noBox.map((s) => s.name))} {noBox.length === 1 ? "was" : "were"} sold without one</>}. Check its price per pack
                    against the bundle’s before you assume the box is cheaper.
                  </>
                ),
              },
              {
                when: "You’re starting to play, or buying a gift",
                then: (
                  <>
                    An Elite Trainer Box: {etb} packs plus sleeves, energy cards, dice, condition markers and a storage box. The{" "}
                    <Link href={guideHref(r, "whats-in-a-pokemon-elite-trainer-box")}>ETB guide</Link> lists what’s inside.
                  </>
                ),
              },
              {
                when: "You want to try a set without a big spend",
                then: <>A booster bundle: {bundle} packs, the fewest of the three and the smallest outlay.</>,
              },
              {
                when: "You’ll play the set’s Prerelease",
                then: (
                  <>
                    A Build & Battle Box: {bb} packs and a deck to build them into. The <Link href={guideHref(r, "pokemon-build-and-battle-box")}>Build & Battle guide</Link>{" "}
                    compares it with the bundle and the ETB.
                  </>
                ),
              },
              {
                when: "You want a bit of every set",
                then: <>A bundle or an ETB of each set costs far less than a box of each, and the ranking above shows which sets are cheapest to start with today.</>,
              },
              {
                when: "Price per pack matters most",
                then: (
                  <>
                    Use the ranking above, then the <Link href={guideHref(r, "booster-box-vs-etb-vs-booster-bundle")}>box, ETB and bundle comparison</Link> for how the three
                    differ.
                  </>
                ),
              },
            ]}
          />
        </>
      ),
    },
    next
      ? {
          id: "next-set",
          title: `Pre-ordering ${next.name}`,
          body: (
            <>
              <Prose>
                <p>
                  <strong>{next.name}</strong> is the next {SERIES} set: it releases on {formatRelease(next.releaseDate)},{" "}
                  {plural(daysBetween(data.today, next.releaseDate), "day")} from today.{" "}
                  {nextLines.length > 0 ? (
                    <>
                      In {r.inName}, its {andList(nextLines.map((p) => inline(p.productType)))} {nextLines.length === 1 ? "is" : "are"} open for pre-order right now
                      {nextBest && <>, the cheapest pack at {money(nextBest.perPack, r.market)} in the {inline(nextBest.p.productType)}</>}.
                    </>
                  ) : (
                    <>No store in {r.inName} has its booster box, Elite Trainer Box or bundle open for pre-order right now. Stores open pre-orders at different times, so check its set page again closer to release.</>
                  )}
                </p>
                <p>
                  A pre-order is a promise to ship on or around release day. Before you pay, check when the store charges you (now or at dispatch), whether you can cancel,
                  and what it says about allocation: a store that gets fewer boxes than it sold may cancel part of an order. Compare its pre-order price with the other stores
                  on the set’s page, and with the same product of the sets already out, in the tables above.
                </p>
                {upcoming.length > 1 && (
                  <p>
                    After {next.name}, {andList(upcoming.slice(1).map((s) => `${s.name} (${formatRelease(s.releaseDate)})`))} {upcoming.length === 2 ? "is" : "are"} announced too.
                  </p>
                )}
              </Prose>
              <NextLinks
                links={[
                  ...(nextPre ? [{ href: nextPre, label: `${next.name} pre-order prices`, icon: "tag" as const }] : []),
                  { href: setHref(r, next), label: `All ${next.name} products`, icon: "calendar" },
                  { href: guideHref(r, "how-to-preorder-pokemon-tcg"), label: "How to pre-order", icon: "arrow-right" },
                ]}
              />
            </>
          ),
        }
      : {
          id: "next-set",
          title: "The next Mega Evolution set",
          body: (
            <>
              <Prose>
                <p>
                  Every announced {SERIES} set is out{newest && <>: the newest is {newest.name}, released {formatRelease(newest.releaseDate)}</>}. When the next one is
                  announced, it appears here with its release date and, once stores open them, its pre-order prices.
                </p>
                <p>
                  When pre-orders do open, check when the store charges you, whether you can cancel, and what it says about allocation, and compare its price with the other
                  stores on the set’s page before you pay.
                </p>
              </Prose>
              <NextLinks links={[{ href: guideHref(r, "how-to-preorder-pokemon-tcg"), label: "How to pre-order", icon: "arrow-right" }]} />
            </>
          ),
        },
    {
      id: "older-sets",
      title: "Checks before buying an older Mega Evolution set",
      body: (
        <>
          <Prose>
            <p>
              The earlier sets in the series are still sold, but an older set can be in stock at fewer stores than a new one, and you may be offered one by a marketplace
              or a private seller rather than a store. A few checks keep you from paying too much or getting something that isn’t what it says.
            </p>
          </Prose>
          <Checklist
            items={[
              <>Check the exact product: a Pokémon Center Elite Trainer Box{pcEtb != null && <> ({pcEtb} packs)</>} and the retail ETB{etb != null && <> ({etb} packs)</>} are different products, and so are a booster box and a booster bundle.</>,
              <>Check that a set sold without a booster box isn’t being sold as one: {noBox.length > 0 ? andList(noBox.map((s) => s.name), "or") : "a store-made lot"} in a “box” is loose packs, not a sealed display.</>,
              <>Check the price against today’s stores: the set pages and the tables above show what the same product costs in stock right now.</>,
              <>Check the delivery cost and the returns policy: our prices exclude shipping, and an old set from a far-away seller can cost more than it looks.</>,
              <>Check the shrink-wrap and the seals when it arrives, and keep the packaging until you’re happy with it.</>,
              <>Check a price far below every store’s twice: it can be an honest bargain, or a reseal.</>,
            ]}
          />
          <NextLinks links={[{ href: guideHref(r, "how-to-avoid-resealed-pokemon-products"), label: "How to avoid resealed product", icon: "arrow-right" }]} />
        </>
      ),
    },
    {
      id: "tools",
      title: "Checking a price or a trade",
      body: (
        <>
          <Prose>
            <p>
              Offered a {SERIES} box by a friend, at a local shop or on a marketplace? Search the product in the <strong>value checker</strong>. It shows the cheapest
              price at a store that has it in stock in {r.inName} today, the median of those stores, and the price per pack. Type in the price you were offered, and it
              tells you whether that’s under the cheapest store, between the cheapest and the median, or above what most stores ask.
            </p>
            <p>
              Swapping sealed product for cards, or one set’s ETB for another’s? The <strong>trade calculator</strong> adds up both sides. Use the value checker’s
              cheapest in-stock price as the value of each sealed product, so both of you are working from the same numbers, and the calculator shows the gap in{" "}
              {r.currency} and as a percentage.
            </p>
          </Prose>
          <NextLinks
            links={[
              { href: `/${r.region}/tools/value-checker`, label: "Value checker", icon: "search" },
              { href: `/${r.region}/tools/trade-calculator`, label: "Trade calculator", icon: "arrow-right" },
            ]}
          />
          <Note>
            Both tools report what stores ask today. Neither says what a product will be worth later, and nor does this guide: prices change as stores sell through and new stock
            arrives.
          </Note>
        </>
      ),
    },
    whereToBuy(r, {
      tcg: { query: "Mega Evolution", label: "Mega Evolution sealed" },
      links: [
        { href: typeHref(r, "booster-box"), label: "Booster boxes" },
        { href: typeHref(r, "etb"), label: "Elite Trainer Boxes" },
        { href: guideHref(r, "pokemon-chaos-rising-vs-perfect-order"), label: "Chaos Rising vs Perfect Order" },
      ],
    }),
  ];

  return {
    intro: (
      <Lede>
        {cheapest ? (
          <>
            Today in {r.inName}, the cheapest pack in a {SERIES} booster box, Elite Trainer Box or bundle costs <strong>{money(cheapest.perPack, r.market)}</strong>, in{" "}
            {cheapest.set.name}’s {inline(cheapest.p.productType)} at {money(cheapest.p.lowestPriceCents, r.market)}.{" "}
          </>
        ) : (
          <>No {SERIES} booster box, Elite Trainer Box or bundle is in stock in {r.inName} right now. </>
        )}
        Below is every set in the series, released and upcoming, with the cheapest of
        each product at {storesPhrase(r)} and what it works out to per pack.
      </Lede>
    ),
    sections,
  };
}

/** Released sets with a priced pack today, cheapest pack first. */
function rankSets(released: readonly PokemonSet[], data: GuideData): { set: PokemonSet; p: ProductCardData; perPack: number }[] {
  return released
    .map((set) => ({ set, best: bestPack(data.bySet[set.code]) }))
    .filter((x): x is { set: PokemonSet; best: { p: ProductCardData; perPack: number } } => !!x.best)
    .map(({ set, best }) => ({ set, ...best }))
    .sort((a, b) => a.perPack - b.perPack);
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
