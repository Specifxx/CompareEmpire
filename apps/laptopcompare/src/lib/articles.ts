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
    slug: "welcome-to-laptopcompare",
    category: "blog",
    title: "Welcome to LaptopCompare",
    excerpt:
      "What LaptopCompare is, why we built it, and how it helps you find the best price on a new laptop.",
    author: "LaptopCompare",
    date: "2026-06-06",
    readMins: 2,
    tags: ["news", "about"],
    body: `LaptopCompare is a free price-comparison tool for **laptops** — ultraportables, workstations, gaming rigs and Chromebooks.

Laptop prices swing a lot between retailers and configs, and overseas sites quietly show you the wrong currency. We built LaptopCompare to find the cheapest in-stock deal for you.

## What you can do here

- **[Browse the database](/browse)** — popular models across the major brands, with the lowest live price.
- **Compare across markets** — switch between **Australia, the United States** and the **United Kingdom** to price each laptop in AUD, USD or GBP across retailers like JB Hi-Fi, Best Buy and Currys.

Each laptop links straight out to the cheapest retailer. Spotted something off, or want a store added? Use the [contact form](/contact).`,
  },
  {
    slug: "how-to-choose-a-laptop",
    category: "guide",
    title: "How to Choose a Laptop",
    excerpt:
      "OS, size, tier and budget — a quick guide to picking the right laptop and getting the best price.",
    author: "LaptopCompare",
    date: "2026-06-06",
    readMins: 3,
    tags: ["beginner", "buying"],
    body: `A few decisions narrow the field fast.

## Operating system

- **macOS** — MacBooks; superb battery and build.
- **Windows** — the widest choice across every price point.
- **ChromeOS** — cheap, simple, great for browsing.

## Screen size

- **13–14-inch** — light and portable.
- **15–16-inch** — the mainstream balance of screen and weight.
- **17-inch / 2-in-1** — desktop replacements and convertibles.

## Tier & price

Match the tier to the job — Budget for browsing, Premium/Workstation for creative work, Gaming for play. Use the **[database](/browse)** to compare each model across retailers, and set the market switcher to **Australia, the US** or the **UK** for local pricing.`,
  },
];

export function getArticles(category?: ArticleCategory): Article[] {
  const list = category ? ARTICLES.filter((a) => a.category === category) : ARTICLES;
  return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
