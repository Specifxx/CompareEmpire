// File-based content for the Blog and Guides sections. Authored by us (not user
// input), rendered with the lightweight <Markdown> component. To publish a new
// article, add an entry here.

export type ArticleCategory = "blog" | "guide";

export interface Article {
  slug: string;
  category: ArticleCategory;
  title: string;
  excerpt: string;
  author: string;
  date: string; // ISO (YYYY-MM-DD)
  readMins: number;
  tags: string[];
  body: string; // markdown
}

export const ARTICLES: Article[] = [
  {
    slug: "welcome-to-dexcompare",
    category: "blog",
    title: "Welcome to DexCompare",
    excerpt:
      "What DexCompare is, why we built it, and how it helps you find the cheapest Pokémon cards across stores.",
    author: "DexCompare",
    date: "2026-06-06",
    readMins: 2,
    tags: ["news", "about"],
    body: `DexCompare is a free price-comparison tool for **the Pokémon Trading Card Game**.

Pokémon is fun to collect, but tracking down the cheapest copy of a card across a dozen different stores is tedious — every shop prices differently, stock changes daily, and overseas sites quietly show you the wrong currency. We built DexCompare to do that legwork for you.

## What you can do here

- **[Browse the card database](/browse)** — every Pokémon card across 173 sets, with the lowest live price.
- **[Compare sealed products](/sealed)** — booster boxes, Elite Trainer Boxes, bundles and packs, priced across shops.
- **[Buy & sell on the forum](/forum)** — post want-to-buy / want-to-sell listings and trade directly with other collectors.

## Markets we cover

Use the market switcher to price cards in **Australia, New Zealand, the United States** and the **United Kingdom** — including big stores like TCGplayer, Troll and Toad, Cardmarket, and the UK's Chaos Cards, Magic Madhouse and more. Each card links straight out to the cheapest store so you can buy in a couple of clicks.

Spotted something off, or want a store added? Use the [contact form](/contact) or the [forum](/forum). Thanks for stopping by, and happy hunting.`,
  },
  {
    slug: "where-to-buy-pokemon-cards-australia",
    category: "guide",
    title: "Where to Buy Pokémon Cards in Australia",
    excerpt:
      "How to find the cheapest Pokémon singles and sealed product in Australia — and how DexCompare does the comparison for you.",
    author: "DexCompare",
    date: "2026-06-06",
    readMins: 3,
    tags: ["buying", "australia"],
    body: `Pokémon is sold by a growing number of Australian game stores, and prices for the same card can vary a lot from shop to shop. Here's how to buy smart.

## Singles vs sealed

- **Singles** are individual cards — the cheapest way to get exactly what you need. Browse them in our **[card database](/browse)**, where each card shows the lowest live price and links straight to the store.
- **Sealed** product (booster boxes, Elite Trainer Boxes, bundles, packs) is better for opening and collecting. Compare it on the **[Sealed Products page](/sealed)**.

## Pick your market

Set the market switcher to **Australia** to see AUD prices across Australian stores plus eBay AU, or switch to the **US** and **UK** to compare against TCGplayer, Troll and Toad and the major UK retailers. We always request the local price for the market you choose, so there are no surprise currency conversions at checkout.

## Tips for the cheapest basket

1. **Sort by price.** The database finds the cheapest in-stock copy of each card across every store we track.
2. **Watch shipping.** A card that's 20c cheaper isn't a win if it adds postage from a separate store — we show an estimated shipping figure per shop.
3. **Use the [forum](/forum).** Other collectors list cards for sale (often below retail), and you can post a want-to-buy for anything you're chasing.

If your favourite shop is missing, let us know via [contact](/contact) — this guide will grow as coverage does.`,
  },
];

export function getArticles(category?: ArticleCategory): Article[] {
  const list = category ? ARTICLES.filter((a) => a.category === category) : ARTICLES;
  return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
