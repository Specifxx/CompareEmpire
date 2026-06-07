// File-based content for the Blog and Guides sections. Authored by us (not user
// input), rendered with the lightweight <Markdown> component.

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
    slug: "welcome-to-carcompare",
    category: "blog",
    title: "Welcome to CarCompare",
    excerpt:
      "What CarCompare is, why we built it, and how it helps you find the best price on a new car.",
    author: "CarCompare",
    date: "2026-06-06",
    readMins: 2,
    tags: ["news", "about"],
    body: `CarCompare is a free price-comparison tool for **new cars** — SUVs, sedans, hatchbacks, utes and EVs.

Drive-away prices vary a lot between dealers and marketplaces, and it's hard to know what a fair price is. We built CarCompare to surface the lowest listed price for each model so you can negotiate from a position of strength.

## What you can do here

- **[Browse the database](/browse)** — popular models across the major makes, with the lowest listed price.
- **Compare across markets** — switch between **Australia, the United States** and the **United Kingdom** to price each car in AUD, USD or GBP across marketplaces like carsales, Cars.com and Auto Trader.

Each car links straight out to the cheapest listing. Spotted something off, or want a marketplace added? Use the [contact form](/contact).`,
  },
  {
    slug: "how-to-buy-a-new-car",
    category: "guide",
    title: "How to Buy a New Car for Less",
    excerpt:
      "Body type, fuel, segment and budget — a quick guide to picking the right car and getting the best drive-away price.",
    author: "CarCompare",
    date: "2026-06-06",
    readMins: 3,
    tags: ["beginner", "buying"],
    body: `A few decisions narrow the field fast.

## Body type

- **SUV** — the all-rounder: space, ride height, resale.
- **Hatchback / Sedan** — efficient and easy to park.
- **Ute** — work, towing and tradies.
- **Wagon / Van** — maximum space for families.

## Fuel / drivetrain

- **Petrol** — cheapest to buy.
- **Hybrid** — lower running costs, great in the city.
- **Electric** — lowest running costs, higher upfront price.

## Get the best price

Use the **[database](/browse)** to compare each model across marketplaces, and set the market switcher to **Australia, the US** or the **UK** for local pricing. The lowest listed price is your anchor — take it to a dealer and ask them to beat it.`,
  },
];

export function getArticles(category?: ArticleCategory): Article[] {
  const list = category ? ARTICLES.filter((a) => a.category === category) : ARTICLES;
  return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
