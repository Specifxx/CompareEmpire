// Guide: Pokémon TCG Christmas gifts in the US, UK and Canada, by budget (owner, 2026-11-10: Pokémon hype, Christmas five weeks out).
// The Australian gift guide's picking (bandPicks) and rows, with budget bands in each market's own money (never converted) and copy
// that names the region. Every price is a store's own listing today; pre-orders are never picked; no delivery date is promised.
import Link from "next/link";
import type { ProductCardData } from "@/lib/data";
import { money, plural } from "@/lib/format";
import type { Region, RegionInfo } from "@/lib/regions";
import { TYPE_BY_LABEL } from "@/lib/sealed-title";
import { SET_BY_CODE } from "@/lib/sets";
import { TYPE_ABOUT } from "@/lib/type-about";
import { toolHref } from "../tools";
import { GIFT_TYPES, type GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import { bandPicks, PER_BAND } from "./pokemon-tcg-gift-guide-australia";
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

const GUIDE = GUIDE_BY_SLUG.get("pokemon-tcg-christmas-gift-guide")!;
const LINK = "font-semibold text-brand hover:underline";

/** The three band edges in whole units of each market's own money (US$, £, C$): bands are [0,a) [a,b) [b,c) [c,∞). */
export const EDGES: Partial<Record<Region, readonly [number, number, number]>> = { us: [30, 60, 120], uk: [20, 50, 100], ca: [45, 90, 180] };
const TYPES = [
  ["Blister", "Tin", "Collection", "Booster Bundle", "Build & Battle Box"],
  ["Elite Trainer Box", "Booster Bundle", "Collection", "Tin", "Build & Battle Box"],
  ["Pokémon Center Elite Trainer Box", "Elite Trainer Box", "Ultra-Premium Collection", "Collection"],
  ["Booster Box", "Ultra-Premium Collection", "Pokémon Center Elite Trainer Box"],
] as const;

export function bandsFor(r: RegionInfo, m: (c: number) => string) {
  const e = EDGES[r.region] ?? EDGES.us!;
  const cuts = [0, e[0] * 100, e[1] * 100, e[2] * 100, Infinity];
  return TYPES.map((types, i) => ({
    id: ["under-" + e[0], `${e[0]}-to-${e[1]}`, `${e[1]}-to-${e[2]}`, `${e[2]}-and-over`][i],
    from: cuts[i],
    to: cuts[i + 1],
    types,
    title: i === 0 ? `Pokémon gifts under ${m(cuts[1])}` : i === 3 ? `Pokémon gifts from ${m(cuts[3])}` : `Pokémon gifts from ${m(cuts[i])} to ${m(cuts[i + 1])}`,
  }));
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
  const bands = bandsFor(r, m).map((b) => ({ ...b, picks: bandPicks(data.cards, b, data.today).slice(0, PER_BAND) }));
  const open = data.cards.filter((p) => p.inStockStores > 0 && p.lowestPriceCents);
  const cheapest = [...open].sort((a, b) => a.lowestPriceCents! - b.lowestPriceCents!)[0] ?? null;
  const sets = [...new Set(bands.flatMap((b) => b.picks.map((p) => p.setCode)).filter((c): c is string => !!c))]
    .map((c) => SET_BY_CODE.get(c)!)
    .filter(Boolean)
    .slice(0, 6);
  const typesInStock = GIFT_TYPES.filter((t) => open.some((p) => p.productType === t));
  const where = r.inName;
  const adj = r.adjective;

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
          {b.picks.length ? <Picks r={r} picks={b.picks} /> : <p className="text-sm leading-6 text-muted">Nothing from these product types is in stock at two or more stores {where} in this budget right now.</p>}
        </LiveBlock>
        <AmazonNote r={r} />
      </>
    ),
  });

  const sections: GuideSection[] = [
    bandSection(bands[0], true, <>Small gifts and stocking fillers: blister packs, tins and small collections. Below, products of those types in stock at two or more {adj} stores today, the newest set&rsquo;s first, each at the cheapest store&rsquo;s own price before delivery. Every name opens its product page, which lists every store that has it.</>),
    bandSection(bands[1], false, <>This is where most Elite Trainer Boxes, larger collections and premium tins sit. An ETB is the classic gift for a player: a set&rsquo;s packs and everything needed to play with them in one box.</>),
    bandSection(bands[2], false, <>Pokémon Center Elite Trainer Boxes, Ultra-Premium Collections and the bigger collection boxes: gifts that are as much about the box and its promo cards as the packs.</>),
    bandSection(bands[3], false, <>The booster box: 36 packs of one set, the most packs in one sealed product and the one many collectors keep sealed. Ultra-Premium Collections and some Pokémon Center ETBs sit here too.</>),
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
                    {TYPE_ABOUT[t.slug]} {from ? <>In stock {where} today from {m(from.lowestPriceCents)}.</> : <>None in stock {where} right now.</>}{" "}
                    <Link href={typeHref(r, t.key)}>Every one {where}</Link>.
                  </>
                ),
              };
            })}
          />
          <Prose>
            <p>Not sure which set? A set&rsquo;s page shows every sealed product from it that {adj} stores list, with the cheapest of each type. The newest sets are the ones most people are opening right now; an older set can be the one a collector is missing.</p>
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
              <>Check the store&rsquo;s own delivery estimate, and order early if it must arrive by Christmas Day, 25 December. We do not know any store&rsquo;s cut-off date: the store&rsquo;s checkout does.</>,
              <>Add delivery to the price: a few dollars of postage can change which store is cheapest. {r.taxNote}</>,
              <>Pre-orders ship around release day, not when you order: a set that isn&rsquo;t out yet is a promise, not a parcel.</>,
              <>Check the returns policy, in case the gift is a duplicate.</>,
              <>
                Check the shrink-wrap when it arrives: <Link href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>how to avoid resealed products</Link>.
              </>,
            ]}
          />
          <Prose>
            <p>
              Choosing between two? <Link href={guideHref(r, "booster-box-vs-etb-vs-booster-bundle")}>Booster box vs ETB vs bundle</Link> explains the three most bought products. The{" "}
              <strong>value checker</strong> shows the cheapest price {where} of anything you were offered.
            </p>
          </Prose>
          <NextLinks
            links={[
              { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
              { href: `/${r.region}/deals`, label: "Today’s deals", icon: "tag" },
              { href: `/${r.region}/black-friday`, label: "Black Friday prices", icon: "tag" },
            ]}
          />
          <Note>
            Prices are each store&rsquo;s listed price, {r.taxNote.charAt(0).toLowerCase() + r.taxNote.slice(1)} Excluding delivery, read about twice a day. {PACK_SOURCE}
          </Note>
        </>
      ),
    },
    whereToBuy(r, {
      amazon: { query: "Pokemon TCG", label: "Pokémon TCG" },
      tcg: { query: "Pokemon TCG", label: "Pokémon TCG" },
      links: [
        { href: typeHref(r, "booster-bundle"), label: `Every booster bundle ${where}` },
        { href: typeHref(r, "etb"), label: `Every ETB ${where}` },
      ],
    }),
  ];

  return {
    intro: (
      <Lede>
        {cheapest ? (
          <>
            {plural(typesInStock.length, "kind")} of Pokémon TCG gift {typesInStock.length === 1 ? "is" : "are"} in stock at {adj} stores today, from <strong>{m(cheapest.lowestPriceCents)}</strong>.{" "}
          </>
        ) : (
          <>Nothing from these product types is in stock at an {adj} store right now. </>
        )}
        Christmas is 25 December. Here are the gifts by budget, one of each kind in each band, with what each one holds and what to check before you order. Every price is today&rsquo;s, from the stores&rsquo; own listings.{" "}
        <Link href={`/${r.region}/deals`} prefetch={false} className={LINK}>
          Today&rsquo;s deals {where} →
        </Link>
      </Lede>
    ),
    sections,
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
