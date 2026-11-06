
## 2026-11-06: Black Friday and Cyber Monday price watch pages

The owner's October numbers (2026-11-06): the US made 73% of affiliate earnings at a US$108 average order, one US$6.4k order
earned as much as twelve ordinary days, and eBay credits only a purchase made within 24 hours of the click. His asks: Black
Friday and Cyber Monday "price watch" pages this week, so Google indexes them before 27 and 30 November, and the high end of
the market (sealed, graded, vintage) in its own prominent sections, each ending in a live eBay listing.

- `/[region]/cyber-monday` joins `/[region]/black-friday`: ONE component (`components/HolidaySalePage.tsx`) under two URLs,
  thin routes, `lib/black-friday.ts` `eventCopy(event)` for the words. The Black Friday page's URL, title, h1 and metadata are
  unchanged; both pages are in the sitemap for every region and link each other.
- Under the deals table, a **price watch** (`lib/price-watch.ts`, `#price-watch`): the dearest sealed in stock today (the
  region's ProductStat rows, dearest first, in stock only), the week's moves down (`priceMovesData(market).down`, the
  price-moves page's rows), older sets still in stock (one product per set from `olderInStockData`) and graded chase-card
  searches (`GRADED_SEARCHES`: PSA 10 Charizard, Umbreon VMAX, Pikachu, Mew ex 151, Rayquaza, BGS 10). Every row ends in a
  tagged eBay search button (`placement: "price-watch"`, in `PLACEMENTS`), and the graded block carries the chase `EbayStrip`.
- Why searches and strips, not listings in the HTML: this site holds no eBay listing in its server data for singles (the strips
  fetch at request time by design, DECISIONS "eBay listing strips"), and a graded slab is never a store row. A search link
  still carries the EPN tag and starts the 24-hour credit window on the click.
- The words keep `BANNED_COPY`: "down this week" and "dearest in stock", never "price drops", "was", "sale" or urgency;
  `tests/price-watch.test.ts` renders the Cyber Monday page in `files` mode and sweeps it, and pins the sitemap entry.
- US-first by the owner's numbers, but every region gets its own page in its own currency: the US page is `/us/cyber-monday`.

## 2026-11-05: Amazon's own price on the product page's Amazon row, from the Creators API

The owner's US Associates account was approved today and he asked for Amazon's API prices as price rows on every site.
Ported from MTG Compare the same day. Here, in two script-side steps and one reader:

- `scripts/amazon-asins.ts` runs in the daily import after the export (`dexcompare-sealed-import.yml`), in every region with its
  OWN Amazon (AU, US, UK, CA, DE for the eurozone; NZ and SG link to Amazon Australia as a search and stay a search, since an
  AUD price is not a New Zealand price). It searches the region's Amazon for each in-stock product (most stores first,
  `AMAZON_SEARCH_BUDGET` a region a day) and keeps a result ONLY when `identifyAny()` in `lib/sealed-title.ts` reads the
  Amazon title as the same product (the same groupKey): the rule that matches the stores matches Amazon, a wrong merge
  being worse than a missing price. ASINs and misses go in `data/amazon/asins-<region>.json` (ASINs may be stored; a miss
  is retried after 30 days) and ride the publish commit; `status-<region>.json` says what the last run did.
- `scripts/fetch-amazon-prices.ts` runs first in every Vercel build, fetches today's prices for those ASINs (`getItems`,
  ten a call, one a second, `AMAZON_BUILD_CALLS` a region, 30 by default) into the git-ignored `data/amazon-live/`, and
  drops a price under 60% or over 160% of the product's in-stock store median. Prices are never committed: Amazon's
  licence lets a price be kept 24 hours and shown with its time.
- `lib/amazon-live.ts` gives the product page the item's own tagged `/dp/` link and, while under 24 hours old, the price;
  the page passes it to the table's pinned Amazon row (`OfferTable` `pinned.amazon`), which shows it with "as of <time>
  <region clock>" and the licence's disclaimer, and the browser hides the price after 24 hours (`AmazonPrice.tsx`) because
  the page sits in the CDN for a day. The row stays an ad outside the store order: never ranked, never the best price,
  never in deals, alerts, history, the feed, metadata, JSON-LD or the quick view (`tests/amazon-api.test.ts` pins the
  reader to the product page and the client to the scripts). Both files are traced into the functions
  (`next.config.js`).

One credential serves every store: `AMAZON_CREATORS_AU_CLIENT_ID` / `_CLIENT_SECRET` / `_VERSION` as GitHub secrets and
Vercel Production variables (the same values as Compare Empire's and MTG Compare's; `AMAZON_CREATORS_<REGION>_*` would override for one
store). Access is per marketplace and opens by itself once that store's account has qualifying sales (about 10 in 30
days); a refused store is skipped, so the feature costs nothing until then and switches on without a code change.

## 2026-11-06 — Awin: a store that accepts the family pays from the next build, with no step by hand

**Decision (owner: "check if we are making the most of Awin, and if it's not there, just do it"):** the family's Awin
account (Compare Empire, publisher 3144410) is read each morning by Compare Empire's `scripts/awin-sync.ts`, which
publishes the programmes that accepted us, with their tracked domains, in its public `data/awin/programmes.json`.
DexCompare copies it first in its build (`scripts/fetch-awin.ts` → `src/lib/awin-programmes.json`; the committed copy is
an empty list). `offerLink` turns a link to a joined advertiser's own domain (Magic Madhouse, Chaos Cards, Zatu…,
whichever accept) into its Awin deep link, `sponsored`, with the affiliate note. Order and prices never change.
