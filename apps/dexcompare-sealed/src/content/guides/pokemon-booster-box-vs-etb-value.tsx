// Guide: booster box vs Elite Trainer Box, value per pack, set by set. The other comparison guide (booster-box-vs-etb-vs-booster-bundle)
// says what each product holds; this one does the sum for the eight newest released sets sold with a booster box: the cheapest open box
// and ETB of each in the region today, the price per pack of each (packs.ts), the gap between them, and what the ETB costs over its own
// packs bought at the box's price per pack: the price of its extras, which only the reader can weigh. Both numbers are printed only when
// both products are in stock. The extras are named in type-about.ts's words; in the US, the same sum at MSRP (rrp.ts, with RRP_NOTE).
import Link from "next/link";
import type { ProductCardData } from "@/lib/data";
import { money, plural } from "@/lib/format";
import { packsFor, packsForLabel, perPackCents } from "@/lib/packs";
import type { RegionInfo } from "@/lib/regions";
import { usMsrpCents } from "@/lib/rrp";
import type { PokemonSet } from "@/lib/sets";
import { TYPE_ABOUT } from "@/lib/type-about";
import { toolHref } from "../tools";
import type { GuideData } from "./data";
import { fixedPacks, msrpTables, packsBySeries, regularSet, seriesPhrase } from "./facts";
import { GUIDE_BY_SLUG } from "./index";
import {
  Checklist,
  Decisions,
  GuideBody,
  guideHref,
  Lede,
  LiveBlock,
  linesFor,
  MsrpNote,
  Note,
  PACK_SOURCE,
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
} from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("pokemon-booster-box-vs-etb-value")!;

const BOX = "Booster Box";
const ETB = "Elite Trainer Box";

/** One set's sums: its cheapest open box and ETB today, each per pack, the gap, and what the ETB costs over its packs at the box's rate. */
export interface SetSums {
  set: PokemonSet;
  box: ProductCardData | null;
  etb: ProductCardData | null;
  boxPacks: number | null;
  etbPacks: number | null;
  boxPP: number | null;
  etbPP: number | null;
  /** ETB per pack minus box per pack (cents), when both are in stock. */
  gap: number | null;
  /** The ETB's price minus its packs at the box's price per pack (cents), when both are in stock: what its extras cost. */
  extras: number | null;
}

export function sumsFor(set: PokemonSet, products: readonly ProductCardData[] | undefined): SetSums {
  const box = (products ?? []).find((p) => p.productType === BOX && p.lowestPriceCents) ?? null;
  const etb = (products ?? []).find((p) => p.productType === ETB && p.lowestPriceCents) ?? null;
  const boxPacks = packsForLabel(BOX, set.code);
  const etbPacks = packsForLabel(ETB, set.code, etb?.name ?? "");
  const boxPP = box ? perPackCents(box.lowestPriceCents, boxPacks) : null;
  const etbPP = etb ? perPackCents(etb.lowestPriceCents, etbPacks) : null;
  const both = box && etb && boxPacks && etbPacks && boxPP != null && etbPP != null;
  return {
    set,
    box,
    etb,
    boxPacks,
    etbPacks,
    boxPP,
    etbPP,
    gap: both ? etbPP - boxPP : null,
    extras: both ? etb.lowestPriceCents! - Math.round((box.lowestPriceCents! * etbPacks) / boxPacks) : null,
  };
}

/** One sentence per set, from today's numbers only. */
export function sumsVerdict(s: SetSums, r: RegionInfo): string {
  const m = (c: number) => money(c, r.market);
  if (s.extras != null && s.gap != null && s.boxPP != null && s.etbPP != null) {
    if (s.extras > 0)
      return `Right now a pack costs ${m(s.boxPP)} in the box and ${m(s.etbPP)} in the Elite Trainer Box, ${m(s.gap)} more. The ETB costs ${m(s.extras)} more than its ${s.etbPacks} packs would at the box’s price per pack: that is what its extras cost you.`;
    if (s.extras === 0) return `Right now the Elite Trainer Box costs exactly what its ${s.etbPacks} packs would at the box’s price per pack (${m(s.boxPP)}), so its extras cost you nothing more.`;
    return `Right now the Elite Trainer Box works out cheaper per pack than the box (${m(s.etbPP)} against ${m(s.boxPP)}): it costs ${m(-s.extras)} less than its ${s.etbPacks} packs would at the box’s rate, extras included.`;
  }
  if (s.boxPP != null) return `No ${s.set.name} Elite Trainer Box is in stock in ${r.inName} right now, so there is nothing to set against the box’s ${m(s.boxPP)} a pack.`;
  if (s.etbPP != null) return `No ${s.set.name} booster box is in stock in ${r.inName} right now, so there is nothing to set against the Elite Trainer Box’s ${m(s.etbPP)} a pack.`;
  return `Neither the booster box nor the Elite Trainer Box of ${s.set.name} is in stock in ${r.inName} right now.`;
}

/** The lede's one live sentence: in how many of the sets with both in stock a pack costs more in the ETB today. */
function lededCount(both: number, dearer: number, r: RegionInfo): string {
  if (both === 1) return dearer ? `In the one set with both in stock in ${r.inName} today, a pack costs more in the ETB.` : `In the one set with both in stock in ${r.inName} today, a pack costs no more in the ETB.`;
  if (dearer === both) return `In all ${both} sets with both in stock in ${r.inName} today, a pack costs more in the ETB.`;
  if (dearer === 0) return `In none of the ${both} sets with both in stock in ${r.inName} today does a pack cost more in the ETB.`;
  return `In ${dearer} of the ${both} sets with both in stock in ${r.inName} today, a pack costs more in the ETB.`;
}

/** The summary table's last cell. */
function extrasCell(s: SetSums, r: RegionInfo): string {
  if (s.extras == null) return "Not both in stock";
  if (s.extras > 0) return money(s.extras, r.market);
  return s.extras === 0 ? "Nothing more" : `Nothing (ETB ${money(-s.extras, r.market)} less)`;
}

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const sets = data.sets.map(setOf).filter((s): s is NonNullable<typeof s> => !!s);
  const sums = sets.map((s) => sumsFor(s, data.bySet[s.code]));
  const both = sums.filter((s) => s.extras != null);
  const dearer = both.filter((s) => s.extras! > 0);
  const lo = dearer.length ? dearer.reduce((a, b) => (b.extras! < a.extras! ? b : a)) : null;
  const hi = dearer.length ? dearer.reduce((a, b) => (b.extras! > a.extras! ? b : a)) : null;
  const ex = both[0] ?? null;
  const box = fixedPacks("booster-box") ?? 36;
  const [etbNow, etbBefore] = packsBySeries("etb");
  const newest = sets[0] ?? null;
  const pcPacks = newest ? packsFor("pc-etb", newest.code) : null;
  const etbsPerBox = etbNow && box % etbNow.packs === 0 ? box / etbNow.packs : null;
  const m = (c: number | null) => money(c, r.market);
  const tools = {
    value: toolHref(r.region, "value-checker"),
    trade: toolHref(r.region, "trade-calculator"),
    fees: toolHref(r.region, "selling-fee-calculator"),
  };

  const sections: GuideSection[] = [
    {
      id: "the-question",
      title: "The question this guide answers",
      body: (
        <Prose>
          <p>
            A <Link href={typeHref(r, "booster-box")}>booster box</Link> is packs and nothing else. An <Link href={typeHref(r, "etb")}>Elite Trainer Box</Link> is fewer
            packs plus a set of accessories. What each one holds is covered in{" "}
            <Link href={guideHref(r, "booster-box-vs-etb-vs-booster-bundle")}>booster box vs ETB vs booster bundle</Link>, and the ETB’s contents in detail in{" "}
            <Link href={guideHref(r, "whats-in-a-pokemon-elite-trainer-box")}>what’s in a Pokémon Elite Trainer Box</Link>. This guide asks something narrower.
          </p>
          <p>
            An ETB’s price covers its packs and its extras together, so comparing the two sticker prices tells you little. The useful question isn’t “which is
            cheaper?” but{" "}
            <strong>“how much am I paying for the ETB’s extras, and are they worth that to me?”</strong> Nobody else can answer the second half for you. Sleeves you’ll
            never use are worth nothing to you; sleeves you were about to buy anyway are worth what you’d have paid for them. What we can do is put a number on the first
            half, set by set, from the prices {r.adjective} stores{r.market === "US" ? " and TCGplayer" : ""} ask today.
          </p>
        </Prose>
      ),
    },
    {
      id: "the-sum",
      title: "How the sum works",
      body: (
        <>
          <Prose>
            <p>Three steps, all within one set, because packs from different sets are priced differently:</p>
            <ol>
              <li>
                <strong>The box’s price per pack.</strong> Divide the cheapest booster box in stock by its {box} packs.
              </li>
              <li>
                <strong>The ETB’s packs at that rate.</strong> Multiply that per-pack price by the ETB’s packs ({etbNow.packs} in {seriesPhrase(etbNow.series)} sets
                {etbBefore ? `, ${etbBefore.packs} in most earlier ones` : ""}).
              </li>
              <li>
                <strong>The difference.</strong> Take that away from the cheapest ETB in stock. What’s left is what the ETB charges you for everything that isn’t a
                pack.
              </li>
            </ol>
            {ex && ex.box && ex.etb && ex.boxPP != null && ex.etbPP != null && ex.extras != null ? (
              <p>
                Take <Link href={setHref(r, ex.set)}>{ex.set.name}</Link> in {r.inName} today. Its cheapest booster box is {m(ex.box.lowestPriceCents)}, which is{" "}
                {m(ex.boxPP)} a pack. At that rate, {ex.etbPacks} packs come to {m(Math.round((ex.box.lowestPriceCents! * ex.etbPacks!) / ex.boxPacks!))}. Its cheapest
                Elite Trainer Box is {m(ex.etb.lowestPriceCents)}, or {m(ex.etbPP)} a pack.{" "}
                {ex.extras > 0 ? (
                  <>
                    So the ETB costs <strong>{m(ex.extras)}</strong> more than the same number of packs bought at the box’s rate. That {m(ex.extras)} is the price of its
                    accessories and promo, as stores have it today.
                  </>
                ) : (
                  <>So today the ETB costs no more than the same packs bought at the box’s rate, and its accessories cost you nothing extra.</>
                )}
              </p>
            ) : (
              <p>
                When a set has both a box and an ETB in stock in {r.inName}, the tables below do this sum with today’s prices. Right now none of the sets below has both
                in stock, so there is no figure to show.
              </p>
            )}
            <p>
              The figure isn’t a judgement of the ETB. It’s the price tag on its extras, so you can hold it up against what those extras are worth to you.
            </p>
          </Prose>
          <p className="text-xs leading-5 text-muted">{PACK_SOURCE}</p>
        </>
      ),
    },
    {
      id: "extras-by-set",
      title: "What the ETB’s extras cost, set by set",
      live: true,
      body: (
        <>
          <Prose>
            <p>
              For the {sets.length} newest sets sold with a booster box, the cheapest box and ETB in stock in {r.inName} right now, per pack, and what the ETB costs over
              its packs at the box’s rate. A set shows a figure only when both are in stock.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {sets.length ? (
              <StackTable
                caption={`Booster box and Elite Trainer Box per pack in ${r.inName} today, and what the ETB’s extras cost, by set`}
                head={["Set", "Box per pack", "ETB per pack", "ETB extras cost"]}
                rows={sums.map((s) => ({
                  key: s.set.code,
                  th: (
                    <Link href={setHref(r, s.set)} prefetch={false} className="font-semibold text-ink hover:text-brand hover:underline">
                      {s.set.name}
                    </Link>
                  ),
                  cells: [
                    <span key="b">{s.boxPP != null ? m(s.boxPP) : "—"}</span>,
                    <span key="e">{s.etbPP != null ? m(s.etbPP) : "—"}</span>,
                    <span key="x" className={s.extras == null ? "text-faint" : "font-semibold"}>
                      {extrasCell(s, r)}
                    </span>,
                  ],
                }))}
              />
            ) : (
              <p className="text-[15px] leading-6 text-muted">No set to compare right now.</p>
            )}
          </LiveBlock>
          <Prose>
            {both.length === 0 ? (
              <p>
                Right now none of these sets has both a booster box and an Elite Trainer Box in stock in {r.inName}, so there is no extras figure to compare. Stock
                changes as stores refill: each set’s page shows what is open today.
              </p>
            ) : (
              <p>
                {both.length === 1 ? "One set has" : `${both.length} of the ${sets.length} sets have`} both in stock today.{" "}
                {dearer.length === 0 ? (
                  <>In every one of them the ETB costs no more per pack than the box, so its extras come at no cost over the packs.</>
                ) : lo && hi && lo !== hi ? (
                  <>
                    Where the ETB costs more per pack, its extras cost you between <strong>{m(lo.extras)}</strong> ({lo.set.name}) and{" "}
                    <strong>{m(hi.extras)}</strong> ({hi.set.name}).
                  </>
                ) : (
                  <>
                    {dearer.length === 1 ? "Where the ETB costs more per pack" : "In each"}, its extras cost you <strong>{m(dearer[0].extras)}</strong>.
                  </>
                )}{" "}
                {dearer.length > 0 && dearer.length < both.length && (
                  <>In {plural(both.length - dearer.length, "set")}, the ETB is no dearer per pack than the box at all, so its extras cost nothing more.</>
                )}{" "}
                The figure moves with each store’s price, which is why it’s worked out from today’s listings rather than printed once.
              </p>
            )}
          </Prose>
        </>
      ),
    },
    {
      id: "set-by-set",
      title: "The two products side by side",
      live: true,
      body: (
        <>
          <Prose>
            <p>
              Here are the products behind those numbers: the cheapest open booster box and Elite Trainer Box of each set, with where they’re in stock. Open a product to
              see every store’s price for it.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {sums.map((s) => (
              <SetGroup key={s.set.code} title={<SetTitle r={r} set={s.set} today={data.today} />}>
                <p className="mb-2 text-[15px] leading-6 text-ink/90">{sumsVerdict(s, r)}</p>
                <PriceTable r={r} caption={`${s.set.name}: booster box and Elite Trainer Box in ${r.inName} today, with the price per pack`} lines={linesFor(data.bySet[s.set.code], [BOX, ETB], s.set)} />
              </SetGroup>
            ))}
            {!sums.length && <p className="text-[15px] leading-6 text-muted">No set to show right now.</p>}
          </LiveBlock>
          <p className="text-xs leading-5 text-muted">
            Each store’s listed price, excluding shipping. Delivery can change the sums, especially when the box and the ETB come from different stores.{" "}
            <Link href={`/${r.region}/cheapest-packs`} prefetch={false} className="font-semibold text-brand hover:underline">
              Every set, by price per pack →
            </Link>
          </p>
        </>
      ),
    },
    {
      id: "what-are-the-extras-worth",
      title: "What are the extras worth to you?",
      body: (
        <>
          <Prose>
            <p>
              Here’s what you get for that figure, in our product notes’ words: “{TYPE_ABOUT["elite-trainer-boxes"]}” The box gets none of it. Go through the list and
              be honest about which parts you’d use.
            </p>
          </Prose>
          <Checklist
            items={[
              <>
                <strong>Sleeves.</strong> If you play and need a fresh set, they’re worth what you’d otherwise pay for sleeves. If you already sleeve with your own, or
                don’t play, count them as nothing.
              </>,
              <>
                <strong>Energy cards, dice and condition markers.</strong> Handy for a new player. If you already have plenty, they add little.
              </>,
              <>
                <strong>The storage box.</strong> Useful if you need somewhere to keep a deck or a set’s cards. If you have shelves of them, it’s just packaging.
              </>,
              <>
                <strong>The promo card.</strong> Usually set-exclusive, and only in the ETB. If you want it, check what the card itself sells for:{" "}
                <Link href={guideHref(r, "how-to-check-pokemon-card-value")}>how to check a Pokémon card’s value</Link> shows how.
              </>,
              <>
                <strong>The box as a gift.</strong> An ETB looks like a present in a way a stack of packs doesn’t. That has a value, and only you can set it.
              </>,
            ]}
          />
          <Prose>
            <p>
              Add up what the parts you’d use are worth to you, and set it against the extras figure for your set. If your total is higher, the ETB is the better buy for
              you. If it’s lower, the box gets you the same packs for less.
            </p>
            <p>
              Planning to sell or swap the parts you won’t use? The <Link href={tools.fees}>selling fee calculator</Link> shows what a sale of the promo card would leave
              you after eBay’s fees and postage, and the <Link href={tools.trade}>trade calculator</Link> adds up both sides if you trade it instead. Neither guesses a
              price: you bring the numbers.
            </p>
          </Prose>
        </>
      ),
    },
    {
      id: "more-than-one",
      title: "Buying more than one ETB",
      body: (
        <Prose>
          <p>
            The extras figure is per ETB, so it multiplies.
            {etbsPerBox ? (
              <>
                {" "}
                In {seriesPhrase(etbNow.series)} sets, {etbsPerBox} Elite Trainer Boxes hold the same {box} packs as one booster box ({box} ÷ {etbNow.packs}). Buy{" "}
                {etbsPerBox} instead of a box and you pay for {etbsPerBox} sets of sleeves, dice and storage boxes
                {hi && hi.extras != null ? (
                  <>
                    : at today’s {m(hi.extras)} in {hi.set.name}, that’s {m(hi.extras * etbsPerBox)} over the box
                  </>
                ) : null}
                . You also get {etbsPerBox} of whatever promo the ETB carries, which may be the point for you.
              </>
            ) : (
              <> Several ETBs instead of a box means paying for several sets of accessories.</>
            )}
          </p>
          <p>
            Going the other way, if you want more packs than an ETB holds but not a whole box, a <Link href={typeHref(r, "booster-bundle")}>booster bundle</Link> (
            {fixedPacks("booster-bundle")} packs, no accessories) is the other product to price.{" "}
            <Link href={guideHref(r, "are-pokemon-booster-boxes-worth-it")}>Are Pokémon booster boxes worth it?</Link> sets the box against bundles and single packs, and{" "}
            <Link href={guideHref(r, "cheapest-way-to-buy-pokemon-packs")}>the cheapest way to buy Pokémon packs</Link> ranks every product type by price per pack.
          </p>
          {pcPacks != null && (
            <p>
              A <Link href={typeHref(r, "pc-etb")}>Pokémon Center Elite Trainer Box</Link> holds {pcPacks} packs in {newest?.series} sets, more than the retail ETB, with
              a stamped promo. The same sum works for it: price its packs at the box’s rate and see what’s left.{" "}
              <Link href={guideHref(r, "pokemon-center-etb-vs-elite-trainer-box")}>Pokémon Center ETB vs Elite Trainer Box</Link> compares the two.
            </p>
          )}
        </Prose>
      ),
    },
  ];

  if (r.market === "US") {
    const [table] = msrpTables();
    const ref = table ? regularSet(table.series[0]) : null;
    const boxM = ref ? usMsrpCents("booster-box", ref.code) : null;
    const etbM = ref ? usMsrpCents("etb", ref.code) : null;
    const etbP = ref ? packsFor("etb", ref.code) : null;
    if (table && boxM != null && etbM != null && etbP) {
      const boxPPM = perPackCents(boxM, box)!;
      const extrasM = etbM - Math.round((boxM * etbP) / box);
      sections.push({
        id: "msrp",
        title: "The same sum at US MSRP",
        body: (
          <>
            <Prose>
              <p>
                In the US, The Pokémon Company International publishes list prices for {seriesPhrase(table.series)} products. At MSRP a booster box is{" "}
                {money(boxM, "US")}, or {money(boxPPM, "US")} a pack, and an Elite Trainer Box is {money(etbM, "US")} for {etbP} packs, or{" "}
                {money(perPackCents(etbM, etbP), "US")} a pack. So at list price the ETB’s extras cost <strong>{money(extrasM, "US")}</strong> over its packs. Stores set
                their own prices, which is why the table above, from today’s listings, can show a different figure for each set.
              </p>
            </Prose>
            <MsrpNote />
          </>
        ),
      });
    }
  }

  sections.push(
    {
      id: "decide",
      title: "How to decide",
      body: (
        <>
          <Decisions
            rows={[
              {
                when: "You only want the packs",
                then: <>A booster box. In any set where the ETB’s extras cost something in the table above, the box gets you the same packs for less.</>,
              },
              {
                when: "You’ll use the sleeves, dice and storage box",
                then: <>Add up what you’d pay for them separately and compare it with your set’s extras figure. If yours is higher, take the ETB.</>,
              },
              {
                when: "You want the promo card",
                then: (
                  <>
                    It comes in the ETB, not the box. Check what the card sells for on its own, then see whether it covers the extras figure.
                  </>
                ),
              },
              {
                when: "You’re buying a gift or a first product",
                then: <>An ETB: the packs come with sleeves, dice, markers and a box to keep it all in, and the extras figure is what that costs over the packs.</>,
              },
              {
                when: "Someone quoted you a price",
                then: (
                  <>
                    Check it against what stores ask today with the <Link href={tools.value}>value checker</Link>, which shows the cheapest in-stock price, the median and
                    the price per pack.
                  </>
                ),
              },
            ]}
          />
          <Note>
            The cards inside any pack are random, in a box or an ETB alike, and neither product promises a particular card. This guide compares what you pay, not what
            you might open.
          </Note>
        </>
      ),
    },
    {
      id: "the-sets",
      title: "The sets in this guide",
      body: (
        <>
          <Prose>
            <p>
              These are the {plural(sets.length, "newest set")} sold with a booster box. Each set’s page lists every product of it with every {r.adjective} store’s price
              today, so you can check the box and the ETB from more than one store, and see the set’s other products too.
            </p>
          </Prose>
          <SetChips r={r} listed={data.listedSets} sets={sets} />
          <Prose>
            <p>
              Sets sold without a booster box aren’t here, because there’s no box to compare with: they’re listed in{" "}
              <Link href={`${guideHref(r, "booster-box-vs-etb-vs-booster-bundle")}#no-booster-box`}>booster box vs ETB vs booster bundle</Link>.
            </p>
          </Prose>
        </>
      ),
    },
    whereToBuy(r, {
      tcg: { query: "Elite Trainer Box", label: "Pokémon Elite Trainer Boxes" },
      links: [
        { href: typeHref(r, "etb"), label: "Elite Trainer Boxes" },
        { href: typeHref(r, "booster-box"), label: "Booster boxes" },
        { href: tools.value, label: "Value checker" },
      ],
    }),
  );

  return {
    intro: (
      <Lede>
        An Elite Trainer Box’s price pays for its packs and for its sleeves, dice, storage box and, usually, a promo card, all in one. A booster box is packs alone. So the fair question
        is how much the ETB charges for the extras.{" "}
        {both.length ? (
          <>
            {lededCount(both.length, dearer.length, r)}{" "}
          </>
        ) : null}
        Here’s that figure for the {plural(sets.length, "newest set")} with a booster box, from {r.adjective} prices today, so you can decide whether the extras are
        worth it to you.
      </Lede>
    ),
    sections,
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
