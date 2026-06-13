// File-based content for the Guides and Blog sections (authored by us).
export type ArticleCategory = "guide" | "blog";
export interface Article { slug: string; category: ArticleCategory; title: string; excerpt: string; author: string; date: string; readMins: number; tags: string[]; body: string; }

export const ARTICLES: Article[] = [
  {
    slug: "one-piece-card-rarities-explained",
    category: "guide",
    title: "One Piece Card Rarities Explained: C, UC, R, SR, SEC & Manga",
    excerpt: "What each rarity stamp means, why alt-arts and Secret Rares command the big money, and how rarity drives price.",
    author: "OPCompare", date: "2026-06-10", readMins: 6, tags: ["rarity", "beginner", "value"],
    body: `Every One Piece card prints its rarity next to the card number. Knowing the ladder helps you read value at a glance.

## The rarity ladder

- **C (Common)** and **UC (Uncommon)** — the bulk of a set; mostly playset filler.
- **R (Rare)** and **SR (Super Rare)** — the playable chase rares; many decks are built around SR characters.
- **L (Leader)** — one per deck; alternate-art leaders are highly sought.
- **SEC (Secret Rare)** — the top of the standard pull rate and usually a set's most valuable card.
- **Special / Manga Rare** — alternate-art and manga-style treatments (and SP cards from Premium Boosters) are the true grails.

## Why alt-arts cost the most

In One Piece, the **art treatment** often matters more than the card's gameplay. The same character can exist as a cheap common and a $300 manga-art SEC. Demand is driven by collectors as much as players.

## Using this when buying

Decide whether you want the *cheapest playable copy* or a *specific art*. On any card page here, every store's price for that exact printing is ranked by total delivered cost — so you never overpay for the version you want.`,
  },
  {
    slug: "how-to-spot-fake-one-piece-cards",
    category: "guide",
    title: "How to Spot Fake One Piece Cards",
    excerpt: "Texture, colour, the foil pattern and the back-print line — a practical checklist before you spend real money.",
    author: "OPCompare", date: "2026-06-07", readMins: 5, tags: ["fakes", "authentication", "buying"],
    body: `Counterfeit One Piece cards exist, especially for expensive leaders and Secret Rares. Run through these checks before a big purchase.

- **Texture & gloss.** Genuine cards have a consistent, slightly textured finish. Fakes are often too glossy or too matte.
- **Colour & saturation.** Real prints are crisp; fakes drift towards over-saturated or washed-out colour.
- **Foil pattern.** Compare the holo pattern against a known-genuine card from the same set — fakes rarely match the exact foil.
- **Back print.** The reverse should be sharp with clean borders; blurry text or a mismatched back colour is a red flag.

## Buying online safely

Prefer **graded copies** for expensive cards, buy from **sellers with returns**, and be wary of prices far under market — on each card page here, a listing far below the pack is usually too good to be true.`,
  },
  {
    slug: "cheapest-way-to-buy-one-piece-singles",
    category: "blog",
    title: "The Cheapest Way to Buy One Piece Singles in 2026",
    excerpt: "Singles vs. booster boxes, shipping maths, and why comparing every store beats loyalty to one shop.",
    author: "OPCompare", date: "2026-06-11", readMins: 5, tags: ["deals", "buying", "shipping"],
    body: `Want specific cards for a deck? **Buying singles beats cracking boxes.** A booster box is a gamble; a singles order is a shopping list you control.

## The hidden cost: shipping

The sticker price isn't the real price. A card 50c cheaper at one store can cost more once shipping is added. Every comparison here ranks listings by **total delivered cost** — item plus shipping.

## Buy in one basket

Combining your wants into one order from the store that stocks the most usually beats chasing the floor on each card across five shops (and paying five shipping fees).

## Don't forget eBay

For out-of-print sets and alt-arts, eBay is often the deepest market — and every eBay link here is price-checked against local stores so you can see which is cheaper today.`,
  },
  {
    slug: "op01-romance-dawn-why-its-expensive",
    category: "blog",
    title: "Why Romance Dawn (OP01) Singles Stay Expensive",
    excerpt: "Scarce early print runs, surging player numbers, and what it means if you're buying the first set today.",
    author: "OPCompare", date: "2026-06-09", readMins: 4, tags: ["op01", "investing", "buying"],
    body: `**Romance Dawn (OP01)** launched the One Piece Card Game in late 2022 with print runs that didn't anticipate how big the game would get. Two years on, demand has multiplied while early supply stayed fixed.

## The result

First-set leaders and SRs — and especially the alt-arts — trade at a premium that newer sets don't command. It's the same dynamic that keeps any game's first set pricey.

## If you're buying

1. **Decide on condition.** Played copies are far cheaper than Near Mint, and for a deck that's often all you need.
2. **Compare every market.** Currency swings mean the cheapest copy moves between the US, UK and Australia week to week — exactly what a compare tool is for.
3. **Watch the deals page.** First-set cards occasionally dip when a store overstocks; the deals page surfaces those moments.`,
  },
];

export function getArticles(category?: ArticleCategory): Article[] {
  const list = category ? ARTICLES.filter((a) => a.category === category) : ARTICLES.slice();
  return list.sort((a, b) => (a.date < b.date ? 1 : -1));
}
export function getArticle(slug: string): Article | undefined { return ARTICLES.find((a) => a.slug === slug); }
