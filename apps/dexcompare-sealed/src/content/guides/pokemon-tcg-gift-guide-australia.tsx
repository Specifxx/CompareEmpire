// Guide: Pokémon TCG gifts in Australia, by budget (the owner's Amazon Associates round, 2026-10-26). AU only.
// Today's open products of the gift types (data.ts GIFT_TYPES: bundles, ETBs, boxes, collections, tins, Build & Battle, blisters) at Australian
// stores, in four price bands, each band showing one product of each type (the newest set's first, then the cheapest) so the list is a
// spread of choices, not ten tins. What each type holds is type-about.ts's words; pack counts are packs.ts's. Every product has its
// Amazon AU "Check price" link (lib/amazon.ts: a search, never an Amazon price) with the Associates statement beside them.
import Link from "next/link";
import type { ProductCardData } from "@/lib/data";
import { money, plural } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { TYPE_BY_LABEL } from "@/lib/sealed-title";
import { SET_BY_CODE } from "@/lib/sets";
import { TYPE_ABOUT } from "@/lib/type-about";
import { toolHref } from "../tools";
import { GIFT_TYPES, type GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import {
  AmazonCheck,
  AmazonNote,
  Checklist,
  Decisions,
  GuideBody,
  guideHref,
  Lede,
  LiveBlock,
  NextLinks,
  Note,
  PACK_SOURCE,
  perPackOf,
  productHref,
  Prose,
  SetChips,
  typeHref,
  whereToBuy,
  type BodyProps,
  type GuideOutline,
  type GuideSection,
} from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("pokemon-tcg-gift-guide-australia")!;
const LINK = "font-semibold text-brand hover:underline";

/** The budget bands, in Australian cents: [from, to) — the last has no top. */
/** The budget bands, in Australian cents ([from, to); the last has no top), each with the product types that belong at that price. */
export const BANDS = [
  { id: "under-50", from: 0, to: 5000, title: "Pokémon gifts under A$50", types: ["Blister", "Tin", "Collection", "Booster Bundle", "Build & Battle Box"] },
  { id: "50-to-100", from: 5000, to: 10000, title: "Pokémon gifts from A$50 to A$100", types: ["Elite Trainer Box", "Booster Bundle", "Collection", "Tin", "Build & Battle Box"] },
  { id: "100-to-200", from: 10000, to: 20000, title: "Pokémon gifts from A$100 to A$200", types: ["Pokémon Center Elite Trainer Box", "Elite Trainer Box", "Ultra-Premium Collection", "Collection"] },
  { id: "200-and-over", from: 20000, to: Infinity, title: "Pokémon gifts from A$200", types: ["Booster Box", "Ultra-Premium Collection", "Pokémon Center Elite Trainer Box"] },
] as const;

/** At most this many products a band. */
export const PER_BAND = 6;
/** A gift is in stock at two or more stores: one store's last box is a price nobody else matches. */
export const MIN_STORES = 2;
/** …and at most this many times the middle price of its type today: an out-of-print outlier is a collector's buy, not a gift pick. */
export const MAX_OVER_MEDIAN = 1.5;

/**
 * One band's picks: products of the band's types priced in [from, to), in stock at MIN_STORES or more, at most MAX_OVER_MEDIAN times
 * their type's median price today; one of each type (the newest set's, then the cheapest), in the band's type order, at most PER_BAND
 * (two of a type when the band has room). Released products only (a pre-order is not a gift on the day).
 */
export function bandPicks(cards: readonly ProductCardData[], band: { from: number; to: number; types: readonly string[] }, today: string): ProductCardData[] {
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 0;
  };
  const eligible = (type: string) => {
    const ofType = cards.filter((p) => p.productType === type && p.lowestPriceCents && p.inStockStores > 0);
    const mid = median(ofType.map((p) => p.lowestPriceCents!));
    return ofType
      .filter((p) => p.lowestPriceCents! >= band.from && p.lowestPriceCents! < band.to && p.inStockStores >= MIN_STORES && p.lowestPriceCents! <= mid * MAX_OVER_MEDIAN)
      .filter((p) => !p.setCode || (SET_BY_CODE.get(p.setCode)?.releaseDate ?? "") <= today)
      .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") || a.lowestPriceCents! - b.lowestPriceCents! || a.slug.localeCompare(b.slug));
  };
  const lists = band.types.map(eligible);
  const out: ProductCardData[] = [];
  for (let round = 0; round < 2 && out.length < PER_BAND; round++) for (const l of lists) if (l[round] && out.length < PER_BAND) out.push(l[round]);
  return out;
}

function Picks({ r, picks }: { r: RegionInfo; picks: readonly ProductCardData[] }) {
  return (
    <ul className="grid gap-2">
      {picks.map((p) => {
        const t = TYPE_BY_LABEL.get(p.productType);
        const { packs, perPack } = perPackOf(p);
        return (
          <li key={p.slug} data-type={t?.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border border-line bg-surface px-4 py-3">
            <span className="min-w-0">
              <Link href={productHref(r, p)} prefetch={false} className={LINK}>
                {p.name}
              </Link>
              <span className="block text-sm text-muted">
                {t ? t.label : p.productType} · <b className="text-ink">{money(p.lowestPriceCents, r.market)}</b>
                {packs != null && perPack != null && (
                  <>
                    {" "}
                    · {plural(packs, "pack")}, {money(perPack, r.market)} a pack
                  </>
                )}{" "}
                · in stock at {plural(p.inStockStores, "store")}
              </span>
            </span>
            <AmazonCheck r={r} p={p} />
          </li>
        );
      })}
    </ul>
  );
}

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const m = (c: number | null | undefined) => money(c ?? null, r.market);
  const bands = BANDS.map((b) => ({ ...b, picks: bandPicks(data.cards, b, data.today) }));
  const open = data.cards.filter((p) => p.inStockStores > 0 && p.lowestPriceCents);
  const cheapest = [...open].sort((a, b) => a.lowestPriceCents! - b.lowestPriceCents!)[0] ?? null;
  const sets = [...new Set(bands.flatMap((b) => b.picks.map((p) => p.setCode)).filter((c): c is string => !!c))]
    .map((c) => SET_BY_CODE.get(c)!)
    .filter(Boolean)
    .slice(0, 6);
  const typesInStock = GIFT_TYPES.filter((t) => open.some((p) => p.productType === t));

  const bandSection = (b: (typeof bands)[number], first: boolean, lead: React.ReactNode): GuideSection => ({
    id: b.id,
    title: b.title,
    live: first,
    body: (
      <>
        <Prose>
          <p>{lead}</p>
        </Prose>
        <LiveBlock r={r} checked={data.checked}>
          {b.picks.length ? <Picks r={r} picks={b.picks} /> : <p className="text-sm leading-6 text-muted">Nothing from these product types is in stock at an Australian store in this budget right now.</p>}
        </LiveBlock>
        <AmazonNote r={r} />
      </>
    ),
  });

  const sections: GuideSection[] = [
    bandSection(
      bands[0],
      true,
      <>
        Under A$50 is mostly blister packs at Australian stores, with the odd tin or small collection. Below, products of those types in stock at two or more Australian stores today,
        the newest set&rsquo;s first, each at the cheapest store&rsquo;s own price including GST and before delivery. Every name opens its product page, which lists every
        Australian store that has it.
      </>,
    ),
    bandSection(
      bands[1],
      false,
      <>
        From A$50 to A$100 most Elite Trainer Boxes, larger collections and premium tins come into reach. An ETB is the classic gift for a player: a set&rsquo;s packs and
        everything needed to play with them in one box.
      </>,
    ),
    bandSection(
      bands[2],
      false,
      <>
        From A$100 to A$200 sit Pokémon Center Elite Trainer Boxes, Ultra-Premium Collections and the bigger collection boxes: gifts that are as much about the box and its promo
        cards as the packs.
      </>,
    ),
    bandSection(
      bands[3],
      false,
      <>
        From A$200, the booster box: 36 packs of one set, the most packs in one sealed product and the one many collectors keep sealed. Ultra-Premium Collections and some
        Pokémon Center ETBs sit here too.
      </>,
    ),
    {
      id: "what-each-holds",
      title: "What each gift holds",
      body: (
        <>
          <Decisions
            rows={GIFT_TYPES.map((label) => {
              const t = TYPE_BY_LABEL.get(label)!;
              const from = open.filter((p) => p.productType === label).sort((a, b) => a.lowestPriceCents! - b.lowestPriceCents!)[0];
              return {
                when: t.plural,
                then: (
                  <>
                    {TYPE_ABOUT[t.slug]} {from ? <>In stock in Australia today from {m(from.lowestPriceCents)}.</> : <>None in stock in Australia right now.</>}{" "}
                    <Link href={typeHref(r, t.key)}>Every one in Australia</Link>.
                  </>
                ),
              };
            })}
          />
          <Prose>
            <p>
              Not sure which set? A set&rsquo;s page shows every sealed product from it that Australian stores list, with the cheapest of each type. The newest sets are the ones
              most people are opening right now; an older set can be the one a collector is missing.
            </p>
          </Prose>
          <SetChips r={r} listed={data.listedSets} sets={sets} />
        </>
      ),
    },
    {
      id: "before-you-order",
      title: "Before you order a gift",
      body: (
        <>
          <Checklist
            items={[
              <>Check the store&rsquo;s delivery estimate to your postcode, and order early if it needs to arrive by a date such as Christmas Day, 25 December.</>,
              <>Add delivery to the price: a few dollars of postage can change which store is cheapest.</>,
              <>Pre-orders ship around release day, not when you order: a set that isn&rsquo;t out yet is a promise, not a parcel.</>,
              <>Check the returns policy, in case the gift is a duplicate.</>,
              <>
                Check the shrink-wrap when it arrives: <Link href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>how to avoid resealed products</Link>.
              </>,
              <>Buying on Amazon AU? Check who the seller is and the delivery date on Amazon&rsquo;s page before you order.</>,
            ]}
          />
          <Prose>
            <p>
              Choosing between two? <Link href={guideHref(r, "booster-box-vs-etb-vs-booster-bundle")}>Booster box vs ETB vs bundle</Link> explains the three most bought products,
              and <Link href={guideHref(r, "best-pokemon-elite-trainer-boxes-australia")}>the best ETBs in Australia</Link> ranks today&rsquo;s ETBs by price per pack. The{" "}
              <strong>value checker</strong> shows the cheapest Australian price of anything you were offered.
            </p>
          </Prose>
          <NextLinks
            links={[
              { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
              { href: `/${r.region}/deals`, label: "Today’s deals", icon: "tag" },
              { href: guideHref(r, "where-to-buy-pokemon-cards-australia"), label: "Where to buy in Australia", icon: "store" },
            ]}
          />
          <Note>
            Prices are each Australian store&rsquo;s listed price including GST, excluding delivery, read about twice a day. {PACK_SOURCE}
          </Note>
        </>
      ),
    },
    whereToBuy(r, {
      amazon: { query: "Pokemon TCG", label: "Pokémon TCG" },
      links: [
        { href: typeHref(r, "booster-bundle"), label: "Every booster bundle in Australia" },
        { href: typeHref(r, "etb"), label: "Every ETB in Australia" },
      ],
    }),
  ];

  return {
    intro: (
      <Lede>
        {cheapest ? (
          <>
            {plural(typesInStock.length, "kind")} of Pokémon TCG gift {typesInStock.length === 1 ? "is" : "are"} in stock at Australian stores today, from <strong>{m(cheapest.lowestPriceCents)}</strong>.{" "}
          </>
        ) : (
          <>Nothing from these product types is in stock at an Australian store right now. </>
        )}
        Here they are by budget, one of each kind in each band, with what each one holds and what to check before you order. Every price is today&rsquo;s, from the stores&rsquo;
        own listings.{" "}
        <Link href={`/${r.region}/deals`} prefetch={false} className={LINK}>
          Today&rsquo;s deals in Australia →
        </Link>
      </Lede>
    ),
    sections,
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
