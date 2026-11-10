// The words a hub page (a type hub, a set hub, a region home) carries above its grid and in its FAQ, built ONLY from the
// products the page already loaded: today's cheapest open price, the median of the open prices, how many stores stock the
// cheapest, per pack, and the gap between cheapest and dearest. Nothing here is invented, nothing talks about the past ("today",
// "right now"), and every sentence is tested against BANNED_COPY (no pull rates, expected value, investment or trend claims).
// A hub with too little data says less, never filler: each sentence appears only when its number exists (SEO indexing plan,
// SEO-1, 2026-11-10: Google fetched the US booster box hub, found 787 characters of prose in 565 KB of HTML and did not index it).
// Pure: no database and no React (tests/hub-summary.test.ts).
import { cardOpen } from "./compact";
import type { ProductCardData } from "./data";
import { money, plural } from "./format";
import { cheapestPerPackByType, type PerPackPick } from "./per-pack";
import type { RegionInfo } from "./regions";

export interface HubFaq {
  q: string;
  a: string;
}

export interface HubSummary {
  /** Two to four short paragraphs, shown above the product grid. */
  paragraphs: string[];
  /** Four to six questions, answered from the same numbers, shown under the grid (and as FAQPage JSON-LD). */
  faq: HubFaq[];
}

export interface HubSummaryInput {
  r: Pick<RegionInfo, "inName" | "adjective" | "market">;
  /** What the page lists, plural, lower case: "booster boxes", "Surging Sparks sealed products", "Pokémon sealed products". */
  subject: string;
  /** The products the page loaded (open and sold out). */
  products: readonly ProductCardData[];
  /** True when `products` is every product of the hub; false when it is only its cheapest rows (a type hub's first 48). */
  complete: boolean;
  /** Every in-stock product of the hub when the page loaded only some (a type hub); defaults to the open ones in `products`. */
  openTotal?: number;
  /** Every sold-out product of the hub when the page loaded only some; defaults to the sold-out ones in `products`. */
  soldTotal?: number;
  /** What `openTotal` counts when it is wider than `subject` (the region home: "Pokémon sealed products"); defaults to `subject`. */
  countSubject?: string;
  /** Stores tracked in the market. */
  storeCount: number;
  /** US: TCGplayer is named beside the stores. */
  tcgplayer?: boolean;
}

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/** The cheapest pack across the products (cheapest per pack, a fixed pack count only), or null. */
function wayIn(products: readonly ProductCardData[]): PerPackPick | null {
  let best: PerPackPick | null = null;
  for (const pick of cheapestPerPackByType([...products])) if (!best || pick.perPack < best.perPack) best = pick;
  return best;
}

export function hubSummary(i: HubSummaryInput): HubSummary {
  const { r, subject } = i;
  const counted = i.countSubject ?? subject;
  const open = i.products.filter((p) => cardOpen(p) && p.lowestPriceCents != null);
  const openN = i.openTotal ?? i.products.filter(cardOpen).length;
  const sold = i.soldTotal ?? i.products.filter((p) => !cardOpen(p)).length;
  const prices = open.map((p) => p.lowestPriceCents as number);
  const cheapest = open.length ? open.reduce((a, b) => ((b.lowestPriceCents as number) < (a.lowestPriceCents as number) ? b : a)) : null;
  const dearest = open.length ? open.reduce((a, b) => ((b.lowestPriceCents as number) > (a.lowestPriceCents as number) ? b : a)) : null;
  const mid = median(prices);
  const multi = open.filter((p) => p.inStockStores >= 2);
  const below = open.filter((p) => p.medianOpenCents != null && p.inStockStores >= 2 && (p.lowestPriceCents as number) <= p.medianOpenCents * 0.9);
  const way = wayIn(open);
  const where = `${plural(i.storeCount, `${r.adjective} store`)}${i.tcgplayer ? " and TCGplayer" : ""}`;
  const m = r.market;
  const price = (c: number | null) => money(c, m);
  const storesOf = (p: ProductCardData) => (p.inStockStores > 0 ? plural(p.inStockStores, "store") : "TCGplayer");

  const paragraphs: string[] = [];
  if (cheapest) {
    paragraphs.push(
      `Right now ${openN.toLocaleString("en")} of the ${counted} listed in ${r.inName} ${openN === 1 ? "is" : "are"} in stock. ` +
        `${i.countSubject ? `Among the ${subject}, the cheapest in stock is` : "The cheapest is"} ${cheapest.name} at ${price(cheapest.lowestPriceCents)}, ${cheapest.inStockStores > 0 ? `in stock at ${storesOf(cheapest)}` : "on TCGplayer"}.` +
        (mid != null && open.length >= 3 ? ` The middle price of the ${i.complete ? "" : "cheapest "}${open.length} in stock is ${price(mid)}.` : ""),
    );
  } else {
    paragraphs.push(`None of the ${subject} we track in ${r.inName} is in stock right now${sold ? `: ${plural(sold, "product")} ${sold === 1 ? "is" : "are"} listed and sold out everywhere` : ""}. This page fills in as soon as a store has one.`);
  }
  if (cheapest && dearest && open.length >= 2 && i.complete && dearest !== cheapest) {
    const gap = (dearest.lowestPriceCents as number) - (cheapest.lowestPriceCents as number);
    paragraphs.push(`Between the cheapest and the dearest of them there is ${price(gap)}: ${dearest.name} starts at ${price(dearest.lowestPriceCents)}.`);
  } else if (cheapest && open.length >= 2 && !i.complete && mid != null) {
    const top = Math.max(...prices);
    paragraphs.push(`The ${plural(open.length, "cheapest product")} shown run from ${price(cheapest.lowestPriceCents)} to ${price(top)}; the rest of the ${openN.toLocaleString("en")} in stock are one tap away.`);
  }
  if (multi.length >= 2) {
    paragraphs.push(
      `${plural(multi.length, "product")} ${multi.length === 1 ? "is" : "are"} in stock at two or more ${r.adjective} stores, which is where comparing helps` +
        (below.length ? `: ${below.length} ${below.length === 1 ? "has" : "have"} a lowest price at least 10% under the middle price of the stores that stock ${below.length === 1 ? "it" : "them"}` : "") +
        ".",
    );
  }
  if (way) {
    paragraphs.push(`Per booster pack, the cheapest way in is the ${way.p.productType} at ${price(way.perPack)} a pack (${price(way.p.lowestPriceCents)} for ${way.packs} packs).`);
  }
  paragraphs.push(`Prices are each store's listed item price in ${m === "US" ? "US dollars" : "local currency"} from ${where}, and shipping is not included.`);

  const faq: HubFaq[] = [];
  if (cheapest) {
    faq.push({
      q: `What is the cheapest of the ${subject} in ${r.inName} today?`,
      a: `${cheapest.name} at ${price(cheapest.lowestPriceCents)}, ${cheapest.inStockStores > 0 ? `in stock at ${storesOf(cheapest)}` : "on TCGplayer"}. ${i.complete ? "That is the lowest in-stock price of every product on this page." : "That is the lowest in-stock price among the products shown."} Open the product to see every store's price side by side.`,
    });
  }
  faq.push({
    q: `How many of the ${counted} are in stock in ${r.inName}?`,
    a: openN
      ? `${plural(openN, "product")} ${openN === 1 ? "is" : "are"} in stock right now${sold ? `, and ${plural(sold, "more product")} ${sold === 1 ? "is" : "are"} listed but sold out everywhere` : ""}. We check ${where}, so the count changes as stores sell out or receive new stock.`
      : `None right now${sold ? `; ${plural(sold, "product")} ${sold === 1 ? "is" : "are"} listed and sold out everywhere` : ""}. We check ${where} and this page updates with each check.`,
  });
  if (cheapest && dearest && open.length >= 2 && mid != null) {
    faq.push({
      q: `How much do prices differ between the ${subject}?`,
      a: i.complete
        ? `Among the ${plural(open.length, "product")} in stock, prices run from ${price(cheapest.lowestPriceCents)} (${cheapest.name}) to ${price(dearest.lowestPriceCents)} (${dearest.name}), with a middle price of ${price(mid)}. Different products are not like for like, so compare the same product across stores on its page.`
        : `Among the ${plural(open.length, "cheapest product")} shown, prices run from ${price(cheapest.lowestPriceCents)} to ${price(Math.max(...prices))}, with a middle price of ${price(mid)}. Different products are not like for like, so compare the same product across stores on its page.`,
    });
  }
  if (way) {
    faq.push({
      q: `Which of the ${subject} is cheapest per pack?`,
      a: `Today the ${way.p.productType} (${way.p.name}) at ${price(way.perPack)} a booster pack: ${price(way.p.lowestPriceCents)} for ${way.packs} packs. Per-pack prices divide the listed price by the packs inside; promos, sleeves and dice are not priced in.`,
    });
  }
  if (multi.length >= 2 && mid != null) {
    faq.push({
      q: `Is it worth checking more than one store in ${r.inName}?`,
      a: `${plural(multi.length, "product")} on this page ${multi.length === 1 ? "is" : "are"} in stock at two or more stores${below.length ? `, and ${below.length} of them ${below.length === 1 ? "has" : "have"} a lowest price at least 10% under the middle price of the stores that stock ${below.length === 1 ? "it" : "them"}` : ""}. A product page lists every store, cheapest first.`,
    });
  }
  faq.push({
    q: `Where do these prices come from, and are they up to date?`,
    a: `Each price is read from the store's own listing: ${where}, checked twice a day. The price shown is the item price in ${m === "US" ? "US dollars" : "the store's own currency"}, without shipping, which stores set separately. We never convert between currencies and we do not vouch for a store.`,
  });
  return { paragraphs, faq };
}

/** The FAQPage JSON-LD for the questions a page shows (the markup goes only where the answers are visible). */
export function faqJsonLd(faq: readonly HubFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}
