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
    slug: "welcome-to-phonecompare",
    category: "blog",
    title: "Welcome to PhoneCompare",
    excerpt:
      "What PhoneCompare is, why we built it, and how it helps you find the best price on a new phone.",
    author: "PhoneCompare",
    date: "2026-06-06",
    readMins: 2,
    tags: ["news", "about"],
    body: `PhoneCompare is a free price-comparison tool for **smartphones** — from flagships to budget handsets.

Phone prices vary a lot between retailers and carriers, and overseas sites quietly show you the wrong currency. We built PhoneCompare to find the cheapest in-stock deal for you.

## What you can do here

- **[Browse the database](/browse)** — popular phones across the major brands, with the lowest live price.
- **Compare across markets** — switch between **Australia, the United States** and the **United Kingdom** to price each phone in AUD, USD or GBP across retailers like JB Hi-Fi, Best Buy and Currys.

Each phone links straight out to the cheapest retailer. Spotted something off, or want a store added? Use the [contact form](/contact).`,
  },
  {
    slug: "how-to-choose-a-phone",
    category: "guide",
    title: "How to Choose a Phone",
    excerpt:
      "OS, size, tier and budget — a quick guide to picking the right phone and getting the best price.",
    author: "PhoneCompare",
    date: "2026-06-06",
    readMins: 3,
    tags: ["beginner", "buying"],
    body: `A few decisions narrow the field fast.

## Operating system

- **iOS** — iPhones; long updates, tight ecosystem.
- **Android** — huge choice across brands and price points.

## Form factor

- **Compact** — easy one-handed use.
- **Standard / Max** — the mainstream and the big-screen flagships.
- **Foldable / Flip** — premium, do-it-all or pocketable.

## Tier & price

Flagships get the best cameras and chips; mid-range phones now cover most needs for far less. Use the **[database](/browse)** to compare each model across retailers, and set the market switcher to **Australia, the US** or the **UK** for local pricing.`,
  },
];

export function getArticles(category?: ArticleCategory): Article[] {
  const list = category ? ARTICLES.filter((a) => a.category === category) : ARTICLES;
  return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
