// Guide: where to buy Pokémon cards (sealed product) in Australia. AU only: the all-region version is where-to-buy-pokemon-cards-online;
// this one is the Australian deep dive. The store count comes from the registry (stores.ts), the live blocks from StoreStat (the stores
// with the most in stock today, at most 12 rows), typeSummary (in stock and on pre-order by type, with the in-stock from-price) and the
// newest released set's cheapest box, ETB and bundle (calendarProducts). Then how to compare, postage, pre-orders, a local game store
// against an online one, eBay against a store (the fees guide has the numbers), checks for a new store phrased as checks (never claims
// about any store), the half-the-median red flag (deals.ts DEAL_MIN_RATIO) and the tools. No postage prices or thresholds: they vary by
// store, so the guide says to check them.
import Link from "next/link";
import { toolHref } from "@/content/tools";
import { CALENDAR_TYPES } from "@/lib/data";
import { DEAL_MIN_RATIO } from "@/lib/deals";
import { money, plural } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { TYPE_BY_LABEL } from "@/lib/sealed-title";
import { STORE_BY_KEY, storesInMarket } from "@/lib/stores";
import type { GuideData } from "./data";
import { fixedPacks } from "./facts";
import { GUIDE_BY_SLUG } from "./index";
import {
  Checklist,
  Decisions,
  GuideBody,
  guideHref,
  Lede,
  linesFor,
  LiveBlock,
  NextLinks,
  Note,
  PriceTable,
  Prose,
  setHref,
  setOf,
  SetTitle,
  StackTable,
  typeHref,
  whereToBuy,
  type BodyProps,
  type GuideOutline,
} from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("where-to-buy-pokemon-cards-australia")!;

/** The product types the stock table shows, in this order, when Australian stores have any in stock or on pre-order. */
const SHOWN_TYPES = ["Booster Box", "Elite Trainer Box", "Booster Bundle", "Pokémon Center Elite Trainer Box", "Ultra-Premium Collection", "Collection", "Tin", "Build & Battle Box", "Booster Pack"];

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const count = storesInMarket(r.market).length;
  const stores = data.stores.filter((s) => STORE_BY_KEY.has(s.store));
  const top = stores[0] ?? null;
  const types = SHOWN_TYPES.map((label) => data.types.find((t) => t.productType === label)).filter((t): t is NonNullable<typeof t> => !!t && t.inStock + t.preorder > 0);
  const set = data.sets.map(setOf).find((s) => !!s) ?? null;
  const lines = set ? linesFor(data.bySet[set.code], CALENDAR_TYPES, set) : [];
  const priced = lines.filter((l) => l.p);
  const half = Math.round(DEAL_MIN_RATIO * 100);
  const box = fixedPacks("booster-box");

  return {
    intro: (
      <Lede>
        DexCompare compares <strong>{plural(count, "Australian store")}</strong> that sell Pokémon TCG sealed product online, every price in Australian dollars with GST already
        included. Below: who has the most in stock today, what the newest set costs, how to weigh postage and pre-orders, and when a local shop or eBay is the better call.
      </Lede>
    ),
    sections: [
      {
        id: "most-in-stock",
        title: "Who has the most in stock in Australia today",
        live: true,
        body: (
          <>
            <Prose>
              <p>
                The stores we compare range from large online card shops to game stores with a web store on the side. We read each one’s own website and count what it has in
                stock right now.
              </p>
            </Prose>
            <LiveBlock
              r={r}
              checked={data.checked}
              footer={
                <Link href={`/${r.region}/stores`} prefetch={false} className="font-semibold text-brand hover:underline">
                  All {plural(count, "store")} we compare in Australia →
                </Link>
              }
            >
              {stores.length ? (
                <StackTable
                  caption="The Australian stores with the most Pokémon sealed products in stock today"
                  head={["Store", "In stock", "Listed"]}
                  rows={stores.map((s) => ({
                    key: s.store,
                    th: (
                      <Link href={`/${r.region}/stores/${s.store}`} prefetch={false} className="font-semibold text-ink hover:text-brand hover:underline">
                        {STORE_BY_KEY.get(s.store)!.name}
                      </Link>
                    ),
                    cells: [<span key="i" className="font-semibold">{s.inStock}</span>, <span key="l" className="text-muted">{s.listed}</span>],
                  }))}
                />
              ) : (
                <p className="text-sm text-muted">None in stock right now: the stores’ counts appear here after the next price check.</p>
              )}
            </LiveBlock>
            <Prose>
              <p>
                {top ? (
                  <>
                    Right now <Link href={`/${r.region}/stores/${top.store}`}>{STORE_BY_KEY.get(top.store)!.name}</Link> has the most sealed Pokémon in stock, with{" "}
                    {plural(top.inStock, "product")}.{" "}
                  </>
                ) : null}
                “Listed” counts everything a store shows, in stock or not. A big range is handy when you want several products in one parcel, but it says nothing about price:
                the cheapest box can just as easily be at a smaller store. Each product page ranks every Australian store by price, so check there before you settle on one shop.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "newest-set",
        title: "The newest set, cheapest first",
        live: true,
        body: (
          <>
            <Prose>
              <p>
                The newest English set is where most buyers start. Here is the cheapest booster box, Elite Trainer Box and booster bundle of it in Australia right now, with what a
                single pack works out to inside each.
              </p>
            </Prose>
            <LiveBlock r={r} checked={data.checked} title={set ? <SetTitle r={r} set={set} today={data.today} /> : undefined}>
              {set ? (
                <PriceTable r={r} caption={`${set.name}: the cheapest booster box, Elite Trainer Box and booster bundle in Australia today`} lines={lines} />
              ) : (
                <p className="text-sm text-muted">None in stock right now.</p>
              )}
            </LiveBlock>
            <Prose>
              <p>
                {set && priced.length ? (
                  <>
                    Every row links to the product’s own page, where all the stores that stock it are ranked. The{" "}
                    <Link href={setHref(r, set)}>{set.name} set page</Link> lists everything else from the set, from tins to collections.{" "}
                  </>
                ) : set ? (
                  <>
                    None of the set’s headline products is in stock in Australia right now. The <Link href={setHref(r, set)}>{set.name} set page</Link> shows what stores
                    list and what’s on pre-order.{" "}
                  </>
                ) : null}
                Price per pack is the fairest way to line up different products. A {box ? `${box}-pack ` : ""}<Link href={typeHref(r, "booster-box")}>booster box</Link> usually costs the
                least per pack; an <Link href={typeHref(r, "etb")}>Elite Trainer Box</Link> costs more per pack but adds sleeves, dice and a promo; a{" "}
                <Link href={typeHref(r, "booster-bundle")}>booster bundle</Link> is the cheap way in. Which one suits you depends on what you want out of the box.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "by-type",
        title: "What’s in stock in Australia, by product type",
        body: (
          <>
            <div className="card my-6 px-4 py-2 sm:px-5 sm:py-3">
              {types.length ? (
                <StackTable
                  caption="Pokémon sealed products in stock and on pre-order in Australia today, by type, with the lowest in-stock price"
                  head={["Product", "In stock", "Pre-order", "From"]}
                  rows={types.map((t) => {
                    const info = TYPE_BY_LABEL.get(t.productType)!;
                    return {
                      key: info.key,
                      type: info.key,
                      th: (
                        <Link href={typeHref(r, info.key)} prefetch={false} className="font-semibold text-ink hover:text-brand hover:underline">
                          {info.plural}
                        </Link>
                      ),
                      cells: [
                        <span key="n">{t.inStock ? plural(t.inStock, "product") : "None right now"}</span>,
                        <span key="p" className="text-muted">{t.preorder ? plural(t.preorder, "product") : "—"}</span>,
                        <span key="f" className="font-semibold">{t.fromCents != null ? money(t.fromCents, r.market) : "—"}</span>,
                      ],
                    };
                  })}
                />
              ) : (
                <p className="py-2 text-sm text-muted">None in stock right now: the counts appear here after the next price check.</p>
              )}
            </div>
            <Prose>
              <p>
                “From” is the lowest in-stock price of that type in Australia today, across every set, so it is often an older or smaller product. Open the type to see every
                product ranked. Everything here is English-language sealed product; singles, graded cards, accessories and store-made bundles are left out on purpose, so each
                product page compares like with like.
              </p>
            </Prose>
          </>
        ),
      },
      {
        id: "how-to-compare",
        title: "How to compare prices in Australia",
        body: (
          <Prose>
            <p>Every price on DexCompare is the store’s own listed price, read from its website about twice a day. Three things to keep in mind when you read one:</p>
            <ul>
              <li>
                <strong>It already includes GST.</strong> Australian stores show prices to consumers with Australia’s standard 10% GST included, so the figure you see is the
                figure you pay for the item. There’s nothing to add at the till.
              </li>
              <li>
                <strong>It excludes shipping.</strong> Postage depends on the store, the parcel and where you live, so we leave it out and rank on the item price alone. The next
                section covers how to account for it.
              </li>
              <li>
                <strong>In stock comes first.</strong> A product page ranks the stores that have it in stock, cheapest first, then the ones that list it without stock. A low price
                on an out-of-stock listing can’t be bought today.
              </li>
            </ul>
            <p>
              Where several stores have a product in stock, its page also shows the middle price of those stores. That is the going rate in Australia today, and the
              easiest yardstick for any offer you see somewhere else.
            </p>
          </Prose>
        ),
      },
      {
        id: "postage",
        title: "Postage: the cost the table leaves out",
        body: (
          <>
            <Prose>
              <p>
                Australia is a big country and parcels are not cheap to send, so postage can change which store is really the cheapest. Two stores a few dollars apart on the item
                can swap places once delivery is added. A few habits help:
              </p>
              <ul>
                <li>
                  <strong>Check the free-shipping threshold.</strong> Many stores waive postage over a certain order value, and the threshold differs from store to store. If you’re
                  close to it, adding a <Link href={typeHref(r, "booster-bundle")}>booster bundle</Link> or a tin you wanted anyway can cost less than paying for delivery.
                </li>
                <li>
                  <strong>Put the whole order in one cart.</strong> One parcel from one store is usually cheaper than three from three, even if one item is slightly dearer there.
                </li>
                <li>
                  <strong>Look for local pick-up.</strong> Some stores with a shopfront let you collect an online order. If one is near you, it can save the postage altogether.
                </li>
                <li>
                  <strong>Compare at checkout.</strong> Add the item to the cart and enter your postcode before you decide: that’s the only way to see the real total.
                </li>
              </ul>
            </Prose>
            <Note>
              We don’t print postage prices: each store sets its own and they change. The store’s shipping page or its checkout has the figure for your postcode.
            </Note>
          </>
        ),
      },
      {
        id: "pre-orders",
        title: "Pre-orders from Australian stores",
        body: (
          <Prose>
            <p>
              Many Australian stores take pre-orders for an upcoming set before it comes out. A pre-order reserves a product at the store’s listed price, and the store charges
              you either when you order or when it ships, depending on its terms. The table above counts pre-orders separately from stock for that reason.
            </p>
            <p>
              Before you pre-order, read the store’s terms for when it charges your card, what happens if its allocation is cut, and whether you can cancel. Stores may ship
              pre-orders a few days either side of the release date. The <Link href={guideHref(r, "how-to-preorder-pokemon-tcg")}>pre-order guide</Link> covers the rest, and
              lists the sets you can pre-order now.
            </p>
          </Prose>
        ),
      },
      {
        id: "local-or-online",
        title: "Local game store or online store?",
        body: (
          <>
            <Prose>
              <p>
                You don’t have to choose one for good. Plenty of game stores sell online too, and some online stores have a shopfront. Here’s how the two compare.
              </p>
            </Prose>
            <Decisions
              rows={[
                {
                  when: "You want it today",
                  then: <>A local store wins: no postage and no waiting. Check its price against the product page here first, so you know how it sits against the online stores.</>,
                },
                {
                  when: "You play as well as collect",
                  then: (
                    <>
                      Many local stores run the events: league nights and Prereleases, where a{" "}
                      <Link href={typeHref(r, "build-battle")}>Build &amp; Battle Box</Link> is the entry kit. Buying there keeps the tables open.
                    </>
                  ),
                },
                {
                  when: "You want the lowest price",
                  then: <>Online usually gives you more choice: every Australian store side by side, ranked by price. Remember to add postage before you compare.</>,
                },
                {
                  when: "You want to see the box first",
                  then: <>In person you can check the shrink-wrap before you pay. Online, check it the moment the parcel arrives.</>,
                },
              ]}
            />
          </>
        ),
      },
      {
        id: "ebay-or-store",
        title: "eBay Australia or a store?",
        body: (
          <Prose>
            <p>
              eBay is the other big place Australians buy sealed Pokémon. It’s useful for older or hard-to-find products that stores no longer stock, and for buying from other
              collectors. For a current set, though, a store is usually simpler: a business with a returns policy, prices with GST included, and a price you can check against every other Australian store in one place.
            </p>
            <p>
              If you do look at eBay, compare the listing’s price <strong>plus postage</strong> against the cheapest Australian store, not against a single shop. Read the
              seller’s feedback, check where the item ships from, and look for photos of the actual box. The{" "}
              <Link href={guideHref(r, "ebay-vs-australian-stores-pokemon-fees")}>eBay vs Australian stores guide</Link> works through the costs on both sides, including what
              eBay charges if you’re the one selling.
            </p>
          </Prose>
        ),
      },
      {
        id: "new-store",
        title: "Before you order from a new Australian store",
        body: (
          <Checklist
            items={[
              <>
                <strong>Check for an ABN</strong> in the site’s footer or terms. Australian businesses are given one, and you can look it up on the government’s ABN Lookup.
              </>,
              <>
                <strong>Check the contact details:</strong> a business name, an email address, and ideally a phone number or a street address.
              </>,
              <>
                <strong>Check the postage cost</strong> for your postcode at checkout: our prices exclude shipping.
              </>,
              <>
                <strong>Check the returns and refunds policy</strong> for sealed product. Australian Consumer Law gives you rights when goods arrive faulty or not as
                described, whatever a policy says.
              </>,
              <>
                <strong>Check it’s the exact product:</strong> the right set, the right type, and English-language.
              </>,
              <>
                <strong>Check how you pay.</strong> A card or a payment service gives you a way to dispute a charge; a direct bank transfer to a store you don’t know does not.
              </>,
              <>
                <strong>Check the shrink-wrap and seals</strong> when it arrives, before you open anything.
              </>,
            ]}
          />
        ),
      },
      {
        id: "red-flags",
        title: "Red flags: a price far under everyone else’s",
        body: (
          <Prose>
            <p>
              Across {plural(count, "Australian store")}, prices for the same box tend to sit within a range of each other. When one listing is far below the rest, it’s worth a
              question before you pay. On DexCompare, a price under {half}% of the middle price is never shown as a deal: that is almost always a listing filed under the wrong
              product, such as a single pack priced as a box.
            </p>
            <p>
              Elsewhere, a sealed product far under the going price can mean a resealed box, a damaged item, or a seller who won’t ship. Check the middle price on the product
              page, then read the <Link href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>resealed product guide</Link> for what to look at on the listing and on
              the wrap.
            </p>
          </Prose>
        ),
      },
      {
        id: "tools",
        title: "Tools that help",
        body: (
          <>
            <Prose>
              <ul>
                <li>
                  <strong>Someone has quoted you a price?</strong> The <Link href={toolHref(r.region, "value-checker")}>value checker</Link> shows the cheapest in-stock price
                  in Australia for the same product today, and the middle price, so you can see where the quote sits.
                </li>
                <li>
                  <strong>Trading cards or product with a friend or a shop?</strong> The <Link href={toolHref(r.region, "trade-calculator")}>trade calculator</Link> adds up
                  both sides and works out what a store-credit offer is worth.
                </li>
                <li>
                  <strong>Selling something to fund a box?</strong> The <Link href={toolHref(r.region, "selling-fee-calculator")}>selling fee calculator</Link> uses eBay
                  Australia’s published fees to show what a sale leaves you after postage.
                </li>
              </ul>
            </Prose>
            <NextLinks
              links={[
                { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
                { href: toolHref(r.region, "trade-calculator"), label: "Trade calculator", icon: "arrow-right" },
                { href: toolHref(r.region, "selling-fee-calculator"), label: "Selling fee calculator", icon: "tag" },
              ]}
            />
          </>
        ),
      },
      whereToBuy(r, {
        links: [
          { href: `/${r.region}/sealed`, label: "All sealed products" },
          { href: guideHref(r, "cheapest-way-to-buy-pokemon-packs"), label: "Cheapest way to buy packs" },
        ],
      }),
    ],
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
