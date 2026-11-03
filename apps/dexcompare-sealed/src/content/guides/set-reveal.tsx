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
  /** "5 Mega Evolution Pokémon ex" when the announcement gives a count that names fewer than it holds; else the list's length is used. */
  megaCount?: string;
  /** The set's make-up, line by line, as the announcement lists it ("14 illustration rare Pokémon"). */
  makeup?: string[];
  /** New or notable mechanics and rarities, each as the source describes it. */
  features?: { name: string; text: string }[];
  /** The publisher's product line-up, one line a product, when the announcement lists contents and promos. */
  products?: string[];
  /** For a set led by something other than Mega ex (30th Celebration): what collectors chase, as sourced; replaces the Mega wording. */
  chase?: string;
  /** The Japanese set(s) the English set is drawn from, when a source says so. */
  japanese?: string;
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
      { label: "PokéGuardian: Mega Evolution—Delta Reign revealed, from the publisher's press kit (read 2026-11-03)", url: "https://www.pokeguardian.com/3231721_pokemon-tcg-mega-evolution-delta-reign-revealed" },
      { label: "Samurai Sword Tokyo: the two-part Stadium cards of Storm Emeralda (read 2026-11-03)", url: "https://samuraiswordtokyo.com/blogs/news/two-part-stadium-cards-storm-emeralda-m6" },
    ],
    makeup: [
      "4 Mega Evolution Pokémon ex",
      "6 other Pokémon ex",
      "6 Stadium cards that make three Legendary Stadiums",
      "14 illustration rare Pokémon",
      "17 ultra rare Pokémon and Trainer cards",
      "6 special illustration rare Pokémon and Supporter cards",
    ],
    features: [
      {
        name: "Legendary Stadiums",
        text: "A new kind of Stadium: two Stadium cards played as a pair, whose artwork joins into one wide picture when they sit side by side. A booster pack that holds a Legendary Stadium holds both halves. Legendary Summit is the first one revealed, and the set has six of these Stadium cards, making three Legendary Stadiums.",
      },
    ],
    japanese: "Storm Emeralda, the Japanese set its cards come from, where the Legendary Stadiums first appeared",
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
  // The 2026-11-03 set guides. Each line below is what the cited source says, read on 2026-11-03; PokéGuardian reprints the
  // publisher's press kit (its set description and product line-up), so its counts are the publisher's words.
  me7: {
    code: "me7",
    prev: "me6",
    megas: ["Mega Lucario Z ex"],
    cards: null,
    trainers: null,
    special: null,
    extra:
      "Flowing Fists is the first English set of 2027. Its headline card is Mega Lucario Z ex, a new form of Mega Lucario that first appeared in the Mega Dimension download for Pokémon Legends: Z-A.",
    chase:
      "The publisher has named the set and its date, but not its card list yet. Its Japanese source set, Aura Seeker (out in Japan on 27 November 2026), has revealed Mega Lucario Z ex and Sigilyph ex, and reports from it name Mega Absol Z ex and Mega Garchomp Z ex too. Cards from a Japanese set usually reach the English set, but not always all of them, so treat those as likely, not confirmed.",
    features: [
      {
        name: "Mega Lucario Z ex",
        text: "A Metal-type Mega ex with 210 HP. Its Ability, Aura Seeker, searches your deck for a Supporter card, and its 120-damage attack does double damage to an ex Pokémon that is weak to it (as Wargamer reported the Japanese card).",
      },
      {
        name: "Sigilyph ex",
        text: "A Pokémon ex whose Ability prevents all damage done to it by Mega Evolution Pokémon: a direct answer to the series' Mega ex, though it protects only itself (Wargamer, from the Japanese card).",
      },
    ],
    japanese: "Aura Seeker, the Japanese set out on 27 November 2026, a smaller set of about 78 cards plus secret rares (Screen Rant, reporting PokéBeach's translation)",
    sources: [
      { label: "Wargamer: the Pokémon TCG's first 2027 release, Flowing Fists, is revealed (21 October 2026)", url: "https://www.wargamer.com/pokemon-trading-card-game/flowing-fists" },
      { label: "Screen Rant: Pokémon TCG confirms new set releasing November 27 (Aura Seeker)", url: "https://screenrant.com/pokemon-tcg-new-set-november-27-aura-seeker/" },
    ],
  },
  cel30: {
    code: "cel30",
    prev: "me5",
    megas: [],
    cards: null,
    trainers: null,
    special: null,
    extra:
      "It marks the Pokémon TCG's 30th anniversary and was released at the same time around the world, with every card in it foil.",
    chase:
      "Every booster pack holds one of 30 Pikachu rare cards, the set brings back 30 classic Pokémon cards from the game's history, and it adds a new rarity, the Futuristic rare, drawn by the artist YOSHIROTTEN. Those three are what collectors open 30th Celebration for.",
    features: [
      { name: "Every card is foil", text: "The whole set is printed foil, not only its rares." },
      { name: "30 Pikachu rare cards", text: "Each booster pack holds one of 30 Pikachu rare cards, some drawn in daytime and some in night-time settings." },
      { name: "Futuristic rare", text: "A new rarity with new visuals by the artist YOSHIROTTEN." },
      { name: "30 returning classics", text: "Thirty classic Pokémon cards from the game's 30 years return in the set." },
    ],
    products: [
      "Elite Trainer Box: 9 booster packs, an illustration rare style Nidorina promo and the usual accessories",
      "Poster Collection: 3 booster packs, Articuno, Zapdos and Moltres promos and a two-sided poster",
      "Tech Sticker Collection: 3 booster packs, an Alolan Exeggutor or Lucario foil promo and a sticker sheet",
      "Pokémon ex Box: 4 booster packs, a Sylveon ex or Greninja ex promo and an oversize card",
      "ex Tin: 4 booster packs and a Sylveon ex or Greninja ex promo",
    ],
    sources: [
      {
        label: "The Pokémon Company International: media alert, product line-up for the 30th Celebration expansion (via Pokémon's press site)",
        url: "https://pokemon.gamespress.com/MEDIA-ALERT-The-Pokemon-Company-International-Reveals-Product-Lineup-f",
      },
    ],
  },
  me4: {
    code: "me4",
    prev: "me3",
    megas: ["Mega Greninja ex", "Mega Floette ex", "Mega Pyroar ex", "Mega Dragalge ex"],
    megaCount: "5 Mega Evolution Pokémon ex",
    cards: "over 120 cards",
    trainers: "more than 20 Trainer cards",
    special: "more than 35 Pokémon and Trainer cards with special illustrations",
    extra: "Mega Greninja ex and Mega Floette ex lead the announcement; the four named Mega ex are the four booster pack wrappers.",
    makeup: [
      "5 Mega Evolution Pokémon ex",
      "5 other Pokémon ex",
      "11 illustration rare Pokémon",
      "18 ultra rare Pokémon and Trainer cards",
      "6 special illustration rare Pokémon and Supporter cards",
    ],
    sources: [{ label: "PokéGuardian: Mega Evolution—Chaos Rising officially revealed, from the publisher's press kit", url: "https://pokeguardian.com/3060210_mega-evolution-chaos-rising-officially-revealed" }],
  },
  me3: {
    code: "me3",
    prev: "me2pt5",
    megas: ["Mega Zygarde ex", "Mega Starmie ex", "Mega Clefable ex", "Mega Skarmory ex"],
    cards: "over 120 cards",
    trainers: "more than 25 Trainer cards",
    special: "more than 30 Pokémon and Trainer cards with special illustrations",
    extra: "Mega Zygarde ex headlines the set, which is built around Pokémon Legends: Z-A. Meowth ex is among its other Pokémon ex.",
    makeup: [
      "4 Mega Evolution Pokémon ex",
      "9 other Pokémon ex",
      "11 illustration rare Pokémon",
      "18 ultra rare Pokémon and Trainer cards",
      "6 special illustration rare Pokémon and Supporter cards",
    ],
    sources: [{ label: "PokéGuardian: Mega Evolution—Perfect Order officially revealed, from the publisher's press kit", url: "https://www.pokeguardian.com/2921595_mega-evolution-perfect-order-officially-revealed" }],
  },
  me2pt5: {
    code: "me2pt5",
    prev: "me2",
    megas: ["Mega Dragonite ex", "Mega Lucario ex", "Mega Gardevoir ex", "Mega Meganium ex", "Mega Emboar ex", "Mega Feraligatr ex"],
    megaCount: "13 Mega Evolution Pokémon ex",
    cards: "over 290 cards",
    trainers: "over 30 Trainer cards",
    special: "22 special illustration rare Mega Evolution Pokémon ex, Pokémon ex and Supporter cards",
    extra:
      "Ascended Heroes is a special set: it was not sold in booster boxes, only in Elite Trainer Boxes, bundles, tins and collections. It also brings back Trainer's Pokémon and has Stellar Tera Pokémon ex.",
    makeup: [
      "13 Mega Evolution Pokémon ex",
      "6 Tera Pokémon ex and 20 other Pokémon ex",
      "33 illustration rare Pokémon",
      "14 ultra rare Mega Evolution Pokémon ex, Pokémon ex and Trainer cards",
      "7 Mega attack rare Mega Evolution Pokémon ex",
      "22 special illustration rare Mega Evolution Pokémon ex, Pokémon ex and Supporter cards",
    ],
    features: [
      { name: "Mega attack rare", text: "A new rarity for Mega Evolution Pokémon ex whose attack names are written in Japanese katakana; the set has seven." },
      { name: "Trainer's Pokémon", text: "Pokémon that belong to a named Trainer return, such as the Erika's Tangela and Larry's Komala promos, and N's Zekrom, the Elite Trainer Box promo." },
    ],
    sources: [{ label: "PokéGuardian: Mega Evolution—Ascended Heroes special set officially revealed, from the publisher's press kit", url: "https://www.pokeguardian.com/2832227_mega-evolution-ascended-heroes-special-set-officially-revealed" }],
  },
  me2: {
    code: "me2",
    prev: "me1",
    megas: ["Mega Charizard X ex", "Mega Gengar ex", "Mega Heracross ex", "Mega Lopunny ex"],
    cards: "over 120 cards",
    trainers: "10 Trainer cards",
    special: "more than 15 Pokémon and Trainer cards with special illustrations",
    extra: "Mega Charizard X ex leads the set and its key art.",
    sources: [{ label: "Pokémon (pokemon.com/uk): Mega Evolution—Phantasmal Flames", url: "https://www.pokemon.com/uk/pokemon-tcg/mega-evolution-phantasmal-flames" }],
  },
  me1: {
    code: "me1",
    prev: "zsv10pt5",
    megas: ["Mega Lucario ex", "Mega Gardevoir ex", "Mega Venusaur ex", "Mega Kangaskhan ex"],
    megaCount: "10 Mega Evolution Pokémon ex",
    cards: "over 180 cards",
    trainers: "more than 15 Trainer cards",
    special: "more than 50 Pokémon and Trainer cards with special illustrations",
    extra:
      "It is the first set of the Mega Evolution series, which brought Mega Evolution back to the game. A Mega Evolution Pokémon ex gives up three Prize cards when it is Knocked Out.",
    makeup: [
      "10 Mega Evolution Pokémon ex",
      "22 illustration rare Pokémon",
      "22 ultra rare Mega Evolution Pokémon ex and Trainer cards",
      "10 special illustration rare Mega Evolution Pokémon ex and Supporter cards",
    ],
    features: [
      { name: "Mega Evolution Pokémon ex", text: "Big Pokémon ex that give up three Prize cards when Knocked Out, one more than an ordinary Pokémon ex." },
      { name: "Ultra rare Trainers", text: "Ultra rare prints now include Item, Stadium and Pokémon Tool cards, not only Supporters." },
    ],
    sources: [{ label: "PokéGuardian: Pokémon TCG Mega Evolution officially revealed, from the publisher's press kit", url: "https://pokeguardian.com/2604003_pokemon-tcg-mega-evolution-officially-revealed" }],
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
      . We print only what these sources state, and say whose word it is; a card they haven&rsquo;t named isn&rsquo;t listed here.
    </Note>
  );

  const megaList = rv.megas.length === 0 ? null : (
    <StackTable
      caption={`The Mega Evolution Pokémon ex named in the ${name} announcement${rv.megaCount ? ` (of ${rv.megaCount})` : ""}`}
      head={["Card", "Type of card"]}
      align="left"
      rows={rv.megas.map((c) => ({ key: c, th: <span className="font-semibold text-ink">{c}</span>, cells: [<span key="t">Mega Evolution Pokémon ex</span>] }))}
    />
  );

  const known: GuideSection = {
    id: angle === "list" ? "card-list" : "what-we-know",
    title:
      angle === "list" ? `The ${name} card list so far` : angle === "chase" ? (rv.megas.length ? `The ${name} chase cards: the Mega ex` : `The ${name} chase cards`) : `What ${name} holds`,
    body: (
      <>
        <Prose>
          <p>
            {name} is the {set.series} series set {out ? "released" : "releasing"} on {formatRelease(set.releaseDate)}.{" "}
            {counts.length > 0 && <>The publisher&rsquo;s announcement says it has {and(counts)}. </>}
            {rv.megas.length > 0 && (
              <>
                {rv.megaCount ? <>It has {rv.megaCount}; the ones named so far are</> : <>The Mega Evolution Pokémon ex named so far:</>} {and(rv.megas)}.{" "}
              </>
            )}
            {rv.extra}
          </p>
          {rv.chase && <p>{rv.chase}</p>}
          {rv.japanese && (
            <p>
              The Japanese edition: {rv.japanese}. Japanese sealed product is on our <Link href={`/${r.region}/japanese`}>Japanese Pokémon page</Link>.
            </p>
          )}
          {angle === "chase" && rv.megas.length > 0 && !rv.chase && (
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

  const featureSection: GuideSection[] = rv.features?.length
    ? [
        {
          id: "whats-new",
          title: `New in ${name}: mechanics and rarities`,
          body: (
            <>
              <Prose>
                <p>
                  What {name} adds to the game or to the collection, as the sources below describe it. A new mechanic changes how a set plays; a new rarity changes what
                  collectors look for in a pack. Neither changes what a sealed product holds: the pack counts stay the same.
                </p>
              </Prose>
              <StackTable
                caption={`What is new or notable in ${name}`}
                head={["Feature", "What it is"]}
                align="left"
                rows={rv.features.map((f) => ({ key: f.name, th: <span className="font-semibold text-ink">{f.name}</span>, cells: [<span key="t">{f.text}</span>] }))}
              />
            </>
          ),
        },
      ]
    : [];

  const rarities: GuideSection = {
    id: "secret-rares",
    title: `${name} secret rares and special illustration rares`,
    body: (
      <Prose>
        {rv.makeup?.length ? (
          <>
            <p>What the publisher says {name} holds:</p>
            <ul>
              {rv.makeup.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </>
        ) : null}
        <p>
          Secret rares are the cards numbered past the set&rsquo;s printed total, such as 140/135. In the {set.series} series they include the special illustration rares,
          the full-art illustrations of a Pokémon or a Pokémon ex, and the gold hyper rares.
          {rv.special ? <> For {name}, the announcement promises {rv.special}.</> : <> The publisher&rsquo;s release announcement for {name} doesn&rsquo;t give a count.</>}
        </p>
        <p>
          Which cards get a special illustration print, and how many hyper rares there are, the announcement doesn&rsquo;t say card by card, so we don&rsquo;t either.{" "}
          {out ? <>The set&rsquo;s numbered list answers it card by card.</> : <>When the set is out, the numbered list from the publisher answers it.</>}
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
          ) : set.noBoosterBox ? (
            <p>
              {name} was never sold as a booster box: its packs come in Elite Trainer Boxes, bundles, tins and collections, so the table above starts with those. A
              &ldquo;booster box&rdquo; of it is a store&rsquo;s own lot, not a product the publisher makes.
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
        {rv.products?.length ? (
          <Prose>
            <p>The publisher&rsquo;s {name} line-up, with each product&rsquo;s promo cards:</p>
            <ul>
              {rv.products.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </Prose>
        ) : null}
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
            set.noBoosterBox
              ? { when: <>You want as many {name} packs as possible for the chase cards</>, then: <>Elite Trainer Boxes or bundles: the set has no booster box.</> }
              : { when: <>You want as many {name} packs as possible for the chase cards</>, then: <>A booster box: the most packs in one product, usually the lowest price per pack.</> },
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
    {
      q: `What are the ${name} chase cards?`,
      a: rv.megas.length ? (
        <>The announcement names {and(rv.megas)}. Their special illustration versions are the cards most collectors chase.</>
      ) : (
        <>{rv.chase}</>
      ),
    },
    ...(rv.features?.length
      ? [{ q: `What is new in ${name}?`, a: <>{and(rv.features.map((f) => f.name))}. Each is explained in the section on what&rsquo;s new above.</> }]
      : []),
    {
      q: `How many cards are in ${name}?`,
      a: rv.cards ? <>The publisher says {rv.cards}{rv.special ? <>, including {rv.special}</> : null}.</> : <>The release announcement doesn&rsquo;t give a count, so we don&rsquo;t print one.</>,
    },
    {
      q: set.noBoosterBox ? `Is there a ${name} booster box?` : `Is a ${name} booster box or an Elite Trainer Box better?`,
      a: set.noBoosterBox ? (
        <>No. {name} is a special set sold without booster boxes; the Elite Trainer Box and the bundle are the ways to buy its packs in quantity.</>
      ) : (
        <>A box is more packs and usually less per pack; an ETB is fewer packs plus accessories. Today&rsquo;s price per pack for each is in the table above.</>
      ),
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
        ? [known, ...featureSection, rarities, prices, choose, ...othersSection, faq, checks]
        : [known, ...featureSection, prices, rarities, choose, prevSection, faq, checks];

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
            {name} {out ? "came out" : "releases"} on {formatRelease(set.releaseDate)}
            {rv.megas.length ? <>, led by {and(rv.megas)}</> : null}
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
