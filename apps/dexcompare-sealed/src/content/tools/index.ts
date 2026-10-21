// The tools: small calculators and checkers at /<region>/tools/<slug>, each a standalone page with its own copy and FAQ, so a search for
// "pokemon card trade calculator" lands on a page that answers it. The registry is pure (no database, no React): the sitemap, the
// footer and the tests read it as it stands. The pages are src/app/[region]/tools; each tool's interactive part is a client component
// (src/components/tools/), so the page's copy, FAQ and links are in the server HTML a crawler reads.
//
// The writing rules are the guides' (src/content/guides/index.ts): nothing may match BANNED_COPY, no pull rates, no claims about
// what a card or product will be worth, and every fee figure comes from lib/fees.ts with the day it was checked.
import type { Region } from "../../lib/regions";
import { REGION_LIST } from "../../lib/regions";

export type ToolSlug = "value-checker" | "trade-calculator" | "selling-fee-calculator" | "grading-value-calculator" | "deck-builder";

export interface ToolFaq {
  q: string;
  a: string;
}

export interface Tool {
  slug: ToolSlug;
  /** The H1 and the <title> (with " | DexCompare" where it fits in 65 characters). */
  title: string;
  /** Meta description and the index card's text: at most 160 characters. */
  description: string;
  /** The index card's eyebrow. */
  kicker: string;
  /** The answer in a sentence, under the H1. */
  lede: string;
  /** What the tool does and how to read it: the page's running copy, a paragraph each. */
  about: readonly string[];
  /** How to use it, step by step. */
  steps: readonly string[];
  faq: readonly ToolFaq[];
  /** The guides it pairs with (guide slugs; the page links the ones offered in the region). */
  guides: readonly string[];
  /** Editorial date (YYYY-MM-DD). */
  updated: string;
}

export const TOOLS: readonly Tool[] = [
  {
    slug: "value-checker",
    title: "Pokémon sealed value checker",
    description: "Check what a Pokémon booster box, ETB or bundle sells for at stores today: the cheapest in-stock price, the median, and the price per pack.",
    kicker: "Value checker",
    lede: "Search any Pokémon TCG sealed product to see what independent stores charge for it today, and how a price you were quoted compares.",
    about: [
      "The value checker reads the same data as the rest of DexCompare: every independent store we track in your region, read twice a day, with each store's own listed price and whether it has the product in stock. Search a booster box, Elite Trainer Box, bundle, tin or collection, and it shows the cheapest in-stock price, the median of the stores that have it in stock, how many stores have it, and what a single booster pack works out to inside it.",
      "Type a price into the box under the result and the checker tells you where that price sits: under the cheapest store, between the cheapest and the median, or above what most stores ask. That makes it useful when a friend offers you a box, a local shop quotes a price, or a marketplace listing looks cheap: you can see in a few seconds what the same product costs from a store right now.",
      "Sealed product only. For a single card, check recent sold listings on eBay or a card marketplace instead; our guide on checking a card's value walks through how. The checker never guesses what a product will be worth later: it reports what stores ask today, and says when they were last checked.",
    ],
    steps: [
      "Pick your region at the top of the site: prices are in its currency.",
      "Search the product by set and type, such as “Surging Sparks booster box”.",
      "Read the cheapest in-stock price, the median and the price per pack.",
      "Optional: type the price you were offered to see how it compares.",
    ],
    faq: [
      { q: "Where do the prices come from?", a: "From the independent online stores DexCompare reads in your region, twice a day. Each price is the store's own listed price, excluding shipping, and the result says when the stores were last checked." },
      { q: "What does the median mean here?", a: "The middle price of the stores that have the product in stock today. Half of those stores ask less and half ask more. It needs at least two stores in stock; with fewer, the checker shows the cheapest price alone." },
      { q: "Can it value a single card?", a: "No. DexCompare compares sealed product: booster boxes, Elite Trainer Boxes, bundles, tins and collections. For a single card, look at recent sold listings for the same card in the same condition." },
      { q: "Does a price under the median mean it is a good buy?", a: "It means it is cheaper than most stores ask today. Check the seller, the shipping cost and the shrink-wrap before you pay, especially when a price is far below every store's." },
      { q: "Why is a product missing?", a: "The checker lists products that at least one store in your region has in stock or that two or more stores list. A product no store we track sells in your region won't appear." },
    ],
    guides: ["how-to-check-pokemon-card-value", "cheapest-way-to-buy-pokemon-packs", "pokemon-booster-box-vs-etb-value"],
    updated: "2026-10-21",
  },
  {
    slug: "trade-calculator",
    title: "Pokémon card trade calculator",
    description: "Add up both sides of a Pokémon card or sealed product trade, see the difference in value and percentage, and work out store credit trade-ins.",
    kicker: "Trade calculator",
    lede: "List what you give and what you get, with a value for each, and see straight away whether the trade is even and by how much.",
    about: [
      "A trade is only fair if both sides agree on what each card or product is worth. The calculator keeps the arithmetic out of the way: add each item you are giving and each item you are getting, with a quantity and a value, and it totals both sides, shows the difference in your currency and as a percentage of the bigger side, and tells you which side is ahead.",
      "Shops that take cards for store credit usually offer a percentage of what they think a card sells for. Set the credit rate and the calculator shows what your side is worth in credit, so you can compare a trade-in with selling the cards yourself. Pair it with the selling-fee calculator to see what the same cards would leave you after eBay's fees.",
      "Use values you can stand behind: the cheapest in-stock store price for sealed product (the value checker shows it), and recent sold listings in the same condition for single cards. The calculator doesn't fetch card prices or judge what anything is worth; it adds up the numbers both traders agree on. Nothing you type leaves your browser.",
    ],
    steps: [
      "Add every item you are giving: a name, how many, and the value of one.",
      "Add every item you are getting in the same way.",
      "Read the totals, the difference and which side is ahead.",
      "For a store trade-in, set the credit rate the shop offers.",
    ],
    faq: [
      { q: "What value should I use for each card?", a: "One both traders accept. For sealed product, the cheapest price at a store that has it in stock is a fair reference; for single cards, recent sold listings for the same card and condition are better than asking prices." },
      { q: "What counts as an even trade?", a: "That is for the two traders to agree. The calculator shows the gap in money and as a percentage of the bigger side, so a small gap is easy to settle with a little cash or one more card." },
      { q: "How does the store credit rate work?", a: "Shops that buy cards usually offer store credit at a percentage of their own value for a card, and a lower percentage in cash. Enter the shop's credit percentage to see what your side becomes in credit." },
      { q: "Is my list saved anywhere?", a: "Only in your own browser, so it is still there if you reload the page. Nothing is sent to DexCompare." },
    ],
    guides: ["how-to-check-pokemon-card-value", "is-pokemon-card-grading-worth-it"],
    updated: "2026-10-21",
  },
  {
    slug: "selling-fee-calculator",
    title: "Pokémon card selling fee calculator",
    description: "Work out eBay's fees on a Pokémon card or sealed product sale, and what you keep after postage, with eBay's published rates or your own.",
    kicker: "Selling fees",
    lede: "Enter the sale price and postage to see eBay's final value fee, the per-order fee, and what the sale leaves you after your own costs.",
    about: [
      "eBay takes a final value fee on the whole amount the buyer pays, postage included, plus a small fee per order. The calculator applies eBay's published rates for Pokémon cards and sealed product (in Australia and the US) to your sale, then subtracts what you paid for postage and for the item, so you see the money that is actually left.",
      "Rates depend on the seller. In Australia, eBay lets Australia-based sellers with up to A$25,000 in sales a year sell for free, and Pro plans pay by tier; in the US, card games pay a different rate with a Basic Store or higher. Pick the preset that matches you, or choose Custom and type the rate from your Seller Hub. Every preset says the day we checked eBay's page and links to it.",
      "Comparing a sale with a trade-in? The trade calculator shows what a shop's store credit offer is worth, and the value checker shows what stores charge for a sealed product today, which is the ceiling most buyers will compare your price with.",
    ],
    steps: [
      "Choose the preset that matches how you sell, or Custom.",
      "Enter the item price and the postage you charge the buyer.",
      "Enter what the postage costs you and what you paid for the item.",
      "Read the fees, what eBay pays you and what you keep.",
    ],
    faq: [
      { q: "Does eBay charge its fee on postage?", a: "Yes. eBay's final value fee is a percentage of the total the buyer pays, which includes the postage you charge (and, in the US, sales tax). The calculator includes postage for that reason." },
      { q: "Do private sellers in Australia pay eBay fees?", a: "eBay's Australian fee page says Australia-based sellers with up to A$25,000 in sales over the past 12 months can sell for free. Above that, or on a Pro plan, fees apply. Check your own rate in Seller Hub." },
      { q: "Why does my fee differ from the calculator's?", a: "Your plan, store subscription, category, promotions and any optional listing upgrades all change it. Use Custom with the rate your Seller Hub shows to match your account exactly." },
      { q: "When were these rates checked?", a: "Each preset shows the date we read eBay's fee page and links to it. eBay changes its fees from time to time, so confirm before you price a big sale." },
    ],
    guides: ["ebay-vs-australian-stores-pokemon-fees", "is-pokemon-card-grading-worth-it", "how-to-check-pokemon-card-value"],
    updated: "2026-10-21",
  },
  {
    slug: "grading-value-calculator",
    title: "Pokémon card grading value calculator",
    description: "Is grading a Pokémon card worth it? Compare selling it raw with grading it first: fees, postage, the grade you expect and the price you need.",
    kicker: "Grading maths",
    lede: "Compare selling a card raw with grading it first: see what each grade would leave you after costs, and the graded price you need to break even.",
    about: [
      "Grading costs money before it earns any: the grading company's fee, postage and insurance both ways, and the selling fees on the graded sale. The calculator puts those costs next to what the card sells for ungraded, then shows what each grade you think likely would leave you, and the graded sale price you need just to match selling it raw.",
      "You supply every number, because every number depends on your card and your grader. Use recent sold listings for the same card, raw and in each grade, and the price list of the grading service and tier you would use. Enter your own estimate of how likely each grade is and the calculator shows a weighted average outcome, so a card that only pays off at the top grade is easy to spot.",
      "Sealed product is the other side of the hobby, and the one DexCompare compares: if the card came out of packs you are still buying, the cheapest-per-pack page shows what each pack costs today. Pair this with the selling-fee calculator for the eBay side of a sale.",
    ],
    steps: [
      "Enter what the card sells for ungraded, and the selling fee rate you pay.",
      "Enter the grading fee and the postage and insurance, both ways.",
      "For each grade, enter what that grade sells for and how likely you think it is.",
      "Read each grade's result, the weighted average and the break-even price.",
    ],
    faq: [
      { q: "When is grading worth it?", a: "When the graded price you can realistically get, after the grading fee, postage both ways and selling fees, beats what the card sells for raw. The calculator shows that break-even price, so you can compare it with recent sold listings." },
      { q: "Does the calculator know grading fees or card prices?", a: "No. Fees change by company, tier and declared value, and card prices change all the time, so every number is yours. Use your grader's current price list and recent sold listings." },
      { q: "What does the weighted average mean?", a: "Each grade's result multiplied by how likely you think that grade is, added up. If you think a 10 is unlikely, the average shows what grading is worth across all the grades you could get, not just the best one." },
      { q: "Should sealed product be graded?", a: "Sealed product isn't graded like cards. For booster boxes and Elite Trainer Boxes, what matters is an intact factory seal; our guide on resealed product says what to check." },
    ],
    guides: ["is-pokemon-card-grading-worth-it", "how-to-check-pokemon-card-value", "how-to-avoid-resealed-pokemon-products"],
    updated: "2026-10-21",
  },
  {
    slug: "deck-builder",
    title: "Pokémon TCG deck builder and list checker",
    description: "Build or paste a Pokémon TCG deck list, count Pokémon, Trainers and Energy, and check it against the 60-card and four-copy rules before you play.",
    kicker: "Deck builder",
    lede: "Build a deck card by card, or paste a list from Pokémon TCG Live, and check it has 60 cards and no more than four copies of any card.",
    about: [
      "A Standard deck has exactly 60 cards, and no more than four copies of a card with the same name, except basic Energy. The deck builder counts as you go: add cards under Pokémon, Trainer or Energy with how many of each, and it keeps the running total, the split between the three sections and a warning on any card over the limit.",
      "Already have a list? Paste it in the usual export format, a count then the card name then the set code and number on each line, with the section headings Pokémon, Trainer and Energy, as Pokémon TCG Live and most deck sites export it. The builder reads it into the three sections, and you can edit it and copy the clean list back out. Your deck stays in your browser.",
      "It checks the counts and the copy limit, not which cards are legal in the current format or the one-per-deck cards such as ACE SPECs: check those against the rotation and the card text. Building from sealed? A Build & Battle Box is made for a first deck, and the cheapest-per-pack page shows the cheapest way into a set's cards today.",
    ],
    steps: [
      "Add a card: its name, how many, and its section.",
      "Or paste a list from Pokémon TCG Live and press Read list.",
      "Fix anything flagged: the total must be 60, four copies at most.",
      "Copy the clean list to import it back into Pokémon TCG Live.",
    ],
    faq: [
      { q: "How many cards are in a Pokémon TCG deck?", a: "Exactly 60 in Standard and Expanded play. The builder counts every section and flags a deck that is over or under." },
      { q: "How many copies of one card can a deck have?", a: "Four of any card with the same name, except basic Energy, which has no limit. Some cards, such as ACE SPECs, have a lower limit printed on them; the builder doesn't know card text, so check those yourself." },
      { q: "Which list format can I paste?", a: "The usual export: each line a count, the card name, then the set code and collector number, under the headings Pokémon, Trainer and Energy. Lines it can't read are listed so you can fix them." },
      { q: "Does it check which cards are legal?", a: "No. It checks counts and the four-copy rule. Format legality changes with each rotation, so check the current Standard list before an event." },
    ],
    guides: ["pokemon-build-and-battle-box", "cheapest-way-to-buy-pokemon-packs", "pokemon-sealed-products-explained"],
    updated: "2026-10-21",
  },
];

export const TOOL_BY_SLUG: ReadonlyMap<string, Tool> = new Map(TOOLS.map((t) => [t.slug, t]));

/** Every tool is offered in every region (each page reads its region's currency, prices and eBay site). */
export function toolRegions(_t: Tool): Region[] {
  return REGION_LIST.map((r) => r.region);
}

export const toolHref = (region: Region, slug: ToolSlug) => `/${region}/tools/${slug}`;

/** The <title>: " | DexCompare" when it still fits in 65 characters. */
export function toolMetaTitle(title: string): string | { absolute: string } {
  return title.length + " | DexCompare".length <= 65 ? title : { absolute: title };
}
