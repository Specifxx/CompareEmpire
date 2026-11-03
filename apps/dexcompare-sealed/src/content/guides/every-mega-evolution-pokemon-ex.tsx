// Guide: every Mega Evolution Pokémon ex so far (2026-11-03). The cards come only from REVEALS (set-reveal.tsx), each set's line sourced
// there, so a correction there corrects this page; the sets, their order and dates from sets.ts. Prices: every Mega Evolution set's
// cheapest open box, ETB and bundle (calendarProducts, as the Mega Evolution price guide, data.ts).
import Link from "next/link";
import { CALENDAR_TYPES } from "@/lib/data";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { SETS } from "@/lib/sets";
import { toolHref } from "../tools";
import type { GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import {
  GuideBody,
  guideHref,
  Lede,
  LiveBlock,
  linesFor,
  NextLinks,
  Note,
  PACK_SOURCE,
  PriceTable,
  Prose,
  SetGroup,
  SetTitle,
  setHref,
  StackTable,
  typeHref,
  whereToBuy,
  type BodyProps,
  type GuideOutline,
} from "./kit";
import { REVEALS } from "./set-reveal";

const GUIDE = GUIDE_BY_SLUG.get("every-mega-evolution-pokemon-ex")!;

/** Each set's own guide, where it has one. */
const SET_GUIDE: Record<string, string> = {
  me1: "mega-evolution-chase-cards",
  me2: "phantasmal-flames-chase-cards",
  me2pt5: "ascended-heroes-chase-cards",
  me3: "perfect-order-chase-cards",
  me4: "chaos-rising-chase-cards",
  me5: "pitch-black-chase-cards",
  me6: "delta-reign-chase-cards",
  me7: "flowing-fists-mega-lucario-z",
};

/** The Mega Evolution series sets with announced Mega ex, oldest first (the order they arrived). */
export function megaSets() {
  return SETS.filter((s) => s.series === "Mega Evolution" && (REVEALS[s.code]?.megas.length ?? 0) > 0).reverse();
}

const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const sets = megaSets();
  const named = sets.reduce((n, s) => n + REVEALS[s.code].megas.length, 0);
  const priced = SETS.filter((s) => s.series === "Mega Evolution" && (data.bySet[s.code]?.length ?? 0) > 0).slice(0, 6);
  const sources = sets.flatMap((s) => REVEALS[s.code].sources);

  return {
    intro: (
      <Lede>
        The Pokémon TCG&rsquo;s Mega Evolution series has brought Mega Evolution back as Mega Evolution Pokémon ex: big ex that give up three Prize cards when Knocked Out.
        Below, every Mega ex the publisher has named so far, {named} cards across {sets.length} sets, in the order they arrived, with each set&rsquo;s sealed prices in{" "}
        {r.inName} today.
      </Lede>
    ),
    sections: [
      {
        id: "how-mega-ex-work",
        title: "How Mega Evolution Pokémon ex work",
        body: (
          <Prose>
            <p>
              A Mega Evolution Pokémon ex is a Pokémon ex with a Mega form: more HP and stronger attacks than most cards, at a price. When one is Knocked Out, your opponent
              takes three Prize cards, one more than for an ordinary Pokémon ex, as the publisher said when it announced the first set of the series. Taking six Prize
              cards wins, so two Mega ex Knocked Out is most of a game.
            </p>
            <p>
              The series has added twists along the way. Ascended Heroes introduced the Mega attack rare, a rarity for Mega ex whose attack names are printed in Japanese
              katakana. Flowing Fists, due in 2027, is led by Mega Lucario Z ex, a new form from the Pokémon Legends: Z-A Mega Dimension download, and its Japanese source
              set adds Sigilyph ex, whose Ability stops damage from Mega Evolution Pokémon to itself.
            </p>
            <p>
              For collectors, the Mega ex are the chase cards of each set, above all their special illustration rare prints. Every pack of a set can hold any of them, so the
              sealed product you buy changes how many packs you open and what each costs, not what the packs can hold.
            </p>
          </Prose>
        ),
      },
      {
        id: "every-mega-ex",
        title: "Every Mega ex so far, set by set",
        body: (
          <>
            <StackTable
              caption="The Mega Evolution Pokémon ex the publisher has named, by set, oldest set first"
              head={["Set", "Mega Evolution Pokémon ex named"]}
              align="left"
              rows={sets.map((s) => {
                const rv = REVEALS[s.code];
                return {
                  key: s.code,
                  th: (
                    <span>
                      <Link href={setHref(r, s)} className="font-semibold text-ink hover:text-brand hover:underline">
                        {s.name}
                      </Link>
                      <span className="block text-xs font-normal text-muted">{formatRelease(s.releaseDate)}</span>
                    </span>
                  ),
                  cells: [
                    <span key="m">
                      {and(rv.megas)}
                      {rv.megaCount && <span className="text-muted"> ({rv.megas.length} named of {rv.megaCount})</span>}
                      {SET_GUIDE[s.code] && (
                        <>
                          {" "}
                          <Link href={guideHref(r, SET_GUIDE[s.code])} className="whitespace-nowrap font-semibold text-brand hover:underline">
                            Set guide →
                          </Link>
                        </>
                      )}
                    </span>,
                  ],
                };
              })}
            />
            <Prose>
              <p>
                Where a set has more Mega ex than its announcement names (the first Mega Evolution set has ten, Ascended Heroes thirteen), the table lists the named ones and
                says how many there are. 30th Celebration, the anniversary set, isn&rsquo;t led by Mega ex: it is built around 30 Pikachu rares instead, covered in{" "}
                <Link href={guideHref(r, "30th-celebration-chase-cards")}>the 30th Celebration guide</Link>.
              </p>
            </Prose>
            <Note>
              Cards from each set&rsquo;s announcement:{" "}
              {sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 && "; "}
                  <a href={s.url} target="_blank" rel="noopener" className="underline">
                    {s.label}
                  </a>
                </span>
              ))}
              .
            </Note>
          </>
        ),
      },
      {
        id: "prices-today",
        title: `Mega Evolution sets: what they cost in ${r.inName} today`,
        live: true,
        body: (
          <>
            <Prose>
              <p>
                The cheapest booster box, Elite Trainer Box and booster bundle of each Mega Evolution set open at stores in {r.inName} right now, newest set first, with
                the price per pack. Pre-orders are marked.
              </p>
            </Prose>
            <LiveBlock r={r} checked={data.checked}>
              {priced.length === 0 ? (
                <p className="text-sm text-muted">No Mega Evolution set has a box, ETB or bundle open in {r.inName} right now.</p>
              ) : (
                priced.map((s) => {
                  const pre = s.releaseDate > data.today;
                  return (
                    <SetGroup key={s.code} title={<SetTitle r={r} set={s} today={data.today} extra={pre ? <> · Pre-order</> : undefined} />}>
                      <PriceTable r={r} caption={`${s.name}: the cheapest booster box, Elite Trainer Box and booster bundle in ${r.inName} today`} lines={linesFor(data.bySet[s.code], CALENDAR_TYPES, s, pre)} whereHead={pre ? "Open at" : "In stock at"} />
                    </SetGroup>
                  );
                })
              )}
            </LiveBlock>
            <Note>Prices are each store&rsquo;s listed price, excluding shipping, read about twice a day. {PACK_SOURCE}</Note>
          </>
        ),
      },
      {
        id: "which-set",
        title: "Which Mega Evolution set to open for a Mega ex",
        body: (
          <>
            <Prose>
              <p>
                Pick the set by the Mega ex you want, then the product by how you like to buy. A <Link href={typeHref(r, "booster-box")}>booster box</Link> is the most packs
                and usually the lowest price per pack; an <Link href={typeHref(r, "etb")}>Elite Trainer Box</Link> is fewer packs plus sleeves, dice and a storage box; a{" "}
                <Link href={typeHref(r, "booster-bundle")}>booster bundle</Link> is a few packs to try a set. Ascended Heroes and 30th Celebration were never sold in booster
                boxes. If you want one particular card, buying it as a single is the only sure way; opening packs is a lottery, and we don&rsquo;t publish odds.
              </p>
              <p>
                Every set&rsquo;s prices side by side, with its release date and pack counts, are in{" "}
                <Link href={guideHref(r, "pokemon-mega-evolution-sealed-price-guide")}>the Mega Evolution sealed price guide</Link>.
              </p>
            </Prose>
            <NextLinks
              links={[
                { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
                { href: toolHref(r.region, "trade-calculator"), label: "Trade calculator", icon: "arrow-right" },
                { href: `/${r.region}/releases`, label: "Release calendar", icon: "calendar" },
              ]}
            />
          </>
        ),
      },
      {
        id: "faq",
        title: "Mega Evolution ex FAQ",
        body: (
          <Prose>
            {[
              { q: "How many Prize cards is a Mega Evolution Pokémon ex worth?", a: "Three. Your opponent takes three Prize cards when one is Knocked Out, one more than for an ordinary Pokémon ex." },
              { q: "Which set has the most Mega ex?", a: "Of the sets whose announcements give a count, Ascended Heroes: its set description lists 13 Mega Evolution Pokémon ex." },
              { q: "What is the newest Mega ex?", a: `${and(REVEALS[sets.at(-1)!.code].megas)}, from ${sets.at(-1)!.name}, due ${formatRelease(sets.at(-1)!.releaseDate)}.` },
              { q: "What is a Mega attack rare?", a: "A rarity Ascended Heroes introduced for Mega ex whose attack names are printed in Japanese katakana." },
            ].map((x) => (
              <div key={x.q}>
                <h3 className="font-semibold">{x.q}</h3>
                <p>{x.a}</p>
              </div>
            ))}
          </Prose>
        ),
      },
      whereToBuy(r, {
        tcg: { query: "Mega Evolution", label: "Mega Evolution sealed" },
        links: [
          { href: guideHref(r, "pokemon-legendary-stadium-cards"), label: "Legendary Stadiums explained" },
          { href: guideHref(r, "pokemon-mega-evolution-sealed-price-guide"), label: "Mega Evolution price guide" },
        ],
      }),
    ],
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
