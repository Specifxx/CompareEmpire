// Guide: Legendary Stadiums explained (2026-11-03), Delta Reign's new kind of Stadium card. What the card is and how it is packed come
// from the publisher's set description as PokéGuardian reported it (and lib/preorder-guides.ts's Delta Reign guide, which quotes the
// same source); how the two halves are played, the three Stadiums and their effects come from Samurai Sword Tokyo's reading of the
// Japanese Storm Emeralda cards, labelled as such (the English names of two of them aren't confirmed). Prices: Delta Reign read whole
// and Pitch Black's cheapest box, ETB and bundle, as the set-reveal guides (data.ts).
import Link from "next/link";
import { CALENDAR_TYPES, type ProductCardData } from "@/lib/data";
import { money } from "@/lib/format";
import { preorderPath } from "@/lib/preorder-guides";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { toolHref } from "../tools";
import type { GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import {
  Checklist,
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
  type BodyProps,
  type GuideOutline,
} from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("pokemon-legendary-stadium-cards")!;
const LINK = "font-semibold text-brand hover:underline";

const SOURCES = [
  { label: "PokéGuardian: Mega Evolution—Delta Reign revealed, from the publisher's press kit (20 August 2026)", url: "https://www.pokeguardian.com/3231721_pokemon-tcg-mega-evolution-delta-reign-revealed" },
  { label: "Samurai Sword Tokyo: the two-part Stadium cards of Storm Emeralda (read 2026-11-03)", url: "https://samuraiswordtokyo.com/blogs/news/two-part-stadium-cards-storm-emeralda-m6" },
];

/** The three Legendary Stadiums as the Japanese cards have them (Samurai Sword Tokyo's paraphrase; only Legendary Summit's English name is confirmed). */
const STADIUMS = [
  { name: "Legendary Summit", english: true, effect: "When a Colorless Pokémon is Knocked Out by an opponent's attack, the opponent takes one fewer Prize card." },
  { name: "Legendary Trench", english: false, effect: "Healing is doubled for both players' Pokémon." },
  { name: "Legendary Lava Cave", english: false, effect: "Evolved Pokémon in play, both players', have no Abilities." },
];

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const set = setOf("me6")!;
  const prev = setOf("me5")!;
  const out = set.releaseDate <= data.today;
  const open: ProductCardData[] = data.bySet.me6 ?? [];
  const lines = linesFor(open, CALENDAR_TYPES, set, !out);
  const prevLines = linesFor(data.bySet.me5, CALENDAR_TYPES, prev, false);
  const box = lines.find((l) => l.label === "Booster Box")?.p ?? null;
  const boxPP = box ? perPackOf(box) : null;
  const m = (c: number | null | undefined) => money(c ?? null, r.market);
  const word = out ? "in stock" : "open for pre-order";
  const hub = out ? null : preorderPath(r.region, "me6");

  const src = (
    <Note>
      Sources:{" "}
      {SOURCES.map((s, i) => (
        <span key={s.url}>
          {i > 0 && "; "}
          <a href={s.url} target="_blank" rel="noopener" className="underline">
            {s.label}
          </a>
        </span>
      ))}
      . The effects are summaries of the Japanese cards, not the English card text; we&rsquo;ll quote the English wording once it is published.
    </Note>
  );

  return {
    intro: (
      <Lede>
        A Legendary Stadium is a Stadium card split in two: you need both halves in your hand and play them together as one Stadium, and side by side their art makes one
        wide picture. They are new in <Link href={setHref(r, set)}>{set.name}</Link>, {out ? "out since" : "out on"} {formatRelease(set.releaseDate)}, which has three of them.
      </Lede>
    ),
    sections: [
      {
        id: "what-is-a-legendary-stadium",
        title: "What is a Legendary Stadium?",
        body: (
          <>
            <Prose>
              <p>
                A Stadium card is a Trainer card that stays in play beside the Active Spot and changes the game for both players until another Stadium replaces it. A
                Legendary Stadium is the same idea in two pieces: a left half and a right half, two separate cards with their own collector numbers, that only work
                together. The publisher&rsquo;s set description for {set.name} lists &ldquo;6 Stadium cards that make three Legendary Stadiums&rdquo;.
              </p>
              <p>
                The halves are made to be opened together: a booster pack that holds a Legendary Stadium holds both halves, so you never pull one half alone. Laid side by
                side they make one long illustration, which is a large part of their appeal to collectors as well as players.
              </p>
            </Prose>
            {src}
          </>
        ),
      },
      {
        id: "how-they-work",
        title: "How Legendary Stadiums work in a game",
        body: (
          <>
            <Prose>
              <p>As the Japanese cards read, according to Samurai Sword Tokyo&rsquo;s explainer:</p>
            </Prose>
            <Checklist
              items={[
                <>Neither half can be played on its own. You combine the two halves from your hand and play them as one Stadium.</>,
                <>Once in play, the pair follows the normal Stadium rules: one Stadium played a turn, and a new Stadium sends it to the discard pile.</>,
                <>A single half in your hand does nothing until you draw its partner, so a deck plays both halves in matching numbers.</>,
                <>The deck limit treats the two halves of one Stadium together: up to four cards in total, as the explainer reads the rule.</>,
              ]}
            />
            <Prose>
              <p>
                That last point is the one to check before a tournament: the English rules text and any official ruling come with the set, and they are what a judge will
                use. Until then, treat the deck-building detail as the Japanese ruling, reported second hand.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "the-three-stadiums",
        title: "The three Legendary Stadiums in Delta Reign",
        body: (
          <>
            <StackTable
              caption="The three Legendary Stadiums and what each does, as the Japanese cards read"
              head={["Stadium", "What it does"]}
              align="left"
              rows={STADIUMS.map((s) => ({
                key: s.name,
                th: (
                  <span className="font-semibold text-ink">
                    {s.name}
                    {!s.english && <span className="font-normal text-muted"> (working English name)</span>}
                  </span>
                ),
                cells: [<span key="e">{s.effect}</span>],
              }))}
            />
            <Prose>
              <p>
                Legendary Summit is the one the publisher showed first, and Samurai Sword Tokyo&rsquo;s explainer pairs it with the set&rsquo;s headline card, Mega Rayquaza
                ex, the Mega Evolution Pokémon ex on {set.name}&rsquo;s key art. The other two names are translations of the Japanese cards and may change in English. More on the set&rsquo;s
                cards is in <Link href={guideHref(r, "delta-reign-chase-cards")}>the Delta Reign chase cards</Link> and{" "}
                <Link href={guideHref(r, "delta-reign-card-list")}>the Delta Reign card list so far</Link>.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "prices-today",
        title: `What ${set.name} sealed costs in ${r.inName} today`,
        live: true,
        body: (
          <>
            <Prose>
              <p>
                Legendary Stadiums come only in {set.name} booster packs. Here is the cheapest {set.name} booster box, Elite Trainer Box and booster bundle {word} in{" "}
                {r.inName} right now, with the price per pack and how many stores have each.
              </p>
            </Prose>
            <LiveBlock r={r} checked={data.checked}>
              <SetGroup title={<SetTitle r={r} set={set} today={data.today} extra={!out ? <> · Pre-order</> : undefined} />}>
                <PriceTable r={r} caption={`${set.name}: the cheapest booster box, Elite Trainer Box and booster bundle in ${r.inName} today`} lines={lines} whereHead={out ? "In stock at" : "Open at"} />
              </SetGroup>
            </LiveBlock>
            <Prose>
              {box ? (
                <p>
                  The {set.name} booster box costs from <strong>{m(box.lowestPriceCents)}</strong> in {r.inName} today
                  {boxPP?.perPack != null && <>, {m(boxPP.perPack)} a pack for its {boxPP.packs} packs</>}
                  {whereText(box) !== "—" && <>, at {whereText(box)}</>}.{" "}
                  <Link href={productHref(r, box)} prefetch={false} className={LINK}>
                    Every store&rsquo;s price for it →
                  </Link>
                </p>
              ) : (
                <p>No {set.name} booster box is {word} in {r.inName} right now; the set page shows every listing, sold out included.</p>
              )}
              {hub && (
                <p>
                  <Link href={hub} prefetch={false} className={LINK}>
                    Every store&rsquo;s {set.name} pre-order, side by side →
                  </Link>
                </p>
              )}
            </Prose>
          </>
        ),
      },
      {
        id: "set-before",
        title: `For comparison: ${prev.name}`,
        live: true,
        body: (
          <>
            <Prose>
              <p>
                {prev.name}, released {formatRelease(prev.releaseDate)}, is the set before {set.name} and has no Legendary Stadiums. Its cheapest box, ETB and bundle in{" "}
                {r.inName} today, for a like-for-like look at two sets of the same series:
              </p>
            </Prose>
            <LiveBlock r={r} checked={data.checked}>
              <SetGroup title={<SetTitle r={r} set={prev} today={data.today} />}>
                <PriceTable r={r} caption={`${prev.name}: the cheapest booster box, Elite Trainer Box and booster bundle in ${r.inName} today`} lines={prevLines} />
              </SetGroup>
            </LiveBlock>
          </>
        ),
      },
      {
        id: "which-to-buy",
        title: "Which product to open for Legendary Stadiums",
        body: (
          <>
            <Prose>
              <p>
                Every {set.name} pack can hold a Legendary Stadium, whichever product it comes in. So the choice is the usual one: a{" "}
                <Link href={typeHref(r, "booster-box")}>booster box</Link> for the most packs and usually the lowest price per pack, an{" "}
                <Link href={typeHref(r, "etb")}>Elite Trainer Box</Link> for fewer packs plus sleeves, dice and a storage box, or a{" "}
                <Link href={typeHref(r, "booster-bundle")}>booster bundle</Link> to try the set. If you want one particular Stadium for a deck, buying the two halves as single
                cards is the sure way; opening packs is for the fun of it.
              </p>
            </Prose>
            <NextLinks
              links={[
                { href: setHref(r, set), label: `All ${set.name} sealed`, icon: "tag" },
                { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
                { href: toolHref(r.region, "trade-calculator"), label: "Trade calculator", icon: "arrow-right" },
              ]}
            />
            <Note>Prices are each store&rsquo;s listed price, excluding shipping, read about twice a day. {PACK_SOURCE}</Note>
          </>
        ),
      },
      {
        id: "faq",
        title: "Legendary Stadium FAQ",
        body: (
          <Prose>
            {[
              { q: "Can you play one half of a Legendary Stadium?", a: "No. As the Japanese card reads, neither half can be played on its own: you combine both from your hand and play them as one Stadium." },
              { q: "Do you get both halves in one pack?", a: "Yes. The publisher's set description says a booster pack holding a Legendary Stadium holds both halves." },
              { q: "How many Legendary Stadiums are in Delta Reign?", a: "Three, made from six Stadium cards. Legendary Summit is the first one revealed." },
              { q: "Which set are Legendary Stadiums from?", a: `${set.name}, the Mega Evolution series set out ${formatRelease(set.releaseDate)}. In Japan they first appeared in Storm Emeralda.` },
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
        tcg: { query: set.name, label: set.name },
        links: [
          { href: guideHref(r, "every-mega-evolution-pokemon-ex"), label: "Every Mega ex so far" },
          { href: guideHref(r, "delta-reign-booster-box-price"), label: "Delta Reign box prices" },
        ],
      }),
    ],
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
