// Guide: the Delta Reign booster box price (SEO sprint, 2026-10-23; the query "delta reign booster box price"). Delta Reign's open
// products in the region today (data.ts: the set read whole, open only, cheapest first), its booster box, Elite Trainer Box and booster
// bundle with the price per pack (packs.ts), the release date (sets.ts) and whether it is still a pre-order (judged against data.today),
// Pitch Black's cheapest box, ETB and bundle beside it (the set before it), the US MSRP in the US only (rrp.ts, with RRP_NOTE), and the
// checks before pre-ordering. No pull rates, no card lists, no forecast.
import Link from "next/link";
import { CALENDAR_TYPES } from "@/lib/data";
import { money, plural } from "@/lib/format";
import { preorderPath } from "@/lib/preorder-guides";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { usMsrpCents } from "@/lib/rrp";
import { TYPE_ABOUT } from "@/lib/type-about";
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
  MsrpNote,
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
  type GuideSection,
} from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("delta-reign-booster-box-price")!;
const LINK = "font-semibold text-brand hover:underline";
const CODE = "me6";
const PREV = "me5";

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const set = setOf(CODE)!;
  const prev = setOf(PREV)!;
  const out = set.releaseDate <= data.today;
  const open = data.bySet[CODE] ?? [];
  const lines = linesFor(open, CALENDAR_TYPES, set, !out);
  const box = lines.find((l) => l.label === "Booster Box")?.p ?? null;
  const etb = lines.find((l) => l.label === "Elite Trainer Box")?.p ?? null;
  const bundle = lines.find((l) => l.label === "Booster Bundle")?.p ?? null;
  const prevLines = linesFor(data.bySet[PREV], CALENDAR_TYPES, prev, false);
  const prevBox = prevLines.find((l) => l.label === "Booster Box")?.p ?? null;
  const boxes = open.filter((p) => p.productType === "Booster Box");
  const others = open.filter((p) => !CALENDAR_TYPES.includes(p.productType)).slice(0, 8);
  const m = (c: number | null | undefined) => money(c ?? null, r.market);
  const word = out ? "in stock" : "open for pre-order";
  const hub = preorderPath(r.region, CODE);
  const us = r.market === "US";
  const msrp = us ? { box: usMsrpCents("booster-box", CODE), etb: usMsrpCents("etb", CODE), bundle: usMsrpCents("booster-bundle", CODE) } : null;
  const boxPP = box ? perPackOf(box) : null;
  const prevPP = prevBox ? perPackOf(prevBox) : null;

  const sections: GuideSection[] = [
    {
      id: "prices-today",
      title: `Delta Reign prices in ${r.inName} today`,
      live: true,
      body: (
        <>
          <Prose>
            <p>
              The cheapest Delta Reign booster box, Elite Trainer Box and booster bundle {word} in {r.inName} right now, each with its price per pack and how many stores have it.
              {!out && <> Delta Reign releases on {formatRelease(set.releaseDate)}, so every price here is a pre-order: what a store asks today for a product it will ship around release day.</>}
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            <SetGroup title={<SetTitle r={r} set={set} today={data.today} extra={!out ? <> · Pre-order</> : undefined} />}>
              <PriceTable r={r} caption={`Delta Reign: the cheapest booster box, Elite Trainer Box and booster bundle in ${r.inName} today, with the price per pack`} lines={lines} whereHead={out ? "In stock at" : "Open at"} />
            </SetGroup>
          </LiveBlock>
          <Prose>
            {box ? (
              <p>
                The Delta Reign booster box costs from <strong>{m(box.lowestPriceCents)}</strong> in {r.inName} today
                {boxPP?.perPack != null && <>, {m(boxPP.perPack)} a pack for its {boxPP.packs} packs</>}, {whereText(box) === "—" ? "" : <>at {whereText(box)}</>}.{" "}
                {boxes.length > 1 && <>{plural(boxes.length, "listing")} of the box {boxes.length === 1 ? "is" : "are"} {word} here; the table shows the cheapest.</>}
              </p>
            ) : (
              <p>
                No Delta Reign booster box is {word} in {r.inName} right now. A store can open its listing at any time, so the box can appear here on
                any check; the product page lists every store that has listed it, sold out included.
              </p>
            )}
            {etb && bundle && (
              <p>
                The Elite Trainer Box is {m(etb.lowestPriceCents)} and the booster bundle {m(bundle.lowestPriceCents)}. Per pack, that is {m(perPackOf(etb).perPack)} and{" "}
                {m(perPackOf(bundle).perPack)}; the ETB&rsquo;s price also pays for its sleeves, dice, damage counters and storage box.
              </p>
            )}
          </Prose>
          {hub && (
            <p className="text-sm">
              <Link href={hub} prefetch={false} className={LINK}>
                Every store&rsquo;s Delta Reign pre-order, side by side →
              </Link>
            </p>
          )}
        </>
      ),
    },
    {
      id: "against-pitch-black",
      title: "Delta Reign against Pitch Black",
      live: true,
      body: (
        <>
          <Prose>
            <p>
              The set before Delta Reign is {prev.name}, released {formatRelease(prev.releaseDate)}. Its prices are the nearest guide to where a new Mega Evolution set&rsquo;s sit once
              it has been out a few months, because both are main sets of the same series with the same pack counts. Here are {prev.name}&rsquo;s cheapest in-stock box, ETB and
              bundle in {r.inName} today.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            <SetGroup title={<SetTitle r={r} set={prev} today={data.today} />}>
              <PriceTable r={r} caption={`${prev.name}: the cheapest booster box, Elite Trainer Box and booster bundle in ${r.inName} today`} lines={prevLines} />
            </SetGroup>
          </LiveBlock>
          <Prose>
            {box && prevBox ? (
              <p>
                Today a Delta Reign box costs {m(box.lowestPriceCents)} and a {prev.name} box {m(prevBox.lowestPriceCents)}
                {boxPP?.perPack != null && prevPP?.perPack != null && <> ({m(boxPP.perPack)} against {m(prevPP.perPack)} a pack)</>}. That is a comparison of two prices today, not a
                forecast: what Delta Reign costs after release depends on how much of it stores receive and how fast it sells.
              </p>
            ) : (
              <p>One of the two boxes isn&rsquo;t {out ? "in stock" : "listed"} in {r.inName} right now, so there&rsquo;s no like-for-like comparison today.</p>
            )}
          </Prose>
        </>
      ),
    },
    {
      id: "what-you-get",
      title: "What each Delta Reign product holds",
      body: (
        <Prose>
          <p>
            <Link href={typeHref(r, "booster-box")}>
              <strong>Booster box</strong>
            </Link>
            : {TYPE_ABOUT["booster-boxes"]} {boxPP?.packs != null && <>Delta Reign&rsquo;s holds {boxPP.packs} packs.</>}
          </p>
          <p>
            <Link href={typeHref(r, "etb")}>
              <strong>Elite Trainer Box</strong>
            </Link>
            : {TYPE_ABOUT["elite-trainer-boxes"]} {etb && perPackOf(etb).packs != null && <>Delta Reign&rsquo;s holds {perPackOf(etb).packs} packs.</>}
          </p>
          <p>
            <Link href={typeHref(r, "booster-bundle")}>
              <strong>Booster bundle</strong>
            </Link>
            : {TYPE_ABOUT["booster-bundles"]} {bundle && perPackOf(bundle).packs != null && <>Delta Reign&rsquo;s holds {perPackOf(bundle).packs} packs.</>}
          </p>
          <p>
            Which suits you depends on how you buy. A box is the most packs in one product and usually the lowest price per pack. An Elite Trainer Box is fewer packs with the
            accessories to play. A bundle is the smallest of the three. The full comparison is in{" "}
            <Link href={guideHref(r, "booster-box-vs-etb-vs-booster-bundle")}>booster box vs ETB vs booster bundle</Link>, and the Build &amp; Battle Box, the set&rsquo;s prerelease kit, has{" "}
            <Link href={guideHref(r, "pokemon-build-and-battle-box")}>its own guide</Link>.
          </p>
          {msrp && msrp.box != null && (
            <p>
              In the US, the MSRP of a Delta Reign booster box is {money(msrp.box, "US")}
              {msrp.etb != null && <>, an Elite Trainer Box {money(msrp.etb, "US")}</>}
              {msrp.bundle != null && <> and a booster bundle {money(msrp.bundle, "US")}</>}. Stores set their own prices, so today&rsquo;s can sit above or below those.
            </p>
          )}
          {msrp && msrp.box != null && <MsrpNote />}
        </Prose>
      ),
    },
    ...(others.length
      ? [
          {
            id: "other-products",
            title: "Other Delta Reign products listed today",
            live: true,
            body: (
              <>
                <Prose>
                  <p>Beyond the three headline products, these Delta Reign products are {word} in {r.inName}, cheapest first.</p>
                </Prose>
                <LiveBlock r={r} checked={data.checked}>
                  <StackTable
                    caption={`Other Delta Reign products ${word} in ${r.inName} today`}
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
              </>
            ),
          } satisfies GuideSection,
        ]
      : []),
    {
      id: "before-you-pre-order",
      title: out ? "Before you buy" : "Before you pre-order",
      body: (
        <>
          <Prose>
            <p>
              {out
                ? "Delta Reign is out, so every price above is for a product a store has on its shelf. A few checks still apply:"
                : `A pre-order is a store's promise to ship on or after ${formatRelease(set.releaseDate)}. Before you pay:`}
            </p>
          </Prose>
          <Checklist
            items={[
              <>Check when the store takes payment: at order, or at dispatch.</>,
              <>Check what happens if its allocation is cut: a refund, a partial order, or a wait.</>,
              <>Add delivery to the price before comparing two stores.</>,
              <>Check the listing is the English-language product you want, not a case or a different language.</>,
              <>
                Read <Link href={guideHref(r, "how-to-preorder-pokemon-tcg")}>how to pre-order Pokémon TCG sets</Link> for the rest.
              </>,
            ]}
          />
          <Prose>
            <p>
              Swapping product with someone, or checking an offer? The <strong>value checker</strong> gives today&rsquo;s cheapest price of any sealed product in {r.inName}, and the{" "}
              <strong>trade calculator</strong> adds up both sides.
            </p>
          </Prose>
          <NextLinks
            links={[
              { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
              { href: toolHref(r.region, "trade-calculator"), label: "Trade calculator", icon: "arrow-right" },
              { href: setHref(r, set), label: "All Delta Reign sealed", icon: "tag" },
              { href: setHref(r, prev), label: `All ${prev.name} sealed`, icon: "tag" },
            ]}
          />
          <Note>Prices are each store&rsquo;s listed price, excluding shipping, read about twice a day. {PACK_SOURCE}</Note>
        </>
      ),
    },
    whereToBuy(r, {
      tcg: { query: "Delta Reign", label: "Delta Reign" },
      links: [
        { href: guideHref(r, "pokemon-mega-evolution-sealed-price-guide"), label: "Mega Evolution price guide" },
        { href: guideHref(r, "cheapest-pokemon-booster-box"), label: "The cheapest booster box" },
      ],
    }),
  ];

  return {
    intro: (
      <Lede>
        {box ? (
          <>
            The Delta Reign booster box costs from <strong>{m(box.lowestPriceCents)}</strong> in {r.inName} today{!out && <>, on pre-order</>}
            {boxPP?.perPack != null && <> ({m(boxPP.perPack)} a pack)</>}.{" "}
          </>
        ) : (
          <>No Delta Reign booster box is {word} in {r.inName} right now. </>
        )}
        Delta Reign {out ? "came out" : "releases"} on {formatRelease(set.releaseDate)}. Below: the box, Elite Trainer Box and bundle at every store, {prev.name} beside them, and
        what to check {out ? "before you buy" : "before you pre-order"}.{" "}
        <Link href={setHref(r, set)} prefetch={false} className={LINK}>
          All Delta Reign →
        </Link>
      </Lede>
    ),
    sections,
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody guide={GUIDE} r={r} outline={outline(r, data)} />;
}
