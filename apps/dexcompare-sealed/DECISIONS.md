
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

## 2026-11-06 — Store thumbs up and down, one tally shared by every site

**Decision (owner: "a little mini area where you can rate a shop … thumbs up a store or thumbs down a store … across all
the sites you can now see that these stores are trusted"):** every store row carries two tiny thumbs beside the store's
name (`src/components/StoreVote.tsx`, the same file on every Compare Empire site), with counts once a store has votes and
a green "Trusted" mark from 3 thumbs up and 80% of the votes. RiftCompare keeps the votes and serves one public tally
(`riftcompare.com/api/store-votes`, CDN six hours), keyed by the store's host without "www.", so a shop listed on several
sites shares its thumbs; this site stores nothing and fetches the tally in the browser only (no function, no build
step). One vote per browser per store, a few per network, marketplaces (eBay, Amazon, TCGplayer…) get none. Votes never
order prices, hide a store or decide the cheapest. RiftCompare's DECISIONS.md, 2026-11-06, has the rules; change the
component there first and copy it.

## 2026-11-06 — Buy links open the store's checkout

**Decision (owner: "for all the sites that we can, send them directly to the checkout page, with the item in the
basket"):** an in-stock Shopify store row opens that store's checkout with the priced item in the cart, through
Shopify's cart permalink (`/cart/<variant id>:1`), as RiftCompare, OP Compare and MTG Compare do. `feeds.ts` keeps each
variant's id, `priceOf` names the in-stock variant it priced, and the importer stores it as `?variant=<id>` on the offer
URL (still the product page with that variant picked). `offerLink` turns it into the cart link, tagged
`utm_source=dexcompare&utm_medium=referral&utm_content=checkout`; `offerRef` and its SQL twin strip the variant. Awin
stores keep their tracked link; TCGplayer, eBay, Amazon and non-Shopify stores are unchanged. `lib/checkout-link.ts`,
`tests/checkout-link.test.ts`. Revert by removing the `shopifyCartUrl` block in `offerLink`.

## 2026-11-06 — A cart list on every site

**Decision (owner: "I really like the cart feature … all of our websites"; built on RiftCompare first, TCGEmpire
#346):** every store price row gets an "Add to cart" button, and the header a cart with its count on every width.
`/cart` (static, noindexed, out of the sitemap) groups the lines by store with ONE "Check out at <store>" button per
store: Shopify's cart permalink `/cart/<variant>:<qty>,…`, which fills that store's cart and opens its checkout. The
list lives in the visitor's browser only (`localStorage` `ce_cart_v1`): no account, no database, no function. The page
re-checks each line's price and stock from the store's own `/products/<handle>.js` in the browser (Shopify serves it
with CORS open) and leaves a sold-out line out. A line is cartable only when the row's own buy link already is a cart
permalink (the single-click checkout links), so Awin and partner stores, and rows whose variant we don't know, stay
"manual" lines on their own tracked links; eBay, Amazon, TCGplayer and Cardmarket are never lines. Shared files, the
same in every site (port fixes by hand): `src/lib/cart-list.ts`, `src/components/cart/*` (`cart-config.ts` is the
one per-site file; styles imported once from the root layout), `tests/cart-list.test.ts`.

## 2026-11-06 — Every visitor lands on their own region, the US when we can't tell

The owner, for every site: "all of our websites … should default to the US version, unless it detects the user's
country." `lib/region-boot.ts` (byte-identical in MTG Compare, DexCompare, WargameCompare and CamCompare) now moves
every person, never a crawler, on a regional page of another region to the same page in theirs: the region they picked
(localStorage), else their time zone's, else the US. This reverses the 2026-11-02 rule that moved only visitors who had
picked and offered everyone else a "Switch to <X> prices" line; Compare Empire made the same reversal earlier the same
day. Crawlers still see every regional page as it is, and URLs, titles, canonicals and hreflang are unchanged, so
indexing is untouched. A pick always beats the time zone. `tests/region-boot.test.ts` pins it.

## 2026-11-06 — eBay and Amazon rows are full price rows, on top, outlined

**Decision (owner: "eBay prices and Amazon prices should function exactly like a normal store price row. So you can also
add to cart … if it's in stock … it just sits on the very top. And it has a different colored outline"):** the eBay row
is always the first row, with a green outline, and Amazon the second, with an amber one. Both carry everything a store
row has: the stock line, the store thumbs (one tally per eBay / Amazon domain, `ebay.com.au`, `amazon.com`…) and the
cart button. They are "manual" cart lines on their own tagged links (`src/lib/cart-list.ts`), never a Shopify checkout;
an Amazon line's price is dropped from the visitor's list after 24 hours (Amazon's licence), and the cart then says to
see today's price on Amazon. With no Amazon price the row reads "Also check on Amazon", a tagged link. Unchanged: neither
is counted as a store, "Best price", a deal, an alert price or the reference price; TCGplayer and Cardmarket stay
references (no thumbs, no cart line); no Amazon link in a pop-up.
DexCompare (and MTG Compare, the same tables): the slots are now eBay, Amazon, TCGplayer, then the stores (TCGplayer was second); the eBay listing row shows the "In stock" pill, its shipping under the price.

## 2026-11-06: The quick view carries the tagged Amazon link (owner)

Since 2026-11-02 the quick view showed no Amazon link (or, on KaeYoung and ScentCompare, an "Amazon" row that opened our
own product page), read as Amazon's ban on links in pop-ups. The owner noticed the quick view sends nobody to Amazon and
chose (2026-11-06) to put the product page's own tagged Amazon link there. Amazon's Participation Requirements, item
(o): "You will not post or serve any Special Links … within any pop-up or pop-under windows, transitional page ads, or
layer ads, except for pop-up windows in conjunction with your Site promoting Products closely associated with the
materials on your Site." A quick view the visitor opens for one product, showing that same product, fits the exception;
the owner accepted the remaining risk. The quick view shows the link only (the item's own page where the ASIN is known,
else the tagged search), never Amazon's price: that stays on the product page under the 24-hour licence. Uninvited
overlays (a phone ad dock, a corner card, an exit pop-up) still never carry Amazon, and an Amazon page is never framed
(item (n)).

## 2026-11-07: A case holds a fixed number of units, and eBay far under the median is never the best price

Ported from MTG Compare the same day (an eBay seller's feedback there: a 120-pack sleeved case was a six-box case's "best
price, 26% below the median"; `rowPacks` skips every pack check on a case). `wrongCaseQuantity` (`sealed-title.ts`) refuses a
case title whose stated counts are none of the case's: Booster Box Case 6 boxes / 216 packs, ETB Case 10 / 90, Booster
Bundle Case 10 or 25 bundles / 60 or 150 packs (both are sold as "the case"), and a sleeved booster case. "Booster Case x2",
"Master Case (60 bundles)", "Sleeved Booster Box Case - 144 packs" go; several "Nx" adding up to the case ("5x Koraidon, 5x
Miraidon") stay. It runs in `refusedForType` (import and read) and `identify()`. And an eBay listing under 75% of the
in-stock stores' median (two or more stores) is shown in its row but is never the best price (`ebayFloorFor`,
`ebayMayBeBest`, `ebay-offer-row.ts`). The count is not put in the eBay query: Browse needs every keyword in the title.

## 2026-11-07 — The low-traction cull: tins, blisters, decks and collections must be a comparison

Owner, 2026-11-07: apply Compare Empire's focus cull to every site ("any products that are not trendy, or very low traction or
conversion, we probably want to get rid of"). On 2026-11-07 DexCompare listed 9,358 products; 8,738 were tins, blisters, decks
and collections, 5,725 were in stock nowhere and only 1,346 were in stock at two or more stores in any market. Search Console
had essentially nothing on product pages (the property's 56 days: the home page). Thousands of one-store or no-store pages are
the "Crawled – currently not indexed" pile the SEO audit found.

- `lib/focus.ts` decides what the exporter writes to data/public/: a product stays with search demand (a click or 10+ impressions,
  from the `demand` branch), a set under 120 days old or upcoming, two in-stock sources in one market, or — for core products
  (boxes, ETBs, bundles, packs, cases, Japanese) — any listing at all, so an out-of-print box stays. Tins, blisters, decks and
  collections need the comparison. ≈9,360 → 1,960 products on 2026-11-07's data.
- Neon and the price history keep every product, so one that qualifies again returns at the same URL with its chart.
- A culled product's URL 301s to its type page in the same region (`data/public/culled.json`, `lib/culled.ts`).
- The exporter's half-size guard compares listed rows with the last listed rows once a focused export exists.

## 2026-11-07: Three listings to index a region page; the sitemap lists the core

The owner's Search Console and Bing audit (2026-11-07) found thousands of region product pages "Crawled" or
"Discovered – currently not indexed": the same product exists at seven region URLs, and a page where one or two stores
list it is a store's shelf inside the template, which Google buckets as thin. `productTier` (`src/lib/index-tiers.ts`)
now needs three listings (stores, plus an open marketplace offer) for a region page to be indexable (`MIN_INDEX_LISTINGS`):
0–2 is thin, noindex, follow, out of the sitemap and out of hreflang (the page's `regionAlternates` already advertises
only the regions where `productNoindex` is false). The sitemap's strong tier is now the core: in stock at three or more
stores (`STRONG_IN_STOCK`), or a headline product five or more stores list (`STRONG_HEADLINE_LISTED`); everything between
stays indexable and linked, out of the sitemap. Every page stays live and every URL is unchanged. Loosen the constants
once Search Console shows the core indexed (recheck ~25 Nov). `tests/index-tiers.test.ts`.
## 2026-11-07 — Black Friday strip (owner: "capture all of the Black Friday SEO")

One line under the header on every region page, in the server HTML, linking that region's `/black-friday` from 1 November
to the Saturday after Black Friday, then its `/cyber-monday` to the day after Cyber Monday, then nothing (`saleStrip` in
`lib/black-friday.ts`, tested). The xl header entry switches to Cyber Monday on the same day; the sidebar and footer list
both pages. A link, never a pop-up (pop-up policy: nothing uninvited on a visit's first page), never a countdown or any
BANNED_COPY phrase. The strip covers the widths (phone, lg) where the header has no room for the entry.

## 2026-11-07 — eBay's account-deletion endpoint is back

eBay checks every production keyset's Marketplace Account Deletion endpoint and disables a keyset whose endpoint keeps
failing. DexCompare's keyset is registered at `https://dexcompare.app/api/ebay/marketplace-deletion` (the old site's
route; `archived/dexcompare/EBAY_GROWTH_CHECK.md`), but the sealed port never carried that route over, so the address
fell into `/api/ebay/[region]` and answered 400. Found in the all-keys check after eBay warned about Compare Empire's
endpoint. `src/app/api/ebay/marketplace-deletion/route.ts` answers the challenge with
sha256(code + `EBAY_VERIFICATION_TOKEN` + endpoint) and acknowledges notices; it stores nothing (we hold no eBay user
data). The token must be the same value as on eBay's page, in Vercel Production; a missing token answers 500 so it shows.
`tests/ebay-deletion.test.ts` pins it. Never remove the route while the keyset exists.

## Black Friday guide (2026-11-07)

Owner: get the Black Friday pages indexed and ranking. The sale pages were already in the sitemap and the daily IndexNow
run (it submits the whole sitemap). Added the guide `pokemon-black-friday-2026` in every region. It gives the dates, the newest three
released sets with headline product in stock (the resealed guide's read: cheapest store and middle store price for the
booster box, ETB and bundle), as the prices to read a Black Friday price against, and five checks. It links both sale pages
and they link back to it. It makes no claim about what will be cheaper on the day.

## 2026-11-07 — Why Google sends DexCompare almost nothing, and a sitemap of its best pages only

The owner asked why RiftCompare does well in Google while DexCompare can't reach 50 clicks a day. Search Console (the
`sc-domain:dexcompare.app` property; the old `https://www.dexcompare.app/` property only sees redirects since the apex became
canonical on 2026-10-27) answered it: in 90 days **only the home page has ever had an impression**, all of them for the
search "dexcompare". URL Inspection of 81 sitemap URLs: 79 "URL is unknown to Google", 2 (the home page) indexed. RiftCompare's
sample: 20 of 25 indexed. The pages themselves are fine read as Googlebot (200, self-canonical, 280 ms, price in the server
HTML, no noindex; `crawl-audit-sites`), so it is not a ranking loss to bigger Pokémon sites: Google has not crawled past the
home page since the move. The history explains it: the 5xx months on the old database, two host moves in three days
(apex → www 10-25, www → apex 10-27), and www without DNS from 10-26 until today, so every URL Google knew failed and it cut
the crawl to almost nothing.

What changed:
- **The sitemap names the core only**: each region's most-stocked strong products (`SITEMAP_PRODUCTS` in `lib/index-tiers.ts`:
  US 300, CA and AU 200, UK and EU 150, NZ and SG 60; ~1,100 instead of 2,420) and no store pages (`SITEMAP_STORE_PAGES`; ~900
  URLs). Hubs, guides, tools and seasonal pages are unchanged. Every page left out stays indexable and linked. With a few URLs
  crawled a day, 6,400 listed URLs spread them over store pages and the long tail. The import's live-sitemap floor is 600.
- **RiftCompare's Pokémon section links here with clean URLs** (TCGEmpire, the same day): its ~700 links carried
  `?utm_source=riftcompare…`, which this site's robots.txt disallows (`/*?`), so Googlebot could follow none of them from our
  best-crawled site.
- `www.dexcompare.app` resolves again (owner, 2026-11-07) and 308s every path to the apex, so Google's ~8,900 old www URLs now
  lead somewhere.

Widen `SITEMAP_PRODUCTS` once Search Console shows most listed product pages "Indexed" (recheck ~2026-11-25). Don't flip the
canonical host again: each move resets what Google knows.
