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
    slug: "welcome-to-cameracompare",
    category: "blog",
    title: "Welcome to CameraCompare",
    excerpt:
      "What CameraCompare is, why we built it, and how it helps you find the best price on cameras.",
    author: "CameraCompare",
    date: "2026-06-06",
    readMins: 2,
    tags: ["news", "about"],
    body: `CameraCompare is a free price-comparison tool for **cameras** — mirrorless bodies, DSLRs, compacts, action cameras and lenses.

Camera prices swing a lot between retailers and between countries, and overseas sites quietly show you the wrong currency. We built CameraCompare to find the cheapest in-stock option for you.

## What you can do here

- **[Browse the database](/browse)** — popular cameras across the major brands, with the lowest live price.
- **Compare across markets** — switch between **Australia, the United States** and the **United Kingdom** to price each camera in AUD, USD or GBP across stores like B&H, Adorama, digiDirect, JB Hi-Fi and Wex.

Each camera links straight out to the cheapest store. Spotted something off, or want a retailer added? Use the [contact form](/contact). Thanks for stopping by.`,
  },
  {
    slug: "how-to-choose-a-camera",
    category: "guide",
    title: "How to Choose a Camera",
    excerpt:
      "Sensor size, camera type and budget — a quick guide to picking the right camera, and how to get it for the best price.",
    author: "CameraCompare",
    date: "2026-06-06",
    readMins: 3,
    tags: ["beginner", "buying"],
    body: `New to cameras? A few decisions narrow the field fast.

## Camera type

- **Mirrorless** — the modern default: compact, great autofocus and video.
- **DSLR** — older tech, often cheaper second-hand, big lens selection.
- **Compact / action** — pocketable, great for travel and vlogging.

## Sensor size

Bigger sensors generally mean better image quality and low-light performance, at higher cost and size:

- **Full Frame** — best quality, professional and enthusiast bodies.
- **APS-C** — the sweet spot for value and portability.
- **Micro 4/3** — compact systems with excellent stabilisation.

## Get the best price

Use the **[database](/browse)** to compare each camera across retailers, and set the market switcher to **Australia, the US** or the **UK** to see local pricing. Watch shipping, and check for open-box deals — they can save a lot on flagship bodies.`,
  },
];

export function getArticles(category?: ArticleCategory): Article[] {
  const list = category ? ARTICLES.filter((a) => a.category === category) : ARTICLES;
  return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
