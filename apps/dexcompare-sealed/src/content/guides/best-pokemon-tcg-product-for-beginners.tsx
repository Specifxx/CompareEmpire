// Guide: the best first Pokémon TCG product for a new player (2026-11-01), every region. The region's cheapest open ready-to-play decks,
// Build & Battle Boxes, booster bundles and tins today (data.ts BEGINNER_TYPES), with what each is for. What each type holds is
// type-about.ts's words only; no pull rates, no value claims.
import Link from "next/link";
import type { ProductCardData } from "@/lib/data";
import { money, plural } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { TYPE_BY_LABEL } from "@/lib/sealed-title";
import { TYPE_ABOUT } from "@/lib/type-about";
import { BEGINNER_TYPES, type GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import { Checklist, Decisions, GuideBody, guideHref, Lede, LiveBlock, NextLinks, productHref, Prose, typeHref, whereToBuy, type BodyProps, type GuideOutline, type GuideSection } from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("best-pokemon-tcg-product-for-beginners")!;
const LINK = "font-semibold text-brand hover:underline";
/** At most this many products a type. */
export const PER_TYPE = 4;

const storesPhrase = (r: RegionInfo) => (r.market === "US" ? "US stores and TCGplayer" : `${r.adjective} stores`);

/** One type's cheapest open products today, at most PER_TYPE. */
export function picksOf(cards: readonly ProductCardData[], type: string): ProductCardData[] {
  return cards
    .filter((p) => p.productType === type && p.lowestPriceCents && p.inStockStores > 0)
    .sort((a, b) => a.lowestPriceCents! - b.lowestPriceCents! || a.slug.localeCompare(b.slug))
    .slice(0, PER_TYPE);
}

function Picks({ r, picks }: { r: RegionInfo; picks: readonly ProductCardData[] }) {
  if (!picks.length) return <p className="text-sm leading-6 text-muted">None is in stock at the stores we compare right now.</p>;
  return (
    <ul className="grid gap-2">
      {picks.map((p) => (
        <li key={p.slug} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border border-line bg-surface px-4 py-3">
          <Link href={productHref(r, p)} prefetch={false} className={LINK}>
            {p.name}
          </Link>
          <span className="text-sm text-muted">
            <b className="text-ink">{money(p.lowestPriceCents, r.market)}</b> · in stock at {plural(p.inStockStores, "store")}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const decks = picksOf(data.cards, "Deck");
  const bb = picksOf(data.cards, "Build & Battle Box");
  const bundles = picksOf(data.cards, "Booster Bundle");
  const tins = picksOf(data.cards, "Tin");
  const about = (label: string) => {
    const t = TYPE_BY_LABEL.get(label);
    return t ? TYPE_ABOUT[t.slug] : null;
  };
  const block = (id: string, title: string, label: string, key: Parameters<typeof typeHref>[1], picks: ProductCardData[], first = false): GuideSection => ({
    id,
    title,
    live: first,
    body: (
      <>
        {about(label) && (
          <Prose>
            <p>{about(label)}</p>
          </Prose>
        )}
        <LiveBlock r={r} checked={data.checked}>
          <Picks r={r} picks={picks} />
        </LiveBlock>
        <NextLinks links={[{ href: typeHref(r, key), label: `Every ${TYPE_BY_LABEL.get(label)?.plural.toLowerCase() ?? label} in ${r.inName}`, icon: "arrow-right" }]} />
      </>
    ),
  });
  const sections: GuideSection[] = [
    {
      id: "which-one",
      title: "Which one to buy",
      body: (
        <Decisions
          rows={[
            { when: <>Learning to play, with a friend or a child</>, then: <>A ready-to-play deck. Battle Academy is made for two new players; a League Battle Deck is a stronger deck for someone who has the basics.</> },
            { when: <>Wants to open packs and play on the day</>, then: <>A Build &amp; Battle Box: packs plus the cards to build a deck around them.</> },
            { when: <>Mostly wants to open packs</>, then: <>A booster bundle or a tin: several packs for less than an Elite Trainer Box.</> },
            { when: <>Already hooked</>, then: <>An Elite Trainer Box or a booster box. See <a href={guideHref(r, "booster-box-vs-etb-vs-booster-bundle")}>booster box vs ETB vs bundle</a>.</> },
          ]}
        />
      ),
    },
    block("decks", "Ready-to-play decks in stock today", "Deck", "deck", decks, true),
    block("build-and-battle", "Build & Battle Boxes in stock today", "Build & Battle Box", "build-battle", bb),
    block("bundles", "Booster bundles in stock today", "Booster Bundle", "booster-bundle", bundles),
    block("tins", "Tins in stock today", "Tin", "tin", tins),
    {
      id: "before-you-buy",
      title: "Before you buy",
      body: (
        <Checklist
          items={[
            <>Buy English product for a player who will play with local friends: Japanese packs look great but play with Japanese text.</>,
            <>Check the listing is sealed and from a store you trust. See <a href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>how to avoid resealed product</a>.</>,
            <>Compare the same product across stores: the cheapest is often not the store you know.</>,
            <>Once they know they like the game, packs are cheapest per pack in bigger products. See <a href={guideHref(r, "cheapest-way-to-buy-pokemon-packs")}>the cheapest way to buy packs</a>.</>,
          ]}
        />
      ),
    },
    whereToBuy(r, { tcg: { query: "Pokemon Battle Academy", label: "Pokémon decks" } }),
  ];
  const cheapest = [...decks, ...bb].sort((a, b) => a.lowestPriceCents! - b.lowestPriceCents!)[0] ?? null;
  return {
    intro: (
      <Lede>
        New to the Pokémon Trading Card Game, or buying for someone who is? Start with something made to be played: a <strong>ready-to-play deck</strong> or a{" "}
        <strong>Build &amp; Battle Box</strong>, not a booster box. {cheapest ? <>{storesPhrase(r)} have one in stock today from <strong>{money(cheapest.lowestPriceCents, r.market)}</strong>.</> : null}{" "}
        Below is which to pick, and the cheapest of each in {r.inName} right now.
      </Lede>
    ),
    sections,
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
