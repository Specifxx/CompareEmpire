export type ArticleCategory = "guide" | "blog";
export interface Article { slug: string; category: ArticleCategory; title: string; excerpt: string; author: string; date: string; readMins: number; tags: string[]; body: string; }

export const ARTICLES: Article[] = [
  {
    slug: "yugioh-card-rarities-explained",
    category: "guide",
    title: "Yu-Gi-Oh! Card Rarities Explained: Common to Quarter Century Secret",
    excerpt: "Super, Ultra, Secret, Ultimate, Ghost, Starlight and Quarter Century — what each rarity means and how it drives price.",
    author: "YGOCompare", date: "2026-06-10", readMins: 7, tags: ["rarity", "beginner", "value"],
    body: `Yu-Gi-Oh! prints the same card across many rarities, and the rarity often matters more for price than the card itself.

## The rarity ladder

- **Common** — no foil; the cheapest way to play a card.
- **Rare** — silver-foil name.
- **Super Rare** — foil artwork.
- **Ultra Rare** — gold-foil name + foil art.
- **Secret Rare** — diagonal rainbow foil; a set's premium pulls.
- **Ultimate Rare** — embossed/textured foil.
- **Ghost Rare** and **Starlight Rare** — ultra-low pull-rate collector chase cards.
- **Quarter Century Secret Rare** — the 25th-anniversary rarity that has become the modern grail.

## Why the same card has ten prices

A tournament player can run a cheap **Common** copy; a collector will pay 100× for the **Quarter Century Secret Rare** of the exact same card. They're functionally identical. Decide which you're buying *before* you shop.

## Using this site

Every card page ranks all the printings and rarities we track by total delivered price — so you can grab the cheapest playable copy, or hunt the specific foil, without overpaying.`,
  },
  {
    slug: "yugioh-hand-traps-buying-guide",
    category: "guide",
    title: "The Hand Trap Buyer's Guide: Ash, Maxx \"C\", Imperm & Veiler",
    excerpt: "The four cards almost every competitive deck runs — what they do for your wallet and where to buy them cheapest.",
    author: "YGOCompare", date: "2026-06-08", readMins: 6, tags: ["hand traps", "competitive", "staples"],
    body: `If you're building a competitive deck, the **hand traps** are a bigger line item than your actual strategy. Four cards show up in almost every deck:

- **Ash Blossom & Joyous Spring** — the universal negate; you'll want three.
- **Maxx "C"** — the card-advantage tax (legal in the TCG again as of recent lists).
- **Infinite Impermanence** — the best non-monster interruption.
- **Effect Veiler** — a free-to-summon-shutdown tuner.

## The cost reality

A full hand-trap suite is often pricier than the rest of the deck. Because these are reprinted constantly across many rarities, prices vary wildly between printings and stores. Buying the cheapest *playable* printing (usually a recent Common or Super Rare) instead of a flashy Secret saves a fortune.

## Buy smart

On any card page here, the cheapest printing across every store is ranked first — the fastest way to assemble a playset without overpaying for foil you don't need.`,
  },
  {
    slug: "cheapest-way-to-buy-yugioh-singles",
    category: "blog",
    title: "The Cheapest Way to Buy Yu-Gi-Oh! Singles in 2026",
    excerpt: "Singles vs. boxes, shipping maths, and why comparing every store beats loyalty to one shop.",
    author: "YGOCompare", date: "2026-06-11", readMins: 5, tags: ["deals", "buying", "shipping"],
    body: `For a specific deck, **buying singles beats cracking boxes** every time. A box is a gamble; a singles list is a controlled spend.

## The hidden cost: shipping

A card 50c cheaper somewhere can cost more once shipping is added. Every comparison here ranks listings by **total delivered cost** — item plus shipping.

## Buy in one basket

Assembling your wants in one order from the store that stocks the most usually beats chasing the floor on each card across five shops and paying five shipping fees.

## Don't forget eBay

For vintage and out-of-print prints, eBay is often the deepest market — and every eBay link here is price-checked against local stores so you can see which is cheaper today.`,
  },
  {
    slug: "vintage-yugioh-why-lob-is-expensive",
    category: "blog",
    title: "Why 2002 Legend of Blue Eyes Cards Cost a Fortune",
    excerpt: "First-print Blue-Eyes, Dark Magician and Exodia — scarcity, nostalgia and the original print run.",
    author: "YGOCompare", date: "2026-06-09", readMins: 4, tags: ["vintage", "lob", "investing"],
    body: `**Legend of Blue Eyes White Dragon (LOB)** launched the Yu-Gi-Oh! TCG in 2002 — and first-edition copies of its iconic cards now trade for huge money.

## Why

- **Tiny early supply** vs. two decades of collector demand.
- **Nostalgia** — these are the cards a generation grew up with.
- **Condition scarcity** — 2002 cardboard in Near Mint is genuinely rare, and graded gem-mint copies command enormous premiums.

## If you're buying

1. **Pick your condition.** Played first-editions are dramatically cheaper than NM, and for most collectors that's the smart buy.
2. **Watch out for fakes** — vintage Blue-Eyes is one of the most counterfeited cards. Prefer graded copies or stores with returns.
3. **Compare markets.** Currency swings move the cheapest copy between regions; that's exactly what this tool is for.`,
  },
];

export function getArticles(category?: ArticleCategory): Article[] {
  const list = category ? ARTICLES.filter((a) => a.category === category) : ARTICLES.slice();
  return list.sort((a, b) => (a.date < b.date ? 1 : -1));
}
export function getArticle(slug: string): Article | undefined { return ARTICLES.find((a) => a.slug === slug); }
