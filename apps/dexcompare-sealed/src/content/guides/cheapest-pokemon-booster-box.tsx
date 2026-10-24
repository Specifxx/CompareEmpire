// Guide: the cheapest Pokémon booster box right now (SEO sprint, 2026-10-23; the query "cheapest pokemon booster box"). Every open
// booster box in the region today, ranked by price (data.ts openBoxes), the price per pack (packs.ts), the cheapest box of each recent
// set, why the newest sets tend to be the cheapest (sets.ts facts only, never a forecast), the sets sold without a booster box, the
// checks before buying a cheap box, and the tools. Pre-orders are kept apart: a box that isn't out yet is never "the cheapest box".
import Link from "next/link";
import { money, plural } from "@/lib/format";
import { andList, fixedPacks, setsWithoutBox } from "./facts";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { toolHref } from "../tools";
import type { GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import { BoxTable, boxRows, cheapestBySet, median } from "./booster-box-kit";
import { Checklist, GuideBody, guideHref, Lede, LiveBlock, NextLinks, Note, PACK_SOURCE, Prose, SetChips, typeHref, whereToBuy, type BodyProps, type GuideOutline, type GuideSection } from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("cheapest-pokemon-booster-box")!;
const LINK = "font-semibold text-brand hover:underline";

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const all = boxRows(data.cards, data.today);
  const released = all.filter((x) => !x.preorder);
  const pre = all.filter((x) => x.preorder);
  const top = released.slice(0, 10);
  const cheapest = released[0] ?? null;
  const dearest = released.length > 1 ? released[released.length - 1] : null;
  const mid = median(released.map((x) => x.p.lowestPriceCents!));
  const bySet = cheapestBySet(released).slice(0, 8);
  const newest = bySet[0] ?? null;
  const cheapestPP = released.filter((x) => x.perPack != null).sort((a, b) => a.perPack! - b.perPack!)[0] ?? null;
  const noBox = setsWithoutBox().slice(0, 6);
  const packs = fixedPacks("booster-box") ?? 36;
  const m = (c: number | null | undefined) => money(c ?? null, r.market);
  const stores = r.market === "US" ? "US stores and TCGplayer" : `${r.adjective} stores`;
  const preBySet = cheapestBySet(pre);

  const sections: GuideSection[] = [
    {
      id: "cheapest-today",
      title: `The cheapest booster boxes in ${r.inName} today`,
      live: true,
      body: (
        <>
          <Prose>
            <p>
              These are the ten cheapest Pokémon booster boxes in stock at {stores} right now, cheapest first. Each row is one store&rsquo;s own listed price for that set&rsquo;s
              booster box, in {r.currency} and before shipping; the last column says how many stores have it in stock, so you can see whether the cheapest price is one shop or
              several. Follow a box&rsquo;s name to compare every store that lists it.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {top.length ? (
              <BoxTable r={r} rows={top} caption={`The ten cheapest Pokémon booster boxes in stock in ${r.inName} today, with the price per pack`} />
            ) : (
              <p className="text-sm leading-6 text-muted">No booster box is in stock in {r.inName} right now. Every set&rsquo;s page lists its box, sold out included.</p>
            )}
          </LiveBlock>
          <Prose>
            {cheapest ? (
              <p>
                Right now the cheapest booster box in {r.inName} is the <Link href={`/${r.region}/p/${cheapest.p.slug}`}>{cheapest.p.name}</Link> at <strong>{m(cheapest.p.lowestPriceCents)}</strong>
                {cheapest.perPack != null && <>, or {m(cheapest.perPack)} a pack for its {packs} packs</>}. In all, {plural(released.length, "booster box", "booster boxes")} of released sets{" "}
                {released.length === 1 ? "is" : "are"} in stock here today{dearest && mid != null && <>, from {m(cheapest.p.lowestPriceCents)} up to {m(dearest.p.lowestPriceCents)} for the {dearest.p.name}, with the middle of the range at {m(mid)}</>}.
              </p>
            ) : (
              <p>When a box comes into stock at any store we read, it appears here on the next check, about twice a day.</p>
            )}
            {cheapestPP && cheapest && cheapestPP.p.slug !== cheapest.p.slug && (
              <p>
                The cheapest box isn&rsquo;t always the cheapest pack: a set&rsquo;s box can hold a different count. Per pack, the cheapest today is the {cheapestPP.p.name} at {m(cheapestPP.perPack)}.
              </p>
            )}
          </Prose>
        </>
      ),
    },
    {
      id: "by-set",
      title: "The cheapest box of each recent set",
      live: true,
      body: (
        <>
          <Prose>
            <p>
              If you already know which set you want, the question is narrower: what does <em>that</em> set&rsquo;s box cost today? Here are the newest sets with a booster box in stock in{" "}
              {r.inName}, newest first, each with its cheapest box. Older sets follow the same pattern further down the list on the{" "}
              <Link href={typeHref(r, "booster-box")}>booster boxes page</Link>.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {bySet.length ? (
              <BoxTable r={r} rows={bySet} caption={`The newest Pokémon sets' cheapest in-stock booster box in ${r.inName} today`} />
            ) : (
              <p className="text-sm leading-6 text-muted">No recent set has a booster box in stock in {r.inName} right now.</p>
            )}
          </LiveBlock>
          <SetChips r={r} sets={bySet.map((x) => x.set)} />
        </>
      ),
    },
    {
      id: "why",
      title: "Why the newest sets are usually the cheapest boxes",
      body: (
        <Prose>
          <p>
            A booster box is {packs} sealed packs of one set, and a set is printed for a while and then stops. While a set is in print, stores can reorder it from their
            distributor, so their prices sit near what they pay for it plus their margin, and competition between stores keeps them there. Once a set stops being printed, the
            boxes left on shelves are all there will be, and stores price what&rsquo;s left by what buyers will pay for it.
          </p>
          <p>
            That is why the cheapest box in {r.inName} today is usually from a recent set{newest ? <> (the newest set with a box in stock here is {newest.set.name}, out since {formatRelease(newest.set.releaseDate)})</> : null}, and why
            the dearest boxes in the table above are older sets. It isn&rsquo;t a rule about value, and this guide makes no prediction about any set: it&rsquo;s a description of what
            stores ask today.
          </p>
          <p>
            Two more things move a box&rsquo;s price that have nothing to do with the set. Shipping: a cheap box from a store that charges a lot to post it can cost more delivered
            than a dearer one with free shipping, so add delivery before you compare. And stock: a price held by one store with one box left is a price for one buyer. The
            store count beside each price tells you which is which.
          </p>
          {noBox.length > 0 && (
            <p>
              Some sets were never sold as a booster box at all: {andList(noBox.map((s) => s.name))} among the recent ones. A &ldquo;booster box&rdquo; of one of those is a lot a store
              has put together itself, and we leave it out, so it never shows up here as a cheap box. Their packs come in Elite Trainer Boxes, bundles and collections instead.
            </p>
          )}
        </Prose>
      ),
    },
    {
      id: "pre-orders",
      title: "Pre-order boxes are a different question",
      body: (
        <>
          <Prose>
            <p>
              A box that isn&rsquo;t released yet can be listed below an in-stock box, but it isn&rsquo;t the same offer: you pay now, or at dispatch, for a box that arrives on or after
              release day. We keep pre-orders out of the ranking above so the cheapest box is always one you can have now.
            </p>
            {preBySet.length > 0 ? (
              <p>
                Open for pre-order in {r.inName} today:{" "}
                {preBySet.map((x, i) => (
                  <span key={x.p.slug}>
                    {i > 0 && "; "}
                    <Link href={`/${r.region}/p/${x.p.slug}`}>{x.p.name}</Link> from {m(x.p.lowestPriceCents)}, releasing {formatRelease(x.set.releaseDate)}
                  </span>
                ))}
                . What to check before you pay is in <Link href={guideHref(r, "how-to-preorder-pokemon-tcg")}>how to pre-order Pokémon TCG sets</Link>.
              </p>
            ) : (
              <p>No booster box is open for pre-order in {r.inName} right now.</p>
            )}
          </Prose>
        </>
      ),
    },
    {
      id: "checks",
      title: "Before you buy the cheapest box",
      body: (
        <>
          <Prose>
            <p>The cheapest listing is only a good buy if the box that arrives is the box you paid for. A few checks take a minute and save the most common problems:</p>
          </Prose>
          <Checklist
            items={[
              <>Check the store&rsquo;s delivery cost to you, and add it to the price before comparing two stores.</>,
              <>Read the listing&rsquo;s title: English-language, the set you want, &ldquo;booster box&rdquo; and not &ldquo;booster bundle&rdquo; or a single pack.</>,
              <>Buying from a store you haven&rsquo;t used before? Look for a returns policy and real contact details.</>,
              <>
                When the box arrives, check the shrink-wrap before you open it: <Link href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>how to avoid resealed products</Link>.
              </>,
              <>If a price is far under every other store&rsquo;s, check the listing twice: it can be a mistake, or not the product its title suggests.</>,
            ]}
          />
          <Note>
            Prices are each store&rsquo;s listed price, excluding shipping, read about twice a day. {PACK_SOURCE}
          </Note>
        </>
      ),
    },
    {
      id: "box-or-not",
      title: "Is a box the cheapest way to buy packs?",
      body: (
        <>
          <Prose>
            <p>
              Usually, per pack, but not always, and not for every set. A booster bundle or a single sleeved pack can come out cheaper per pack than a box of the same set when a
              store discounts it. Compare them side by side in <Link href={guideHref(r, "cheapest-way-to-buy-pokemon-packs")}>the cheapest way to buy Pokémon packs</Link>, and see what
              an Elite Trainer Box&rsquo;s extras cost over a box&rsquo;s packs in <Link href={guideHref(r, "pokemon-booster-box-vs-etb-value")}>booster box vs ETB value</Link>.
            </p>
            <p>
              Trading or selling a box instead? The <strong>value checker</strong> gives the cheapest in-stock price of any sealed product here, and the{" "}
              <strong>trade calculator</strong> adds up both sides of a swap in {r.currency}.
            </p>
          </Prose>
          <NextLinks
            links={[
              { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
              { href: toolHref(r.region, "trade-calculator"), label: "Trade calculator", icon: "arrow-right" },
              { href: `/${r.region}/cheapest-packs`, label: "Cheapest per pack", icon: "tag" },
            ]}
          />
        </>
      ),
    },
    whereToBuy(r, {
      tcg: { query: "Pokemon Booster Box", label: "Pokémon booster boxes" },
      links: [
        { href: typeHref(r, "booster-box"), label: "Every booster box" },
        { href: typeHref(r, "booster-box-case"), label: "Booster box cases" },
      ],
    }),
  ];

  return {
    intro: (
      <Lede>
        {cheapest ? (
          <>
            The cheapest Pokémon booster box in stock in {r.inName} today is the <strong>{cheapest.p.name}</strong> at <strong>{m(cheapest.p.lowestPriceCents)}</strong>, {whereFor(cheapest.p.inStockStores, cheapest.p.marketplaceOpen)}.{" "}
          </>
        ) : (
          <>No Pokémon booster box is in stock in {r.inName} right now. </>
        )}
        Below, every box in stock ranked by price, the cheapest box of each recent set, and what to check before you buy.{" "}
        <Link href={`/${r.region}/type/booster-boxes`} prefetch={false} className={LINK}>
          All booster boxes →
        </Link>
      </Lede>
    ),
    sections,
  };
}

const whereFor = (stores: number, tcg: boolean) => (stores > 0 ? `in stock at ${plural(stores, "store")}${tcg ? " and TCGplayer" : ""}` : "on TCGplayer");

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
