// File-based content for the Guides and Blog sections. Authored by us (not user
// input), rendered with the lightweight <Markdown> component. To publish a new
// article, add an entry here.
//
// Editorial line: DexCompare content is for people who BUY Pokémon cards —
// buying smart, conditions/grading, spotting fakes, storage, rarities, deals —
// not how to play the game (plenty of sites cover that; buyers are our audience).
// "guide" = evergreen how-to; "blog" = takes, price commentary and buying angles.

export type ArticleCategory = "guide" | "blog";

export interface Article {
  slug: string;
  category: ArticleCategory;
  title: string;
  excerpt: string;
  author: string;
  date: string; // ISO (YYYY-MM-DD) — first published
  updated?: string; // ISO (YYYY-MM-DD) — last substantive edit, if any
  readMins: number;
  tags: string[];
  body: string; // markdown
}

export const ARTICLES: Article[] = [
  {
    slug: "pokemon-card-set-symbols-and-collector-numbers-explained",
    category: "guide",
    title: "How to Read a Pokemon Card's Set Symbol and Number",
    excerpt:
      "Learn what the tiny symbol, the 054/198-style number, and the rarity icon on a Pokemon card actually mean before you buy or sell.",
    author: "DexCompare",
    date: "2026-07-01",
    readMins: 5,
    tags: ["set-symbol", "collector-number", "rarity", "card-basics"],
    body: `Look at the bottom edge of any Pokemon card and you'll find three small pieces of information crammed into a couple of centimetres: a little icon, a number that looks like a fraction, and (on most modern cards) a shape or letter combination that signals rarity. Collectors read this strip automatically, but if you're new to buying and selling, it's easy to miss - and misreading it is one of the most common reasons people overpay or list a card under the wrong name. Here's what each part is actually telling you.

## What is the set symbol on a Pokemon card?

The set symbol is the small icon printed near the collector number, usually bottom-left or bottom-right of the card depending on the card's era. It identifies which expansion the card was printed in - the same way an ISBN prefix tells you which edition of a book you're holding. Two cards can show the exact same Pokemon, the same artwork even, and still be worth very different amounts because they came from different sets.

Early cards from the late 1990s and early 2000s didn't use a symbol at all, or used very plain ones, which is part of why those older sets can be tricky to tell apart at a glance. From the early 2000s onward, every mainline set got its own distinct symbol - a shape, a small badge, sometimes a stylised letter - and that symbol has stayed consistent on every card printed within that set's run.

### Why the symbol matters more than the artwork

Reprints are common in the Pokemon TCG. A popular Pokemon might appear in a base set, then again in a special collection, then again in an anniversary set, often with near-identical illustration. If you're trying to identify exactly which printing you own - which matters for both grading and pricing - the set symbol is a faster and more reliable check than trying to match artwork by eye. If you're not sure which set a symbol belongs to, [browsing the full set index](/sets) side by side with your card is the quickest way to confirm it, since sets are generally organised in release order with their symbols visible.

## What does the number on a Pokemon card mean (e.g. 054/198)?

The collector number - printed as something like \`054/198\` - tells you two things at once. The second number is the total count of cards in that set's main numbering run. The first number is where this specific card sits within that sequence. So \`054/198\` means this is card 54 out of a base set of 198.

A few practical points that trip people up:

- **The second number isn't always the "full" set size.** Many modern sets include "secret rares" numbered higher than the stated total - a card numbered \`199/198\` or \`210/198\` in a 198-card set is a bonus card beyond the official print run, not a misprint. These are frequently some of the more sought-after cards in a set precisely because there are proportionally fewer of them printed at those higher numbers.
- **Leading zeros are normal.** \`009/198\` and \`9/198\` refer to the same position; some sets pad the number, others don't, depending on formatting choices made at print time.
- **Number plus set symbol together uniquely identify a printing.** Neither one on its own is enough, since collector numbers reset with every new set. Card \`054\` exists in dozens of different sets - it's only \`054\` *of that specific set* that narrows it down.

If you're trying to match a physical card to a listing, searching by name and then cross-checking the number against [the card database](/browse) is the most reliable way to confirm you're comparing like for like, especially before you commit to a price.

## What do the rarity symbols on Pokemon cards mean?

Alongside the set symbol, most cards from the last couple of decades carry a small rarity marker - typically a circle, diamond, or star, sometimes with additional shapes for special card types. Broadly speaking a circle indicates a common card, a diamond an uncommon, and a star a rare - but the star category in particular has splintered over the years into holo rares, ultra rares, secret rares and more, each with its own visual treatment rather than a single consistent icon.

This is genuinely one of the more confusing parts of the hobby because rarity symbols have evolved across eras and don't map perfectly onto how *scarce* or *valuable* a card actually is - a card marked rare isn't automatically worth more than a common, and two "rare" symbols from different sets can represent quite different actual print quantities. Because this deserves proper treatment rather than a quick summary, we've covered the full breakdown - including how the modern star, and full-art, and rainbow-tier symbols differ - in a [dedicated guide to Pokemon card rarities](/guides/pokemon-card-rarities-explained).

### Reading all three together

The real value of learning this strip is being able to read it as a set, not in isolation. Set symbol tells you *when and where* a card was printed. Collector number tells you *its position* within that specific print run, including whether it's a standard-run card or a secret rare beyond the stated total. Rarity icon gives you a rough signal of *print category*, which is a starting point for understanding scarcity but never the whole story - actual market value depends on demand, condition and how many were produced, not the icon alone.

## Why this matters before you buy or sell

None of this is trivia for its own sake. Sellers occasionally list cards with the wrong set attached, buyers sometimes assume a "rare" star symbol means more than it does, and reprints mean the same artwork can legitimately appear under several different set symbols and price points. Taking ten seconds to check the symbol and number against a reliable set list before you buy is the single easiest way to avoid paying for the wrong printing.`,
  },
  {
    slug: "do-pokemon-card-prices-drop-when-a-new-set-releases",
    category: "guide",
    title: "Do Older Set Prices Move When a New Pokemon Set Drops?",
    excerpt:
      "New Pokemon set releases can quietly push older card prices up or down. Here's what actually drives it and how to time your buys around a launch window.",
    author: "DexCompare",
    date: "2026-07-01",
    readMins: 5,
    tags: ["price-trends", "set-releases", "buying-guide", "market-timing"],
    body: `## Does a new Pokemon set actually affect older card prices?

Yes, but not in one predictable direction, and not for every card. A new set release changes buyer attention, print supply, and short-term cash flow in the hobby all at once, and older singles respond to whichever of those forces is strongest for that specific card. Some older cards dip because collectors are spending their budget on the new set instead. Others climb because the new set reminds everyone why an older card was scarce or good in the first place. The honest answer is "it depends on the card," but the mechanisms behind that answer are consistent enough to plan around.

If you're trying to time a purchase, the useful move isn't predicting the market perfectly — it's understanding which of the following forces applies to the specific card you want, then watching how it actually behaves using a live source like the [DexCompare Index](/market) rather than guessing from memory of "what usually happens."

## Why older prices tend to soften around a new release

### Collector budgets are finite and attention is a limited resource

Most buyers aren't restocking their entire want list every month — they have a rough budget, and a new set release pulls a chunk of that budget toward fresh product: booster boxes, new chase cards, and the singles everyone is talking about on release week. Demand for older singles doesn't disappear, but it can soften for a few weeks simply because fewer buyers are actively shopping for them. Sellers who need to move older stock sometimes shade prices down to compete for the reduced pool of active buyers.

### New chase cards can genuinely steal the spotlight

If the new set features a mechanic, art style, or character that overlaps with an older card's appeal, some of that older card's demand can migrate permanently, not just temporarily. This is different from the budget effect above — it's a genuine shift in what collectors want, and it tends to matter most for cards whose appeal was mostly about being the newest or flashiest option in a category, rather than cards valued for format-defining playability or historical significance.

### Bulk supply from box breaks doesn't touch every card equally

New set releases mean fresh product is being opened at scale, but that only affects the price of cards *in that new set* — it doesn't directly increase the supply of older cards. Where it indirectly matters is opportunity cost: sellers sitting on older inventory sometimes list more aggressively around a release window because they want cash freed up to buy into the new set themselves, which can nudge asking prices on older cards down even though nothing about the older card's actual scarcity changed.

## Why some older cards climb right after a new set launches

### Reprints and reminders can validate scarcity instead of hurting it

A common assumption is that any reprint-adjacent news pushes older prices down. Often the opposite happens. When a new set reintroduces a popular Pokemon, a returning trainer card, or a mechanic that echoes an older release, it puts that older card back in front of buyers who'd forgotten about it. If the older printing is scarcer, has better art, or is tied to a more significant tournament era, renewed attention can lift its price rather than compete it away. The new set acts as free marketing for the old one.

### Format rotation and playability shifts

For cards with any competitive relevance, a new set can change what's viable, which changes demand for staples that support (or counter) the new strategies. A card that suddenly synergizes with a new archetype can see real demand increases that have nothing to do with nostalgia or aesthetics — it's a simple function of players needing four copies for their decks. This effect is sharper and faster than the collector-driven effects above, because competitive players tend to move on tournament schedules, not on when they feel like it.

## How to actually time a purchase around a release window

### Watch behavior, don't assume a rule

Because both directions are possible, the safest approach is to track the specific card you want rather than applying a blanket "always buy before" or "always buy after" rule. Set a baseline for the card a couple of weeks before the release, then check it again a couple of weeks after. [Browsing sets](/sets) to see what's actually printed in the new release is a quick way to judge whether there's a plausible connection to your target card at all — if there's no overlap in theme, mechanic, or character, the release is less likely to move that card much either way.

### Let softness work in your favor

If a release window does soften prices on a card you already wanted, that's simply a buying opportunity, not a signal to wait longer for it to drop further. Checking [current deals](/deals) during release weeks can surface cards that dipped below guide simply because seller attention shifted elsewhere — that's often a better entry point than trying to time a bottom that may not come.

### Don't chase the new set's spotlight effect

If you're buying an older card specifically because a new set seems to be reviving interest in it, be aware that spotlight effects can fade once the new set's own hype cycle ends. If the card's fundamentals — actual print scarcity, real competitive use, lasting collector demand — don't support the new attention, a short-term bump is more likely to normalize than compound. Cards backed by genuine scarcity or format relevance tend to hold gains; cards riding pure novelty from a release-week narrative tend to give them back.`,
  },
  {
    slug: "how-to-track-pokemon-card-price-history-before-you-buy",
    category: "guide",
    title: "Why Today's Price Isn't Enough: Reading Pokemon Card Price History",
    excerpt:
      "A low price today could be a real deal or a data error. Here's how to read a card's price history like a collector, not a gambler.",
    author: "DexCompare",
    date: "2026-07-01",
    readMins: 5,
    tags: ["price-history", "buying-guide", "market-trends", "collecting"],
    body: `## Why a single price snapshot can mislead you

If you only ever look at what a card costs right now, you're missing the part of the story that actually tells you whether that number is good, bad, or meaningless. A single listing is one seller's opinion on one day. It might reflect a genuine shift in the card's demand, or it might just be a mispriced listing, a bulk-lot leftover, or a low-grade copy that got lumped in with higher-grade sales data by mistake.

Price history fixes this by showing you the shape of the trend, not just the endpoint. A card sitting at a certain price after months of slow, steady decline tells a very different story than a card at that same price after a sudden overnight drop. The number can be identical. The context changes everything about whether you should buy now, wait, or keep scrolling.

This matters more in the Pokemon TCG than people expect, because so much of the market is driven by reprints, set rotations, tournament results, and content creator hype cycles that spike and fade fast. A chart smooths out the noise from any one seller and shows you what's actually happening across the market.

## How do you tell a real price dip from a data glitch?

This is the question that actually saves or costs you money, so it's worth being deliberate about it. A handful of checks will filter out most bad reads.

### Look at the trend line, not just the low point

A genuine dip usually has some lead-up: a gradual slide over days or weeks as more copies get listed and sellers compete on price. A glitch tends to look like a single vertical spike down (or up) that doesn't connect to anything before or after it. If the line drops off a cliff for one day and then snaps straight back to the previous range, that's a strong sign the outlier was a data error, a single mispriced listing, or a sale of a damaged or miscategorized copy rather than a market move.

### Check whether the move matches the card's grade and printing

Price history is only useful if you're comparing like with like. A raw copy, a graded slab, and a specific print run (first edition, unlimited, a particular set reprint) can trade at completely different levels. If a "drop" coincides with a mix of listing types suddenly appearing in the data, you're not looking at a real price change, you're looking at a change in what's being measured. Always confirm you're viewing history for the exact card, set, and condition you actually want, using the [card value checker](/card-value) to pin down specifics before you read too much into a chart.

### Ask why, not just what

Real dips usually have a reason you can name: a new set released that increased supply, a card rotated out of a competitive format, a reprint was announced, or general market-wide softness hit multiple cards at once. If you can't think of any plausible reason for a sudden move and it only affects one listing, treat it as noise until proven otherwise. If the same pattern shows up across a card's history repeatedly, or across other cards in the same set, that's a signal the move is real and structural rather than a one-off.

### Give it time before you commit

If a price just dropped in the last day or two, resist the urge to treat it as the new floor immediately. Genuine dips tend to hold or continue for at least a few days as the broader market catches up; glitches correct themselves almost immediately. A short waiting period costs you very little and protects you from buying into a number that was never real.

## What does a healthy long-term price trend actually look like?

Cards that are genuinely appreciating tend to move in a stair-step pattern rather than a straight line: periods of flat or slightly declining prices, punctuated by step-ups tied to real events, rather than one continuous rocket-shaped curve. A chart that's smooth and gradual is usually more trustworthy than one with wild daily swings, because it suggests enough transaction volume for the price to reflect genuine buyer and seller behavior rather than a thin market being moved by one or two trades.

It also helps to zoom out. A card that looks flat over a month might show a clear seasonal pattern over a year, easing around set release windows and firming up around anniversaries or nostalgia-driven demand. Judging a card only on its most recent weeks can make a completely normal cycle look like a trend when it's really just the pattern repeating.

## How can you actually monitor this without checking every day?

Nobody wants to manually refresh a listing page every morning hoping to catch a dip. This is really what price history and alerts are built for. Browsing the [DexCompare Index](/market) gives you a sense of where prices for popular cards and sets currently sit relative to their recent range, which is a faster way to spot cards trading unusually low or high than eyeballing individual listings one at a time.

For cards you're actually planning to buy, the more useful move is setting up a [wishlist alert](/wishlist) so you get notified when a price actually moves, instead of trying to remember to check back. That way you're reacting to a real, sustained change rather than guessing based on a single visit. And if you're just trying to see what's currently trading below its recent history across categories, the [deals page](/deals) rounds up listings worth a second look without you having to build that comparison yourself.

None of this guarantees a card only goes up from here. But reading the history instead of the headline number is the difference between buying based on evidence and buying based on a single, possibly misleading, snapshot.`,
  },
  {
    slug: "do-pokemon-card-reprints-lower-value",
    category: "guide",
    title: "Do Pokemon Card Reprints Kill Value? What Really Happens",
    excerpt:
      "A reprint doesn't automatically tank your card's price. Here's the honest breakdown of when reprints matter, when they don't, and what to check before you panic-sell.",
    author: "DexCompare",
    date: "2026-07-01",
    readMins: 5,
    tags: ["reprints", "card-value", "pokemon-tcg", "collecting-basics"],
    body: `## Does reprinting a Pokemon card lower its value?

Sometimes, but far less often and far less dramatically than most collectors assume. A reprint only pushes a price down when it meaningfully increases the *available supply of that specific card* relative to how many people want it. That sounds obvious, but the details matter a lot, and they're the part most panic-driven forum posts skip over.

The confusion usually comes from mixing up two different things: reprinting the *artwork or character* versus reprinting the *exact card*. When Charizard gets a new illustration in a fresh set, that is not a reprint of your card at all - it's a new, separate collectible competing for the same fan's attention. When a specific numbered card (same set, same art, same rarity) gets reissued in a special collection with a new print run, that's a true reprint, and that's the scenario worth actually analyzing.

### The two kinds of "reprint" collectors confuse

- **New artwork of the same Pokemon** - a new Charizard card in a new set. This barely touches the value of an older Charizard card, because collectors treat each print as a distinct item, not a substitute.
- **The literal same card reissued** - identical artwork, set symbol, and card number appearing again in a reprint product (this happens more with vintage-style reprint sets or promotional reissues). This is the only case where supply genuinely increases for that exact card.

If you're trying to figure out which category a card falls into before you decide whether to worry, [checking its current market data](/card-value) is a faster way to get a real answer than guessing from a rumor.

## Why supply alone doesn't determine price

Print runs going up is only half the equation. Price is set by supply *relative to* demand, and reprints often arrive at the exact moment demand is also rising - which is precisely why a company chooses to reprint that card in the first place. Nobody reprints a card nobody wants.

This is the mechanic that trips people up: a reprint can increase supply by, say, tens of thousands of copies, but if the character or card is popular enough that demand grows by more than that over the same period, the price holds or even climbs. Conversely, a niche card that gets bundled into every entry-level starter deck for years can see real, lasting price erosion, because supply keeps climbing while demand for that particular card stays flat.

### What actually causes lasting price drops

- **Repeated, ongoing reprints** rather than a single one-off run. A card reissued once in a special collection behaves differently than a card that keeps reappearing in starter products year after year.
- **Reprints in high-print-run product types** like structure decks or beginner boxes, which are made in far greater quantities than a limited chase set.
- **A drop in the card's underlying demand** at the same time as the reprint - for example if the Pokemon falls out of competitive relevance or the artwork style ages out of fashion.
- **Condition-graded copies flooding the market** alongside the reprint, since a fresh run also means a fresh wave of mint-condition submissions.

### What usually does NOT cause a lasting drop

- A single special-collection or tin reprint of a card that remains genuinely scarce in its *original* print run and grade.
- Reprints of the character rather than the exact card (new art, new set).
- Reprints that target a completely different collector segment - for instance, a budget-friendly reissue aimed at new players doesn't necessarily compete with someone chasing an original first-edition copy in near-mint condition.

## How rarity and print run interact with reprints

This is where understanding rarity actually pays off. Two cards can look similarly "special" to a casual buyer but respond completely differently to a reprint announcement, because their underlying scarcity mechanics are different. A card whose value rests mainly on being hard to pull from packs will feel a reprint much more than a card whose value rests on grade, autograph, or first-edition status, since those factors don't get reproduced even when the base card does.

If you're not sure how a card's specific rarity marking affects its supply story, it's worth reading through [how Pokemon card rarities actually work](/guides/pokemon-card-rarities-explained) before you draw conclusions from a reprint headline alone. Rarity symbols tell you a lot about original print behavior, but they don't tell you anything about future reissue plans - those are separate questions entirely.

## Should you sell before a reprint hits the market?

Selling purely because a reprint was *announced* is usually a reaction to headlines, not to actual market data. Prices move on realized supply and realized demand, not announcements - and by the time a reprint product actually ships and gets opened, the market has often already priced in most of the expected effect, for better or worse.

A more useful approach is to treat a reprint announcement as a prompt to check your card's actual trend rather than an automatic sell signal. Look at how the price has moved historically after comparable reprints of similar cards, use [the value checker](/card-value) to see current pricing across sources rather than relying on memory of what it "used to" sell for, and factor in your card's grade and edition, since those often matter more to long-term value than whether the base artwork got reissued.

If you're building out a fuller picture of a collection rather than just one card, our guide on [valuing your full Pokemon card collection](/guides/how-to-value-your-pokemon-card-collection) walks through how to weigh reprints alongside condition, rarity, and demand when you're assessing what you actually own. And if you want to see how a specific reprinted version compares side-by-side with the original across sets, [browsing the card database](/browse) will show you both listings rather than leaving you to guess from memory.

## The bottom line

Reprints are a supply signal, not a verdict. The real question is never "did this get reprinted," it's "did supply grow faster than demand for this exact card." Most of the time, especially with popular characters, demand keeps up. The cards that genuinely lose value long-term are usually the ones getting reprinted repeatedly into low-demand, high-volume products - not the ones that show up once in a shiny new collection box.`,
  },
  {
    slug: "pokemon-30th-celebration-preorder-guide",
    category: "blog",
    title: "Pokémon 30th Celebration (Sept 16): What We Know & How to Get It at MSRP",
    excerpt:
      "The all-foil 30th anniversary set lands worldwide on September 16, 2026 — with a Base Set Charizard reprint and 30 Pikachu variants. Here's everything confirmed so far, and the plan for actually getting it at retail price.",
    author: "DexCompare",
    date: "2026-06-11",
    readMins: 5,
    tags: ["30th celebration", "preorders", "sealed", "new release"],
    body: `The Pokémon TCG turns 30 this year, and **Pokémon TCG: 30th Celebration** releases **worldwide on September 16, 2026** — the first set in the game's history to launch everywhere on the same day. If the 25th Anniversary Celebrations set taught us anything, this will be the most fought-over product of the year.

## What's confirmed so far (June 2026)

- **Every card is foil** — including basic Energy.
- A brand-new **"Futuristic Rare"** rarity debuts, opening with Mewtwo and Mew illustrated by YOSHIROTTEN.
- **30 different Pikachu cards** — every booster pack is guaranteed to contain one.
- **Classic reprints** headlined by the **Base Set Charizard**, plus beloved cards like Pikachu & Zekrom GX from Team Up.

## Why it will sell out

The 25th Anniversary set sold out instantly in 2021 and never really came back at MSRP. 30th Celebration has the same recipe — anniversary framing, guaranteed chase pulls, nostalgia reprints — plus five more years of collectors. Expect preorders to vanish within hours of going live at each store.

## The plan: how to actually get it at MSRP

1. **Don't pay scalper preorder prices.** When hype products list early at 2–3× MSRP, patience usually wins — allocations spread across dozens of stores, not just the big ones.
2. **Watch the specialist stores, not just the giants.** The big-box sites get camped. The dozens of smaller TCG shops we track often list allocations quietly. Keep an eye on the **[sealed product database](/sealed?q=30th)** — listings will appear there the moment any store we track posts one.
3. **Check the [Drops & restocks hub](/restock)** — every new and upcoming release shows the cheapest live preorder across every store in your country, updated daily.
4. **Compare before you click buy.** Launch-window prices vary wildly between stores for identical product. Thirty seconds on a compare page routinely saves $20–50 on an ETB.

We'll keep this updated as products and preorder dates are confirmed. Set your country (top of the page) and the prices you see will be from stores that actually ship to you.`,
  },
  {
    slug: "pitch-black-preorder-guide",
    category: "blog",
    title: "Mega Evolution: Pitch Black (July 17) — Preorder Guide & Cheapest Prices",
    excerpt:
      "Pitch Black is the next Mega Evolution expansion, releasing July 17, 2026. Preorders are live now — here's how to pay the least for boxes and ETBs, and what to watch out for.",
    author: "DexCompare",
    date: "2026-06-11",
    readMins: 4,
    tags: ["pitch black", "mega evolution", "preorders", "sealed"],
    body: `**Mega Evolution: Pitch Black** releases on **July 17, 2026** — the fifth expansion of the Mega Evolution era. After Chaos Rising sold out in minutes and Ascended Heroes ETBs vanished in hours, preorder demand for Pitch Black is already running hot.

## Preorder prices are all over the place

This is the single most important thing to understand about hype-set preorders: **stores price the same box very differently** during the preorder window. Some price at MSRP to reward regulars; others price to demand. In the Chaos Rising window we saw the same Booster Box listed anywhere from MSRP to roughly 25% above it — at the same time.

That spread is free money if you compare first:

- **[Search Pitch Black in the sealed database](/sealed?q=pitch%20black)** — every store listing we track, cheapest first, in your local currency.
- **[Check the Drops & restocks hub](/restock)** — new and upcoming sets with the cheapest live Booster Box and ETB preorder per country.

## Should you preorder or wait?

Honest answer: it depends which product.

- **Booster Boxes / ETBs at or near MSRP** — preordering is usually the safe play for a hyped era. Worst case, supply is fine and you paid retail.
- **Anything well above MSRP** — be patient. Modern sets get multiple print waves; Chaos Rising-level sellouts are the exception, not the rule, and restocks do come (our [restock tracker](/restock/chaos-rising) logs them as they happen).
- **Just want specific cards?** Skip sealed entirely — once the set is out, **[buying the singles](/browse)** you actually want is almost always cheaper than gambling on packs.

## The 30-second routine before any preorder

1. Open the **[sealed compare page](/sealed?q=pitch%20black)** for the product.
2. Check the spread — if the cheapest in-stock store is near MSRP, take it.
3. If everything is gouged, set a **[restock alert](/restock)** instead and let the email come to you.

Prices update daily across every store we track in Australia, New Zealand, the US and the UK.`,
  },
  {
    slug: "chaos-rising-restock-playbook",
    category: "blog",
    title: "Chaos Rising Sold Out? The Restock Playbook That Actually Works",
    excerpt:
      "Mega Evolution — Chaos Rising sold out in minutes and ETBs are trading $15–25 over MSRP. Here's the realistic playbook for getting one at retail — without camping store pages all day.",
    author: "DexCompare",
    date: "2026-06-11",
    readMins: 4,
    tags: ["chaos rising", "restocks", "sealed", "mega evolution"],
    body: `**Mega Evolution — Chaos Rising** (released May 22) is the hottest sell-out of 2026 so far. Big-box allocations went in minutes, and secondary prices settled $15–25 over MSRP for ETBs — more for the stamped Pokémon Center version. If you missed launch, here's the playbook that actually works.

## 1. Stop camping the big-box stores

Everyone is refreshing the same three giant retailers. Meanwhile, the **specialist TCG shops — the ones we track across Australia, NZ, the US and the UK — receive their own allocations** and often list them with zero fanfare. That's where MSRP copies keep appearing.

The **[Chaos Rising restock tracker](/restock/chaos-rising)** watches those stores continuously and shows, on one page: which stores have Booster Boxes or ETBs in stock *right now*, at what price, plus a log of every restock we've caught and how fast it sold out.

## 2. Let the email do the camping

On the tracker, drop your email into the **restock alert** — no account, free — and we email you the moment a Box or ETB comes back in stock anywhere we track, in your country. Restock windows have been measured in minutes; an alert beats a lucky refresh every time.

## 3. Know your walk-away price

The restock log on the tracker shows real restock prices, so you know what "normal" looks like. If a restock lands near MSRP — take it. If a store relists at a heavy premium, remember the singles math:

- **Want the chase cards?** [Compare Chaos Rising singles](/sets/chaos-rising) — buying the exact cards you want is almost always cheaper than ripping gouged sealed product.
- **Want sealed to hold?** Premiums usually compress when the next print wave lands. Patience has beaten FOMO in nearly every modern set.

## 4. Don't forget the deals page

While you wait, the **[deals page](/deals)** lists cards currently selling 15–70% below their TCGplayer market price across our stores — the same compare engine, pointed at bargains instead of hype.

Good luck out there — and let the tracker do the refreshing for you.`,
  },
  {
    slug: "where-to-buy-pokemon-cards",
    category: "guide",
    title: "Where to Buy Pokémon Cards (Australia, NZ, US & UK)",
    excerpt:
      "The complete guide to buying Pokémon TCG cards — singles and sealed — in Australia, New Zealand, the United States and the United Kingdom, and how to always find the cheapest price.",
    author: "DexCompare",
    date: "2026-06-10",
    readMins: 6,
    tags: ["buying", "stores", "singles", "sealed"],
    body: `Want to buy **Pokémon TCG** cards but not sure where to start? Whether you're chasing a single grail card, filling out a binder set, or grabbing a sealed booster box, this guide covers exactly **where to buy Pokémon cards** in **Australia, New Zealand, the United States and the United Kingdom** — and how to make sure you never overpay.

The short version: prices for the same card vary a lot between shops and change daily, so the smartest move is to **[compare every store at once on DexCompare](/browse)** and buy from whichever is cheapest in your country.

## How to find the cheapest Pokémon card price

1. **[Search the card database](/browse)** and open the card you want.
2. Each card shows the **lowest live price across every store we track**, sorted cheapest-first, with a one-click link straight to the shop.
3. Use the **country switcher** (top of the page) to set your region — prices then show in your local currency (AUD, NZD, USD or GBP), sourced from local stores, so what you see is what you'll actually pay.

Every card also shows a **market price guide** with its source (TCGplayer's market price). That guide is what the card *trades* for — the live store prices are what you can *actually buy it* for, and the two can differ in either direction.

## 🇦🇺 Buying Pokémon cards in Australia

Australia has a deep spread of Pokémon retailers — dedicated TCG shops, collectables stores and local game stores — plus eBay Australia for harder-to-find singles. Because postage and stock differ wildly between shops, the cheapest *delivered* price is rarely the first shop you check.

- **Singles:** [browse the card database](/browse) with the country set to **Australia** to see the lowest AUD price across 50+ Australian stores and eBay AU.
- **Tip:** many AU stores offer free shipping over a threshold — buying a few cards from one shop can beat splitting an order across three.

## 🇳🇿 Buying Pokémon cards in New Zealand

Several Kiwi TCG stores stock Pokémon singles in NZD. Buying locally avoids international shipping and currency surprises.

- Set the country switcher to **New Zealand** and **[browse singles](/browse)** to compare live NZD prices across NZ stores.
- **Tip:** NZ stock can be thinner than AU/US for chase cards — [wishlist](/wishlist) the ones you want and turn on price-drop alerts so you're ready when they're listed.

## 🇺🇸 Buying Pokémon cards in the United States

The US is the deepest Pokémon market in the world — TCGplayer alone lists millions of singles, plus eBay US and countless stores. That depth means the best deals are out there, but only if you compare.

- Switch the country to the **United States** and **[search the database](/browse)** for live USD prices across US sources including TCGplayer and eBay US.
- **Tip:** for high-value chase cards, condition matters enormously — we surface Near-Mint English prices so you're comparing like for like, not a cheaper played or Japanese copy.

## 🇬🇧 Buying Pokémon cards in the United Kingdom

UK collectors can buy singles in GBP from British TCG retailers, with eBay UK and Cardmarket (the big EU marketplace) filling the gaps. Buying from UK/EU sources avoids customs and import fees.

- Set the country to the **United Kingdom** and **[browse singles](/browse)** for live GBP prices.

## Singles vs sealed: which should you buy?

- **Chasing specific cards** (to finish a set or grab a grail)? Buy **singles** — it's almost always far cheaper than ripping packs hoping to pull the card. Start on the **[card database](/browse)**.
- **Want the opening experience, or to hold long-term?** Buy **sealed** — booster boxes and Elite Trainer Boxes. Sealed product from popular sets has historically held value better than most singles, but nothing is guaranteed.

## Tips for buying Pokémon cards safely

- **Check the condition grade** before you buy — NM (Near Mint) is the default collectors pay full price for; LP/MP/HP copies should be meaningfully cheaper. See our [condition & grading guide](/guides/pokemon-card-conditions-and-grading).
- **Beware prices that look too good** — a $20 "deal" on a $100 card is usually a Japanese print, a proxy, or a fake. Our [fake-spotting guide](/guides/how-to-spot-fake-pokemon-cards) covers the checks.
- **Compare delivered prices, not sticker prices** — we show postage where the seller publishes it, so you can compare what actually leaves your wallet.
- **Track instead of impulse-buying** — add cards to your [wishlist](/wishlist) and we'll email you when they get cheaper.`,
  },
  {
    slug: "how-to-start-collecting-pokemon-cards",
    category: "guide",
    title: "How to Start a Pokémon Card Collection (Beginner's Guide)",
    excerpt:
      "Starting a Pokémon card collection in the 2020s — what to collect, what to buy first, how much to spend, and the beginner traps that waste money.",
    author: "DexCompare",
    date: "2026-06-10",
    readMins: 7,
    tags: ["collecting", "beginners", "budget"],
    body: `Pokémon cards are the most collected trading cards on the planet, and starting a collection today is easier — and easier to get wrong — than ever. This guide is the advice we'd give a friend starting from zero.

## First: decide WHAT you're collecting

"All of it" is not a collection strategy — there are more than 20,000 English cards. The happiest collectors pick a lane:

- **A Pokémon you love** — every printing of Charizard, Umbreon, Gengar, whatever you grew up with. Open-ended, very personal, easy to budget.
- **A set** — completing one set (say, a modern set's 200-odd cards) binder page by binder page. Clear finish line, very satisfying.
- **An era** — vintage WOTC (1999–2003), the EX era, or modern Scarlet & Violet. Era collecting is where serious money lives, so start modern and work backwards.
- **An art style** — Illustration Rares and alt-arts are the modern hotness; many people collect *only* full-art cards they think are beautiful.

There's no wrong answer, but having an answer stops you spraying money at random packs.

## Buy singles, not packs (mostly)

The single most important beginner lesson: **if you want a specific card, buy the card.** Opening packs to chase one card is strictly worse odds than a casino. A chase card that's a 1-in-200-packs pull costs 200 × pack price to "earn" — or one [database search](/browse) and a fraction of that to just buy.

Packs and boxes are for the *opening experience* (which is genuinely fun — budget for it like entertainment, not investment).

## A sensible starter budget

- **$0** — build your [wishlist](/wishlist) on DexCompare, learn prices, turn on price-drop alerts. Watching prices for two weeks before buying teaches you more than any guide.
- **Under $50** — a binder, sleeves, and your first few singles bought at the right price. See [storage & protection](/guides/how-to-store-and-protect-pokemon-cards).
- **$50–$200** — a serious start on a set or a Pokémon-specific collection, all in singles, all bought from the cheapest store via [price comparison](/browse).
- **More than that** — slow down. Expensive cards punish impatience; read the [grading guide](/guides/pokemon-card-conditions-and-grading) before you spend three figures on one card.

## Beginner traps that waste money

1. **Ripping retail packs for "value"** — sealed product on shelves is priced so that the average box returns less than it costs. Fun, yes. Profitable, no.
2. **Buying ungraded "mint" cards at graded prices** — anyone can say mint. Without a grade, pay raw-card prices.
3. **Ignoring the printing** — the same Pikachu can exist as a base print, holo, reverse holo and promo with wildly different values. Check the set code and collector number (e.g. \`058/091\`) before buying; our card pages show every printing separately.
4. **Paying market price for damaged cards** — a played copy should cost well under the NM price. The condition spectrum on each card page shows what each grade should cost.
5. **FOMO on brand-new sets** — new-set singles almost always fall in price over the first few months as supply floods in. Patience is literally money.

## Where DexCompare fits

We track every English card across AU, NZ, US and UK stores, refresh prices daily, and show the **market price guide with its source** next to the **real cheapest store**. Add your targets to the [wishlist](/wishlist), let the price-drop emails come to you, and build the collection you actually want — at prices you chose, not prices that happened to you.`,
  },
  {
    slug: "pokemon-card-conditions-and-grading",
    category: "guide",
    title: "Pokémon Card Conditions & Grading Explained (NM, LP, PSA, CGC)",
    excerpt:
      "What NM / LP / MP / HP / DMG actually mean, how condition changes a card's price, and when professional grading (PSA, BGS, CGC) is worth the fee.",
    author: "DexCompare",
    date: "2026-06-10",
    readMins: 8,
    tags: ["condition", "grading", "PSA", "value"],
    body: `Two copies of the same Pokémon card can differ in price by 10× — sometimes 100× — purely on condition. Understanding the grading ladder is the difference between paying the right price and donating money to a seller.

## The raw-card condition scale

Stores and marketplaces describe ungraded ("raw") cards on a five-step scale. DexCompare shows the cheapest price per grade on every card page so you can see the whole spectrum at a glance.

- **NM — Near Mint.** Looks unplayed. Clean edges, sharp corners, no scratches visible without tilting under light. This is the default grade prices are quoted in.
- **LP — Lightly Played.** Minor wear you have to look for: light edgewear, tiny scuffs. Usually 70–85% of NM price.
- **MP — Moderately Played.** Obvious wear at a glance — whitening on edges, surface scratches, maybe a small crease. Roughly half of NM.
- **HP — Heavily Played.** Significant damage: creases, heavy whitening, dinged corners. 25–40% of NM.
- **DMG — Damaged.** Bends, water damage, writing, tears. Worth a fraction; fine for a binder placeholder, terrible as a purchase at any other price.

**Rule of thumb:** if a listing doesn't state a condition, assume the worst grade the photos allow — and pay accordingly.

## What professional grading is

Grading companies — **PSA**, **CGC** and **Beckett (BGS)** are the big three — authenticate a card, grade it 1–10, and seal it in a tamper-evident plastic slab. A **PSA 10** ("Gem Mint") commands an enormous premium: it's common for a PSA 10 to sell for 3–10× the raw NM price, while a PSA 8 often sells *below* raw NM (because the 8 proves the card isn't mint).

- **PSA** — the biggest brand, the most liquid slabs, generally the highest resale.
- **CGC** — strong on modern cards, faster/cheaper tiers, sub-grades available.
- **BGS** — the "Black Label 10" is the rarest flex in the hobby; tougher grading.

## When grading is worth it

Grading costs real money (typically US$15–$25+ per card at the slow tiers, much more for fast turnaround). It's worth it when:

1. **The card is genuinely valuable** — a sensible floor is: only grade cards worth several times the grading fee in NM.
2. **Your copy is truly mint** — centring, edges, corners and surface all matter. An honest self-check under a bright light saves a lot of wasted fees on cards that will come back a 7.
3. **You're selling or holding long-term** — slabs sell faster, for more, with fewer disputes. For a binder collection you never plan to sell, raw cards in sleeves are fine and far cheaper.

It is **not** worth grading bulk, played cards, or modern commons — the fee exceeds the card's ceiling.

## Buying graded vs raw

- Buying a **slab** costs more upfront but removes condition risk and fake risk in one go — you're paying for certainty.
- Buying **raw** is cheaper and fine for NM/LP collection copies — but apply the [fake checks](/guides/how-to-spot-fake-pokemon-cards) and assume optimistic seller grading.
- A note on our prices: graded slabs trade in their own market, so DexCompare's store comparison deliberately tracks **raw singles** — the slab keywords (PSA/BGS/CGC) are filtered out so a $2,000 slab never pollutes a $40 card's price.

## The takeaway

Condition isn't a detail — it **is** the price. Learn the five raw grades, check the per-condition prices on the [card page](/browse) before buying, and only pay grading fees on cards where the math works.`,
  },
  {
    slug: "how-to-spot-fake-pokemon-cards",
    category: "guide",
    title: "How to Spot Fake Pokémon Cards (Collector's Checklist)",
    excerpt:
      "Fakes are everywhere — marketplaces, car-boot sales, even 'gifts'. A practical checklist of texture, print, light and weight tests that catch almost every counterfeit.",
    author: "DexCompare",
    date: "2026-06-10",
    readMins: 6,
    tags: ["fakes", "safety", "buying"],
    body: `Counterfeit Pokémon cards have become genuinely good — good enough to fool a quick glance, which is all a marketplace photo gives you. Here's the checklist collectors actually use, roughly in the order of how often each test catches a fake.

## Before you buy (online)

1. **Price sanity check.** The number one tell. If a card sells for $100 everywhere and one listing is $25 "Brand new! Mint!", it's a fake, a Japanese print being passed off as English, or a scam. Check the real market on [DexCompare](/browse) first — we show the market price guide *and* every legitimate store's price, so a too-good-to-be-true number is obvious in seconds.
2. **Seller signals.** New account, stock photos, dozens of identical chase cards "in hand", ships from overseas when the listing says local — each is a flag; together they're a verdict.
3. **Ask for photos of the back.** Fakes most often fail on the card BACK: washed-out blue, wrong shade swirls, blurry Poké Ball. Real backs are crisp with a vivid, slightly dark blue.

## In your hands

4. **The texture test.** Modern holos and full-arts have an embossed texture you can feel and see under angled light. Most fakes are smooth and glossy.
5. **The light test.** Real cards have a thin black/dark layer in the middle of the cardboard sandwich. Hold the card in front of a bright phone torch: a real card glows dimly and evenly; most fakes glow bright because the middle layer is missing.
6. **The bend ("flick") test — gently.** Real cards are springy and snap back silently; fakes feel either flimsy-papery or stiff-plasticky. (Don't crease someone else's card, obviously.)
7. **Font and print quality.** Compare against a real card from the same era: fakes get the energy symbols slightly wrong, the font weight too bold, the HP number misaligned, accents missing in "Pokémon".
8. **Weight and size.** Real cards are remarkably consistent. A kitchen scale (≈1.7–1.9 g) and a known-real card for comparison catch lazy fakes.

## Era-specific tells

- **Vintage (WOTC, 1999–2003):** fakes often copy the *unlimited* print but with shadowless layouts or wrong copyright lines. Check the copyright text against a verified image — our card pages link real product images for reference.
- **Modern ultra-rares:** real alt-arts have layered, directional texture; fakes print a flat photo of that texture. Angle it under light and the difference is immediate.
- **Jumbo/promo cards:** widely faked as "rare collector items" — a jumbo card is rarely worth much; nobody fakes cheap things except to sell in bulk.

## If you've already bought one

- Marketplace purchases: open a "not as described" case immediately — photograph the tells (back colour, light test) as evidence. eBay's authenticity programs side with buyers on confirmed fakes.
- Never resell a known fake "as real" — in most countries that's straightforward fraud.

## The honest summary

Almost every fake is caught by just two habits: **know the real price** before you buy (that's literally what [DexCompare](/browse) is for), and **check the back and the texture** when the card is in hand. Fakers rely on buyers doing neither.`,
  },
  {
    slug: "how-to-store-and-protect-pokemon-cards",
    category: "guide",
    title: "How to Store & Protect Your Pokémon Cards",
    excerpt:
      "Sleeves, toploaders, binders, slabs and climate — what each layer of protection costs, what it's for, and a sensible setup for every collection size.",
    author: "DexCompare",
    date: "2026-06-10",
    readMins: 6,
    tags: ["storage", "protection", "collecting"],
    body: `A card's condition is its value, and condition only ever goes one way without protection. The good news: protecting a collection properly is cheap compared to what damage costs.

## The protection ladder

Each layer protects against something specific. Match the layer to the card's value.

### 1. Penny sleeves (~$2 per 100)

Thin, soft sleeves — the absolute minimum for anything you wouldn't bin. They stop surface scratches and finger oils. **Every card worth more than bulk belongs in at least a penny sleeve.**

### 2. Toploaders & semi-rigids (~$15–25 per 25)

Rigid plastic holders that stop bending. The standard for **storing and shipping** anything from a few dollars up. Put the card in a penny sleeve FIRST, then the toploader — a bare card rattling in a toploader scratches.

### 3. Binders with side-loading pages (~$20–50)

The home of a *collection* — sets you're completing, your favourite Pokémon, cards you actually look at. Two non-negotiables:

- **Side-loading pages** — top-loading pages let cards slide out when the binder is carried upright. Side-loaders don't.
- **Zip or strap closure, stored upright** — stacked-flat binders imprint page texture into holos over months.

Skip the old O-ring binders entirely; the rings dent the inner column of cards. Modern zip binders with padded covers are the hobby standard.

### 4. Magnetic one-touches (~$2–4 each)

Crystal-clear magnetic cases for display-worthy cards — the $50–$500 tier that deserves better than a toploader but isn't graded.

### 5. Graded slabs

Grading (covered in our [grading guide](/guides/pokemon-card-conditions-and-grading)) is the terminal layer: authentication + condition + a sealed case in one. For cards in the hundreds and up, the slab premium usually pays for itself at resale.

## Climate: the silent killer

Plastic stops scratches; it doesn't stop physics.

- **Humidity** warps cards and clouds holos. Aim for 40–60% RH; in humid climates a sealed tub with silica gel packets is a $10 fix.
- **Heat** accelerates fading and warping — never store cards in attics, garages or cars.
- **Sunlight** fades cards shockingly fast. UV does it through windows too. Display copies belong in UV-protected cases or away from direct light, and your grails belong in the dark.

## A sensible setup by collection size

- **Starter (binder collector):** penny sleeves for everything, one good zip binder, a shoebox-sized storage box for bulk. Under $40 total.
- **Enthusiast:** the above, plus toploaders for the trade/sale pile and one-touches for the top 10 cards. Silica packets in the storage tubs.
- **High value:** graded slabs for the grails, a fire-safe or safety deposit box for the irreplaceable, and an insurance conversation once the collection passes a few thousand dollars.

Protection is the cheapest "investment return" in the hobby: a $0.02 sleeve preserving a card's NM status protects the 20–30% price gap to LP forever. Before you buy your next card on [DexCompare](/browse), make sure the ones you own aren't quietly downgrading themselves in a drawer.`,
  },
  {
    slug: "how-to-complete-a-pokemon-tcg-set",
    category: "guide",
    title: "How to Complete a Pokémon TCG Set (Without Buying 200 Packs)",
    excerpt:
      "The pack maths, the singles strategy, the order to buy, and how to use DexCompare's set tracker — everything you need to finish a set for the least money.",
    author: "DexCompare",
    date: "2026-06-27",
    readMins: 7,
    tags: ["set completion", "singles", "collecting", "strategy"],
    body: `Completing a Pokémon TCG set — every card in the binder, 100% done — is one of the most satisfying things you can do in the hobby. It's also where most collectors accidentally spend three times more than they needed to. Here's the complete strategy for finishing a set cheaply.

## Why packs are the wrong tool for completion

Each booster pack contains a random slice of the set, so completing a 200-card set from packs is a coupon-collecting problem. Because the ultra-rare slots are shared between dozens of cards, the expected number of packs to pull the full set is far above the set size — for a modern set, typically 500–700 packs, or 14–20 booster boxes. That's $1,400–$2,000+ at MSRP.

The singles maths: the cheapest 150 commons and uncommons in any recent set cost under $30 bought as singles. The ten most expensive chase cards (SIRs, gold rares) might run $300–500 total. The full 200-card set via singles: roughly $350–550 depending on the set, versus $1,400+ in packs.

**Packs are entertainment. Singles are completion.**

## The four-step singles strategy

### Step 1: Start with the [set page on DexCompare](/sets)

Every set has its own card list, sorted by collector number, with the cheapest live store price for each card. Bookmark the set you're completing — that page is your completion dashboard.

### Step 2: Track your progress with the collection feature

Add cards to your [collection](/collection) as you acquire them — DexCompare's set page shows you exactly which cards you own and what percentage you've completed. You'll see the gap clearly instead of hunting through a box.

### Step 3: Buy in three tiers — cheapest to most expensive

Bulk-buying in tiers saves significantly on postage:

- **Tier 1 — Commons & uncommons (≤$0.50 each):** These can often be found in bulk lots on eBay or bought in a single order from one specialist TCG store. Aim to tick off 60–70% of the set for under $30.
- **Tier 2 — Rares and holo rares ($0.50–$10):** Order these in a second pass — bundle as many as you can from the same store to share postage. For each card, the [browse database](/browse) shows every store stocking it, cheapest first with postage included.
- **Tier 3 — Ultra-rares (SIRs, full arts, secret rares, $10+):** Buy these one by one, using the card page's price table. These cards are where the big price spread between stores lives — comparing before you buy here is where you save the most money.

### Step 4: Use the wishlist for Tier 3 cards

Add the expensive missing cards to your [wishlist](/wishlist) and turn on price-drop alerts. Ultra-rare prices move daily, especially in the first 3–6 months after a set releases. Waiting even two weeks on a $50 card can save $10–15.

## Timing: when to start completing a set

- **New set (week 1–8 after release):** Bulk commons are cheap immediately. Ultra-rare prices are highest at launch and fall quickly — start with the bulk and let the SIR prices settle.
- **Set is 3–12 months old:** The sweet spot. Prices have found their floor, eBay supply is deep, and bulk lots appear as people who ripped boxes sell their duplicates.
- **Set is discontinued (2+ years old):** Some commons get scarcer; ultra-rares from beloved sets tend to rise. Start sooner rather than later for vintage sets.

## What a finished set actually costs

For a typical modern Scarlet & Violet set (around 200 cards):

| Tier | Cards | Approx cost |
|---|---|---|
| Commons & uncommons | ~130 cards | $20–35 |
| Rares & holo rares | ~40 cards | $40–80 |
| Ultra-rares (ex, full art) | ~20 cards | $80–150 |
| Secret rares & SIRs | ~10 cards | $150–300 |
| **Total** | **~200 cards** | **$290–565** |

Compare that to the pack route ($1,400+) and the singles premium pays for itself in the first five cards.

## The three common mistakes

1. **Buying singles before sorting duplicates.** If you've already opened some packs, count what you have first — you probably own a third of the commons already.
2. **Ignoring the collector number.** The same Pokémon appears in multiple sets; always confirm the set code (e.g. \`SV08\`) and collector number before buying.
3. **Paying market price for bulk.** Commons are worth almost nothing — never pay more than $0.25 each for them from a specialist TCG store. eBay bulk lots of 50+ mixed cards often beat single-card listings dramatically.

## TL;DR

1. Open the [set page](/sets) for your target set.
2. Start your collection tracker.
3. Buy commons and uncommons in bulk (single order, one store).
4. Buy rares in a second pass, same store where possible.
5. Wishlist the expensive cards and buy each individually from the cheapest store.

That's it. One complete set, minimum money.`,
  },
  {
    slug: "pokemon-card-rarities-explained",
    category: "guide",
    title: "Pokémon Card Rarities & Variants Explained",
    excerpt:
      "Circles, diamonds, stars, reverse holos, full arts, Illustration Rares, secret rares and promos — how to read a card's rarity and what it means for value.",
    author: "DexCompare",
    date: "2026-06-10",
    readMins: 7,
    tags: ["rarities", "variants", "value", "collecting"],
    body: `"What's this card worth?" almost always starts with "what rarity is it?" — and Pokémon's rarity system has grown baroque enough over 25+ years that even returning collectors get lost. Here's the working map.

## The basic symbols

Printed in the card's bottom corner:

- **● Circle — Common.** The bulk of every set. Almost always near-worthless individually (and that's fine — sets need them).
- **◆ Diamond — Uncommon.** Slightly less printed; still bulk in practice.
- **★ Star — Rare.** The baseline "good pull". Non-holo rares from modern sets are worth little; vintage ones can matter.
- **★ Holo Rare.** A star rarity with a holographic picture. The classic "shiny card". Modern holos are cheap; vintage holos (Base Set Charizard!) are the icons of the hobby.

## Reverse holos — the variant trap

Since 2002, nearly every common/uncommon/rare also exists as a **reverse holo**: the *frame* shines instead of the artwork. Reverses are a separate printing with a separate price — usually a small premium over the plain card, occasionally (for certain sets and Pokémon) a large one. When you look a card up on [DexCompare](/browse), check whether the listing you're buying is the plain or reverse version; sellers blur this constantly.

## Modern ultra-rares (the cards people chase)

Modern sets stack several tiers above holo rare. Names shift between eras, but the current landscape:

- **ex / V / GX cards** — mechanically special Pokémon with their own card frames. The *baseline* chase tier; most are inexpensive.
- **Full Art** — the artwork covers the whole card, usually textured. A real premium begins here.
- **Illustration Rare (IR)** — alternate scenic artwork of regular Pokémon; the most beloved modern tier, where art drives price more than playability.
- **Special Illustration Rare (SIR) / Alt Arts** — the headline chase cards of modern sets. Five of the ten most valuable cards in a typical modern set are SIRs.
- **Secret Rares** — cards numbered ABOVE the set total (e.g. \`201/197\`) — gold cards, rainbow cards, special prints. The "overnumbered" badge on our card pages marks these.

**The pattern:** within a modern set, value concentrates brutally in the top art tiers. A set's regular ex might be $2 while its SIR version is $200 — same Pokémon, same set.

## Promos

Black-star promo cards come from events, product boxes and tins, and carry their own numbering (e.g. \`SWSH262\`, \`SVP 044\`). Some are giveaways worth pennies; some (event-exclusive stamps, early McDonald's prints) are genuinely scarce. Promos share artwork with set cards constantly, so **check the collector number, not the picture** — our database tracks promos as their own printings with their own prices.

## Why the same card has many prices

Put together, one Pokémon in one set can exist as: plain, reverse holo, holo, promo-stamped, and a different-number secret/alt version — five-plus printings with five-plus prices. This is why every DexCompare card page shows **"Other printings"**: sometimes the artwork you love is dramatically cheaper one printing over.

## Reading a card in five seconds

1. **Bottom-corner symbol** → base rarity.
2. **Collector number vs set total** → overnumbered = secret rare.
3. **Letter-prefixed number** (SVP, SWSH…) → promo.
4. **Shiny frame vs shiny art** → reverse vs holo.
5. **Then [look the exact printing up](/browse)** — the market settles the rest.`,
  },
  {
    slug: "first-edition-vs-unlimited-pokemon-cards",
    category: "guide",
    title: "First Edition, Shadowless & Unlimited Pokémon Cards Explained",
    excerpt:
      "What the 1st Edition stamp and Shadowless border actually mean, why they're only a big deal on certain vintage cards, and how to tell the three WOTC print runs apart before you pay a premium.",
    author: "DexCompare",
    date: "2026-07-17",
    readMins: 7,
    tags: ["vintage", "first edition", "shadowless", "value", "authentication"],
    body: `Search any vintage Base Set card and you'll see three wildly different prices for what looks like the same picture: "1st Edition", "Shadowless", and plain "Unlimited". They're not condition grades — they're print runs, and telling them apart is worth learning before you pay a vintage premium.

## The three print runs

WOTC printed Pokémon's earliest sets in batches, and each batch left a visible mark:

- **1st Edition.** The very first print run of a set, marked with a small black "1st Edition" emblem near the bottom of the illustration box. WOTC stamped sets this way from Base Set (1999) through the early Neo series, then dropped the practice around 2001 as print volume scaled up to meet demand.
- **Shadowless.** Unique to Base Set. Early production copies were missing the drop shadow that normally sits to the right and below the artwork's inner border — a printing-plate quirk that got corrected partway through the run. "Shadowless" describes that missing shadow, independent of whether the card is also 1st Edition.
- **Unlimited.** Every later, uncapped print run. The drop shadow is present, there's no edition stamp, and this is what the overwhelming majority of a set's surviving copies are — including every copy of **Base Set 2**, which only ever existed as an Unlimited reprint.

A single Base Set card can therefore exist as four real combinations: 1st Edition Shadowless, 1st Edition (with shadow), Shadowless Unlimited, and plain Unlimited — each trading at a different level.

## How to spot each without guessing

1. **Find the stamp first.** No "1st Edition" mark near the illustration box = Unlimited, full stop. Don't let a seller's title claim override what's actually printed on the card.
2. **Check the shadow.** Look at the yellow/coloured border box around the artwork: a soft grey drop shadow along its right and bottom edge means Unlimited-style printing; no shadow at all is the Shadowless tell (Base Set only).
3. **Cross-reference the set.** Shadowless only exists for Base Set. If a listing claims a "Shadowless Jungle" or "Shadowless Fossil" card, that's a red flag, not a rare find.
4. **Trust a graded slab's label over a raw seller's claim.** PSA and CGC record edition and Shadowless status directly on the label after physically inspecting the card — see our [grading guide](/guides/pokemon-card-grading-psa-vs-cgc) for how that process works.

## Why it moves the price — and why it sometimes doesn't

Smaller original print runs mean fewer surviving copies, so 1st Edition and Shadowless copies generally command a premium over Unlimited. But **the size of that premium depends entirely on the card**, not the stamp:

- On an iconic chase card — Base Set Charizard being the obvious example — 1st Edition Shadowless can trade at many multiples of the Unlimited price, because collector demand for that specific Pokémon is enormous.
- On a common or energy card from the same set, the same stamp barely moves the number. Scarcity only becomes value when someone actually wants the card.

That's the misconception worth busting: **"1st Edition" alone doesn't mean "rare" or "valuable"** — plenty of unloved commons got the stamp too. Always check the live price for the *exact* card, not the general reputation of the print run — the [card value checker](/card-value) shows current pricing so you're comparing the real number, not a rumour.

## The authenticity risk

Because 1st Edition and Shadowless copies sell for so much more, they're also the most faked category in the hobby — including genuine Unlimited cards with a counterfeit stamp added on top. Before paying a vintage premium, run the listing through our [fake-spotting checklist](/guides/how-to-spot-fake-pokemon-cards): the stamp itself, the copyright line, and the card back are the three tells that catch a doctored Unlimited card pretending to be 1st Edition.

## The takeaway

1st Edition, Shadowless and Unlimited describe *when* a card was printed, not how good it is. Learn to spot the stamp and the shadow, verify against a graded label or a trusted image when the premium is real money, and always [check the live price](/browse) for the exact print run you're buying — not just the set it came from.`,
  },
  {
    slug: "how-to-value-your-pokemon-card-collection",
    category: "guide",
    title: "How to Value Your Pokémon Card Collection",
    excerpt:
      "A step-by-step guide to finding out what your Pokémon cards are actually worth today — market prices, condition adjustments, the difference between resale and retail value, and when grading changes the number.",
    author: "DexCompare",
    date: "2026-06-27",
    readMins: 7,
    tags: ["valuation", "collection", "grading", "market price"],
    body: `"What are my Pokémon cards worth?" is one of the most Googled questions in the hobby — and the answer is almost always more nuanced than people expect. This guide walks through the correct process, the common mistakes that inflate or deflate your number, and how to turn a shoebox of cards into an accurate total you can actually do something with.

## Why "what I paid" is not the answer

Card values move constantly. A card you bought three years ago for $5 might be $40 today — or $1. A brand-new set's chase card peaks at launch and often drops 40–60% in the following months. Valuing a collection means finding what things are worth *now*, not anchoring to purchase price or "what I've seen them listed for."

## Step 1: Identify every card precisely

Before you can price anything, you need the exact printing. The same Pokémon can exist across dozens of printings with wildly different values:

- Check the **set symbol** (bottom left of the card).
- Check the **collector number** (e.g. \`058/091\`).
- Note the **holo type** — plain, reverse holo, holo rare, full art, or alt art.

A card without its set code and number is just "some Charizard." A card with both is a specific, priceable item.

## Step 2: Find the live market price for each card

The fastest method: **[search the card by name on DexCompare](/browse)**, open the card page, and read the **market price guide**. This is sourced from TCGplayer's market price — the average of real recent sales in the world's deepest card market — updated daily. It's as close to "what the card is actually worth" as a single number gets.

For each card you find, note:

- The **market guide price** (what the card trades at on the open market).
- The **cheapest live store price** in your country (what you could get if you sold locally vs. what someone would pay to buy it from a store today).

These two numbers bracket your card's real-world value.

## Step 3: Apply the condition haircut

The market price guide is for **Near Mint (NM)** — cards that look unplayed. Every step down from NM cuts the value:

| Condition | Typical % of NM price |
|---|---|
| Near Mint (NM) | 100% |
| Lightly Played (LP) | 70–85% |
| Moderately Played (MP) | 45–60% |
| Heavily Played (HP) | 25–40% |
| Damaged (DMG) | <20% |

Be honest. Most people grade their own cards a condition or two higher than the market would. A scratch you've stopped seeing is still a scratch.

For a full breakdown of what each grade means: [Pokémon Card Conditions & Grading Explained](/guides/pokemon-card-conditions-and-grading).

## Step 4: Understand "collection value" vs "resale value"

This is the most important distinction in collection valuation.

**Collection value** (what you'd pay to replace everything) is roughly the sum of the cheapest live store prices. This number tends to be higher than what you could sell for.

**Resale value** (what you'd actually net selling the collection) is typically **40–65% of the market guide total** for most raw collections. Why the gap?

- Buyers on eBay and marketplaces want a discount vs. market price.
- Platforms take 8–15% in fees.
- Shipping, packaging, and time have a real cost.
- Commons and low-value cards are often worth nothing to resell individually.
- Only the top 5–10% of cards in a typical collection drive most of the value.

If you're thinking about selling, the honest resale estimate is your market-guide total × 0.5 for a mixed collection. Chase cards in NM condition, especially in high-demand sets, fare better.

## Step 5: Know when grading changes the number

For any card where the live NM price is above $80–100, it's worth asking: **would a PSA 10 or CGC 10 on this card be worth grading?**

A gem-mint graded copy of a desirable card can trade at 3–10× the raw NM price. But grading costs $20–50+ per card at slow tiers, takes months, and a card that comes back a 7 or 8 often trades *below* raw NM. The math only works when:

1. Your copy is genuinely perfect (check centering, edges, corners and surface under direct light).
2. The card's graded-10 value is well above the raw price + grading fee.
3. You're holding long-term or explicitly targeting the graded market.

Don't grade your collection's bulk — it will cost more than the cards are worth.

## Practical approach: the 80/20 rule

In any mixed collection, roughly 80% of the value lives in 20% or fewer of the cards. Don't waste time pricing commons at $0.20 each. Instead:

1. **Sort by rarity first** — set aside anything with a star, full-art frame, or "secret rare" collector number.
2. **Price the top tier individually** — these are the cards where precision matters.
3. **Bulk-estimate the rest** — common/uncommon bulk is worth roughly $0.05–0.20 per card to a dealer; uncommons and non-holo rares maybe $0.25–0.50. Be conservative.
4. **Add the totals.**

## The free tool for this: the DexCompare value checker

The **[card value checker](/card-value)** is designed exactly for this: search a card, see its market guide price and live store prices, note the condition, and move to the next. It's faster than bouncing between tabs and the prices update daily.

For ongoing tracking, add your cards to your **[collection](/collection)** — you'll see the live value of your tracked cards whenever you log in, and price changes will be reflected automatically.

## Summary

1. Identify every card by set code + collector number.
2. Search it on [DexCompare](/browse) for the live market guide price.
3. Apply the condition discount honestly.
4. Distinguish between collection value (replacement cost) and resale value (~50–60% of guide for most raw collections).
5. Only consider grading for genuinely mint, high-value cards where the maths works.

The process takes longer than a gut feeling, but it's the only version that tells you something real.`,
  },
  {
    slug: "pokemon-sealed-products-explained",
    category: "guide",
    title: "Pokémon TCG Sealed Products Explained — Booster Boxes, ETBs, Tins & More",
    excerpt:
      "What's actually in a Booster Box vs an Elite Trainer Box vs a tin? How many packs, what extras, and which format to buy for your goal — a plain-English breakdown of every Pokémon sealed product type.",
    author: "DexCompare",
    date: "2026-06-27",
    readMins: 7,
    tags: ["sealed", "booster box", "ETB", "buying", "beginners"],
    body: `Walk into any game store or scroll any retailer and you'll see a wall of Pokémon sealed product — Booster Boxes, Elite Trainer Boxes, tins, blisters, Premium Collections and more. They all look impressive. They're all priced very differently. Here's exactly what's inside each one and when it makes sense to buy it.

## The products, explained one by one

### Booster Box

**What it is:** The workhorse of sealed Pokémon product — 36 booster packs bundled together.

**What's inside:** 36 packs × 10 cards = 360 cards. No accessories, no promo, no dividers — just packs. Modern sets usually guarantee one rare or better per pack, so a box gives roughly 36 holos/rares minimum plus a shot at the ultra-rares.

**Price range:** Roughly AU$160–$250, US$110–$160, GBP£90–$130 at MSRP, depending on the set.

**Who it's for:** Someone who wants the opening experience at volume, is building a play set, or is holding sealed product long-term. It's also the most price-transparent format — comparing box prices across stores before you buy routinely saves $20–50 on a single purchase.

**What to watch:** Booster Box prices vary widely between stores, especially at launch and during restock windows. The [sealed products compare page](/sealed) shows every store's live Booster Box price, cheapest first.

---

### Elite Trainer Box (ETB)

**What it is:** The collector's bundle — a midsize box with packs plus accessories.

**What's inside:** Typically 9 booster packs (some sets give 10), plus card sleeves (65 usually), a set of energy cards, damage counters, a player's guide, and dividers for the box itself. The exact contents vary by set — always check the listing.

**Price range:** Roughly AU$80–$110, US$50–$65, GBP£45–$60 at MSRP.

**Who it's for:** Someone who plays the game and will actually use the sleeves and accessories, or a collector who wants a modest opening experience plus a display piece. The box itself is designed to store a binder's worth of sleeved cards once you've ripped the packs.

**What to watch:** ETBs are one of the most scalped products in the hobby — when a set is hyped, ETBs sell out faster than Booster Boxes and recover more slowly. The [restock tracker](/restock) alerts you the moment one comes back in stock at any store we watch.

---

### Tins

**What it is:** A small decorative metal tin, typically featuring a single Pokémon.

**What's inside:** Usually 2–4 booster packs plus one or two promo cards. The promo is specific to the tin variant — if you want a particular promo, you need that exact tin.

**Price range:** AU$20–$45, US$15–$30 depending on content.

**Who it's for:** Casual buyers, gifts, and promo collectors. The promo itself is often the reason to buy a tin — the pack count is too low to make it a sensible way to open cards for value. Tins also make good storage once opened.

**What to watch:** Tins are listed inconsistently — some list just the promo card name, others the tin design. If you're after a specific promo card, check the card's own page on [DexCompare](/browse) first: the single is almost always cheaper than buying the tin just for the promo.

---

### Blister Packs

**What it is:** Retail-format sealed packaging, usually 1–3 packs plus a promo, designed for peg hooks in mass-market stores.

**What's inside:** 1–3 booster packs and typically a promotional card or coin, all shrink-wrapped together.

**Price range:** AU$12–$35, US$8–$22.

**Who it's for:** Impulse purchases, small gifts, and collectors who want a specific promo without paying tin prices. Per-pack cost is higher than a Booster Box, so purely for the opening experience blisters are poor value.

**What to watch:** Many "promo card" blisters feature cards that are also available as standalone singles. Check the promo card's price on [DexCompare](/browse) before you pay blister prices for it.

---

### Collection Boxes & Premium Collections

**What it is:** Larger boxed products, often featuring an oversized card, a playmat, pins, or coins alongside packs.

**What's inside:** Varies enormously by product — typically 4–8 booster packs plus accessories and usually an exclusive promo. Pokémon releases dozens of these annually, each with a different Pokémon focus.

**Price range:** AU$50–$120, US$35–$80.

**Who it's for:** Collectors who want a specific Pokémon's merchandise or a playmat, and don't mind paying the accessory premium. The exclusive oversized or textured promos in some Collections can have standalone collector value.

---

### Build & Battle Kits / Starter Sets

**What it is:** Entry-level product designed to teach the game.

**What's inside:** A pre-built 40-card deck, 4 booster packs, and a damage counter set.

**Price range:** AU$25–$40, US$15–$25.

**Who it's for:** Total beginners and parents buying for kids who want to play, not just collect. The packs are secondary to the ready-to-play deck. Not a value purchase for a collector.

---

## Buying sealed: the three questions

**1. Do you want specific cards, or the opening experience?**
If you want specific cards, [buy the singles](/browse) — it's almost always cheaper than the expected-value math on sealed product. Sealed is for the experience, the accessories, or long-term holding.

**2. Which format matches your use case?**
Playing? ETB (sleeves + packs). Holding? Booster Box (most liquid at resale). Gift? Tin or blister. New to the game? Build & Battle.

**3. Are you comparing before you buy?**
The same Booster Box can vary $30–60 between stores on the same day — the [sealed product compare page](/sealed) lists every store's live price. At launch or during restocks, checking it before you click buy is the easiest $20 you'll save all week.

## Where to find the cheapest sealed prices

- **[Sealed products browse](/sealed)** — every Booster Box, ETB, and Collection sorted by price across every store we track in your country.
- **[Drops & restocks](/restock)** — upcoming releases and sold-out sets, with free email alerts for when stock appears.
- **[Deals page](/deals)** — cards and sealed products listed below their market guide right now.

The single most important rule: compare before you buy. Launch-window pricing on a hyped ETB or Booster Box can vary as much as 40% between stores — and that's before factoring in postage.`,
  },
  // ── Blog — buying-focused takes and commentary ────────────────────────────
  {
    slug: "cheapest-way-to-buy-pokemon-cards",
    category: "blog",
    title: "The Cheapest Way to Buy Pokémon Cards in 2026",
    excerpt:
      "Singles beat packs, comparison beats loyalty, and patience beats hype. The simple playbook for paying less for the exact cards you want.",
    author: "DexCompare",
    date: "2026-06-10",
    readMins: 5,
    tags: ["buying", "deals", "singles"],
    body: `If you want a specific Pokémon card, there is a cheapest way to get it — and it's almost never the way most people buy. Here's the playbook, in order of how much money each step saves.

## 1. Buy the single, not the pack

The maths never changes: if a chase card is pulled from roughly one pack in two hundred, "earning" it from packs costs around 200× the pack price. Buying the single costs… the single's price. Packs are entertainment (great!), but they are the most expensive possible way to acquire a specific card. If your goal is *owning the card*, [search it and buy the single](/browse).

## 2. Compare every store, every time

The same card, same condition, routinely differs **20–50% between stores** on the same day — stores price by their own stock, not by the market. Loyalty to one shop is a voluntary tax. Every card page on DexCompare ranks the live price at every store we track, cheapest first, so the comparison takes seconds instead of ten open tabs.

## 3. Check the market guide before you pay

Each card shows a **market price guide** (sourced from TCGplayer's market price) next to the store prices. If every local store is well above the guide, supply is thin locally — that's when waiting, or buying from eBay, saves real money. If a store is *below* the guide, that's your green light.

## 4. Let the price come to you

Prices move daily. Heart the cards you want onto your [wishlist](/wishlist), add your email, and we'll send you a digest whenever one of them drops. Buying on the dip instead of on impulse is the single laziest way to save 10–20%.

## 5. Mind the postage

A $4 card with $12 shipping is a $16 card. We show postage where the seller publishes it and flag free-shipping thresholds — consolidating three wants into one store's order regularly beats three "cheapest" singles from three stores.

## 6. Time the hype curve

New-set chase cards almost always fall for 2–3 months after release as supply floods in. Vintage and out-of-print cards do the opposite. Translation: be patient with new sets, decisive with old ones.

That's the whole system: singles, comparison, the market guide, alerts, postage, timing. None of it takes effort once it's habit — and it compounds on every card you ever buy.`,
  },
  {
    slug: "are-booster-boxes-worth-it",
    category: "blog",
    title: "Are Pokémon Booster Boxes Worth It? The Honest Maths",
    excerpt:
      "Expected value, the fun premium, and when sealed actually makes sense — a straight answer to the hobby's most-asked buying question.",
    author: "DexCompare",
    date: "2026-06-10",
    readMins: 5,
    tags: ["sealed", "buying", "value"],
    body: `"Should I buy a booster box?" is the most common buying question in the hobby, and most answers are either hype or finger-wagging. Here's the honest version.

## The expected-value reality

A booster box's "expected value" — what the singles inside are worth on average — is almost always **below the box price** shortly after release. It has to be: if ripping boxes reliably beat buying singles, dealers would rip every box themselves. For a typical modern set, the average box returns well under what you paid once you account for the bulk that's worth pennies.

So as a way to acquire *specific* cards, boxes lose to [buying singles](/browse) — usually badly.

## What you're actually buying

A booster box is three different products. Be honest about which one you want:

1. **Entertainment.** Thirty-six pack openings is genuinely fun. Priced per hour of enjoyment, a box compares fine with a night out — just budget it as fun, not investment.
2. **A lottery ticket.** Top alt-arts make a box profitable. Most boxes don't contain one. That's what a lottery is.
3. **A sealed asset.** UNOPENED boxes of desirable sets have historically appreciated as supply gets ripped. This is the only version with an investment case — and it only works if you never open it, store it well, and pick sets people will still want in five years.

## When a box genuinely makes sense

- **You'd open packs anyway** — then compare box prices like you would a single; per-pack cost varies hugely between stores.
- **You want the bulk** — starting a collection from zero? A box yields hundreds of playables and binder fillers plus the fun.
- **You're holding sealed long-term** — buy the most-loved set of the era at the lowest comparison price, then forget you own it.

## When it doesn't

- You want 3–8 specific cards. Buy them. It will cost a fraction of the box.
- You're "investing" but plan to open it. Pick one.
- The box is over the market guide because it's the hyped set of the month — hype premiums on sealed decay fast once reprints land.

**Bottom line:** boxes are a great entertainment purchase and an occasionally-great sealed hold, but they are never the cheap way to get cards you can just point at. Point first, then [check the price](/browse).`,
  },
  {
    slug: "pokemon-cards-as-an-investment",
    category: "blog",
    title: "Pokémon Cards as an Investment — Honest Take (2026)",
    excerpt:
      "The 2021 bubble, what actually held value, what crashed, and the real maths behind 'holding' cards — before you buy anything as an investment read this first.",
    author: "DexCompare",
    date: "2026-06-28",
    readMins: 8,
    tags: ["investment", "value", "collecting", "market", "sealed"],
    body: `The Pokémon card market had one of the more dramatic bull runs of the modern collectibles era. Between mid-2020 and early 2021, prices for vintage cards, sealed product, and even bulk modern cards climbed 200–500%. Booster Boxes that sat at retail for months disappeared overnight. First-edition Base Set Charizards that had traded at $10,000–$20,000 suddenly surfaced at $50,000–$100,000+.

Then prices fell. Most of them fell hard — 40–70% from peak by late 2022. Some haven't recovered. For anyone who bought at the peak, the "investment" has been a significant loss. For anyone who already held the right cards before the boom, it was generational.

Which category would you be in if you bought Pokémon cards today as an investment?

## What has actually held value

Not everything collapsed equally. The assets that have retained — and often continued growing from — their pre-boom values:

- **Vintage high grade.** PSA 10 and BGS 10 copies of the genuinely iconic cards — Base Set Charizard Shadowless 1st Edition, Tropical Mega Battle promos, pre-release Raichu — have held elevated values. The authentic scarcity of a Gem Mint copy of a 27-year-old card doesn't change when hype cycles do.
- **Factory-sealed vintage boxes.** An unopened First Edition Base Set Booster Box isn't abundant, and it becomes slightly less abundant every time someone opens one. Sealed vintage is the most defensible long-term hold in the hobby.
- **Loved modern sealed (unopened).** The most-loved modern sets — base Sword & Shield, early Scarlet & Violet expansions with iconic SIRs — have tended to hold or appreciate slowly when unopened and well-stored. "Slowly" means years, not months.
- **Specific high-art singles.** Certain Illustration Rares and SIRs with crossover appeal (buyers who buy the art, not the game) have maintained collector demand above and beyond TCG-player interest.

## What hasn't held value

- **Modern bulk boxes at or above MSRP.** Pokémon prints aggressively. A sold-out new set will restock. Sets rarely stay scarce enough to sustain box prices above MSRP unless they were genuinely beloved AND are now fully out of print.
- **Graded modern commons.** If you sent $5 cards to PSA during the boom because "everything is going up," you now have $25+ in grading fees and a slab worth $3.
- **Raw cards held as an "investment".** A card that sits in a sleeve for three years is still a raw card when you go to sell. Condition claims require a buyer's trust; graded slabs are the version that trades in an investment market.
- **Most Pokémon merchandise.** Tins, playmats, pins: almost none of this appreciates meaningfully. Budget it as a purchase, not a hold.

## The honest maths

Say you buy a modern Booster Box today for $160 AUD at MSRP.

**Carrying costs over 5 years:**
- Climate-controlled storage (avoid humidity, heat, UV) — part of a storage solution.
- Insurance on a serious collection runs roughly 1–2% of declared value per year.
- Opportunity cost of $160 not invested elsewhere.

**Likely outcome spectrum:**
- Set is loved and out of print in 5 years → maybe 2–3× MSRP.
- Set is popular but sees multiple reprints → flat to slight decline.
- Hobby contracts or the set isn't fondly remembered → loss.

A 2–3× return on a 5-year hold in the best case is about 15% compounded annually. That's genuinely solid *if* it happens. But most boxes don't hit that number, and you need to pick right, store right, and never open it.

## The cost people forget: liquidity

When you need to sell, you need a buyer, a platform, and a fee. eBay takes ~13–15% in most markets; a buyer expects a discount off the market guide. A card priced at $500 often nets $350–$400 after fees and negotiation. Factor that in before calculating returns.

Stocks can be sold in seconds. A popular sealed Booster Box takes days to a couple of weeks. Vintage cards in thin markets can take months. That illiquidity is a real cost that rarely appears in "Pokémon investment" content.

## When it makes more sense

Being honest, "Pokémon cards as an investment" is often a post-hoc justification for buying something you already enjoy. That's fine — collecting what you love is a perfectly sound reason to be in this hobby. The problem is when that framing leads to overpaying, holding too long, or buying things you'd never enjoy because a video promised expected value growth.

The cases where holding Pokémon cards as an asset makes more sense:

1. **You're buying vintage, authenticated, graded cards** — you understand the PSA/BGS grading market, you're buying grades with documented population scarcity, and you can afford to hold for 5–10+ years.
2. **You already collect and love the hobby** — the things you buy because you love them cost you nothing in regret if the price doesn't move. The floor on a Charizard you display in your collection is the enjoyment of owning it.
3. **You're buying at or below MSRP** — the hold strategy breaks immediately if you start above retail. Only the MSRP buyers have the margin that makes a 2× return meaningful.

## The data angle

We're a price-comparison database, not an investment platform — but the same data that tells you where to buy a card cheapest also tells you how the market is moving. Every [card page](/browse) shows the market guide price sourced from TCGplayer's real transaction history. If you're holding cards as an asset, you need accurate price data, not hype.

The most useful thing you can do with DexCompare for this purpose: [add cards to your collection](/collection) with what you paid, and watch the live market guide next to your cost basis. That's a more honest ledger than optimism.

## The honest summary

Pokémon cards *can* appreciate — some of them, under the right conditions, meaningfully. They are not a reliable asset class. The boom that made it look like one was fuelled by lockdowns, celebrity unboxing videos, and monetary stimulus, not fundamentals. The fundamentals are: scarcity, condition, authenticity, and ongoing demand. Those exist for the best vintage cards and the most beloved sealed product. For most things sold at a game store right now, they don't.

If you're buying cards because you love them: do it. They'll never be worth nothing to you.

If you're buying cards purely as an investment: be honest about which specific cards you're choosing, why they'll be scarce and desired in ten years, and what you'd do if they're not. The investors who came out ahead in 2020–2021 weren't people who bought because the market was hot — they were people who already held things because they genuinely loved them.`,
  },
  {
    slug: "buying-pokemon-cards-internationally",
    category: "blog",
    title: "Buying Pokémon Cards Internationally — What You Need to Know",
    excerpt:
      "When importing cards saves money, when it costs you extra, how customs works in AU/NZ/US/UK, and how to use the country switcher so you're comparing stores that actually ship to you.",
    author: "DexCompare",
    date: "2026-06-28",
    readMins: 7,
    tags: ["buying", "international", "import", "stores", "prices"],
    body: `Pokémon TCG cards are a global product but a locally-priced one. The same card can be $15 USD in the US, $25 AUD in Australia (roughly $16 USD), and £12 GBP in the UK (roughly $15 USD) — or the gaps can run the other way, depending on the set and the stores. That spread makes "should I buy internationally?" a real question, and the answer isn't always obvious.

## Why the price gap exists

Local stores in each market pay their own import and distribution costs, carry inventory in their local currency, and price to the local competitive landscape. A dedicated TCG retailer in Melbourne is competing with other Melbourne shops; they're not competing with a US store that doesn't ship to Australia economically.

The result: for popular modern English cards, US stores almost always have the deepest supply and the lowest floor prices, because the US is the largest TCG market and TCGplayer alone lists millions of singles. Australian, NZ, and UK buyers looking at international options are usually comparing against US sources.

**The gap that matters is the delivered price — card + international shipping + any import duty.** That's what DexCompare is actually showing when you set your country and filter by market.

## How the DexCompare country switcher works

The **country selector** at the top of every page filters the stores you see to those that ship to your selected country. When you're set to Australia, you see Australian stores (and any international stores that ship to Australia) with prices in AUD. New Zealand shows NZD from NZ stores. US shows USD. UK shows GBP.

This means the comparison you're doing is already "international-aware" — if an overseas store ships to your country at a price that's competitive after postage, it appears in your comparison. If it doesn't, it doesn't.

Practical takeaway: **set your country first, then browse.** You'll see the real comparison — local and international stores that ship to you, cheapest delivered first — without having to manually calculate currency and shipping for each tab.

## When importing genuinely saves money

A few scenarios where buying internationally makes sense:

**1. The card isn't stocked locally.**
For older singles — cards from sets that released a few years ago — local stores in smaller markets (NZ especially) often have thin or no inventory. A US or AU source ships internationally for a modest flat fee, and suddenly the card you've been waiting for is available today.

**2. The domestic price is well above the market guide.**
Every card page shows the market guide price, sourced from TCGplayer's real transaction history. If every local store in your country is, say, 40% above that guide, and a US source ships internationally for $8–12, the maths often work — especially for cards $30+.

**3. You're ordering multiple cards at once.**
International shipping is mostly a fixed cost ($5–15 in most cases for registered post from a US store). A single $12 card doesn't justify it; five $15–20 cards in one order almost always does. The per-card shipping cost collapses to $2–3, and the price advantage of the US market takes over.

## When it doesn't make sense

**1. Customs and import duties.**
This is the hidden cost most guides skip.

- **Australia:** Cards are generally zero-rated for GST if the total order value is under AU$1,000 (the low-value import threshold). Above $1,000, the marketplace or seller is supposed to collect GST. In practice, small parcels under the threshold arrive without additional tax the vast majority of the time. Large, high-value purchases may attract GST at the border.
- **New Zealand:** Similar threshold system; parcels under NZ$1,000 in total value are typically GST-free. The NZ customs authority does spot-check packages.
- **United States:** Buying internationally *into* the US from, say, a Japanese store is a different scenario — import duties can apply on goods above the de minimis threshold (currently US$800). For most TCG card orders this threshold is rarely reached, but buying high-value sealed product internationally can attract attention.
- **United Kingdom:** Post-Brexit, all goods imported from outside the UK are subject to VAT (currently 20%) if the consignment value exceeds £135. For card orders — especially sealed Booster Boxes or high-value singles — this is a real cost. A £100 order from a US store can attract £20 in VAT plus Royal Mail's handling fee.

**The practical rule:** for most raw singles under $50–100 in value, international shipping works fine. For sealed product worth $150+ or large collections, check the duty situation for your country before ordering.

**2. Condition disputes across borders.**
Returning a card internationally is expensive and slow. If a card arrives in worse condition than described, a "not as described" claim works — but the postage cost to return it often exceeds the card's value. This argues for buying high-value raw cards from local stores, or from sellers with clear grading photos, when you're importing.

**3. Small orders where postage kills the saving.**
A single $8 common doesn't make sense to import even if the card is $3 cheaper internationally. The crossover point for most shipping scenarios is roughly $15–20 per card at international shipping rates, and the card needs to be meaningfully above the domestic price.

## Japanese vs English cards: the language trap

A significant fraction of "cheap international" listings are Japanese cards. Japanese printings of popular cards are often 40–70% cheaper than English — which makes them attractive to buyers who discover them on search, and attractive to sellers who list them without being clear about the language.

**Japanese cards are legitimately beautiful and legitimately cheaper.** They're the same game, different language, typically with slightly different card sizes and different backs. If you're collecting for art or display, Japanese is a genuine option.

**Japanese cards are not substitutes for English in most price comparisons** — their graded and raw markets are separate, a Japanese PSA 10 is worth less than an English one, and bulk Japanese cards have essentially no resale value in English markets.

On DexCompare, our comparisons filter to English-language cards. The market price guide is TCGplayer's, which covers the English market. If you're buying to match the prices you see here, buy English.

## The delivered-price discipline

Whether you're buying locally or internationally, the number that matters is the one that leaves your account:

**Card price + postage = delivered price.**

For domestic orders, DexCompare shows postage where stores publish it. For international orders, you need to add international shipping manually (typically US$8–15 from US stores to AU/NZ/UK; check the store's shipping page for your destination).

The quick calculation: find the card's cheapest domestic store on the [browse page](/browse), note the delivered price, then check whether a cheaper international source — after shipping — still beats it. For high-value singles and multi-card orders, it often does.

## The sensible approach

1. **Set your country** in the DexCompare selector to see the real local comparison first.
2. **Check if the local delivered price is near the market guide.** If it is, buy locally — simpler, faster, no duty risk.
3. **If local prices are 20%+ above guide**, look at international options — especially US sources for AU/NZ/UK buyers.
4. **Bundle orders** when buying internationally — the shipping cost is mostly fixed, so more cards = better maths.
5. **Know the duty rules for your country** on high-value orders before you click.
6. **Stick to English cards** unless you're deliberately collecting Japanese prints.

The country switcher and the market guide are the two tools that make this comparison quick. Everything else is just the delivered-price discipline applied across borders.`,
  },
  {
    slug: "pokemon-card-grading-psa-vs-cgc",
    category: "guide",
    title: "Pokémon Card Grading — PSA vs CGC, Costs & What Gets a 10 (2026)",
    excerpt:
      "Everything you need to decide whether to grade your Pokémon cards: PSA vs CGC compared, 2026 costs and turnaround times, the maths of when grading pays off, and how to self-assess before you submit.",
    author: "DexCompare",
    date: "2026-06-28",
    readMins: 7,
    tags: ["grading", "PSA", "CGC", "value", "collecting"],
    body: `Professional grading turns a raw card into a certified slab — but it costs money, takes time, and can go badly wrong if you submit the wrong card. This guide covers the decision honestly so you can keep your money where it belongs.

## What grading actually does

A grader (PSA, CGC or Beckett) authenticates your card, inspects it under magnification across four dimensions — centering, edges, corners and surface — and assigns a numeric grade from 1 to 10. The card is then sealed in a tamper-evident plastic case (a "slab") with the grade printed on it.

The practical effects:
- **Condition is locked in** — a PSA 10 is a PSA 10 forever; no dispute about whether it's NM.
- **Fakes are ruled out** — legitimate companies authenticate before grading.
- **Resale is faster and cleaner** — buyers know exactly what they're getting.

## PSA vs CGC: the real difference

| | PSA | CGC |
|---|---|---|
| **Brand recognition** | Highest — the gold standard | Strong and growing fast |
| **Resale liquidity** | Best — PSA 10s command the highest premiums | Good; premium vs raw is lower but catching up |
| **Sub-grades** | No | Yes (centering/edges/corners/surface) |
| **Economy turnaround** | ~60–90 days | ~45–80 days |
| **Economy tier cost** | ~US$25/card | ~US$20/card |
| **Best for** | Vintage and high-value cards where PSA brand pays | Modern cards, high volume, or when sub-grades add context |

**Bottom line:** PSA if you're grading a vintage card or anything where slabs trade heavily and the PSA brand premium justifies the extra cost. CGC if you're doing modern cards, want sub-grades, or are running higher-volume submissions where cost differences add up.

Beckett (BGS) is worth knowing about — their "Black Label 10" (all four sub-grades perfect) is the rarest flex in the hobby — but BGS is a niche market and BGS slabs outside vintage are harder to sell.

## The economics: when grading pays off

Grading costs roughly US$20–30 per card at economy tiers in 2026, excluding return shipping. That fee is sunk — you don't get it back if the card comes back a 7. Run the maths before you submit.

**The decision formula:**

1. Find the raw NM market price for your card — [check the card page](/card-value).
2. Estimate your realistic grade. Most hobbyist cards that look mint come back 8–9, not 10.
3. Look up completed eBay sales for "PSA 10 [card name]" and "PSA 9 [card name]".
4. Subtract: grading fee ($25) + return shipping (~$8) + marketplace fees (~13% on eBay).
5. If the net uplift over raw still beats your cost in step 1 — you have a case.

**Concrete example (2026):**
- Raw NM: $80. PSA 10 comparables: $240. PSA 9 comparables: $95.
- If it's genuinely a 10: $240 − $25 − $8 − $31 (eBay 13%) = $176 net. You paid $80 raw. **Profit of $96.** Worth it.
- If it's more likely a 9: $95 − $25 − $8 − $12 = $50 net. You paid $80. **Loss of $30.** Not worth it.

The maths is brutal and honest: most cards don't pass it. That's fine — raw cards in sleeves are a perfectly good collection.

**Cards almost never worth grading:** commons, uncommons, modern bulk, anything under ~$50 raw, played copies, and cards where graded sales are sparse (no buyers = no premium).

## Self-grading: what the companies actually check

Inspect your card under a single bright point light, tilted at an angle. The four dimensions:

- **Centering** — PSA 10 needs roughly 55/45 or better front, 75/25 back. Even slightly off-centre rarely grades 10.
- **Edges** — run your fingernail along each edge under light. Any white chipping = 8 at best.
- **Corners** — all four must be sharp. A single fuzzy corner is a 9 ceiling.
- **Surface** — holo scratches are the most common killer. Rotate slowly under a point light and look for rings or fine lines. Any visible = 8 or below.

If you can easily spot problems, the card is a 9 at best. Only submit 9s where the 9-vs-raw premium justifies the fee.

## Practical submission tips

1. **Use a local submission service** — Australian, NZ and UK collectors shipping direct to PSA/CGC in the US face expensive one-way postage. Several local TCG dealers run group submissions that pool the shipping cost significantly.
2. **Double-sleeve for transit** — penny sleeve first, rigid top-loader, team bag, padded envelope. Never ship a bare card.
3. **Declare the correct value** — PSA/CGC insurance is based on your declared value; under-declaring is your risk, over-declaring drives up their declared-value tier fees.
4. **Set realistic expectations** — most hobbyist submissions return 7–9. A genuine 10 requires a card that was never touched without gloves or sleeved fresh from a pack.

## Should you buy graded or raw?

**Buy raw** when you're collecting for enjoyment, the card is under $100, and the seller's photos are clear. Condition risk on good stores with honest descriptions is low.

**Buy graded** when the card is expensive and condition risk matters — a raw $500 vintage card can easily be a 7 dressed up as NM. A PSA 9 or 10 removes that uncertainty. The [condition guide](/guides/pokemon-card-conditions-and-grading) covers how to read condition in photos when buying raw.

Track your raw cards and their current market values in the [collection tracker](/collection) — the fastest way to spot which cards in your binder have grown enough that grading might finally make economic sense.`,
  },
  {
    slug: "how-to-sell-pokemon-cards",
    category: "guide",
    title: "How to Sell Your Pokémon Cards — Where to Sell & Get the Best Price",
    excerpt:
      "The complete seller's guide: which channel to use for valuable singles, bulk and graded slabs, how to price from real data, what to avoid, and the honest maths on what you'll net.",
    author: "DexCompare",
    date: "2026-06-29",
    readMins: 8,
    tags: ["selling", "eBay", "marketplace", "value", "pricing"],
    body: `There's a right way to sell Pokémon cards and a very costly wrong way. The right way involves knowing what you have, choosing the correct channel for each card, and pricing from real transaction data — not wishful thinking. This guide covers all three.

## Step 1: Know what you actually have

Before listing anything, identify each card precisely:

- **Set code and collector number** — printed bottom-left (e.g. \`SV08 198/191\`). This uniquely identifies the card and its printing. The same Pokémon can have a dozen printings at wildly different prices.
- **Condition** — assess honestly against the five grades (NM, LP, MP, HP, DMG). Most people grade their own cards one tier higher than buyers would. See [Pokémon Card Conditions & Grading Explained](/guides/pokemon-card-conditions-and-grading) for the precise definitions.
- **Variant** — plain, reverse holo, holo rare, full art, special illustration rare? Each is a separate listing with a separate price.

Once you know what you have, [search each card on DexCompare](/card-value) to see the **market price guide** (sourced from TCGplayer's real transaction history) and what local stores are currently charging. Those two numbers bracket what you can realistically ask.

## Step 2: Sort cards before you start listing

In any mixed collection, roughly 80% of the value lives in 20% of the cards. Working from most to least valuable saves enormous time:

1. **Separate by rarity** — set aside anything with a star rarity, full-art or alt-art frame, or a collector number above the printed set total (secret rares).
2. **Price the top tier individually** — these are the cards where the right channel and right price make a real difference.
3. **Group the rest by value bracket** — $2–10 cards can go in set lots; anything under $2 should be sold as bulk.

## Which channel to use — a plain comparison

### eBay

**Best for:** singles $20 and above, vintage cards, graded slabs, anything where a global buyer pool lifts the price.

eBay is the deepest buyer pool in most English markets. A rare card that a local store would buy at 40 cents on the dollar often finds a collector on eBay who pays close to market guide.

- **Fees:** roughly 13–15% of the final sale price in most markets (AU, US, UK). No listing fees for the first 250 listings per month.
- **Buy It Now vs Auction:** Use Buy It Now at 5–10% below the market guide for modern singles — it sells faster and the price is predictable. Use auctions for vintage chase cards (Base Set holos, 1st Edition copies) where bidder competition can lift the price above any fixed listing.
- **Critical step:** always check **Completed/Sold listings** on eBay before you price — search your card, filter to Sold, and look at what actually sold (not what's listed, which is aspirational). Listed prices are wishes; sold prices are the market.
- **Postage:** offer tracked postage, photograph everything before sealing. An untracked $100 card that "gets lost" is your loss.

### Local game stores

**Best for:** quick cash, bulk lots, worn cards, anything under $5 that isn't worth individual effort.

Local game stores (LGS) buy cards to resell at a margin. Their offer will be **30–50% of market value** — lower for bulk, higher for specific chase cards they're short on. That discount is the price you pay for instant certainty and zero packing/posting time.

When it makes sense: you want the collection gone quickly, you have a lot of low-value bulk, or you're dealing with played cards where the online buyer-condition-dispute risk isn't worth the extra dollars.

### Specialist TCG Facebook groups and communities

**Best for:** collector-to-collector sales of cards $20–200, where negotiating a fair price without platform fees is worth the effort.

Pokémon card trading groups on Facebook have active buyers and regular buy/sell/trade threads. No fees — but no buyer protection either. Use PayPal Goods & Services (not Friends & Family) to protect both parties; F&F is for people you know, not strangers.

Condition disputes are the biggest risk here: photograph every card clearly, describe the condition honestly, and price a little under market guide — buyers in these groups know prices.

### TCGplayer (US sellers)

**Best for:** US-based sellers with a steady flow of modern cards to move.

TCGplayer is the dominant US marketplace — millions of listings, the deepest liquidity for English singles. Fees are roughly 10–12% plus a small per-transaction fee. You set up a "store" and ship orders directly to buyers. The volume of traffic makes it faster to move $3–10 cards than eBay auctions.

Non-US sellers can use TCGplayer as a price benchmark but usually can't list there directly.

### Cardmarket (UK and Europe)

**Best for:** UK and European sellers, especially for cards that trade at a meaningful premium on the European market.

Cardmarket is the dominant card marketplace in the EU and UK. Fees are lower than eBay. Worth checking for cards where European demand (or EU-exclusive promos) lifts the price above the TCGplayer guide.

## How to price your cards

The **market guide on DexCompare** is your anchor — it's the average of real recent sales, the fairest single number for what a NM English copy trades at globally.

**From that number:**
- **NM condition:** price at 5–10% below the market guide to sell within a week, or at guide if you can wait.
- **LP condition:** 70–80% of NM guide.
- **MP condition:** 45–55% of NM guide.
- **HP/DMG:** 20–35% of NM — and be explicit in the listing about the condition.

**Account for fees in your asking price.** If eBay takes 13% and you want $30 net, your listing price needs to be $34.50. Many first-time sellers forget this and are disappointed at what actually lands in the account.

## Bulk vs individual listings — the crossover point

**Cards under $2:** not worth individual eBay listings (time vs money is terrible). Options:
- Sell to a local game store by weight or by count
- Batch into lots of 50–100 mixed cards for $5–15 per eBay lot
- Give away to local players — goodwill, no time cost

**Cards $2–10:** usually worth listing in small themed lots (e.g. "10× SV08 rare assortment") rather than individual listings. More efficient and still captures most of the value.

**Cards $10+:** worth individual listings with good photos. These are the cards where the 20-minute effort of a proper listing recovers real money.

## Selling graded cards (PSA, CGC, BGS slabs)

Slabs trade in their own market at different price levels than raw cards:

- Search "PSA 10 [card name]" and "CGC 10 [card name]" on eBay **Sold Listings** — that's your anchor, not the raw NM guide.
- eBay is almost always the right venue for graded cards — deepest buyer pool for slabs.
- Photograph the slab clearly (front, back, label) — buyers paying hundreds or thousands want to see the actual grade label, not a stock photo.
- Ship slabs with tracking and insurance; tape the slab in a bubble mailer snugly (no rattling).

## How to pack and ship safely

Poorly packed cards are the number one cause of condition disputes and lost returns. The correct stack:

1. Penny sleeve
2. Rigid toploader (not a team bag alone — too much give)
3. Team bag sealed with tape
4. Cardboard stiffeners front and back in the envelope, taped so the toploader can't slide
5. Padded envelope or bubble mailer

For anything $50 or above: use tracked and signed post, and photograph the whole pack process before sealing.

## What you'll realistically net

Honest estimate for a typical mixed raw collection sold card by card on eBay:

| | |
|---|---|
| Market guide total | your starting reference |
| eBay fees | −13–15% |
| Postage per parcel | −$1–3 |
| Your time | real but unquantified |
| **Net proceeds** | **~55–65% of market guide total** |

Quick game store sell-out: 30–40% of market guide — zero effort, zero time, same week.

## The five common mistakes

1. **Pricing from listed prices, not sold prices.** Listed prices are aspirations. Check "Completed/Sold" on eBay to see what actually traded.
2. **Overgrading your own cards.** Every seller thinks their played card is NM. Take photos under good light and describe honestly — buyers will dispute anything they disagree with.
3. **Listing bulk individually.** The time cost of 200 individual $0.50 listings (photos, packing, postage, messages) vastly exceeds the proceeds. Sell in lots or to a local store.
4. **Using PayPal Friends & Family with strangers.** F&F removes buyer protection and is against PayPal's terms for goods transactions. Always use Goods & Services.
5. **Untracked postage for valuable cards.** A card that doesn't arrive is a refund you're legally obliged to give. Track everything over $20.

## Using DexCompare before you sell

The [card value checker](/card-value) gives you the market guide and live store prices for any card in seconds — the essential pre-listing check that tells you whether your price is competitive.

If you've been tracking cards in the [collection tracker](/collection), you already have cost basis vs current value at a glance: the cards where market value has exceeded what you paid are your prime sell candidates.

Price from data, not from what you hope. The market always has the last word.`,
  },
  {
    slug: "why-pokemon-card-prices-differ-between-stores",
    category: "blog",
    title: "Why the Same Pokémon Card Has Five Different Prices",
    excerpt:
      "Market price, store price, eBay price, graded price, foreign price — what each number means and which one you should actually pay.",
    author: "DexCompare",
    date: "2026-06-10",
    readMins: 6,
    tags: ["prices", "market", "buying"],
    body: `Look up any popular card and you'll find five different numbers for it. None of them are wrong — they're answering different questions. Knowing which is which is the difference between a good buy and an overpay.

## 1. The market price (the guide)

The number TCGplayer headlines: an algorithmic blend of recent actual sales for the Near-Mint English card. This is what the card *trades at* in the deepest market on Earth. On DexCompare it's shown on every card as the labelled **market price guide, with its source** — a reference, never a buy button. Local stores can sit above it (thin supply, import costs) or below it (overstock, stale pricing). Both happen daily, which is exactly why the guide is shown next to real store prices instead of pretending to be one.

## 2. The local store price

What a shop actually charges, driven by what they paid and what's in their drawer — not by the global market. This is the number you can actually pay today in your own currency with cheap domestic postage. It's also the number that varies 20–50% between shops, which is the entire reason [comparison](/browse) pays.

## 3. The eBay price

The floor-ish price for most cards — broadest supply, auction dynamics — but it comes with condition roulette and seller risk. Our eBay prices are filtered hard (no bundles, no graded slabs, no Japanese copies masquerading as English) so the eBay line you see is a genuine like-for-like single.

## 4. The graded price

A PSA 10 of a card is a *different product* trading in a different market — often 3–10× the raw price, while a PSA 8 can trade *below* raw NM. Never anchor a raw card's value to a slab listing, and be suspicious of any raw listing priced like one. (Full breakdown in our [grading guide](/guides/pokemon-card-conditions-and-grading).)

## 5. The foreign-print price

Japanese and Chinese printings often cost a fraction of English — beautiful cards, legitimately cheaper, and the #1 source of "too good to be true" listings passed off as English. We filter them out of our comparisons; when buying elsewhere, check the listing's language before celebrating a bargain.

## So which do you pay?

The **cheapest in-stock local store price for the condition you want**, sanity-checked against the **market guide**:

- Store ≤ guide → buy with confidence.
- Store slightly above guide → normal for your region; pay it or set a [wishlist alert](/wishlist) and wait.
- Store far above guide → wait, or take the eBay route.

Five numbers, one rule: know what each is measuring, then pay the lowest one that's measuring what you actually want.`,
  },
  {
    slug: "how-to-avoid-pokemon-card-buying-scams",
    category: "guide",
    title: "How to Avoid Pokémon Card Buying Scams Online",
    excerpt:
      "Empty-box listings, fake 'graded' slabs, off-platform payment requests — the scam patterns that target Pokémon card buyers, and the habits that make you a hard target.",
    author: "DexCompare",
    date: "2026-07-26",
    readMins: 6,
    tags: ["safety", "scams", "buying"],
    body: `A counterfeit card is one risk when you buy Pokémon cards online — a completely different risk is never receiving a card at all, or receiving one that isn't what the photos showed. Chase cards routinely trade for hundreds of dollars, buyers rarely see the item before paying, and "condition" is whatever the seller says it is. That combination is exactly what scammers look for. None of what follows is exotic; it's the same handful of patterns repeating across eBay, Facebook Marketplace, Depop and Discord trade servers, and they're easy to catch once you know what to look for.

## Red flags before you pay

- **The price is meaningfully below the real market.** This is the single biggest tell. Check the [market price guide and live store prices](/browse) for the card first — if a "mint" chase card is listed 40–60% under everywhere else, it's either a fake, a misdescribed reprint, or the listing was never going to ship.
- **Zero feedback, or feedback from a suspiciously different category.** A brand-new account, or one with 200 reviews for phone cases suddenly selling a $400 slab, is a pattern seen right before non-delivery scams.
- **Only stock photos, never the actual item.** A legitimate seller of a specific card can photograph the specific card, front and back, same day. "Stock photo, ships from warehouse" on a supposedly single collectible is a warning sign, not a convenience.
- **Pressure to move off-platform.** Any message asking to finish the sale over PayPal Friends & Family, bank transfer, gift cards, or crypto instead of the platform's own checkout is trying to route around the one thing that protects you: the platform's dispute process. Legitimate sellers rarely need to insist on this.
- **An urgency push.** "Three other buyers are messaging me right now" on a common, easily-sourced card is a manufactured reason to skip your own price and seller checks.

## Common scam patterns specific to this hobby

1. **The empty-box / toploader-only scam.** Photos show a real, valuable card; what actually ships is an empty toploader, a bulk common, or nothing. Almost always paired with a demand to pay outside buyer-protected checkout.
2. **The "regraded" slab.** A cracked-out low grade card resealed in a cloned or genuinely stolen slab shell showing a much higher grade. Cross-check the certification number on the grader's own site (PSA's and CGC's lookup tools are free and public) before paying a graded premium — never trust the number printed on the label alone.
3. **The bait-and-switch on condition.** Listing photos are of a Near Mint copy; what ships is heavily played, with the difference explained away afterwards as "how it looked to me." Insist on photos of the actual card under real light, not a stock image, before paying for anything described as high-grade.
4. **Phishing DMs impersonating platform support.** A message claiming to be from eBay, PayPal or TCGplayer "verifying" your account or "confirming" a payment, with a link to a lookalike login page. Real platforms don't ask you to log in through a link inside a chat message — go to the site directly instead of clicking through.
5. **The overpayment refund scam.** A "buyer" sends a payment (often via a fake or reversible method) for more than the asking price and asks you to refund the difference before the original payment has actually cleared. By the time it bounces, the refund you sent is real money gone.

## Payment methods, safest to riskiest

- **Platform checkout with buyer protection (eBay, most marketplaces).** The safest option by far — if the item never arrives or isn't as described, you have a formal, enforced dispute path.
- **PayPal Goods & Services.** Protected and refundable if something goes wrong; PayPal Friends & Family is not — it waives your protection and is a common ask from scammers precisely because of that.
- **Local cash meetups.** Reasonably safe *in person*, at a public location, where you inspect the card before handing over money — treat any "meet" that turns into "just send it first" as a full stop.
- **Bank transfer, gift cards, crypto, F&F to a stranger.** No recourse if the seller disappears. Fine between people you already trust; a red flag from anyone else.

## Buying from tracked, established stores lowers this risk by default

A lot of this risk is specific to peer-to-peer marketplace listings, where you're trusting an individual you've never dealt with. Buying from an established retailer that ships the card itself — rather than a third-party marketplace listing — removes most of the scam surface above: no anonymous seller, no off-platform payment pressure, and a real business with its own returns process behind the sale. That's part of why [every store DexCompare compares](/stores) is a real, ongoing retailer rather than a marketplace listing, and why the [card price comparison](/browse) is worth checking even when you do buy peer-to-peer — it tells you what the card should cost, which is the first scam check on this whole list.

## If it's already gone wrong

- **Open a case immediately** through the platform's own dispute process (eBay Money Back Guarantee, PayPal's Resolution Centre) rather than trying to negotiate with the seller directly — the clock on these usually starts from the order date, not from when you notice a problem.
- **If you paid by card**, a chargeback through your bank or card issuer is a second line of defence even when a platform dispute is denied.
- **Screenshot everything** — the listing, the messages, the tracking number — before a scammer account gets deleted and the evidence disappears with it.
- **Report the account** to the platform even if you're made whole; it's the only way these listings get taken down before the next buyer sees them.

## The honest summary

Almost every one of these scams is beaten by two habits: know the real price before you pay — that's the [market check](/browse) — and never move money outside a protected payment method for a stranger. Scammers rely on buyers skipping both under time pressure. Slow down, and the pattern is usually obvious.`,
  },
];

export function getArticles(category?: ArticleCategory): Article[] {
  const list = category ? ARTICLES.filter((a) => a.category === category) : ARTICLES.slice();
  return list.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getRelatedArticles(currentSlug: string, limit = 3): Article[] {
  const current = ARTICLES.find((a) => a.slug === currentSlug);
  if (!current) return [];
  const others = ARTICLES.filter((a) => a.slug !== currentSlug && a.category === current.category);
  return others
    .map((a) => ({ article: a, overlap: a.tags.filter((t) => current.tags.includes(t)).length }))
    .sort((a, b) => b.overlap - a.overlap || b.article.date.localeCompare(a.article.date))
    .slice(0, limit)
    .map((s) => s.article);
}
