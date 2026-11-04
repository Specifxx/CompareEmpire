// Guide: the Mega Evolution year (2026-11-04). The English release calendar as a trajectory: how many main sets a year the publisher has
// shipped since Sword & Shield (sets.ts, counted), what 2026's seven Mega Evolution sets were and when, the cheapest box, ETB and bundle of
// each in the region today (calendarProducts), and what is dated next (upcomingSets). The history is of RELEASES, never of prices:
// DexCompare keeps no price history, so nothing here says a price moved, and nothing forecasts one.
import Link from "next/link";
import { CALENDAR_TYPES } from "@/lib/data";
import { money, plural } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { SETS, type PokemonSet } from "@/lib/sets";
import { toolHref } from "../tools";
import type { GuideData } from "./data";
import { upcomingSets } from "./facts";
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
  Prose,
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

const GUIDE = GUIDE_BY_SLUG.get("pokemon-tcg-2026-in-sets")!;

/** The year's Mega Evolution sets, oldest first: the guide's spine (data.ts reads the same codes). */
export const YEAR_CODES = ["me2pt5", "me3", "me4", "me5", "cel30", "me6"] as const;

/** Sets released in a calendar year, by series, oldest first. */
export function setsInYear(year: number): PokemonSet[] {
  return SETS.filter((s) => s.releaseDate.startsWith(`${year}-`)).sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
}

/** How many English sets the publisher dated in each year: the cadence the calendar shows. */
export function cadence(from: number, to: number): { year: number; count: number; names: string[] }[] {
  const out: { year: number; count: number; names: string[] }[] = [];
  for (let y = from; y <= to; y++) {
    const sets = setsInYear(y);
    out.push({ year: y, count: sets.length, names: sets.map((s) => s.name) });
  }
  return out;
}

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const today = data.today;
  const year = YEAR_CODES.map(setOf).filter((s): s is PokemonSet => !!s);
  const released = year.filter((s) => s.releaseDate <= today);
  const pending = year.filter((s) => s.releaseDate > today);
  const next = upcomingSets(today).filter((s) => !YEAR_CODES.includes(s.code as (typeof YEAR_CODES)[number]));
  const years = cadence(2020, 2026);
  const m = (c: number | null | undefined) => money(c ?? null, r.market);
  const lines = (s: PokemonSet) => linesFor(data.bySet[s.code], CALENDAR_TYPES, s, s.releaseDate > today);
  const boxes = year.map((s) => ({ s, box: lines(s).find((l) => l.label === "Booster Box")?.p ?? null }));
  const priced = boxes.flatMap((b) => (b.box && b.box.lowestPriceCents != null ? [{ s: b.s, box: b.box, cents: b.box.lowestPriceCents }] : []));
  const cheapestBox = priced.length ? priced.reduce((a, b) => (b.cents < a.cents ? b : a)) : null;
  const dearestBox = priced.length ? priced.reduce((a, b) => (b.cents > a.cents ? b : a)) : null;

  const sections: GuideSection[] = [
    {
      id: "cadence",
      title: "Seven years of release dates",
      body: (
        <>
          <Prose>
            <p>
              The English Pokémon TCG runs on a calendar the publisher has kept remarkably steady. Count the sets DexCompare groups sealed product under (main sets, the
              &ldquo;.5&rdquo; special sets and the anniversary sets; not promos or galleries) and the shape is the same every year since Sword &amp; Shield: four main sets
              roughly a quarter apart, with one or two special sets between them.
            </p>
          </Prose>
          <StackTable
            caption="English sets with sealed product of their own, by calendar year (sets.ts: the sets this site groups product under)"
            head={["Year", "Sets", "Which"]}
            align="left"
            rows={years.map((y) => ({ key: String(y.year), th: String(y.year), cells: [String(y.count), y.names.join(", ")] }))}
          />
          <Prose>
            <p>
              Two things changed inside that steady count. The special sets got bigger: Celebrations (2021) was a 25-card birthday set, Prismatic Evolutions (2025) and 30th
              Celebration (2026) are full product lines with their own Elite Trainer Boxes, bundles and collections, and the dual sets Black Bolt and White Flare (July 2025)
              were two sets on one day. And the series turned over: Scarlet &amp; Violet ran from March 2023 to July 2025, eleven sets in 28 months, and Mega Evolution began
              in September 2025 at the same pace. The release calendar on this site lists every dated set, so the pattern above is simply what it records.
            </p>
          </Prose>
        </>
      ),
    },
    {
      id: "the-year",
      title: "2026, set by set",
      live: true,
      body: (
        <>
          <Prose>
            <p>
              {plural(released.length, "Mega Evolution set")} released in 2026 so far
              {pending.length ? <>, and {pending.map((s) => s.name).join(" and ")} {pending.length === 1 ? "is" : "are"} dated for the weeks ahead</> : null}. For each, its
              release date and the cheapest booster box, Elite Trainer Box and booster bundle {r.adjective} stores have {pending.length ? "in stock or open for pre-order" : "in stock"} today, with the price per pack.
              {cheapestBox && dearestBox && cheapestBox.s.code !== dearestBox.s.code && (
                <>
                  {" "}
                  Right now the cheapest box of the year is {cheapestBox.s.name}&rsquo;s at {m(cheapestBox.cents)} and the dearest is {dearestBox.s.name}&rsquo;s at{" "}
                  {m(dearestBox.cents)}: a comparison of two prices today, not of how either got there.
                </>
              )}
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {year.map((s) => {
              const l = lines(s);
              const upcoming = s.releaseDate > today;
              const floor = cheapestPerPack(l);
              return (
                <SetGroup key={s.code} title={<SetTitle r={r} set={s} today={today} extra={upcoming ? <> · Pre-order</> : undefined} />}>
                  {l.some((x) => x.p) ? (
                    <PriceTable r={r} caption={`${s.name} in ${r.inName} today: the cheapest booster box, Elite Trainer Box and booster bundle`} lines={l} whereHead={upcoming ? "Open at" : "In stock at"} />
                  ) : (
                    <p className="mb-2 text-[15px] leading-6 text-ink/90">
                      None of {s.name}&rsquo;s booster box, Elite Trainer Box or booster bundle is {upcoming ? "open for pre-order" : "in stock"} at a store we compare in {r.inName} today.
                    </p>
                  )}
                  {floor != null && (
                    <p className="mt-2 text-sm text-ink/80">
                      Cheapest per pack today: {m(floor)}. <Link className="font-semibold text-brand hover:underline" href={setHref(r, s)}>Every {s.name} product</Link>.
                    </p>
                  )}
                </SetGroup>
              );
            })}
          </LiveBlock>
          <Note>
            {`Prices are the cheapest in-stock (or open pre-order) price at the stores DexCompare compares in ${r.inName}, in ${r.currency}, before shipping. Pack counts are from the publisher's product listings, as recorded in our data.`}
          </Note>
        </>
      ),
    },
    {
      id: "what-the-year-showed",
      title: "What the year showed",
      body: (
        <Prose>
          <p>
            <strong>Mega Evolution is a full series, not a victory lap.</strong> Ascended Heroes in January was the series&rsquo; first &ldquo;.5&rdquo; set, then Perfect Order,
            Chaos Rising and Pitch Black came at the usual two-month spacing, with Delta Reign closing the year on {formatRelease(setOf("me6")!.releaseDate)}. That is the same
            cadence Scarlet &amp; Violet kept, which matters if you buy sealed: a main set is on shelves for about eight weeks before the next one takes the spotlight.
          </p>
          <p>
            <strong>The anniversary set is the year&rsquo;s odd one out.</strong> 30th Celebration ({formatRelease(setOf("cel30")!.releaseDate)}) has no 36-pack booster box, as
            Celebrations had none in 2021: it is sold as Elite Trainer Boxes, bundles and collections. Its table above shows what that means for price per pack, which is the
            only number that lets you compare it with a set that does have a box. Our <Link href={guideHref(r, "30th-celebration-chase-cards")}>30th Celebration guide</Link>{" "}
            lists its announced cards.
          </p>
          <p>
            <strong>Every set gets the same three headline products.</strong> Box, Elite Trainer Box, booster bundle, with the same pack counts set after set. That is why price
            per pack is the one figure to compare across the year, and why the <Link href={toolHref(r.region, "value-checker")}>value checker</Link> works for any of them.
          </p>
          <p>
            <strong>Pre-orders open earlier each cycle.</strong> By the time a set releases, {r.adjective} stores have usually listed the next one. Delta Reign&rsquo;s box
            was open to order at several stores a month out; the <Link href={guideHref(r, "how-to-preorder-pokemon-tcg")}>pre-order guide</Link> covers what to check before
            paying for a product that has not shipped.
          </p>
        </Prose>
      ),
    },
    {
      id: "whats-next",
      title: "What is dated next",
      body: (
        <>
          <Prose>
            {next.length ? (
              <p>
                After Delta Reign, the publisher has dated {next.length === 1 ? "one set" : plural(next.length, "set")}:{" "}
                {next.map((s, i) => (
                  <span key={s.code}>
                    {i ? (i === next.length - 1 ? " and " : ", ") : ""}
                    <Link className="font-semibold text-brand hover:underline" href={setHref(r, s)}>{s.name}</Link> on {formatRelease(s.releaseDate)}
                  </span>
                ))}
                . If the calendar above holds, and it has every year since 2020, expect a main set about every two months through 2027 and a special set in the gaps, with the
                next one&rsquo;s pre-orders opening at {r.adjective} stores roughly a month before its date.
              </p>
            ) : (
              <p>The publisher has not dated the next English set yet. The release calendar updates as soon as a store lists one.</p>
            )}
            <p>
              What we will not tell you is where prices go. DexCompare reads each store&rsquo;s price today and keeps no history, so the honest answer to &ldquo;will this box
              be cheaper after release?&rdquo; is that it depends on how much stock stores receive and how quickly it sells, which no one can see in advance. What you can do is
              compare today&rsquo;s price per pack across the year&rsquo;s sets above, check a product&rsquo;s page for every store&rsquo;s price, and set a price alert for the
              one you want.
            </p>
          </Prose>
          <NextLinks
            links={[
              { href: `/${r.region}/releases`, label: "Release calendar", icon: "calendar" },
              { href: typeHref(r, "booster-box"), label: `Booster boxes in ${r.inName}`, icon: "tag" },
              { href: guideHref(r, "pokemon-tcg-market-wrap"), label: "This week's market wrap", icon: "arrow-right" },
              { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
            ]}
          />
        </>
      ),
    },
    whereToBuy(r, {
      tcg: { query: "Pokemon Mega Evolution", label: "Mega Evolution sealed" },
      links: [
        { href: guideHref(r, "pokemon-mega-evolution-sealed-price-guide"), label: "Mega Evolution price guide" },
        { href: guideHref(r, "delta-reign-booster-box-price"), label: "Delta Reign booster box price" },
      ],
    }),
  ];

  return {
    intro: (
      <Lede>
        2026 was the Mega Evolution year: {plural(year.length, "set")} from Ascended Heroes in January to Delta Reign in November, on the same two-month cadence the English game
        has kept since 2020. Here is the year as the release calendar records it, what each set&rsquo;s box, Elite Trainer Box and bundle cost in {r.inName} today, and what the
        publisher has dated next.
      </Lede>
    ),
    sections,
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
