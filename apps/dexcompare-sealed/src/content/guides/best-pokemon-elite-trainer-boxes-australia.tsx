// Guide: the best Pokémon Elite Trainer Boxes to buy in Australia (the owner's Amazon Associates round, 2026-10-26). AU only.
// "Best" by what the site measures and nothing else: price per pack (packs.ts), how many Australian stores have it in stock today, and
// the set (sets.ts: name, series, release date). Every open ETB and Pokémon Center ETB at Australian stores (data.ts openOfType), each
// with its Amazon AU "Check price" link (lib/amazon.ts: a search, never an Amazon price) and the Associates statement beside them.
import Link from "next/link";
import type { ProductCardData } from "@/lib/data";
import { money, plural } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { SET_BY_CODE, SETS, type PokemonSet } from "@/lib/sets";
import { TYPE_ABOUT } from "@/lib/type-about";
import { toolHref } from "../tools";
import type { GuideData } from "./data";
import { specialEtbSets } from "./facts";
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
  setHref,
  SetChips,
  StackTable,
  typeHref,
  whereText,
  whereToBuy,
  type BodyProps,
  type GuideOutline,
  type GuideSection,
} from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("best-pokemon-elite-trainer-boxes-australia")!;
const LINK = "font-semibold text-brand hover:underline";
export const ETB = "Elite Trainer Box";
export const PC_ETB = "Pokémon Center Elite Trainer Box";
/** The by-set table's rows: the newest sets (the rest are one link away, on the type page). */
export const TABLE_SETS = 12;

export interface EtbRow {
  p: ProductCardData;
  set: PokemonSet | null;
  perPack: number | null;
  preorder: boolean;
}

/** Every open ETB (or Pokémon Center ETB) with a price, cheapest first; a set not out yet is a pre-order. */
export function etbRows(cards: readonly ProductCardData[], type: string, today: string): EtbRow[] {
  return cards
    .filter((p) => p.productType === type && p.lowestPriceCents)
    .map((p) => {
      const set = p.setCode ? SET_BY_CODE.get(p.setCode) ?? null : null;
      return { p, set, perPack: perPackOf(p).perPack, preorder: !!set && set.releaseDate > today };
    })
    .sort((a, b) => a.p.lowestPriceCents! - b.p.lowestPriceCents! || a.p.slug.localeCompare(b.p.slug));
}

/** The cheapest row of each set, sets newest first (sets.ts order). */
export function cheapestPerSet(rows: readonly EtbRow[]): (EtbRow & { set: PokemonSet })[] {
  const best = new Map<string, EtbRow & { set: PokemonSet }>();
  for (const x of rows) if (x.set && !best.has(x.set.code)) best.set(x.set.code, x as EtbRow & { set: PokemonSet });
  return SETS.map((s) => best.get(s.code)).filter((x): x is EtbRow & { set: PokemonSet } => !!x);
}

function EtbTable({ r, rows, caption }: { r: RegionInfo; rows: readonly EtbRow[]; caption: string }) {
  return (
    <StackTable
      caption={caption}
      head={["Elite Trainer Box", "Price", "Per pack", "In stock at", "Amazon AU"]}
      rows={rows.map((x) => ({
        key: x.p.slug,
        type: "etb",
        th: (
          <span className="flex min-w-0 flex-col gap-0.5">
            <Link href={productHref(r, x.p)} prefetch={false} className="font-semibold text-ink hover:text-brand hover:underline">
              {x.p.name}
            </Link>
            {x.set && (
              <Link href={setHref(r, x.set)} prefetch={false} className="truncate text-xs font-medium text-brand underline-offset-2 hover:underline">
                All {x.set.name} sealed
              </Link>
            )}
          </span>
        ),
        cells: [
          <span key="p" className="font-semibold">
            {money(x.p.lowestPriceCents, r.market)}
          </span>,
          <span key="pp">{x.perPack != null ? money(x.perPack, r.market) : "—"}</span>,
          <span key="w" className="text-muted">
            {whereText(x.p)}
          </span>,
          <AmazonCheck key="a" r={r} p={x.p} />,
        ],
      }))}
    />
  );
}

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const all = etbRows(data.cards, ETB, data.today);
  const released = all.filter((x) => !x.preorder);
  const pre = cheapestPerSet(all.filter((x) => x.preorder));
  const bySet = cheapestPerSet(released);
  const pc = etbRows(data.cards, PC_ETB, data.today).filter((x) => !x.preorder);
  const m = (c: number | null | undefined) => money(c ?? null, r.market);
  const perPack = [...released].filter((x) => x.perPack != null).sort((a, b) => a.perPack! - b.perPack! || a.p.slug.localeCompare(b.p.slug)).slice(0, 5);
  const stocked = [...released].sort((a, b) => b.p.inStockStores - a.p.inStockStores || a.p.lowestPriceCents! - b.p.lowestPriceCents!).slice(0, 5);
  const newest = bySet[0] ?? null;
  const cheapest = released[0] ?? null;
  const special = specialEtbSets().filter((x) => x.packs != null).slice(0, 4);

  const sections: GuideSection[] = [
    {
      id: "by-set",
      title: "Each set's cheapest Elite Trainer Box in Australia today",
      live: true,
      body: (
        <>
          <Prose>
            <p>
              Every Pokémon set with an Elite Trainer Box in stock at an Australian store today, newest set first, with that set&rsquo;s cheapest ETB. Each price is one
              Australian store&rsquo;s own listed price in Australian dollars, including GST and before delivery. &ldquo;In stock at&rdquo; counts the Australian stores we read
              that have it on the shelf right now, and the product page lists every one of them, cheapest first.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {bySet.length ? (
              <>
                <EtbTable r={r} rows={bySet.slice(0, TABLE_SETS)} caption="The cheapest in-stock Elite Trainer Box of each Pokémon set at Australian stores today, newest set first" />
                {bySet.length > TABLE_SETS && (
                  <p className="mt-3 text-sm text-muted">
                    {plural(bySet.length - TABLE_SETS, "older set")} {bySet.length - TABLE_SETS === 1 ? "has" : "have"} an ETB in stock too:{" "}
                    <Link href={typeHref(r, "etb")} prefetch={false} className={LINK}>
                      every ETB in Australia
                    </Link>
                    .
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm leading-6 text-muted">No Elite Trainer Box is in stock at an Australian store right now.</p>
            )}
          </LiveBlock>
          <AmazonNote r={r} />
          <Prose>
            {cheapest && (
              <p>
                The cheapest ETB in Australia today is the <Link href={productHref(r, cheapest.p)}>{cheapest.p.name}</Link> at <strong>{m(cheapest.p.lowestPriceCents)}</strong>
                {cheapest.perPack != null && <> ({m(cheapest.perPack)} a pack)</>}, and {plural(released.length, "Elite Trainer Box", "Elite Trainer Boxes")} {released.length === 1 ? "is" : "are"} in
                stock across {plural(bySet.length, "set")}.
                {newest && newest.set && (
                  <>
                    {" "}
                    The newest set with one on the shelf is {newest.set.name}, released {formatRelease(newest.set.releaseDate)}, from {m(newest.p.lowestPriceCents)}.
                  </>
                )}
              </p>
            )}
          </Prose>
          <SetChips r={r} listed={data.listedSets} sets={bySet.slice(0, 6).map((x) => x.set)} />
        </>
      ),
    },
    {
      id: "cheapest-per-pack",
      title: "The most packs for the money",
      live: true,
      body: (
        <>
          <Prose>
            <p>
              An Elite Trainer Box is bought for its packs as much as its accessories, so the fairest way to put two ETBs side by side is the price per pack: the box&rsquo;s price
              divided by the booster packs inside it. Most hold eight or nine, and a few sets&rsquo; ETBs hold more or fewer, so a cheaper box isn&rsquo;t always the cheaper
              pack. These are the five in-stock ETBs with the lowest price per pack in Australia today.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {perPack.length ? (
              <ol className="grid gap-2">
                {perPack.map((x, i) => (
                  <li key={x.p.slug} data-type="etb" className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border border-line bg-surface px-4 py-3">
                    <span className="min-w-0">
                      <span className="mr-2 font-display font-bold text-muted">{i + 1}.</span>
                      <Link href={productHref(r, x.p)} prefetch={false} className={LINK}>
                        {x.p.name}
                      </Link>{" "}
                      <span className="text-sm text-muted">
                        {m(x.perPack)} a pack · {m(x.p.lowestPriceCents)} · in stock at {plural(x.p.inStockStores, "store")}
                      </span>
                    </span>
                    <AmazonCheck r={r} p={x.p} />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm leading-6 text-muted">No Elite Trainer Box with a known pack count is in stock at an Australian store right now.</p>
            )}
          </LiveBlock>
          <Prose>
            <p>
              A low price per pack on an older set often means a store is clearing its last few. That is a good buy if it is the set you want, but check the listing is the
              English-language ETB, sealed, and not a display box or a bundle with a similar name. <Link href={guideHref(r, "cheapest-way-to-buy-pokemon-packs")}>The cheapest way to buy
              Pokémon packs</Link> compares ETBs with booster boxes, bundles and loose packs on the same per-pack measure.
            </p>
          </Prose>
        </>
      ),
    },
    {
      id: "most-stocked",
      title: "The easiest ETBs to shop around for",
      body: (
        <>
          <Prose>
            <p>
              An ETB in stock at many Australian stores is one you can buy where delivery suits you, from a store you already trust, or collect locally. These are the ETBs
              in stock at the most Australian stores we read today.
            </p>
          </Prose>
          <ul className="grid gap-2">
            {stocked.map((x) => (
              <li key={x.p.slug} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border border-line bg-surface px-4 py-3">
                <span className="min-w-0">
                  <Link href={productHref(r, x.p)} prefetch={false} className={LINK}>
                    {x.p.name}
                  </Link>{" "}
                  <span className="text-sm text-muted">
                    in stock at {plural(x.p.inStockStores, "store")}, from {m(x.p.lowestPriceCents)}
                  </span>
                </span>
                <AmazonCheck r={r} p={x.p} />
              </li>
            ))}
          </ul>
          <AmazonNote r={r} />
        </>
      ),
    },
    {
      id: "what-you-get",
      title: "What an Elite Trainer Box holds",
      body: (
        <Prose>
          <p>{TYPE_ABOUT["elite-trainer-boxes"]}</p>
          <p>
            The pack count is set by the product line, not the store, and it changes between sets: our data records it from the publisher&rsquo;s product listings.
            {special.length > 0 && (
              <>
                {" "}
                Sets whose ETB differs from its series&rsquo; usual count include{" "}
                {special.map((x, i) => (
                  <span key={x.set.code}>
                    {i > 0 && (i === special.length - 1 ? " and " : ", ")}
                    {x.set.name} ({plural(x.packs!, "pack")})
                  </span>
                ))}
                .
              </>
            )}{" "}
            Each product page shows its own pack count and the price per pack beside every store.
          </p>
          <p>
            An ETB suits someone who wants a set&rsquo;s packs and the things to play with them in one box; a <Link href={typeHref(r, "booster-bundle")}>booster bundle</Link> holds packs
            only, for less, and a <Link href={typeHref(r, "booster-box")}>booster box</Link> holds 36 packs of one set. <Link href={guideHref(r, "whats-in-a-pokemon-elite-trainer-box")}>What&rsquo;s
            in an Elite Trainer Box</Link> goes through the contents in detail.
          </p>
        </Prose>
      ),
    },
    {
      id: "pokemon-center",
      title: "Pokémon Center Elite Trainer Boxes",
      body: (
        <>
          <Prose>
            <p>{TYPE_ABOUT["pokemon-center-elite-trainer-boxes"]}</p>
            <p>
              {pc.length ? (
                <>
                  {plural(pc.length, "Pokémon Center ETB")} {pc.length === 1 ? "is" : "are"} in stock at Australian stores today, from {m(pc[0].p.lowestPriceCents)} for the{" "}
                  <Link href={productHref(r, pc[0].p)}>{pc[0].p.name}</Link>
                  {pc[0].perPack != null && <> ({m(pc[0].perPack)} a pack)</>}.
                </>
              ) : (
                <>No Pokémon Center Elite Trainer Box is in stock at an Australian store right now.</>
              )}{" "}
              <Link href={guideHref(r, "pokemon-center-etb-vs-elite-trainer-box")}>Pokémon Center ETB vs Elite Trainer Box</Link> compares the two for the same set.
            </p>
          </Prose>
          {pc.length > 0 && <EtbTable r={r} rows={pc.slice(0, 5)} caption="The cheapest in-stock Pokémon Center Elite Trainer Boxes at Australian stores today" />}
        </>
      ),
    },
    {
      id: "pre-orders",
      title: "Elite Trainer Boxes on pre-order",
      body: (
        <Prose>
          {pre.length ? (
            <p>
              {pre.map((x, i) => (
                <span key={x.p.slug}>
                  {i > 0 && " "}
                  {x.set.name} releases on {formatRelease(x.set.releaseDate)}; its cheapest Australian ETB pre-order today is {m(x.p.lowestPriceCents)}, open at{" "}
                  {plural(x.p.inStockStores, "store")}. Compare every store on the <Link href={productHref(r, x.p)}>{x.p.name}</Link> page.
                </span>
              ))}{" "}
              Read <Link href={guideHref(r, "how-to-preorder-pokemon-tcg")}>how to pre-order Pokémon TCG sets</Link> before you pay for one.
            </p>
          ) : (
            <p>
              No Elite Trainer Box is open for pre-order at an Australian store right now. When the next set is announced, its pre-order page lists every store taking
              orders; <Link href={guideHref(r, "how-to-preorder-pokemon-tcg")}>how to pre-order Pokémon TCG sets</Link> covers what to check first.
            </p>
          )}
        </Prose>
      ),
    },
    {
      id: "which-etb",
      title: "Which ETB suits what you want",
      body: (
        <>
          <Decisions
            rows={[
              {
                when: "The most packs for the money",
                then: <>Start with the price-per-pack list above, then add delivery to your postcode before you compare two stores.</>,
              },
              {
                when: "The newest set",
                then: newest ? (
                  <>
                    {newest.set.name}&rsquo;s ETB is in stock from {m(newest.p.lowestPriceCents)} today; its <Link href={setHref(r, newest.set)}>set page</Link> lists everything else from the set.
                  </>
                ) : (
                  <>Open the newest set&rsquo;s page: it lists every sealed product stores have.</>
                ),
              },
              {
                when: "A gift",
                then: (
                  <>
                    An ETB is a complete box to open on the day. <Link href={guideHref(r, "pokemon-tcg-gift-guide-australia")}>Our gift guide</Link> sets it beside bundles, tins and
                    collections at every budget.
                  </>
                ),
              },
              {
                when: "Keeping it sealed",
                then: <>Buy from a store you trust, check the shrink-wrap on arrival, and keep the receipt: <Link href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>how to avoid resealed products</Link>.</>,
              },
            ]}
          />
        </>
      ),
    },
    {
      id: "checks",
      title: "Before you buy",
      body: (
        <>
          <Checklist
            items={[
              <>Check the listing is an Elite Trainer Box, not an ETB case, a Pokémon Center ETB or a booster bundle with a similar name.</>,
              <>Add delivery to your postcode: two ETBs a few dollars apart can swap places once it is added.</>,
              <>New to a store? Look for an ABN, a returns policy and contact details.</>,
              <>Buying on Amazon AU? Check who the seller is and the delivery date on Amazon&rsquo;s page before you order.</>,
              <>
                Comparing with eBay? Add the postage and check the seller: <Link href={guideHref(r, "ebay-vs-australian-stores-pokemon-fees")}>eBay vs Australian stores</Link>.
              </>,
            ]}
          />
          <Prose>
            <p>
              Trading or selling an ETB? The <strong>value checker</strong> shows the cheapest Australian in-stock price of any sealed product, and the{" "}
              <strong>trade calculator</strong> sets two sides of a trade against today&rsquo;s prices.
            </p>
          </Prose>
          <NextLinks
            links={[
              { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
              { href: toolHref(r.region, "trade-calculator"), label: "Trade calculator", icon: "arrow-right" },
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
      amazon: { query: "Pokemon Elite Trainer Box", label: "Elite Trainer Box" },
      links: [
        { href: typeHref(r, "etb"), label: "Every ETB in Australia" },
        { href: typeHref(r, "pc-etb"), label: "Pokémon Center ETBs" },
      ],
    }),
  ];

  return {
    intro: (
      <Lede>
        {cheapest ? (
          <>
            {plural(released.length, "Pokémon Elite Trainer Box", "Pokémon Elite Trainer Boxes")} {released.length === 1 ? "is" : "are"} in stock at Australian stores today, from{" "}
            <strong>{m(cheapest.p.lowestPriceCents)}</strong>.{" "}
          </>
        ) : (
          <>No Pokémon Elite Trainer Box is in stock at an Australian store right now. </>
        )}
        The best one to buy depends on what you want from it, so here they are by set, by price per pack and by how many stores have them, with the Pokémon Center ETBs and
        pre-orders apart. Every number is today&rsquo;s, from the stores&rsquo; own listings.{" "}
        <Link href={`/${r.region}/type/elite-trainer-boxes`} prefetch={false} className={LINK}>
          All ETBs in Australia →
        </Link>
      </Lede>
    ),
    sections,
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
