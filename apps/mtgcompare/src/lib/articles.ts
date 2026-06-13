// File-based content for the Guides and Blog sections. Authored by us (not user
// input), rendered with the lightweight <Markdown> component. To publish a new
// article, add an entry here.
//
// Editorial line: MTGCompare content is for people who BUY Magic: The Gathering
// cards — buying smart, conditions/grading, spotting fakes, the Reserved List,
// formats and deals — not how to play. "guide" = evergreen how-to; "blog" =
// takes, price commentary and buying angles.

export type ArticleCategory = "guide" | "blog";

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
    slug: "mtg-card-rarities-explained",
    category: "guide",
    title: "MTG Card Rarities Explained: Common, Uncommon, Rare & Mythic",
    excerpt:
      "What the set symbol colour actually means, why some commons cost more than mythics, and how rarity does (and doesn't) drive price.",
    author: "MTGCompare",
    date: "2026-06-10",
    readMins: 6,
    tags: ["rarity", "beginner", "value"],
    body: `Every Magic card prints its rarity into the set symbol's colour. Knowing the wheel helps you read a card at a glance — but rarity is only loosely correlated with price.

## The rarity wheel

- **Common** (black symbol) — the bulk of a set. Most are bulk-priced, but staple commons (think *Lightning Bolt*, *Counterspell*) can outvalue rares.
- **Uncommon** (silver) — better effects, still opened often. Format-defining uncommons spike hard.
- **Rare** (gold) — one or two per pack. Most chase cards live here.
- **Mythic Rare** (orange-red) — the rarest slot in a modern pack, roughly 1 in 8 packs.
- **Special / Bonus sheet** — Mystical Archive, The List, Special Guests and serialised cards sit outside the normal wheel.

## Why rarity ≠ value

A card's price is set by **demand vs. supply**, not its symbol. A heavily-played Modern or Commander staple printed at uncommon can cost more than a mythic nobody plays. Reserved-List rares from the 1990s trade for hundreds because they can never be reprinted.

## How to use this when buying

Use rarity to understand *how hard a card is to open* — then ignore it and let the live price tell you what it's worth. On any card page here, compare every store's price for the exact printing you want before you buy: the cheapest copy is often at a store you'd never think to check.`,
  },
  {
    slug: "what-is-the-reserved-list",
    category: "guide",
    title: "The Reserved List: Why Some Old Magic Cards Cost a Fortune",
    excerpt:
      "Dual lands, Power Nine and the promise that keeps them expensive. What the Reserved List is and what it means for buyers.",
    author: "MTGCompare",
    date: "2026-06-08",
    readMins: 7,
    tags: ["reserved list", "vintage", "investing"],
    body: `If you've ever wondered why a 1994 *Underground Sea* or an Alpha *Mox* costs as much as a car, the answer is two words: **the Reserved List**.

## What it is

The Reserved List is a Wizards of the Coast policy promising that specific older cards will **never be reprinted** in a functionally identical form. It was created in 1996 to protect the secondary-market value of early collectors' cards after reprints tanked prices.

## What's on it

- The **Power Nine** (Black Lotus, the five Moxen, Ancestral Recall, Time Walk, Timetwister).
- The original **dual lands** (Underground Sea, Tropical Island, etc.).
- A long tail of 1990s rares with no modern equivalent.

## What it means for buyers

Fixed supply + ongoing demand = prices that only really move one direction over the long run. That makes Reserved-List cards both a collector grail and a target for fakes. If you're buying:

1. **Buy the condition you actually want** — played copies of these cards are dramatically cheaper than Near Mint, and the gap is huge.
2. **Compare every market.** Currency swings mean the cheapest *Tundra* might be in the UK one week and the US the next — exactly what a compare tool is for.
3. **Authenticate big purchases.** For four-figure cards, buy graded or from a reputable store with returns.`,
  },
  {
    slug: "how-to-spot-fake-magic-cards",
    category: "guide",
    title: "How to Spot Fake Magic Cards",
    excerpt:
      "The light test, the bend test, the rosette print pattern and the green-dot line. A practical checklist before you spend real money.",
    author: "MTGCompare",
    date: "2026-06-05",
    readMins: 6,
    tags: ["fakes", "authentication", "buying"],
    body: `Counterfeits get better every year, but real Magic cards still share tells that fakes struggle to reproduce. Run through this before any significant purchase.

## The quick checks

- **The light test.** Hold the card to a bright light. Genuine cards have a black core that blocks most light — they look dark grey. Most fakes glow through.
- **The bend test.** A real card bends and snaps back without creasing. (Don't do this on cards you don't own.)
- **The rosette pattern.** Under a loupe, real cards show a tight, random rosette dot pattern. Fakes often show a regular grid or blurry dots.
- **The green-dot / print line.** On the back, the line between the white border and the card frame is crisp on real cards.

## When buying online

You can't loupe a card through a screen, so reduce risk instead: prefer **graded copies** for expensive cards, buy from **stores with returns**, and be sceptical of prices far under market. On every card page here, the lowest delivered price is shown alongside the store — if one listing is suspiciously cheap, it usually isn't the bargain it looks like.`,
  },
  {
    slug: "cheapest-way-to-buy-magic-singles",
    category: "blog",
    title: "The Cheapest Way to Buy Magic Singles in 2026",
    excerpt:
      "Singles vs. packs, shipping maths, and why comparing every store beats loyalty to one shop.",
    author: "MTGCompare",
    date: "2026-06-11",
    readMins: 5,
    tags: ["deals", "buying", "shipping"],
    body: `If you want specific cards — for a Commander deck, a Modern list, a binder — **buying singles is almost always cheaper than cracking packs.** A booster box is a lottery ticket; a singles order is a shopping list.

## The hidden cost: shipping

The sticker price isn't the real price. A card that's 50c cheaper at Store A can cost more once you add a separate shipping charge. That's why every comparison here ranks listings by **total delivered cost** — item plus shipping — not just the headline number.

## Buy in one basket

Combining cards into one order from the cheapest store that stocks most of your list usually beats chasing the absolute floor on each card across five stores (and paying five shipping fees). Use the compare pages to find which single store covers the most of your wants.

## Don't forget eBay

For out-of-print and Reserved-List cards, eBay is often the deepest market. Every eBay link here is price-checked against local stores so you can see at a glance whether the auction site or a shop is cheaper today.`,
  },
  {
    slug: "5-prices-on-a-magic-card-explained",
    category: "blog",
    title: "Market, Low, Mid: The Prices on a Magic Card, Explained",
    excerpt:
      "Why one card shows five different numbers, what each measures, and which one you should actually pay.",
    author: "MTGCompare",
    date: "2026-06-09",
    readMins: 4,
    tags: ["prices", "market price", "buying"],
    body: `Look up any Magic single and you'll see a confusing spread of numbers. Here's what each one is measuring.

- **Market price** — a rolling average of recent *sales*. The closest thing to "what it's really worth" right now.
- **Low** — the cheapest currently-listed copy, often heavily played or from overseas.
- **Mid** — the midpoint of active listings; a rough "fair ask".
- **Listed / direct low** — the cheapest copy from a vetted seller.

## Which should you pay?

You should pay the **lowest delivered price for the condition you want** — full stop. The "market" number is a useful sanity check (is this listing a deal or a rip-off?), but you never have to pay the average if a cheaper buyable copy exists.

That's the whole idea here: each card page collapses every store's price into one ranked list so you can see the genuine floor — and how far the priciest seller is above it — in one glance.`,
  },
];

export function getArticles(category?: ArticleCategory): Article[] {
  const list = category ? ARTICLES.filter((a) => a.category === category) : ARTICLES.slice();
  return list.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
