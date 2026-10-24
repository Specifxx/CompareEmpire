// The set-reveal guides (2026-10-24): one module per query ("delta reign chase cards", "delta reign card list", "delta reign booster box
// vs ETB", "pitch black chase cards"), built here from one config each. The facts about the cards come only from the publisher's own
// announcements, quoted in REVEALS with their source and the day we read them; the prices come from the live loaders (data.ts: the set
// read whole, open only, cheapest first, and the set before it). No single-card prices (the site has none), no pull rates, no card we
// can't source, and no number the announcement doesn't give.
import Link from "next/link";
import type { ReactNode } from "react";
import { CALENDAR_TYPES, type ProductCardData } from "@/lib/data";
import { money } from "@/lib/format";
import { preorderPath } from "@/lib/preorder-guides";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { TYPE_ABOUT } from "@/lib/type-about";
import { toolHref } from "../tools";
import type { GuideData } from "./data";
import type { Guide } from "./index";
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
  PACK_SOURCE,
  perPackOf,
  PriceTable,
  productHref,
  Prose,
  SetGroup,
  SetTitle,
  setHref,
  setOf,
  StackTable,
  typeHref,
  whereText,
  whereToBuy,
  type GuideOutline,
  type GuideSection,
} from "./kit";

const LINK = "font-semibold text-brand hover:underline";

/** What the publisher has announced about a set, with where it said so. Only what the source states; anything else is left out. */
export interface Reveal {
  code: string;
  prev: string;
  /** The Mega Pokémon ex the announcement names, in its order. */
  megas: string[];
  /** Counts as the announcement words them ("more than 135 cards"), or null where it gives none. */
  cards: string | null;
  trainers: string | null;
  special: string | null;
  /** One more sourced line, or null. */
  extra: string | null;
  sources: { label: string; url: string }[];
}

export const REVEALS: Record<string, Reveal> = {
  me6: {
    code: "me6",
    prev: "me5",
    megas: ["Mega Rayquaza ex", "Mega Golurk ex", "Mega Malamar ex", "Mega Golisopod ex"],
    cards: "more than 135 cards",
    trainers: "more than 20 Trainer cards",
    special: "more than 35 special illustration cards",
    extra: "Mega Rayquaza ex is the card the announcement puts first, on the set's key art.",
    sources: [
      {
        label: "Pokémon: the Mega Evolution—Delta Reign expansion arrives November 6, 2026 (read 2026-10-24)",
        url: "https://www.pokemon.com/us/news/the-pokemon-tcg-mega-evolution-delta-reign-expansion-arrives-november-6-2026",
      },
    ],
  },
  me5: {
    code: "me5",
    prev: "me4",
    megas: ["Mega Darkrai ex", "Mega Zeraora ex", "Mega Chandelure ex", "Mega Excadrill ex"],
    cards: null,
    trainers: null,
    special: null,
    extra: "Like every Mega Evolution Pokémon ex, each gives up three Prize cards when it is Knocked Out.",
    sources: [
      {
        label: "The Pokémon Company International press release: Mega Darkrai ex and Mega Zeraora ex debut in Pitch Black (17 July 2026, via Game Developer)",
        url: "https://www.gamedeveloper.com/press-release/media-alert-mega-darkrai-ex-and-mega-zeraora-ex-debut-in-pok-mon-tcg-mega-evolution-pitch-black-expansion-available-today",
      },
    ],
  },
};

export type RevealAngle = "chase" | "list" | "box-vs-etb";

/** "A, B, C and D". */
const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

export function revealOutline(guide: Guide, angle: RevealAngle, rv: Reveal, r: RegionInfo, data: GuideData): GuideOutline {
  const set = setOf(rv.code)!;
  const prev = setOf(rv.prev)!;
  const out = set.releaseDate <= data.today;
  const open: ProductCardData[] = data.bySet[rv.code] ?? [];
  const lines = linesFor(open, CALENDAR_TYPES, set, !out);
  const pick = (label: string) => lines.find((l) => l.label === label)?.p ?? null;
  const box = pick("Booster Box");
  const etb = pick("Elite Trainer Box");
  const bundle = pick("Booster Bundle");
  const prevLines = linesFor(data.bySet[rv.prev], CALENDAR_TYPES, prev, prev.releaseDate > data.today);
  const others = open.filter((p) => !CALENDAR_TYPES.includes(p.productType)).slice(0, 8);
  const m = (c: number | null | undefined) => money(c ?? null, r.market);
  const word = out ? "in stock" : "open for pre-order";
  const hub = out ? null : preorderPath(r.region, rv.code);
  const boxPP = box ? perPackOf(box) : null;
  const etbPP = etb ? perPackOf(etb) : null;
  const bundlePP = bundle ? perPackOf(bundle) : null;
  const name = set.name;
  const counts = [rv.cards, rv.trainers, rv.special].filter((x): x is string => !!x);
  const src = (
    <Note>
      Card facts from{" "}
      {rv.sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 && "; "}
          <a href={s.url} target="_blank" rel="noopener" className="underline">
            {s.label}
          </a>
        </span>
      ))}
      . We print only what the publisher has announced; a card it hasn&rsquo;t named isn&rsquo;t listed here.
    </Note>
  );

  const megaList = (
    <StackTable
      caption={`The Mega Evolution Pokémon ex named in the ${name} announcement`}
      head={["Card", "Type of card"]}
      align="left"
      rows={rv.megas.map((c) => ({ key: c, th: <span className="font-semibold text-ink">{c}</span>, cells: [<span key="t">Mega Evolution Pokémon ex</span>] }))}
    />
  );

  const known: GuideSection = {
    id: angle === "list" ? "card-list" : "what-we-know",
    title: angle === "list" ? `The ${name} card list so far` : angle === "chase" ? `The ${name} chase cards: the Mega ex` : `What ${name} holds`,
    body: (
      <>
        <Prose>
          <p>
            {name} is the {set.series} series set {out ? "released" : "releasing"} on {formatRelease(set.releaseDate)}.{" "}
            {counts.length > 0 && <>The publisher&rsquo;s announcement says it has {and(counts)}. </>}
            It names {rv.megas.length} Mega Evolution Pokémon ex: {and(rv.megas)}. {rv.extra}
          </p>
          {angle === "chase" && (
            <p>
              &ldquo;Chase cards&rdquo; are the ones collectors open packs hoping to find. In a {set.series} set those are the Mega Evolution Pokémon ex and, above all, their
              special illustration versions: the full-art prints that cost the most to find. We don&rsquo;t publish what any single card sells for, because this site compares
              sealed product only and has no singles data. What we can show is what it costs to open packs of {name} in {r.inName} today, below.
            </p>
          )}
          {angle === "list" && (
            <p>
              The full numbered list, with every card&rsquo;s rarity, comes out with the set. Until we can read it from the publisher, this page lists only what has been
              announced, and it says so rather than filling the gaps from leaks.
            </p>
          )}
        </Prose>
        {megaList}
        {src}
      </>
    ),
  };

  const rarities: GuideSection = {
    id: "secret-rares",
    title: `${name} secret rares and special illustration rares`,
    body: (
      <Prose>
        <p>
          Secret rares are the cards numbered past the set&rsquo;s printed total, such as 140/135. In the {set.series} series they include the special illustration rares,
          the full-art illustrations of a Pokémon or a Pokémon ex, and the gold hyper rares.
          {rv.special ? <> For {name}, the announcement promises {rv.special}.</> : <> The publisher&rsquo;s release announcement for {name} doesn&rsquo;t give a count.</>}
        </p>
        <p>
          Which of the named Mega ex get a special illustration print, and how many hyper rares there are, the announcement doesn&rsquo;t say, so we don&rsquo;t either. When the
          set is out, the numbered list from the publisher answers it.
        </p>
        <p>
          What that means for buying sealed: every pack of a set can hold any of its rare cards, whichever product it comes in. A booster box, an Elite Trainer Box and a
          bundle differ in how many packs you get and what each pack costs, not in what the packs can hold.
        </p>
      </Prose>
    ),
  };

  const prices: GuideSection = {
    id: "prices-today",
    title: `What ${name} sealed costs in ${r.inName} today`,
    live: true,
    body: (
      <>
        <Prose>
          <p>
            The cheapest {name} booster box, Elite Trainer Box and booster bundle {word} in {r.inName} right now, each with its price per pack and how many stores have it.
            {!out && <> Every price here is a pre-order: what a store asks today to ship around {formatRelease(set.releaseDate)}.</>}
          </p>
        </Prose>
        <LiveBlock r={r} checked={data.checked}>
          <SetGroup title={<SetTitle r={r} set={set} today={data.today} extra={!out ? <> · Pre-order</> : undefined} />}>
            <PriceTable r={r} caption={`${name}: the cheapest booster box, Elite Trainer Box and booster bundle in ${r.inName} today, with the price per pack`} lines={lines} whereHead={out ? "In stock at" : "Open at"} />
          </SetGroup>
        </LiveBlock>
        <Prose>
          {box ? (
            <p>
              The {name} booster box costs from <strong>{m(box.lowestPriceCents)}</strong> in {r.inName} today
              {boxPP?.perPack != null && <>, {m(boxPP.perPack)} a pack for its {boxPP.packs} packs</>}
              {whereText(box) !== "—" && <>, at {whereText(box)}</>}.{" "}
              <Link href={productHref(r, box)} prefetch={false} className={LINK}>
                Every store&rsquo;s price for it →
              </Link>
            </p>
          ) : (
            <p>No {name} booster box is {word} in {r.inName} right now. A store can list one at any time; the set page shows every listing, sold out included.</p>
          )}
        </Prose>
        {hub && (
          <p className="text-sm">
            <Link href={hub} prefetch={false} className={LINK}>
              Every store&rsquo;s {name} pre-order, side by side →
            </Link>
          </p>
        )}
      </>
    ),
  };

  const choose: GuideSection = {
    id: "which-to-buy",
    title: angle === "box-vs-etb" ? `${name} booster box or ETB: which to buy` : `Which ${name} product to buy`,
    body: (
      <>
        <Prose>
          <p>
            <Link href={typeHref(r, "booster-box")}>
              <strong>Booster box</strong>
            </Link>
            : {TYPE_ABOUT["booster-boxes"]} {boxPP?.packs != null && <>{name}&rsquo;s holds {boxPP.packs} packs.</>}
          </p>
          <p>
            <Link href={typeHref(r, "etb")}>
              <strong>Elite Trainer Box</strong>
            </Link>
            : {TYPE_ABOUT["elite-trainer-boxes"]} {etbPP?.packs != null && <>{name}&rsquo;s holds {etbPP.packs} packs.</>}
          </p>
          <p>
            <Link href={typeHref(r, "booster-bundle")}>
              <strong>Booster bundle</strong>
            </Link>
            : {TYPE_ABOUT["booster-bundles"]} {bundlePP?.packs != null && <>{name}&rsquo;s holds {bundlePP.packs} packs.</>}
          </p>
          {boxPP?.perPack != null && etbPP?.perPack != null && (
            <p>
              In {r.inName} today a pack costs {m(boxPP.perPack)} in the cheapest {name} box and {m(etbPP.perPack)} in the cheapest Elite Trainer Box
              {bundlePP?.perPack != null && <>, and {m(bundlePP.perPack)} in the cheapest bundle</>}.{" "}
              {boxPP.perPack < etbPP.perPack ? (
                <>
                  The box is {m(etbPP.perPack - boxPP.perPack)} a pack cheaper; the ETB&rsquo;s extra cost per pack pays for its sleeves, dice, counters, card dividers and
                  storage box.
                </>
              ) : (
                <>The ETB is no dearer per pack today, so its accessories cost you nothing extra.</>
              )}
            </p>
          )}
        </Prose>
        <Decisions
          rows={[
            { when: <>You want as many {name} packs as possible for the chase cards</>, then: <>A booster box: the most packs in one product, usually the lowest price per pack.</> },
            { when: <>You also want sleeves, dice and a box to keep the cards in</>, then: <>An Elite Trainer Box: fewer packs, with the accessories to play.</> },
            { when: <>You want a few packs to try the set</>, then: <>A booster bundle, the smallest of the three.</> },
            { when: <>You want to play the set at a Prerelease</>, then: <>A Build &amp; Battle Box, the prerelease kit.</> },
          ]}
        />
        <Prose>
          <p>
            The full comparison, set by set, is in <Link href={guideHref(r, "pokemon-booster-box-vs-etb-value")}>booster box vs ETB: value per pack</Link>, and the price of
            every box today is in <Link href={guideHref(r, "cheapest-pokemon-booster-box")}>the cheapest booster box</Link>.
          </p>
        </Prose>
      </>
    ),
  };

  const prevSection: GuideSection = {
    id: "set-before",
    title: `${name} against ${prev.name}`,
    live: true,
    body: (
      <>
        <Prose>
          <p>
            The set before {name} is {prev.name}, released {formatRelease(prev.releaseDate)}. Here are its cheapest box, ETB and bundle in {r.inName} today, for a like-for-like
            look at two sets of the same series. A comparison of two prices today, not a forecast.
          </p>
        </Prose>
        <LiveBlock r={r} checked={data.checked}>
          <SetGroup title={<SetTitle r={r} set={prev} today={data.today} />}>
            <PriceTable r={r} caption={`${prev.name}: the cheapest booster box, Elite Trainer Box and booster bundle in ${r.inName} today`} lines={prevLines} />
          </SetGroup>
        </LiveBlock>
      </>
    ),
  };

  const othersSection: GuideSection[] = others.length
    ? [
        {
          id: "other-products",
          title: `Other ${name} products listed today`,
          live: true,
          body: (
            <LiveBlock r={r} checked={data.checked}>
              <StackTable
                caption={`Other ${name} products ${word} in ${r.inName} today`}
                head={["Product", "Price", out ? "In stock at" : "Open at"]}
                rows={others.map((p) => ({
                  key: p.slug,
                  th: (
                    <Link href={productHref(r, p)} prefetch={false} className="font-semibold text-ink hover:text-brand hover:underline">
                      {p.name}
                    </Link>
                  ),
                  cells: [
                    <span key="p" className="font-semibold">
                      {m(p.lowestPriceCents)}
                    </span>,
                    <span key="w" className="text-muted">
                      {whereText(p)}
                    </span>,
                  ],
                }))}
              />
            </LiveBlock>
          ),
        },
      ]
    : [];

  const qa: { q: string; a: ReactNode }[] = [
    { q: `When does ${name} come out?`, a: <>{name} {out ? "came out" : "releases"} on {formatRelease(set.releaseDate)}.</> },
    { q: `What are the ${name} chase cards?`, a: <>The announcement names {and(rv.megas)}. Their special illustration versions are the cards most collectors chase.</> },
    {
      q: `How many cards are in ${name}?`,
      a: rv.cards ? <>The publisher says {rv.cards}{rv.special ? <>, including {rv.special}</> : null}.</> : <>The release announcement doesn&rsquo;t give a count, so we don&rsquo;t print one.</>,
    },
    {
      q: `Is a ${name} booster box or an Elite Trainer Box better?`,
      a: <>A box is more packs and usually less per pack; an ETB is fewer packs plus accessories. Today&rsquo;s price per pack for each is in the table above.</>,
    },
    { q: `How much is a single ${name} card worth?`, a: <>We don&rsquo;t say: this site compares sealed product only and has no prices for single cards.</> },
  ];
  const faq: GuideSection = {
    id: "faq",
    title: `${name} FAQ`,
    body: (
      <Prose>
        {qa.map((x) => (
          <div key={x.q}>
            <h3 className="font-semibold">{x.q}</h3>
            <p>{x.a}</p>
          </div>
        ))}
      </Prose>
    ),
  };

  const checks: GuideSection = {
    id: "before-you-buy",
    title: out ? "Before you buy" : "Before you pre-order",
    body: (
      <>
        <Checklist
          items={[
            <>Add delivery to the price before comparing two stores.</>,
            ...(out ? [] : [<>Check when the store takes payment, and what happens if its allocation is cut.</>]),
            <>Check the listing is the English-language product you want, not a case or another language.</>,
            <>
              Read <Link href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>how to avoid resealed product</Link> before buying from a marketplace.
            </>,
          ]}
        />
        <NextLinks
          links={[
            { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
            { href: toolHref(r.region, "trade-calculator"), label: "Trade calculator", icon: "arrow-right" },
            { href: setHref(r, set), label: `All ${name} sealed`, icon: "tag" },
            { href: setHref(r, prev), label: `All ${prev.name} sealed`, icon: "tag" },
          ]}
        />
        <Note>Prices are each store&rsquo;s listed price, excluding shipping, read about twice a day. {PACK_SOURCE}</Note>
      </>
    ),
  };

  const order: GuideSection[] =
    angle === "box-vs-etb"
      ? [prices, choose, known, prevSection, ...othersSection, faq, checks]
      : angle === "list"
        ? [known, rarities, prices, choose, ...othersSection, faq, checks]
        : [known, prices, rarities, choose, prevSection, faq, checks];

  return {
    intro: (
      <Lede>
        {angle === "box-vs-etb" ? (
          <>
            {box && etb && boxPP?.perPack != null && etbPP?.perPack != null ? (
              <>
                In {r.inName} today a {name} pack costs {m(boxPP.perPack)} in a booster box and {m(etbPP.perPack)} in an Elite Trainer Box.{" "}
              </>
            ) : (
              <>{name}&rsquo;s box and ETB side by side, with today&rsquo;s prices in {r.inName}. </>
            )}
          </>
        ) : (
          <>
            {name} {out ? "came out" : "releases"} on {formatRelease(set.releaseDate)}, led by {and(rv.megas)}
            {rv.cards && <>, with {rv.cards}</>}.{" "}
          </>
        )}
        Below: what the publisher has announced, what each sealed product costs today, and which to buy.{" "}
        <Link href={setHref(r, set)} prefetch={false} className={LINK}>
          All {name} →
        </Link>
      </Lede>
    ),
    sections: [
      ...order,
      whereToBuy(r, {
        tcg: { query: name, label: name },
        links: [
          { href: guideHref(r, "pokemon-mega-evolution-sealed-price-guide"), label: "Mega Evolution price guide" },
          { href: guideHref(r, "booster-box-vs-etb-vs-booster-bundle"), label: "Box vs ETB vs bundle" },
        ],
      }),
    ],
  };
}

/** A guide's Body from its outline: the shared shell. */
export function revealBody(guide: Guide, angle: RevealAngle, rv: Reveal) {
  return function Body({ r, data }: { r: RegionInfo; data: GuideData }) {
    return <GuideBody data={data} guide={guide} r={r} outline={revealOutline(guide, angle, rv, r, data)} />;
  };
}
