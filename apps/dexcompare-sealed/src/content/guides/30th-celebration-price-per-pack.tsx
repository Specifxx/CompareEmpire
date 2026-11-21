// Guide: Pokémon 30th Celebration, which product is the best value per pack (2026-11-20; the queries "30th celebration etb price",
// "best 30th celebration product to buy"). 30th Celebration has no booster box (sets.ts NO_BOOSTER_BOX), so the box-price shape
// (set-booster-box-price.tsx) does not fit: buyers choose between an ETB, a bundle, tins and a dozen collections instead.
//
// Every price is the region's live, open listings of the set (data.ts: productsBySet, open only). Pack counts come only from:
//  - packs.ts for the ETB (9), Pokémon Center ETB (11), booster bundle (6) and loose pack (1), the site's sourced counts;
//  - the publisher's product line-up (set-reveal.tsx REVEALS.cel30, The Pokémon Company International's media alert) for the Poster
//    Collection (3), Tech Sticker Collection (3), Pokémon ex Box (4) and ex Tin (4).
// Every other product (mini tins, Knock Out, figure, Ditto, binder and Ultra-Premium collections, battle decks) is priced but gets
// no per-pack figure: we have no sourced count for it. No pull rates, no card values, no forecast.
import Link from "next/link";
import { cardOpen } from "@/lib/compact";
import type { ProductCardData } from "@/lib/data";
import { money, plural } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import type { GuideData } from "./data";
import { toolHref } from "../tools";
import { GUIDE_BY_SLUG, guideFor } from "./index";
import {
  Checklist,
  GuideBody,
  guideHref,
  Lede,
  LiveBlock,
  NextLinks,
  Note,
  perPackOf,
  productHref,
  Prose,
  setHref,
  setOf,
  StackTable,
  whereText,
  whereToBuy,
  type BodyProps,
  type GuideOutline,
} from "./kit";
import { REVEALS } from "./set-reveal";

const GUIDE = GUIDE_BY_SLUG.get("30th-celebration-price-per-pack")!;
export const CODE = "cel30";
const LINK = "font-semibold text-brand hover:underline";

/** Listings that are not the English retail product a buyer compares: imports, cases, multi-buys and singles filed as collections. */
const NOT_RETAIL = /international|japanese|\bcase\b|set of two|premium deck set|\bduo\b|black friday|\s-\sME:\s|\(\d+\)\s-\s/i;

export interface Line {
  key: string;
  label: string;
  /** Which listings belong to the line: a product type label, or a name pattern. */
  match: (p: ProductCardData) => boolean;
  /** Packs from the publisher's line-up (REVEALS.cel30); unset = packs.ts decides, or none. */
  packs?: number;
  /** What it holds, in a few words. */
  holds: string;
}

/** The product lines, in the order the guide lists them. Order matters: a name is read by the first line it matches. */
export const LINES: readonly Line[] = [
  { key: "pack", label: "Booster pack", match: (p) => p.productType === "Booster Pack", holds: "one 30th Celebration booster pack" },
  { key: "bundle", label: "Booster bundle", match: (p) => p.productType === "Booster Bundle", holds: "6 booster packs, nothing else" },
  { key: "etb", label: "Elite Trainer Box", match: (p) => p.productType === "Elite Trainer Box", holds: "9 booster packs, a Nidorina promo and the play accessories" },
  {
    key: "pc-etb",
    label: "Pokémon Center Elite Trainer Box",
    match: (p) => p.productType === "Pokémon Center Elite Trainer Box",
    holds: "the Pokémon Center's own ETB, with two more packs than the standard one",
  },
  { key: "poster", label: "Poster Collection", match: (p) => /poster collection/i.test(p.name), packs: 3, holds: "3 packs, Articuno, Zapdos and Moltres promos and a poster" },
  { key: "sticker", label: "Tech Sticker Collection", match: (p) => /tech sticker collection/i.test(p.name), packs: 3, holds: "3 packs, a foil promo and a sticker sheet" },
  { key: "ex-box", label: "Pokémon ex Box", match: (p) => /\bex\s*box\b/i.test(p.name), packs: 4, holds: "4 packs, a Sylveon ex or Greninja ex promo and an oversize card" },
  { key: "ex-tin", label: "ex Tin", match: (p) => p.productType === "Tin" && /\bex\b/i.test(p.name) && !/mini/i.test(p.name), packs: 4, holds: "4 packs and a Sylveon ex or Greninja ex promo" },
  { key: "mini-tin", label: "Mini tin", match: (p) => /mini\s*tin/i.test(p.name), holds: "a small tin; the pack count is on the listing" },
  { key: "knockout", label: "Knock Out Collection", match: (p) => /knock\s*-?\s*out collection/i.test(p.name), holds: "a collection with packs and a promo; check the listing for the count" },
  { key: "figure", label: "Figure Collection", match: (p) => /figure collection/i.test(p.name), holds: "a Mew or Mewtwo figure with packs, as the listings name it" },
  { key: "ditto", label: "Ditto Premium Collection", match: (p) => /ditto premium/i.test(p.name), holds: "a premium collection; check the listing for the pack count" },
  { key: "binder", label: "Binder Collection", match: (p) => /binder collection/i.test(p.name), holds: "a binder with packs; check the listing for the count" },
  { key: "upc", label: "Ultra-Premium Collection", match: (p) => p.productType === "Ultra-Premium Collection", holds: "the largest 30th Celebration product, in Day and Night versions" },
  { key: "deck", label: "Battle Deck", match: (p) => p.productType === "Deck" && /battle deck/i.test(p.name), holds: "a ready-to-play Espeon ex or Umbreon ex deck" },
];

export interface LineRow {
  line: Line;
  /** The cheapest open listing of the line in the region. */
  p: ProductCardData;
  /** Open listings of the line here. */
  listings: number;
  packs: number | null;
  perPack: number | null;
}

/** Pure: each line's cheapest open listing in the region (lines with none are dropped), with its pack count and price per pack. */
export function lineRows(products: readonly ProductCardData[]): LineRow[] {
  const open = products.filter((p) => cardOpen(p) && p.setCode === CODE && p.lowestPriceCents != null && !NOT_RETAIL.test(p.name));
  const taken = new Set<string>();
  const rows: LineRow[] = [];
  for (const line of LINES) {
    const mine = open.filter((p) => !taken.has(p.slug) && line.match(p));
    mine.forEach((p) => taken.add(p.slug));
    if (!mine.length) continue;
    const p = [...mine].sort((a, b) => (a.lowestPriceCents ?? 0) - (b.lowestPriceCents ?? 0))[0];
    const packs = line.packs ?? perPackOf(p).packs;
    rows.push({ line, p, listings: mine.length, packs, perPack: packs && p.lowestPriceCents ? Math.round(p.lowestPriceCents / packs) : null });
  }
  return rows;
}

/** Pure: the rows with a per-pack price, cheapest per pack first. */
export const perPackRanking = (rows: readonly LineRow[]) => rows.filter((r): r is LineRow & { perPack: number } => r.perPack != null).sort((a, b) => a.perPack - b.perPack);

/** "as a loose pack" / "inside the Elite Trainer Box". */
const inside = (x: LineRow) => (x.line.key === "pack" ? "as a loose pack" : `inside the ${x.line.label}`);

const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const set = setOf(CODE)!;
  const rows = lineRows(data.bySet[CODE] ?? []);
  const ranked = perPackRanking(rows);
  const best = ranked[0] ?? null;
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const by = (k: string) => rows.find((x) => x.line.key === k) ?? null;
  const pack = by("pack");
  const etb = by("etb");
  const pcEtb = by("pc-etb");
  const bundle = by("bundle");
  const exBox = by("ex-box");
  const exTin = by("ex-tin");
  const unpacked = rows.filter((x) => x.perPack == null);
  const m = (c: number | null | undefined) => money(c ?? null, r.market);
  const lineup = REVEALS.cel30;
  const gift = (["pokemon-tcg-christmas-gift-guide", "pokemon-tcg-gift-guide-australia"] as const).find((g) => guideFor(g, r.region)) ?? null;

  return {
    intro: (
      <Lede>
        {best?.line.key === "pack" ? (
          <>
            The cheapest way to open 30th Celebration packs in {r.inName} today is simply to buy <strong>loose booster packs</strong>, at <strong>{m(best.perPack)} each</strong>
            {ranked[1] && <>; the next best is the {ranked[1].line.label}, at {m(ranked[1].perPack)} a pack</>}.{" "}
          </>
        ) : best ? (
          <>
            The cheapest way to open 30th Celebration packs in {r.inName} today is the <strong>{best.line.label}</strong>, at <strong>{m(best.perPack)} a pack</strong> (
            {m(best.p.lowestPriceCents)} for {best.packs})
            {pack?.perPack != null && <>, against {m(pack.perPack)} for a loose pack</>}.{" "}
          </>
        ) : (
          <>No 30th Celebration product with a known pack count is in stock in {r.inName} right now. </>
        )}
        30th Celebration has no booster box, so below is every product it comes in, priced at stores in {r.inName} and ranked by what a pack costs inside it.{" "}
        <Link href={setHref(r, set)} prefetch={false} className={LINK}>
          All 30th Celebration →
        </Link>
      </Lede>
    ),
    sections: [
      {
        id: "per-pack",
        title: `30th Celebration price per pack in ${r.inName}`,
        live: true,
        body: (
          <>
            <Prose>
              <p>
                Each product line&rsquo;s cheapest in-stock listing in {r.inName}, with the packs it holds and what that works out to per pack. The typical price is the middle
                of every store&rsquo;s price for the same listing, so one cheap store does not set the picture on its own.
              </p>
            </Prose>
            <LiveBlock r={r} checked={data.checked}>
              {ranked.length === 0 ? (
                <p className="text-sm leading-6 text-muted">No 30th Celebration product with a known pack count is in stock in {r.inName} right now.</p>
              ) : (
                <StackTable
                  caption={`30th Celebration products in ${r.inName} today, cheapest per pack first`}
                  head={["Product", "Packs", "From", "Per pack", "Typical"]}
                  rows={ranked.map((x, i) => ({
                    key: x.line.key,
                    highlight: i === 0,
                    th: (
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-semibold text-ink">{x.line.label}</span>
                        <Link href={productHref(r, x.p)} prefetch={false} className="truncate text-xs font-medium text-brand underline-offset-2 hover:underline">
                          {x.p.name}
                        </Link>
                      </span>
                    ),
                    cells: [
                      <span key="n">{x.packs}</span>,
                      <span key="p" className="font-semibold">
                        {m(x.p.lowestPriceCents)}
                      </span>,
                      <span key="pp" className="font-semibold">
                        {m(x.perPack)}
                      </span>,
                      <span key="t" className="text-muted">
                        {x.p.medianOpenCents != null ? m(x.p.medianOpenCents) : "—"}
                      </span>,
                    ],
                  }))}
                />
              )}
            </LiveBlock>
            <Prose>
              {best && worst && (
                <p>
                  The spread is wide. A pack costs {m(best.perPack)} {inside(best)} and {m(worst.perPack)} {inside(worst)}, {pct(worst.perPack, best.perPack)}%
                  more for the same pack. What you pay over the cheapest line is for the promo card, the box and the extras, not the packs.
                </p>
              )}
              {best?.p.medianOpenCents != null && best.p.lowestPriceCents != null && best.p.lowestPriceCents < best.p.medianOpenCents * 0.7 && (
                <p>
                  One caution on the top line: its cheapest listing ({m(best.p.lowestPriceCents)}) is well under the typical {m(best.p.medianOpenCents)} across stores, so it may be one
                  store&rsquo;s sale or its last units. At the typical price it works out to {m(Math.round(best.p.medianOpenCents / best.packs!))} a pack.
                </p>
              )}
              {etb?.perPack != null && bundle?.perPack != null && (
                <p>
                  The booster bundle ({m(bundle.p.lowestPriceCents)}, {m(bundle.perPack)} a pack) {bundle.perPack < etb.perPack ? "beats" : "does not beat"} the Elite Trainer Box (
                  {m(etb.p.lowestPriceCents)}, {m(etb.perPack)} a pack) on packs alone. The ETB&rsquo;s extra is the Nidorina promo, sleeves, dice and the storage box.
                </p>
              )}
              {exBox?.perPack != null && exTin?.perPack != null && (
                <p>
                  The Pokémon ex Box and the ex Tin hold the same four packs and the same choice of Sylveon ex or Greninja ex promo; the box adds an oversize card. Today the box is{" "}
                  {m(exBox.p.lowestPriceCents)} and the tin {m(exTin.p.lowestPriceCents)}
                  {exBox.p.lowestPriceCents !== exTin.p.lowestPriceCents && <>, so the {exBox.p.lowestPriceCents! < exTin.p.lowestPriceCents! ? "box" : "tin"} is the better buy</>}.
                </p>
              )}
              {pcEtb?.perPack != null && etb?.perPack != null && (
                <p>
                  The Pokémon Center Elite Trainer Box sells at {m(pcEtb.p.lowestPriceCents)} here, {m(pcEtb.perPack)} a pack. That premium over the standard ETB is the
                  collector price of a store-exclusive box, not the price of its packs.
                </p>
              )}
            </Prose>
          </>
        ),
      },
      {
        id: "no-pack-count",
        title: "Products without a fixed pack count",
        live: true,
        body: (
          <>
            <Prose>
              <p>
                These 30th Celebration products are in stock in {r.inName} too. We price them but show no per-pack figure, because we have no publisher-confirmed pack count for
                them. A per-pack number we had to guess would be worse than none. Check the listing for the pack count before you compare one with the products above.
              </p>
            </Prose>
            <LiveBlock r={r} checked={data.checked}>
              {unpacked.length === 0 ? (
                <p className="text-sm leading-6 text-muted">None is in stock in {r.inName} right now.</p>
              ) : (
                <StackTable
                  caption={`Other 30th Celebration products in stock in ${r.inName} today`}
                  head={["Product", "From", "In stock at"]}
                  rows={unpacked.map((x) => ({
                    key: x.line.key,
                    th: (
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-semibold text-ink">{x.line.label}</span>
                        <Link href={productHref(r, x.p)} prefetch={false} className="truncate text-xs font-medium text-brand underline-offset-2 hover:underline">
                          {x.p.name}
                        </Link>
                      </span>
                    ),
                    cells: [
                      <span key="p" className="font-semibold">
                        {m(x.p.lowestPriceCents)}
                      </span>,
                      <span key="w" className="text-muted">
                        {whereText(x.p)}
                      </span>,
                    ],
                  }))}
                />
              )}
            </LiveBlock>
          </>
        ),
      },
      {
        id: "what-each-holds",
        title: "What each 30th Celebration product holds",
        body: (
          <>
            <Prose>
              <p>
                30th Celebration came out on {formatRelease(set.releaseDate)}. {lineup.extra} {lineup.chase} The full rundown of those cards is in{" "}
                <Link href={guideHref(r, "30th-celebration-chase-cards")}>our 30th Celebration chase cards guide</Link>.
              </p>
              <p>What each product line holds, from the publisher&rsquo;s product line-up and our pack counts:</p>
              <ul>
                {LINES.filter((l) => rows.some((x) => x.line.key === l.key)).map((l) => (
                  <li key={l.key}>
                    <strong>{l.label}:</strong> {l.holds}.
                  </li>
                ))}
              </ul>
            </Prose>
            <Note>
              Pack counts for the Poster Collection, Tech Sticker Collection, Pokémon ex Box and ex Tin are from{" "}
              {lineup.sources?.map((s) => (
                <a key={s.url} href={s.url} rel="noopener">
                  {s.label}
                </a>
              ))}
              . The ETB, Pokémon Center ETB and bundle counts are the standard ones for the series. Some stores list &ldquo;style may vary&rdquo; or random-art versions of the
              collections and tins: the contents are the same, the promo or art is not your choice.
            </Note>
          </>
        ),
      },
      {
        id: "which-to-buy",
        title: "Which 30th Celebration product should you buy?",
        body: (
          <Prose>
            <ul>
              <li>
                <strong>Most packs for the money:</strong>{" "}
                {best ? (
                  <>
                    {best.line.key === "pack" ? "loose booster packs" : `the ${best.line.label}`}, at {m(best.perPack)} a pack today
                    {ranked[1] ? (
                      <>
                        , then the {ranked[1].line.label} at {m(ranked[1].perPack)}
                      </>
                    ) : null}
                    .
                  </>
                ) : (
                  <>nothing with a known pack count is in stock here today.</>
                )}{" "}
                Every pack holds one of the 30 Pikachu rares, so the packs themselves are the same wherever they come from.
              </li>
              <li>
                <strong>A gift:</strong> the Elite Trainer Box
                {etb ? <> ({m(etb.p.lowestPriceCents)})</> : null} is the most complete box, with a promo, sleeves and dice.
                {gift && (
                  <>
                    {" "}
                    The <Link href={guideHref(r, gift)}>gift guide</Link> lists options at every budget.
                  </>
                )}
              </li>
              <li>
                <strong>The promos:</strong> each collection carries its own promo (Nidorina, the three legendary birds, Alolan Exeggutor or Lucario, Sylveon ex or Greninja
                ex). If you want one in particular, buy the product that has it; the price per pack above tells you what the promo costs you.
              </li>
              <li>
                <strong>To play:</strong> the Espeon ex and Umbreon ex Battle Decks are ready to play out of the box; see{" "}
                <Link href={guideHref(r, "best-pokemon-tcg-product-for-beginners")}>the best product for beginners</Link>.
              </li>
            </ul>
          </Prose>
        ),
      },
      {
        id: "before-you-buy",
        title: "Before you buy",
        body: (
          <>
            <Checklist
              items={[
                <>Add delivery before comparing two stores: on a small collection, postage can be most of the difference.</>,
                <>Check you are buying the English retail product, not an international or Japanese version, a case or a lot.</>,
                <>&ldquo;Style may vary&rdquo; and &ldquo;random&rdquo; listings send whichever promo or art the store has. Pick a named one if it matters to you.</>,
                <>
                  Check the box is factory sealed and sold as new: <Link href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>how to avoid resealed products</Link>.
                </>,
              ]}
            />
            <NextLinks
              links={[
                { href: setHref(r, set), label: "All 30th Celebration sealed", icon: "tag" },
                { href: guideHref(r, "30th-celebration-chase-cards"), label: "30th Celebration chase cards", icon: "arrow-right" },
                { href: guideHref(r, "cheapest-way-to-buy-pokemon-packs"), label: "Cheapest way to buy packs", icon: "arrow-right" },
                { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
                { href: toolHref(r.region, "trade-calculator"), label: "Trade calculator", icon: "arrow-right" },
              ]}
            />
            <Note>
              Prices are each store&rsquo;s listed price, excluding shipping, read about twice a day.{" "}
              {rows.length ? <>{plural(rows.reduce((n, x) => n + x.listings, 0), "in-stock listing")} were read for this page.</> : null}
            </Note>
          </>
        ),
      },
      whereToBuy(r, {
        tcg: { query: "30th Celebration", label: "30th Celebration" },
        links: [
          { href: guideHref(r, "how-many-packs-in-pokemon-products"), label: "How many packs in each product" },
          { href: guideHref(r, "booster-box-vs-etb-vs-booster-bundle"), label: "Booster box vs ETB vs bundle" },
        ],
      }),
    ],
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
