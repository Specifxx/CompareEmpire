
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

## 2026-11-08 — Google indexes the four big regions' products and guides; the footer links one "Our sites" page

The owner's Claude in Chrome audit of Search Console (2026-11-08): nothing blocks Google (clean pages, 169 ms, no host
problems, no manual action), 8,899 URLs "Discovered – currently not indexed", Googlebot spends 70% of its fetches on scripts
and JSON, no outside site links here, and ~9,000 site-wide keyword footer links come from our own sites. CamCompare, newer,
is indexed (2.77K pages) and hides 1,841 thin pages; this site offered all 6,408 to Google, seven regional copies of most
products and of every guide.

- **NZ, SG and EU product, guide and tool pages are `noindex`** (`INDEXED_DETAIL_REGIONS` in `lib/index-tiers.ts`: US, AU,
  UK, CA), out of the sitemap and out of every hreflang set. Their region home, sealed, set and type hubs stay indexable, and
  every page stays for visitors. Products with fewer than three listings were already `noindex` (2026-11-07). The sitemap's
  products: US 300, CA and AU 200, UK 150 (`SITEMAP_PRODUCTS`).
- **The footer links `/our-sites` once** instead of eight keyword-titled sister links on every page; that page lists each
  other site once by its plain name. The other sites' footers still link here site-wide (their own repos; to be changed the
  same way).
- Not changed: the scripts Googlebot fetches (27 per page) are Next's own chunks, and no cheap cut was found.

Never change the host again. Recheck ~2026-11-25; add EU back first when the core is indexed.

## 2026-11-08 — Christmas is one quiet line, not a costume

Owner: "some of the christmas themes on our websites are a bit too much - the theme must match the domain". The
2026-11-01 Christmas look (falling snow, a strand of lights, trees, presents, candy canes, stockings, a Santa hat on the
logo, candy-cane stripes and seasonal palette swaps) is gone, with its art in `public/xmas/`. The season keeps at most ONE
touch, drawn in the site's own colours: the gifts line in the hero (`ChristmasGifts`, `.xmas-pill`), a plain pill that inherits the hero's text colour, with no gift icon or red glow. It still starts and ends by itself (`lib/season.ts`, 1 November to
Boxing Day), and the tests pin that nothing else comes back. Black Friday and Cyber Monday (strip, pages, nav) are
unchanged. The same rule went to every sister site: the site's own identity first.

## 2026-11-08 — Full-width shell and a featured-product hero

Owner, 2026-11-08: "I really like how the KaeYoung and ScentCompare engine works and how they feature some products on the hero and how
it uses the full screen … maybe the same for the DexCompare / MTG Compare engine."

- **Full width.** From 1280px the shell runs from the eBay rail's edge to the TCGplayer rail's (`.max-w-shell` margins of 136px, not a
  max-width: `100vw` counts a desktop scrollbar), so the sidebar sits flush against the left rail; `.page` widened to 1440px.
- **The hero** (landing page and every region home) is two columns from lg: the words, search, region row, shortcuts and stat chips
  on the left; two big product cards on the right (`components/home/HeroCards.tsx`; under the words on a phone, where the type
  shortcuts become one sideways row). Region homes show the first two of `hotPicks` (owner's featuring order, photo first) under the
  same "Hot right now" h2; the landing page shows the default region's two most-stocked (`lib/picks.ts`) and swaps to the visitor's
  region through `/api/picks/<region>`. Same h1 words, links, URLs, titles and metadata; nothing in the cards is a heading.

## 2026-11-08 — Bing's recommendations: short product titles, IndexNow in small batches

Bing ranks this site for real searches already (93 clicks, 451 queries, 129 pages; owner's Webmaster Tools read, 2026-11-08),
so its four recommendations were checked one by one:

- **"Important pages missing from the sitemap"** (`/ca/preorders/delta-reign`, `/uk/this-week`): every region's `this-week` is
  in the sitemap, and so is every open pre-order page. Delta Reign came out on 6 Nov, so its pre-order page left the sitemap and
  is `noindex` on purpose (`lib/preorder-guides.ts`); the set page carries those searches. Bing last read the sitemap on 3 Nov.
- **Titles too long**: a product title is now the fullest rung of a ladder that fits 70 characters (`TITLE_HARD_MAX`,
  `productTitle`): it drops "and on TCGplayer", then the store count, then the price.
- **IndexNow in batch mode**: the daily job sent the whole sitemap in one request. It now sends at most 300 URLs a run, 100 a
  request: URLs never sent first (sitemap order, hubs first), then each again about weekly (`pickUrls`), remembered in the
  Actions cache (never committed). Every price page changes daily, so a lastmod-based pick would still be the whole sitemap.
- **Links from high-quality sites**: not a code change.

The www → apex redirect is Vercel's domain setting and stays as it is.

## 2026-11-08 — The landing page links the pages Bing ranks; the old value checker URL redirects

Google crawls the home page and little else, while Bing already ranks the newest set's pages, the cheapest-packs guide, the
pre-order pages and `/card-value`. `/card-value` was the old singles site's value checker and 404ed: it (and `/bulk-pricer`)
now 301 to `/au/tools/value-checker`, AU like the other legacy redirects. The landing page gains "Popular right now"
(`components/home/PopularPages.tsx`): plain server-rendered links to the newest set in the US, CA, AU and UK, the open
pre-order, cheapest packs, the cheapest-packs guide, Black Friday, the value checker and the by-country guide, so each is one
click from the page Google reads. Only regions whose detail pages are indexed (`INDEXED_DETAIL_REGIONS`).

## 2026-11-08 — The alert form asks, unticked, for a weekly price drops email

Owner, on the 2026-11-08 competitor scan: "implement all of this" (gap #5, a weekly email of the biggest price drops).
The shared `PriceAlertForm.tsx` (byte-identical on every sister site) gains one UNTICKED box, "Also email me this site's
biggest price drops once a week", sent as `weekly` beside the alert. RiftCompare's alert service does the rest
(TCGEmpire DECISIONS.md, "A weekly biggest-drops email for the sister sites"): it rides the same double opt-in, builds
one edition a week from this site's own `/alert-feed.json`, links only to this site's pages (no eBay or Amazon), and
every email has a one-click stop. This site still stores no address and holds no mail key, and nothing new pops up.
## 2026-11-08 — "Is this a good price?": paste a store link

Owner, 2026-11-08 (the competitor scan's gap #7, "implement all of this"), ported from MTG Compare (mtgcompare #106): a visitor
pastes a store's product link at `/<region>/tools/is-this-a-good-price` (`components/tools/LinkChecker.tsx`, `lib/link-check.ts`)
and sees whether it is a good price.

- The browser asks `/api/check/<host>` for that store's listings: our own stored rows, only for a store in `src/data/stores.json`
  (anything else is a 404), force-dynamic and kept by the CDN for a day like the quick view, never ISR. It never fetches the pasted
  page. The product's cheapest and median in-stock prices come from the browse index the browser already loads.
- A link is keyed by host and path (`linkPath`: a Shopify product is `/products/<handle>` from any collection or market prefix); two
  products under one path need the `?variant=` to tell them apart, or there is no answer (a wrong product is worse than none).
- Verdict (`priceVerdict`): within 1% of the cheapest in stock is the best price; under the median fair; within 3% of it typical;
  above it "you can pay less", with the saving. A listing that was out of stock says so instead. eBay, Amazon, marketplaces, stores
  we don't read and unmatched pages fall back to a search from the link's words, and the visitor types the price.
- Pasting a link into the header search opens the checker (`#link=` in the fragment, so the CDN keeps one copy of the page).
## 2026-11-08 — Shop by Pokémon: one hub per Pokémon

Owner approved the competitor scan's search-by-need hubs (2026-11-08). Collectors search "Charizard box" or "Umbreon
collection", not a set name. `/<region>/pokemon/<slug>` lists the sealed products whose OWN NAME names that Pokémon, whole
words only (Mew is not Mewtwo; `lib/pokemon-hubs.ts`, `tests/pokemon-hubs.test.ts`), cheapest first, with the sold-out ones
behind the stock filter like a type page; `/<region>/pokemon` is the index. About 60 Pokémon, from every name on 3+ products
(trainers, sets and mechanics such as "Mega" or "Team Rocket" are not Pokémon and have no hub).

- One scoped read per page (`pokemonPageData`, capped at 400 rows; a Postgres `~*` word-boundary match in db mode), rendered
  per request and held by the CDN for a day like every hub. No ISR, no prewarming.
- Indexed only with 3+ comparable products AND only in the four indexed regions (`INDEXED_DETAIL_REGIONS`: US, AU, UK, CA);
  otherwise `noindex, follow`. The sitemap lists those hubs only; hreflang names only those regions.
- Linked from the header's shop menu, the sidebar, the phone menu and the footer ("Shop by Pokémon").


## 2026-11-08 — Store badges, free price data and My collection (competitor scan)

The owner approved the competitor scan's ideas (Collectr and PriceCharting keep people coming back with "what is my
collection worth"; Scryfall grew on free data credited with a link; price sites earn links from the stores they list).
- **Store badge.** `/list-your-store` ends with "Already listed? Add our badge": the site's plain-HTML "prices compared on"
  badge (an ordinary link: no iframe, script, image or tracking) and its code to copy. `ListYourStore.tsx` takes it as the
  optional `badge` prop and stays the same file in every site. Stores see it when they come to us; nobody is emailed about it
  (cold outreach stays stopped).
- **Per-store badge.** A store's own page ends with "Add this badge to <store>'s site" (`components/StoreBadgeBox.tsx`): the
  same badge, pointing at that store's page here (`storeBadge(…, path)`), so a store that adds it links to its own listing.
- **Free price data.** `/prices.json` (`lib/price-api.ts`): every product's cheapest in-stock price per market, in that
  market's currency, with an absolute link to its comparison; never eBay, never converted. Free for any use with a visible
  link back (the licence and an attribution snippet are in the file and on the widgets page). Built from the same numbers as
  `/alert-feed.json` and served as a static file: no function runs for it and only a release changes it. Open CORS.
- **My collection.** "I own this" on the product page (`components/vault`, `lib/vault.ts`, the same files in every site)
  keeps a list in the browser only (`ce_vault_v1`: no account, no database, nothing sent to us). `/collection` (a static,
  noindex shell) values it from `/prices.json` in the market each item was added in, one total per market (never converted):
  worth today, the change since the items were added, the change since the last look (one total per market and day in
  `ce_vault_days_v1`), and a share line with the real totals (`utm_medium=collection`). Values are the price to buy it again
  at a store, and the page says so. Linked from the footer.

## 2026-11-09 — The product share card draws the spread as a stats chart

Owner, 2026-11-09: the link preview for a product should look like a graph of stats, to go with a Reddit post. Where six or more
stores have the product in stock in the region, `/og/p/<region>/<slug>` (the product page's og:image) now draws `lib/og-card-stats.tsx`:
four tiles (cheapest, median, dearest, dearest vs cheapest) over one bar per store, cheapest to dearest, with the median dashed.
Fewer than six stores, or no real gap, keep the earlier text card, so a thin product never gets a chart of two bars. The prices are the
page's own in-stock store offers (never eBay or TCGplayer, never converted); caching is unchanged (drawn on first share, kept by the CDN
for a day). Reddit freezes a post's thumbnail, so this had to be live before the post (released with `[deploy][urgent]` at the owner's
request, the one case the 12 hour gate allows).

## 2026-11-09: Paid featured listings, US$100 a week (owner)

Owner: "the ability to have a featured listing on dexcompare and for people to pay for a direct spot on the website via Stripe.
$100 per featured listing per week", the link "any website or eBay or etc.". Built as RiftCompare's shared service (its
DECISIONS.md, same date) because this site has no database, no mail key and no Stripe.

- `/advertise` (static, in the footer and sitemap) holds the form (`FeatureListingForm`): title, blurb, link, photo address,
  price text, region, 1 to 4 weeks, email, and a box confirming the listing is legal and theirs. It posts to
  `riftcompare.com/api/sister-ads` and sends the visitor to Stripe Checkout; the card is held, not charged, until the owner
  approves, so a refused listing costs the seller nothing. `/advertise/thanks` is noindex.
- The banner (`FeaturedAds`, region home only) is drawn in the browser from `riftcompare.com/api/sister-ads/dex` once the page
  is idle: no release is needed to start an ad and none to end it (the banner checks each ad's own dates), nothing is reserved
  when there are none (no layout shift), and no pop-up. At most three at once.
- Labelled "Featured listing", "Paid link", "Not part of the comparison"; link `rel="sponsored nofollow noopener"`. Never a
  price row, best price, deal, alert or ranking input. `tests/featured-ads.test.ts` pins the label, the dates and the service.

## 2026-11-09: open the product page of the cheapest in-stock rows (Reddit: "the cheapest stores have no stock")

A Reddit commenter on the Delta Reign ETB post said the cheapest "in stock" stores had none, and opening them by hand proved it:
Dynamic Card Collectors (US$75.00, "In Store Only"), Wulf Gaming (US$84.99, "Available in store only", theme script holds stock under
a metafield threshold for the counter) and CARDPOPUSA (US$79.99, banner "Online ordering temporarily unavailable", no add-to-cart).
Their Shopify feeds say `available: true`, `requires_shipping: true` and carry no pickup wording, so `pickup-only.ts` (2026-11-05)
could not see them: the signal is only on the rendered page.

- `verifyCheapestPages` (importer.ts, after `demoteSuspectStores`) opens the page of each product's and market's cheapest in-stock
  store rows (4 must pass, up to 10 tries, 350 ms apart per store, robots.txt honoured, 25 minute budget) and writes a row whose page
  says so as sold out. `pageStockVerdict` (page-stock-check.ts) reads only server-rendered text and markup, never script text (Wulf's
  "Not sold online" sits in the JS of every page). A shop-wide notice writes every row of that shop as sold out.
- Fails open: an unreadable page leaves the feed's answer. Rules may only refuse more. Add the real wording to
  `tests/page-stock-check.test.ts` for every store that turns up. `SKIP_PAGE_CHECK=1` skips it. The import summary shows the count.
- Not covered: "preorder" or "presale" wording (Kitchen Table's page still says "Presale item" after release day, with a live add-to-cart),
  and stock only a script reveals. Both are left as the feed says.

## 2026-11-09: Navigation audit: browse sets by series (era), not only by newest

Bill: navigation is very important; a collector deep in one space wants to get to it fast. Product type (ETB, booster box, UPC,
Japanese, "Shop by Pokémon") was already one click, but sets were a flat list of the newest eight: a collector who thinks "Scarlet &
Violet" or "Sword & Shield" had to open the sets page and scroll. Reference: SportsCardCompare's sport/brand menus (waxcompare #13),
ported to this niche's own dimension, the era. Same change as MTG Compare's (the two share this engine).

- The header's "Sets" item now opens a dropdown (`setsMenuColumns`, ShopMenu.tsx): one column per series (up to four), its newest
  sets under it, heading and "All <series> sets" to that series' block on `/sets` (`/sets#scarlet-and-violet`; the page already had
  the ids and the chip row). The sidebar and phone menu get a "Sets by series" group from the same `navGroups` list.
- No new page, no new read: the lists come from `sets.ts`, and a set (or series) no store lists in the region is left out (`listed`).
  URLs, titles, canonicals, h1s and JSON-LD are untouched.
- Not done: a `/series/<slug>` hub or a series filter on the browse grid (new indexable pages, owner's call); the side rails and the
  footer's "Our sites" link fall short of the rubric's "no clutter" item but are the owner's own revenue and family decisions.

## 2026-11-09: one mega-menu component for the header dropdowns (owner)

- Bill: navigation like the best modern sites, one shared pattern across the Dex / MTG engine family. `components/NavMenu.tsx` (the same
  file in DexCompare, MTG, Gundam, Wargame, YGO and Bandai; keep them identical) wraps every header dropdown: the panel is always in the
  server's HTML as plain links (closed it is only `invisible`, so crawlers read it and keyboards skip it), it opens on hover with intent
  (90 ms in, 200 ms grace out), a chevron button toggles it for touch and click, focus into the item opens it, ArrowDown/Up/Home/End move
  through the links, Escape closes and returns focus, focus leaving or a press outside closes it, one menu open at a time, a navigation
  closes it (`aria-expanded`, `aria-controls`, `aria-haspopup`). The label stays a real link.
- Header is now Deals, All sealed, Sets, Pokémon, Guides, Stores (Black Friday after Deals in season), the first five dropdowns. New:
  Deals (best prices, stock and moves, coming soon: the open pre-order hub and the release calendar, which replaces the "Releases" item
  that used to turn into the hub), Pokémon (Charizard, Pikachu, Eevee, Umbreon, Mewtwo, Gengar, Lucario, Greninja hubs, every Pokémon,
  Japanese boxes) and Guides (guides, tools, Price Duel, creators, forum). Product type, Japanese and sets by era already existed.
- No URL, title, canonical, h1 or JSON-LD changed; no read or page added; the phone menu and the sidebar are unchanged.
- Not done: removing the side panel (the menus do not yet cover its deep groups, and it carries the current-section state for the
  deep levels; revisit once the menus have been in use), a phone bottom sheet (the `<dialog>` menu stays), and the side rails and
  footer links, which are the owner's own decisions. Deals is a hover menu: nothing is added to the deploy cadence.

## 2026-11-09 — A store's damaged-box variant is never its price; the shipping probe reads a $250 and a $400 cart

A store (Collectors Guild Australia) asked for two things: the delivered price (A$249.95 + A$9.99 standard delivery) rather than "Shipping
at checkout", and standard boxes compared apart from boxes sold with cosmetic damage.

- `priceOf` picks a listing's cheapest orderable variant, so a store selling "Damaged Box" and "Standard" as options of one product put the
  damaged copy's lower price on the page. A variant whose title reads as damage (`DAMAGED_VARIANT`) is now dropped when the store lists
  others, and a product whose every variant is damaged has no listing. We do not build a per-condition price list: damaged stock stays out
  of the comparison (title rules already refuse it), so every price on a page is for an intact box.
- Shipping: the measurement already existed and shows `+ $9.99 shipping` once a store's measured carts bracket the price. This store's carts
  were $149.95 ($9.99) and $464.95 (free), so a $249.95 row read "Free–$9.99". The ladder is now 40/80/150/250/400 (was 300) so more rows
  fall between two measured carts of the same quote; the next weekly run writes the new points. A quote is never guessed.

## 2026-11-10: DexCompare Premium, a RiftCompare Premium account that works here (owner)

Owner (Bill): build DexCompare Premium now, one account for RiftCompare and DexCompare, whatever is easiest; free price alerts and
the weekly drops email keep running. This site has no accounts, no Stripe and no database, so it holds nothing: RiftCompare's
DECISIONS.md, same date, has the server half.

- `/premium` (static, footer link) offers "Start 14-day free trial" (riftcompare.com/premium) and "sign in"
  (riftcompare.com/sister-premium/dex). That sign-in returns to `/premium/return#t=<token>`; the token lives in the URL fragment,
  is stored in localStorage (`dex_premium_v1`) and the fragment is removed (`lib/premium-member.ts`). The browser asks
  `riftcompare.com/api/sister-premium/status` (at most hourly) what it is worth; RiftCompare re-reads the account each time, so a
  lapsed member loses the extras at the next check. No page reads a cookie, header or session; pages stay static and CDN-cached.
- Members get: a "Tell me when it's back in stock" button on a product with no in-stock price in the visitor's region
  (`RestockAlert`, shown under the price-alert form, never a pop-up; non-members see one quiet line to /premium), up to 200 price
  alerts, and `/watches` (noindex), their watches with stop buttons. Free alerts stay free and ungated.
- Not done on purpose: ad-free (the eBay and TCGplayer rails are this site's income), faster restock checks (imports run about
  twice a day), a synced collection (sealed only, so a vault is thin), the cheapest-delivered basket planner (next, if members ask).
- Pinned by `tests/premium-member.test.ts`.
## 2026-11-10: Product page weight cut by 42% (site review X1)

Measured on a local production build with today's data: /us/p/delta-reign-booster-box was 811 KB of HTML (297 KB of it the React
payload), /ca the same. 330 KB was the 82-row price table: ~4 KB a row, ~1.5 KB of it the store thumbs' inline styles and SVG, the
rest utility class lists, the shipping sentence twice (tooltip and screen-reader text) and a cart icon. Flags were ~2 KB of inline
SVG each, ~16 a page, in the HTML and again in the payload. After: 474 KB (239 KB payload), every store row and link still in the
server HTML, and the title, meta tags, canonical, hreflang, JSON-LD, headings and the set of links byte-identical (compared).

- Rows past `FULL_ROWS` (20, `lib/ebay-offer-row.ts`) in the server's price order are lean (`OfferRows.tsx` LeanRow): store, stock
  pill, price, button. Their data drops the listing title, cart line, per-pack price, host and shipping text; the shipping cents
  stay, so "Price + shipping" still ranks them. Every row is still visible (the owner's 2026-10-24 "all there visible").
- The row's cells, `StockPill` and `ProductCard` use short classes from `globals.css` (`.or-*`, `.sp-*`, `.pc-*`) built with
  `@apply` from the same utilities, so they look the same. `StoreVote` reads `components/store-vote.css` (imported by the root
  layout, never by the component, so node tests can load it).
- The shipping sentence is said once, in "How these prices work", not on every row.
- `Flag` is an `<img>` of `public/flags/<code>.svg`, written from `FLAGS` by `scripts/write-flags.tsx`.
- Not done, and why: the review asked for the rows as a server-only component so they are "not serialised a second time". In the
  App Router a server component's output is in the RSC payload too (as an element tree, ~3x the size of the row data the client
  list takes now), and the rows must stay a client list because "Price + shipping" re-ranks them and the eBay row is placed among
  them in the browser. Trimming the row data was the way to shrink the payload. The 300 KB target needs the header, footer and
  side rails slimmed next; they are the same on every page.

## 2026-11-10: Canada and UK already show every paid row the US does (site review DEX-1)

The review asked why Canada (1,218 visitors, under A$5.25) and the UK (820, A$10.06) earn so little beside the US (1,637, A$551)
and to add whatever paid rows /ca and /uk lack. Checked on a local build of /us, /ca, /uk and /au /p/delta-reign-booster-box and
their quick views (/api/quick/<region>/<slug>):

| Paid row, in order | US | CA | UK |
|---|---|---|---|
| eBay (that country's eBay, a priced listing in the browser) | ebay.com, `dex-us-…` | ebay.ca, `dex-ca-…` | ebay.co.uk, `dex-uk-…` |
| Amazon | amazon.com, priced (US credential) | amazon.ca search, `compareempire-20` + `dex-ca-amazon-table` | amazon.co.uk search, `compareempi03-21` + `dex-uk-amazon-table` |
| TCGplayer | ranked US$ offer through /go, `sharedid=dex-us-…` | US$ offer, "ships from the US", `sharedid=dex-ca-…` | same, `sharedid=dex-uk-…` |

Every row is present, pinned in the same order and tagged per region, on the product page and in the quick view. Nothing was missing
to add. The gap is elsewhere: in the US the TCGplayer row is a comparable price (often the best one) in the buyer's own currency,
while in Canada and the UK it is a US$ price shipped from the US, and Amazon CA and UK show a search instead of a price because
Amazon refuses the AU credential for their tags (`data/amazon/status-ca.json`, `status-uk.json`: "InvalidAssociate"). The import
workflow now passes `AMAZON_CREATORS_CA_*`, `_UK_*` and `_EU_*` through, so their prices appear as soon as those accounts' own
Creators API credentials exist (GitHub secrets and Vercel Production, through the owner's secrets script).

## 2026-11-10: Hubs get a data-built summary and a FAQ (SEO indexing plan, SEO-1)

- Google fetched `/us/type/booster-boxes` on 9 Nov (canonical right, fetch fine) and left it "Crawled, currently not indexed":
  787 characters of prose in 565 KB of HTML. That is a verdict on the page, so more indexing requests cannot change it. The type
  hubs, set hubs and region homes now carry a server-rendered summary and four to six FAQ answers, all computed from the rows
  the page already loads (`lib/hub-summary.ts`, `components/HubSummary.tsx`): the cheapest in-stock product and its price and
  store count, the middle price, the spread, how many products two or more stores stock and how many sit at least 10% under their
  stores' middle price, the cheapest pack, and how prices are read. About 2,300 characters on the US booster box hub, different
  in each region because the numbers are.
- Every number comes from the data files; the copy says "today" and "right now" and is tested against `BANNED_COPY` (no pull
  rates, expected value, investment or trend claims). A hub with too little data says less, not filler: each sentence and
  each question exists only when its number does. On a hub that loads only its cheapest rows (a type hub's 48) the spread says
  "among the cheapest N shown", and the region home says "among the newest booster boxes and ETBs", never "the cheapest" of
  the whole market. The cheapest store is named by its in-stock store count, not its name (the cards do not carry it).
- The FAQPage JSON-LD goes with the visible answers (`<details>`, in the server HTML). Titles, descriptions, URLs, canonicals,
  hreflang and the sitemap are untouched, and this does not redo the page-weight work (site review X1). No indexing request or
  sitemap resubmit for Dex; the rechecks stay 14 and 25 Nov. Pinned by `tests/hub-summary.test.ts`, on the committed data files.

## 2026-11-10: The Premium corner card and the announcement post (owner)

Owner: "the slider that RiftCompare used to use, pointing to Premium", a Premium post, and Premium used as soon as possible. `PremiumCorner`
(root layout, browser only) is one small card at the foot of the page, never a modal: it arms on the third distinct page of a visit, shows only
after the visitor has scrolled half a screen, never for a member, on the Premium or watches pages, on a product page (the buy bar), or while the
rating card or a dialog is open. It carries `data-ad`, so the phone dock yields to it and a visit holds one unit at a time. ✕ silences it 14 days,
opening Premium 30; it shows at most once a visit. RiftCompare removed its own sliders on 2026-11-03 (owner), so this is Dex's alone, at the owner's
2026-11-10 request. The post is a static page, `/premium/restock-alerts` (not a guide: guides need a live price block), in the sitemap with `/premium`.

## 2026-11-10: The weekly price chart (X3)

A dated page per week and region, `/<region>/charts/<YYYY-MM-DD>` (the week's last day, a Sunday), the same as MTG Compare's
(ported from `Specifxx/mtgcompare`, same engine): the 20 products whose cheapest in-stock price rose most that week with last
week's rank (▲, ▼, = or New), and the 10 biggest falls. `/<region>/charts` shows the latest week, canonical on the dated page.
It gives creators and Reddit posts one permanent link per week with real numbers. Pure, from `data/public/price-history.json`
alone (`lib/weekly-chart.ts`), so a past week draws exactly as it was. Real moves only: in stock at 2+ stores on both days, a
move of 5% to under 50%. A week with fewer than 5 such moves publishes nothing. Published weeks in indexed regions are in the
sitemap; the share image (`/og/charts/<region>/<week>`) is static. The home's chips and `/creators` link it.
`tests/weekly-chart.test.ts`.

## 2026-11-10: Premium signs in and pays on DexCompare, a Premium button and a home-page slider (owner)

The owner looked at the first Premium release and asked for three changes: "a nice Premium button … on the homepage that people can
see", "a slider", and sign-in "via DexCompare … I don't want them to go into the RiftCompare website to sign in, because that's very
dodgy". So:

- **Sign-in is `/account`** (noindex): "Continue with Google" (Google Identity Services, DexCompare's own Google client, its public id in
  `NEXT_PUBLIC_DEX_GOOGLE_CLIENT_ID` / `DEX_GOOGLE_CLIENT_ID`) or an emailed 20-minute link from alerts@dexcompare.app that lands on
  `/account/verify#c=…`. The browser sends Google's ID token or the link's code to RiftCompare's `/api/sister-premium/sign-in` (exact-origin
  CORS), which checks it, finds or creates the RiftCompare account (the admin and Stripe stay there) and answers with this site's
  session token. No password, no secret on this site, and the visitor never sees riftcompare.com.
- **Checkout and billing open from `/premium`**: a Monthly / Yearly picker, "Start 14-day free trial" asks RiftCompare's
  `/api/sister-premium/checkout` for a Stripe Checkout session that returns to `/premium?welcome=1`; a member gets "Manage billing"
  (Stripe's portal, back to `/premium`). Signed out, the trial button signs in first and comes back with the plan kept.
- **A Premium button in the header** at every width (a star alone on a phone) and "Premium" in the menu's More group.
- **The slider is in-page** (`PremiumSlides`, home and region home): a banner in the page's flow that turns through three slides, first
  slide in the server HTML, paused on hover, focus and reduced motion, hidden for a member. Not fixed, not a pop-up. The corner card now
  arms on a visit's second page (was third), after a smaller scroll, still once a visit and silenced by ✕.
- `/premium/return` stays for any old RiftCompare link still in flight; nothing links to it.

## 2026-11-10: The sweep's calls move from eBay.de to Australia and the UK (owner: "use the recommendation")

The catalogue sweep shared its 2,100 calls by product count × audience weight, which gave US 912, EU (eBay.de) 459, UK 339,
CA 214 and AU 176. Measured over the 30 days to 11 Nov (`/mnt/project-files/strategy/ebay-site-region-split-2026-11-10.html`):
Australia earned A$72.72, 28% of the site's eBay money, at A$0.41 per daily sweep call against A$0.11 in the US and the EU and
A$0.07 in the UK, and its searches stopped on budget, not on eBay's last page (788 of 2,640 Australian products had a listing).
eBay.de matched 4% of the listings it read. The owner approved the recommended split on 2026-11-10.

- `SWEEP_SHARE` in `src/lib/ebay-sweep.ts` is now a fixed split: **US 912, UK 400, EU 300, AU 274, CA 214** of the default 2,100
  (proportional to a smaller sweep). Product counts no longer decide it. The US keeps the most and is still swept first
  (`MARKETPLACE_ORDER`); what a marketplace leaves unspent still rolls forward to the next by the same shares.
- `MARKET_WEIGHT` is unchanged: it still ranks which fixed and per-product feeds the budget buys first.
- The run cap, the keyset (shared with OP Compare) and the fixed feeds do not change. `tests/ebay-sweep.test.ts` pins the split.
- Recheck about 24 Nov: eBay earnings by tag (dex-au-*, dex-uk-*, dex-eu-*) against the 30 days to 11 Nov, and the job log's
  Sweep table for each marketplace's pages and why it stopped.

## 2026-11-12: front pages feature the dearer products

Owner: "promote the more expensive items, so when users buy them we get more commission". Where the site chooses what to FEATURE (the landing page's five picks and side-rail TCGplayer tiles, the region home's hero cards, deals rail, pre-order grid and TCGplayer strip) it keeps only products at or above US$100 (`FEATURE_MIN_USD_CENTS`, `lib/feature-floor.ts`; other markets through `roughUsdCents`) and puts the dearer first. Real US data of 2026-11-12: median in-stock product $53, top quartile from $140; booster boxes $460, Elite Trainer Boxes $155, Pokémon Center ETBs $250, cases $1,200+; booster bundles $70, tins $42, decks, blisters and packs under $100. So the floor keeps boxes, ETBs, cases and Ultra-Premium Collections and drops the cheap tail. The deals rail ranks by the saving in money, not percent. Cheap products stay listed, searchable and linked from their type and set pages; URLs, titles, metadata, JSON-LD, the sitemap and each product's price-ordered store rows are unchanged, the reference price stays TCGplayer's market, eBay is still never a deal, and no commission rate is read. The landing hero tops up to five picks if fewer clear the floor; the pre-order grid falls back to every pre-order when none does. To change the bar, change the one constant.

## 2026-11-12: a tasteful Christmas layer (owner: "more festive again", after the 8 November tone-down)

On 2026-11-08 the owner had the over-the-top Christmas theme stripped ("the theme must match the domain"); on 2026-11-12 he asked for
it to be more festive again. Accents only, behind the existing season window (1 November to 26 December, the visitor's date, `?season=`):

- **A gift-guide banner** in the landing hero replaces the small gifts pill (`components/season/ChristmasGifts.tsx`): one line of server
  HTML, an inline `currentColor` gift icon, "Christmas gift guide" (not a heading) and, from 2xl, a short subline, linking the EXISTING
  `/us/guides/pokemon-tcg-christmas-gift-guide`. A cranberry-then-pine 3px left edge; the card colours are the site's own.
- **A 3px two-tone hairline** at the top of the page (`body` border, a hard-stop gradient, cranberry then pine), pure CSS, with
  `--xmas-red` and `--xmas-green` tokens that are lighter in the dark theme. The Black Friday strip takes the cranberry token as a left
  edge; the old gifts pill (kept in the shared CSS block) takes the pine one. No new elements.
- **One off switch**: `CHRISTMAS_FESTIVE_LAYER` in `lib/season.ts`. It gates the banner markup and `data-festive` on `<html>`, which the CSS keys
  on. False after New Year removes it; the window closing on 26 December does it anyway. The window logic is unchanged.
- Still absent, and pinned by `tests/christmas.test.ts`: snow, flakes, lights, hats, candy stripes, canvas, animation, palette swaps, pop-ups,
  side rails, images, webfonts, extra requests. No URL, title, meta or heading changed; no `revalidate` touched.


## 2026-11-12: the festive layer is released urgently (owner)

The owner said to deploy the festive layer urgently once every site had it, so this merge carries `[deploy] [urgent]` in its subject: one production build now, instead of waiting for the next release. No other change.

## 2026-11-12: a sign-up people can see (price alert beside the best price, a weekly-drops box on the hubs)

Owner, 2026-11-12: growth has stalled and he wants it fixed with no work from him. Measured the same day: DexCompare had 4,958
visitors in the week to 11 Nov, most of them from Reddit posts, and RiftCompare's alert service counted 0 alerts and 0 weekly
subscribers for this site since alerts launched on 2 Nov. The only sign-up was a text link under the whole price table, 4,237
pixels down a product page. Every visitor has to be won again, so nothing compounds.

- **The price alert moves under the best price.** `PriceAlertForm` gets `prominent`: a real button (`btn-ghost`, a bell) in the
  server HTML right under the best-price card, on in-stock and sold-out products alike ("Email me when a store has it at my
  price" when nothing is in stock). The form still opens in place on a tap, never by itself, and its fields, copy, unticked
  weekly box and privacy line are unchanged. The old link under the table is gone (one form per page). Premium's
  back-in-stock watch stays where it was and stays Premium.
- **A weekly-drops box on the hubs** (`WeeklyDropsBox`): the region home (above the first eBay strip), deals, a set's page (after
  its products), price moves and this week. One email field. It posts `kind: "weekly"` to the alert service: no product, no
  price, no alert; the same double opt-in (one confirmation, nothing else until the click). No heading tag, so each page's
  outline is unchanged; a fixed height in the server HTML, so nothing moves; never a pop-up, never on a product page.
- **Drawn from 14 Nov** (`lib/weekly-box.ts`): the service takes `kind: "weekly"` from RiftCompare's release after 12 Nov, so
  the server leaves the box out until then rather than show a form that would answer with an error.
- **Counted**: `alert_open`, `alert_created` and `weekly_signup` (placement, region) in Web Analytics; RiftCompare's Monday report
  lists alerts and weekly subscribers per site.
- Unchanged: every URL, title, meta, canonical, JSON-LD and heading; no address is stored here; no pop-up.
- Measure on 19 Nov: sign-ups per 100 visitors. If it captures here and on MTG Compare, the other sister sites get the same.

## 2026-11-12: invite-only, raffle and lottery listings are never a price

- **Why**: a visitor reported that most of the cheapest prices were invite-only offers nobody can simply buy.
- **Rule**: `src/lib/invite-only.ts` reads the title, link, tags, description and option names (Shopify) or name, description and link
  (Woo). "Invite only", "by invitation", "request an invite", raffle, lottery, ballot and draw entries are dropped by `priceOf`; the public-data
  reader also drops any such Offer row an older export holds, so it takes effect on the next release without waiting for an import. Rules may only refuse more.
- **Measured in the committed export (85,142 offers)**: 1 row matched (cellysports, CA, a raffle page at C$399.99). Tags and descriptions are
  not kept in the export, so the live importer is what finds the rest; Amazon was already filtered (only IN_STOCK / IN_STOCK_SCARCE listings).

## 2026-11-12: gated releases (GameOn) and Spanish "ES" editions

- GameOn.games (UK) gates its releases behind a "Gatekeeper" (account age, prior order, raffle entry) that the Shopify feed does not mention
  (tag only "Pre-order"): its ETBs showed £49.99 against a £109.99 market and were the UK cheapest. `GATED_RELEASES` in
  `src/lib/invite-only.ts` leaves that store's Pre-order-tagged products out at import, and the reader drops its in-stock rows from older exports.
  Add a store there when its page shows the same gate. Fetching each cheap row's page HTML for gate wording was not done (a request per row).
- A title ending "<box|bundle|display|deck|…> ES" is the Spanish edition (Devastation Store's "Stellar Crown - Booster Box ES" had been
  matched to the English box at US$150 against a US$319.99 median): refused as foreign (8 rows in the export).

## 2026-11-12 — Amazon only where Amazon carries the product (owner)

The owner: no Amazon where Amazon doesn't sell the item (RiftCompare first). `amazonCarries` (lib/amazon.ts) hides the product page's and quick view's Amazon row
for cases and Japanese editions unless the import found a real ASIN.

## 2026-11-12: the page check also refuses gated sales

- Reddit (r/PokemonDealsUK, Delta Reign ETB): several of the UK's cheapest stores sell only by raffle, lottery or after attending shop events, and
  a store's feed cannot say so. `pageStockVerdict` (`src/lib/page-stock-check.ts`), which already opens the page of the cheapest in-stock rows at
  import, now also writes a row as sold out when its page carries gate wording (raffle entry, enter the raffle, sign in to view this release,
  account at least N days old, N prior orders, spent at least £N, invite only, must attend events, GameOn's `gate_keeper` markup). Only wording a gate
  uses counts; a bare "raffle" in a footer does not. Fails open like the rest of the check.
- Not done: comparing a page's own price with the feed's (themes show the default variant, Markets can change the currency; a wrong guess would
  hide good prices). Prices and stock are as fresh as the import, which runs at 08:47 and 20:47 UTC; the page check re-reads the cheapest rows then.
- Also gated by store (`GATED_RELEASES`): Thistle Tavern (tag "<Game> Player": sign in, three event tickets in 56 days) and Obsidia TCG (tag "lottery",
  "allocated via the Lottery System"). On the Delta Reign UK ETB the three cheapest "in stock" rows (GameOn £49.99, Obsidia £54.95, Thistle £58.00)
  were all gated; the first price anyone could pay was £79.95.

## 2026-11-12 — A calmer palette: three colours, three jobs (owner left the design to us)

The owner: "way too much going on … too many colors … I click on the quick view pop up and I see all the colored rows … this is a bit much",
and left the redesign to us. Counted on the US home page and the quick view before the change: 14 competing accents (the gold Premium button, the
blue-to-purple Premium card, the maroon sale strip, violet pre-order cards, eBay-blue and TCGplayer-blue buttons and price tags, a blue-tinted ad
box, green stock pills on every card and row, green, amber and sky-blue row outlines, orange chips, links and motes). The rule now:

- **Orange (`--brand`) is the one thing to press**: the Search button and the best price's button, plus section links. A price table has ONE
  filled orange button. Every other buy button (`.btn-soft`: the other stores, and the pinned eBay, Amazon and TCGplayer rows) is neutral.
- **Green (`--open`) is money**: a saving ("16% below the median", "Save 16%") and the best-price row (`.or-hl`: a raised ground, a 3px green
  edge, the "Best price" badge). Stock is a 6px dot beside grey words (`.sp-*`), not a tinted pill, and nothing pulses.
- **Everything else is neutral.** The row outlines of 2026-11-06 and 11-07 are gone (the classes stay as hooks); the rows keep their order, their
  "Ad" / "Marketplace" tags and every link. Ads (`.ad-box`, `.btn-ad`, the TCGplayer strip, the mini pair) are a dashed neutral box with the
  "Ad" label and an ink-filled button: as easy to see and press as the blue one, without a new hue. Logos (eBay, TCGplayer) keep their colours.
  Premium is the site's own card with a gold star; the pre-order and sale cards are plain cards; the hero's drifting motes are neutral (a click's
  sparks keep the brand colours); the region chip in use is the ink chip.
- **Quick view, phone**: the eBay + TCGplayer mini pair follows the price table below `sm` (it had pushed every store's price off the sheet's
  first screen); from `sm` it still leads. The footer's "See price history and details" is a ghost button, so it no longer outshouts the buy buttons.
- The hero's type chips are one sideways row at every width (they were five wrapped rows on a desktop).
- Unchanged: URLs, titles, metadata, headings, text, JSON-LD and every link in the server HTML; the festive hairline and gift-guide card; the
  headline's accent word. Classes and tokens only, so the light theme follows.
- Measure a week on (19 Nov): outbound clicks per placement (`product-table`, `quickview-table`, the eBay and TCGplayer placements) against the
  week before. If the pinned eBay row's clicks fall, give that row's button the ink fill (`.btn-ad`) before bringing any outline back.

## 2026-11-12: Only eBay and TCGplayer are paid rows

Owner: "we just want eBay and TCGplayer as the paid links at the top. That is why our revenue is declining." The DexCompare sealed
product table's pinned Amazon row now exists only when this build fetched a real Amazon price (`amazonRow` returns null
otherwise). `tests/paid-rows.test.ts` pins it.

## 2026-11-13: The Ultra-Premium Collections (UPC) are a hub, not a guide

UPC searches had no page of their own. A guide shipped first (#201) and the owner asked for a hub, like Rift Compare's hubs: new route
`/<region>/ultra-premium-collections` (the 30th Celebration Day and Night boxes side by side with their photos and store counts, every
curated UPC in stock cheapest first, sold out after, what is inside, a short FAQ, the eBay strip and the US TCGplayer link, no Amazon).
It reads the type page's one capped query and lists only the twelve curated names (`UPC_NAMES`), never a store-noise duplicate. The
guide URL 301s to the hub (`next.config.js`) and the guide is gone from the registry. Own share card `/og/upc` (the two box photos in
`public/upc/`, TCGplayer's, saved once; no price on it, since Reddit and X freeze the image). The only outside facts are the 30th
Celebration's release date, US list price and contents, attributed to ICv2 and Cardlines; no aftermarket multiple is quoted. The type
page stays (it lists everything of the type); the hub is the curated landing page. Measure Search Console impressions for "pokemon upc"
and clicks on the hub a week on (20 Nov).

## 2026-11-13: one horizontal in-page ad block in place of the side rails

Owner: with the side rails off (the side rails were switched off earlier on 2026-11-13), replace them with ONE bigger, subtler, horizontal ad block inside the page that looks native: the site's own
dashed `.ad-box`, a small "Ad" pill, six larger tiles (172px pictures, the logo word, two title lines, price and "View"), eBay's and TCGplayer's taking
turns, eBay first, scrolling sideways when the column is narrower (`.scroller`). No pop-up, nothing fixed, no side space.

- **Where, once a page** (`components/InlineAds.tsx`): the region home between sections (where the TCGplayer strip was), below a product page's "More
  from <set>" and below a set page's grid, never beside a buy button or above a price; every other region page gets it from the layout directly above
  the footer. The pre-footer eBay strip, the pre-footer TCGplayer strip and `TcgplayerStrip` are gone (replaced, so a page has one such block). The
  page's own eBay strips, the quick view's mini pair and the in-feed tiles are unchanged; the in-feed tiles still start past the 6th listing.
- **Browser only, CLS 0:** the server HTML holds an empty box of the block's height; tiles are fetched (the sealed feed the strips share, CDN-cached) and
  drawn when it nears the viewport; under three tiles the box is removed. The phone dock stays and yields to the block (`[data-ad]`).
- **Paid links:** eBay and TCGplayer only (no Amazon in the block); `rel` sponsored; placements `listings-inline` and `tcgplayer-strip-inline` (the side
  placements are removed). Never a store row, best price, deal or alert. `tests/side-ads.test.ts` pins it. The rail code (`SIDE_RAILS`, the two rails) is deleted.

## 2026-11-13: A bot on /go is sent on unrecorded and untagged

Found while checking why earnings fell: Vercel shows 30,819 `go_click` events for 6 to 12 November against 3,990 the week before
(about 500 a day until 9 November, then 3,740, 12,436 and 12,018 on 10, 11 and 12 November), nearly all `product-table`, from more
"devices" than the site had visitors. A crawler that ignores robots.txt and sends a browser's User-Agent was opening every /go link;
the same days Impact counted thousands of TCGplayer clicks with no sales on the card sites. The old check in `src/app/go/route.ts`
only looked for "bot" in the User-Agent. `/go` now uses the card sites' rule (`src/lib/bot-click.ts` `looksLikeBot`: no User-Agent,
a crawler's name, no Accept-Language or no Sec-Fetch-Mode): such a request is still redirected, but no event is recorded and a
TCGplayer link goes to TCGplayer's own page instead of our Impact link (`untaggedDest`), so the network never counts it as our
click. The rule may only mark obvious bots; a person is never refused a link. `tests/click-events.test.ts` pins it. Check after the
next release that `go_click` is back near `buy_click`'s TCGplayer and store count.

## 2026-11-13: the price alert button is in the quick view too

Measured 6–12 Nov: 2,735 of 5,092 buy clicks started in the quick view (`quickview-table`), against about 1,000 from the product page, and the "Email me when the price drops" button (2026-11-12) was on the product page only; it had no taps in its first day and a half. Most visitors compare in the panel and never open the page. The quick route now sends `alert` (the service's site key, the product id, the region's lowest in-stock store price and its market) and `QuickView` draws the same `PriceAlertForm` above its footer link: a button, the form opens in place on a tap, never by itself (no pop-up inside the pop-up). A response the CDN kept from before has no `alert` and draws nothing. `QuickView` takes the site key from the route, never from `lib/alert-feed.ts`, which reads files. `tests/quick-view-alert.test.ts`.

## 2026-11-13: the home pages are trimmed: no Premium promo, no "how it works", no guides list; ten products

Owner: "get rid of Dex Compare Premium from the homepage. No point crowding all the spot on the homepage … how it works as well … the guides,
we probably don't need that as well … fill it with more actual product details."

- **Landing page** (`app/(site)/page.tsx`): the Premium slides, the "how DexCompare ranks stores / How it works" paragraph and the "New Pokémon TCG
  set guides" list are gone. "Most stocked in <region> today" is ten products, two rows of five (ten rows on a phone), from the same pool
  (`lib/picks.ts` `PICK_SLOTS`, the region's newest in-stock booster boxes and Elite Trainer Boxes, up to sixteen); the second row's photos load
  lazily. The hero, the hot buttons and "Popular right now" stay.
- **Region homes** (`app/[region]/page.tsx`): the Premium slides, the "New Pokémon set guides" section and "How DexCompare works" are gone; the
  product rails, deals, latest sets, the market report, the set index, the summary and the FAQ stay.
- **Nothing is deleted from the site.** Premium stays live at `/premium` (header, account menu, product pages), how it works is on `/about`, and
  the guides are on each region's guides index, linked from the header, the sidebar and the landing page's "Buying guides" button. This reverses
  the 2026-11-03 "newest guides one hop from the landing page" link block; the guides stay in the sitemap.

URLs, titles, metadata, h1s and JSON-LD are unchanged. Released with `[deploy] [urgent]` in the merge subject, as the owner asked.

## 2026-11-13: the minimal look: one navigation, a hero of words and a search, products first

Owner: "we're making things too complicated, and before it was simplicity that was driving it … get rid of the products on the hero …
cull the features that we show and all the display aesthetics … we can be minimalistic, dynamic, aesthetic and smooth without having
everything there", and of the ads, "I don't know if it's best practice". A review of every page type, then this. It builds on the trim
above (same day) and reverses the 2026-11-08 featured cards in the hero.

- **One navigation.** The desktop sidebar (`SideNav.tsx`, deleted) repeated the header's menus down the left of every page. The header is
  the site's only navigation now: five sections (Deals, All sealed, Sets, Pokémon, Guides), each with its menu, the search with the row's
  spare room, Premium, region, cart. Stores and the weekly chart moved into the Guides menu, both sale pages lead the Deals menu in
  season, and the All sealed menu lists eight sets (as the phone menu does), so no page lost a site-wide link: compared link by link on 28
  pages, only home-only blocks' links left the three region homes. eBay's sponsored link is out of the header: no ad in the navigation.
  The page is one centred column, 1200px (`max-w-page`; it was 1440px beside a 240px sidebar).
- **The hero has no product, on the landing page and on every region home** (`components/home/Hero.tsx`): the same h1, one line under it,
  the search, the region row and six ways in (booster boxes, ETBs, bundles, pre-orders, deals, all sets), centred, on a ground of two
  CSS gradients. The open pre-order hub is its one pill. `HeroCards`, `SoftHeroCards`, `HeroSparks`, `HypeNow` and `CreatorsCornerBadge` are
  deleted, not hidden.
- **A region home was twenty blocks, one after another; it is six.** The hero; ONE shelf, "In stock today", whose lists (booster boxes,
  Elite Trainer Boxes, deals, pre-orders) sit behind tabs (`Tabs.tsx`: every panel is server-rendered and stays in the HTML, a tab only
  chooses which shows, no request); the latest sets; the weekly email; the page's one ad block; then the reading matter (this week's
  prices, the seven regions compared, every set, today's summary) as closed `<details>` with their `<h2>` in the summary (`Fold.tsx`),
  with the questions and the other TCGs under it. Gone from the page, each still one click away: the creators badge (Guides menu,
  footer), the type chips (All sealed menu), the pre-order and sale cards (the hero's pill; the strip under the header), the hype buttons
  (Pokémon menu), both eBay strips, the older-sets rows (Deals menu, "Older sets in stock") and the reviews row (the footer's).
- **List pages show products first.** A type page's intro, facts table and summary, and a set page's sentence, per-pack strip and summary,
  sat between the headline and the grid; they are under it now (folds, or the page's "About"). The set header lost its box.
- **The product card** is the photo, the name, one stock line ("In stock · 12 stores") and the price, with the per-pack price beside it
  and at most one badge on the photo (−N% under the median, else "Below MSRP"). No frame, type pill, series line, second stock line or
  "Compare N prices" cue. It is still one link with the same `data-qv*`, so the quick view and its buy rows are untouched, and so is the
  product page (the page that earns) apart from the missing sidebar.
- **Ads: the trade-off.** A page keeps ONE in-page block under what the visitor came for, the list pages' in-grid strip and the phone
  dock. The header link and the region home's two strips are gone. Measured before deciding: rails and banners had 163 eBay clicks and no
  sale in the week to 12 November; the earnings come from the product page's and the quick view's rows, which did not change. Recheck
  clicks and earnings per placement on 19 November; if the home's strips earned, one comes back under the shelf.
- **Motion is CSS only** (`globals.css`, "Motion."): the hero's parts rise in turn on load (the h1 moves 10px but is never transparent, so
  the largest paint is not held back), sections rise as they scroll in only where the browser ties it to the scroll position
  (`animation-timeline: view()`), tabs and folds fade in, the header takes its line once the page moves under it. Transforms and opacity
  only, nothing in the layout moves, all of it off for `prefers-reduced-motion`. No animation library, no scroll listener, no observer.
- **Found on the way, and fixed: every region page was wider than a phone's screen.** A visually hidden label inside a sideways scroller
  that is not positioned is not clipped by it and counts toward the page's width. On a 390px phone the layout was 962px wide on every
  region page once the ad block's tiles loaded, and 658px on a product page from its first paint, so the page slid sideways and the buy
  bar's and the dock's buttons were off the screen. `:where(.scroller, .overflow-x-auto, .overflow-x-scroll) { position: relative }`:
  390px on every page now. The other sites using this block have the same fault (a separate thread has them).
- **Measured, old build against new, same data** (US region; phone 390px, desktop 1440px): the region home's page height 24,409px →
  6,539px on a phone and 13,588px → 4,464px on a desktop; its HTML 450,857 → 364,046 bytes, elements 2,121 → 1,639, links 427 → 350,
  first-load JS 155 → 139 kB. Landing page: 4,755px → 3,904px on a phone, 165,028 → 138,938 bytes, 895 → 714 elements. A type page 1,916
  → 1,604 elements, a set page 1,347 → 1,180, the product page 2,512 → 2,376 (its JS unchanged at 145 kB).
- `tests/minimal-look.test.ts` pins the hero (no product, no ad, no script), the shelf (every panel in the HTML), the folds, the region
  home's order and outline, one h1, valid JSON-LD, and the motion rules; `shell`, `shop-menu`, `black-friday`, `side-ads`, `hot-ui`, `geo`
  and `base-components` are updated for the new markup. MTG Compare and YGO Compare take the same look the same day.

URLs, titles, metadata, h1s and JSON-LD are unchanged (compared field by field on 28 pages against the build before). Released with
`[deploy] [urgent]` in the merge subject, as the owner asked.

## 2026-11-13: "+ I own this" has its padding: the collection's button and link carry their class's weight

Found while checking the minimal look, old build against new (Lighthouse, then a walk of the product page). The redesign changed
nothing here: the fault is as old as the collection. `vault.css` wrote the button as `:where(.ce-vault-btn)`, which weighs nothing,
and Tailwind's preflight styles a bare `<button>` (padding 0, the parent's size and weight) and a bare `<a>` (the parent's colour):
one element out-weighs a `:where()`. So "+ I own this" and "Share my collection" drew with no padding, their words against the
border, at 16px and weight 400 where the file asks for 14.4px, 14px and 700, and "See my collection →" was the text's colour, not
the accent. The two rules are written with their class now (`.ce-vault-btn`, `.ce-vault-link`). Measured on a fresh build: the
button is 111.8×40px with 14.4px of padding (it was 91.2×40px with none), and the link is the accent, which reads at 4.5:1 or
better on the page's ground in both themes.

`tests/vault.test.ts` reads the reset from `tailwindcss` itself and the elements from the components' markup, and fails on any
`:where()` rule in `vault.css` that the reset beats (six lines on the old file). `cart.css` is written the same way and is left
alone: its add button is an icon, where the lost padding and size show nothing, and its class's weight would out-rank the
`text-muted` the price rows put on it. MTG Compare and YGO Compare took the same fix the same day; the file is also on Gundam, Bandai, Lorcana,
Cyberpunk and SportsCardCompare, which this change did not touch (reported). No deploy marker: it rides the next release.

## 2026-11-14: A/B tests in the quick view: three 50/50 splits, 20 November to 3 December

The owner (2026-11-14): "we need to do some A/B testing to determine what is the best way for us to earn more revenue". Measured
first, 7-13 November: 4,790 visitors, 4,595 buy clicks, 2,437 of them (53%) inside the quick view; TCGplayer 485 clicks, eBay 640,
Amazon 293, and about two in three clicks to stores with no programme. TCGplayer earned A$0.73 a click here and eBay A$0.13 (30
days to 11 November).

**Where: the quick view only** (`src/lib/ab.ts`, `src/lib/ab-client.tsx`). The panel is drawn in the browser after a tap and is
in no page's server HTML, so a split there needs no cookie on the server, no second URL and no cache key, and changes nothing a
crawler reads: every page, title, link and price in the HTML is the same for everyone. The product page's own table always draws
the control (`tests/ab.test.ts` fails if a page starts a test). The visitor's three coin tosses live in their own `localStorage`
(`ab1`); a browser that keeps nothing is left out.

**The three tests**, independent, each 50/50:

- `order` (US only, where TCGplayer's row is a real US$ offer): eBay's row then TCGplayer's (the control, the owner's order of
  2026-11-06), against TCGplayer's priced row first, eBay's under it. Both stay pinned above the stores; "Best price" and the
  stores' order do not move.
- `mini` (phones only): the small eBay + TCGplayer pair under the price rows (the control, since the calm palette of
  2026-11-12), against above them, as on a desktop.
- `cta` (everyone): TCGplayer's priced row's button says "View deal" (the control), against "Buy now". "View on TCGplayer" was
  tried and dropped before it shipped: the wider button cut the store's name to "TC…" on a 390px phone.

**What is counted.** `ab_seen` once a visit when a quick view shows its prices, then, once a visit each, `ab_paid` (a click on
any link that pays) and the kind of link: `ab_tcg`, `ab_ebay`, `ab_amazon`, `ab_store`, `ab_mini_tcg`, `ab_mini_ebay`. One
property, `k` = `<region>:<order><mini><cta>` (`us:ab-`; `-` where a test does not apply to the visit), because Vercel keeps two
properties and its API cannot cross them. Counts are visits, so each result is a share of the visits that saw. `buy_click` is
unchanged and still counts every click.

**Fixed dates, decided before any number is seen.** Nothing is split or sent before 20 November 00:00 UTC, so the 19 November
rechecks of the 12-13 November redesigns read an untouched site, and nothing from 4 December 00:00 UTC: fourteen whole days, two
of each weekday, Black Friday inside both arms alike. No stopping early on a good-looking day. The read: `order` and `cta` on the
share of visits with a TCGplayer click, `mini` on the share with any paid click, two-sided two-proportion test, p under 0.05; for
`order` the eBay clicks lost are set against the TCGplayer clicks won at each network's own earnings per click for the fortnight.
A test that does not reach p under 0.05 keeps the control. RiftCompare's earnings refresh reads the events for DexCompare and MTG
Compare (its `lib/earnings/ab-test.ts`) and the Monday report and Empire HQ show them. A winner ships as an ordinary change to
every visitor, then to the other card sites. No deploy marker: it rides the next release, well before the 20th.

Not tested, on purpose: the price alert button (its own recheck is 19 November), anything that hides, delays or re-ranks a store's
price, a pop-up, and Amazon without a price. YGO Compare (362 visitors, 74 buy clicks that week) is too small to split.

## 2026-11-14: A polish pass: focus rings, chips, the empty search, the phone menu's title, an empty price history

The owner asked for the sites to look better and feel friendlier, without review. The pages were walked as a first-time visitor on a
390px phone and at 1440px, in both themes (home, a region home, the full list, a set, an in-stock and a sold-out product, a search
with and without results, the 404, the phone menu), with the page width, tap targets and text contrast measured by script. No page
was wider than the phone and no text was under 4.5:1 in either theme (only the eBay and TCGplayer marks' own letters are, and they
are logos). What was found and changed:

- **The focus ring squared every pill.** `:focus-visible` set `border-radius: 6px` after the utilities, so a keyboard turned each
  round button, chip and search box into a 6px rectangle for as long as it was focused (measured: 9999px to 6px). The ring now
  follows the element's own corners; a bare text link keeps the soft 6px through a `:where()` rule that weighs nothing.
- **Chips.** `.chip` is a 20px radius instead of 9999px: a one-line chip is the same pill, and a chip whose words wrap on a phone
  (a guide's whole title under "Keep exploring") is a soft rectangle, not a stretched lozenge. On a touch screen a chip is 40px
  tall (the set and type chips were 32px); a mouse keeps the compact row. Chips, the hero's ways in and the set tiles give a
  little under a press (a transform, off for reduced motion).
- **A search that finds nothing** said "Nothing matches those filters. Try fewer words, another set, or every type." to someone
  who typed a word and used no filter, with "Clear filters" twice, a thumb apart. It now names the search ("We couldn't find
  "zzqqxx"."), says what to try in one line, has one clear button ("Clear the search" when nothing else is set) and, under the
  eBay unit, three pages every region has (sets, deals, releases: the header's own links). The eBay unit is the same markup in
  the same place (the count row keeps its 44px; the two lines above it are one line each, as before).
- **The phone menu's title** read "DexCompare Unite…". It is the flag and the region's name now, never cut; the mark beside it
  says whose menu it is.
- **"Price history" over nothing.** A product with a month of snapshots but under two days in stock drew the heading and no
  chart. The chart's place now says so in one line (how many snapshots, that no store had it in stock, that the history starts
  when it is back). Under `MIN_DAYS` there is still no section at all. The h2 is where it was.
- **The best-price card's last line** began mid-sentence ("up to $160.99 — you save …"). It reads "Stores ask up to $160.99 —
  you save …"; the figures are the same.
- **Small things.** The region hero's line of facts breaks where we choose on a phone (the second dot ended the first line on
  its own); the hero's pill and Christmas line are 40px targets (29px); a section's "See all →" is a 40px target without moving;
  the list's Set and Sort selects have their own chevron, set in from the pill's curve; a disabled button shows it.

**Not changed, on purpose.** No paid link, ad block, pinned eBay / TCGplayer / Amazon row, affiliate tag or placement name was
added, removed, moved, reordered, restyled or reworded, and the quick view and its A/B tests (`lib/ab.ts`) were not touched: the
price rows' classes (`.or-*`), which the quick view shares, are as they were. No URL, redirect, title, description, canonical,
robots, Open Graph, JSON-LD, h1 or h2 changed: fifteen pages' server HTML were compared field by field against the build before,
with every `rel="sponsored"` link and every price row byte for byte the same. So the 19 November recheck of clicks per placement
reads the same placements as last week. No new colour, block, font, library or client script.

**Seen and left** (reported to the owner): on a 390px phone a price row cuts the store's name ("Larry'…") and its per-pack and
shipping notes ("≈ $… + $14…") because the button's column sets the width of the name's; fixing it re-lays the rows the quick
view's tests run in, so it waits for 4 December. The store thumbs are 20×16px (the owner's call, 2026-11-13). A product URL that
404s is drawn by Next's error shell without the theme script, so a visitor who chose the light theme sees that one page dark.

`tests/polish.test.ts` pins the focus rule, the chip, the empty search, the chart's line and the menu's title. No deploy marker:
it rides the next release.

## 2026-11-14: Indexing round: the product page reads every store, Pokémon hubs get words, products link their neighbours

Search Console still calls the hubs "Crawled, currently not indexed", and on 14 November 2 of 20 sampled sitemap URLs were indexed.
Measured before choosing, on a local production build of today's data and a crawl of all 1,842 sitemap URLs: every URL answers 200,
none is noindex, every canonical is its own, hreflang is reciprocal, and there is one h1 a page. The 10 November work holds: a type
hub is 367 KB with 2,600 characters of prose, a set hub 315 KB with 3,000, a product page 424 KB with 4,800 and a Product +
AggregateOffer block. Three things were still wrong.

- **The product page lost stores, and sometimes the cheapest one.** `productPage` (`lib/data.ts`) read `take: 80` offers with no
  order. 89 product pages (US and Canada's most-stocked boxes, ETBs and bundles, the top of the sitemap) have more than 80 listings,
  up to 136, so each kept 80 arbitrary stores: 1,126 in-stock rows were missing, and on 23 pages the cheapest in-stock store was
  one of them. Delta Reign Booster Box said "from $169.97 at 58 US stores" in its title, best price, quick view and JSON-LD while
  its hub card and its own FAQ said $168.99 and 73 stores; Chaos Rising ETB said $66.99 against $49.99. The read is now ordered (in
  stock first, cheapest first) before a cap of 200 (`PRODUCT_OFFERS_TAKE`), so every store is a row and the page agrees with the
  import's counts. `setOfferGroups` (the pre-order pages, 40 a product) is ordered the same way. The cost: those 89 pages grow by
  about 1.4 KB a store (lean rows); the heaviest went from 435 KB to 509 KB, the median product page from 349 KB to 355 KB. The
  quick view, the share image and the widget read the same loader and are right now too; nothing in the quick view's own code,
  its paid rows or `lib/ab.ts` changed. `tests/product-offers-cap.test.ts`.
- **The Pokémon hubs were the thinnest pages in the sitemap**: 146 listed, a median of 171 characters of prose. They carry the type
  hubs' data-built summary and questions now (`hubSummary`, with its FAQPage markup), in a fold under the products: 1,900
  characters at the median, different in each region. The index page says how many Pokémon it lists and which have the most
  products. The 3-product rule and the titles are unchanged. `tests/pokemon-hubs.test.ts`.
- **Product pages were weakly linked.** 339 of the 850 listed product pages had five or fewer sitemap pages linking them, 133 had
  three or fewer: a type hub shows its 48 cheapest, and "More from <set>" is the same set again. "Other <type> in <region>"
  (`lib/type-neighbours.ts`) puts a type's in-stock, indexable products in one fixed order (release date, then slug) and links
  the three on either side (at either end the window slides inward, so the newest box never links a 2014 one), so each is linked
  from six other product pages, three at the two ends, instead of every page linking the newest sets. Plain links with the import's lowest price and store count, no photos, about 2.5 KB; on an in-stock product with no set
  the links sit under the existing "More <type>" rail. After: 107 pages with five or fewer, 32 with three or fewer, the median
  7 to 11 (counting sitemap pages only). `tests/type-neighbours.test.ts`.

Looked at and left: the sitemap's `lastmod` is the import time on every data page (the data files carry no per-product change
time, and the prices do change with each import); guides share a title across the four indexed regions (hreflang covers it); the
intro counts store rows (108) where the FAQ counts the import's deduplicated stores (104). URLs, titles' wording, canonicals,
hreflang and the sitemap are unchanged. The 19 November recheck of clicks per placement will read product pages with these two
additions; the A/B tests (from 20 November) see the same rows in both arms. No deploy marker: it rides the next release.

## 2026-11-14: Inner pages speak the home page's language

The owner asked for every page, not only the home page, to look as calm and finished. One shared set of classes in `globals.css`
("Inner pages") now draws every non-home page, and the pages use it instead of their own one-off sizes and colours.

- **Page header, everywhere.** One headline size (`.ph-h1`, the hero's voice a step down; `.ph-h1-sm` for a product's long name),
  one line under it (`.ph-lede`), one line of facts (`.ph-meta`). Used by about, the legal pages, guides and their index, sets,
  releases, stores, tools, deals and the sale pages, the Pokémon hubs, the weekly chart, the 404 and the error page.
- **Sections** use the home shelf's heading (`.sec-h2`, `.sub-h2`) in place of six hand-written heading sizes.
- **Calm palette on inner pages.** The purple pre-order fills, the green stock-count bars and numbers on the store list, the
  red pack badges in guides and the green tint behind the product's value line are neutral now; green stays for money, the brand
  colour for the thing to press. Links drawn as tiles (`.tile`) lift slightly on hover (transform only, 200 ms, off under reduced
  motion); asides are a neutral hairline box (`.note`); small labels are the neutral `.tag`.
- **Reading pages.** `.prose-dex` has a 68-character measure, 16/17px text, a clear h2/h3 step, quiet list markers, and tables that
  scroll inside their own box. The product page's "About" uses it, and its questions fold into the same `details` rows as the hubs'
  (the answers stay in the server HTML).
- **Guide cards** take the product card's shape (picture on its plate, words on the page's ground); the 404 offers its ways on as
  chips and a wider search.

**Not changed, on purpose.** No paid link, ad block, pinned eBay / TCGplayer / Amazon row, affiliate tag or placement name was
added, removed, moved, reordered or reworded, and the quick view (A/B test from 20 November) was not touched. No URL, title,
description, canonical, robots, Open Graph, JSON-LD, h1 or h2 changed: 17 pages' server HTML were compared against `main` (title,
meta, canonical and hreflang, JSON-LD, h1/h2, the set of internal links, every `rel="sponsored"` link with its words, every
word of text) and are identical. So the 19 November recheck of clicks per placement is unaffected. No new colour, font, library
or client script; no revalidate or data read changed. No deploy marker: it rides the next release.

## 2026-11-14: Paid ad visits tag their affiliate clicks (`fbad`)

Owner: "with the ads, we got to make sure that we keep track to see if they actually are giving us ROI." The A$35 Meta
test (14-21 Nov, US) sends visitors with `utm_source=facebook&utm_medium=paid&utm_campaign=dex-test-2026-11`. A sale
carries back only its click's sub-id, so `lib/paid-visit.ts` (the same file as RiftCompare's and the card engine's)
remembers a paid landing for the tab and adds `-fbad` to the `customid` / `sharedid` / `subId1` / `ascsubtag` of every
affiliate link that visitor opens; only the value is edited, the rest of the URL stays byte for byte. Organic visits
are untouched. RiftCompare's earnings dashboard ("Ad tests") sums the `dex-…-fbad` sales against the ad's spend.
`SiteAnalytics` now keeps `utm_source`, `utm_medium` and `utm_campaign` (nothing else) so Vercel can count the ad's
visitors; search text is still dropped.

## 2026-11-14: The price rows' cart button says "Add to cart"

The owner, opening the price rows: "there needs to be an add to cart button ... right now, it just sends it to the site". The
cart button was already on every store row, but as a bare grey cart icon on a computer (lost on the tinted best-price row) and
as small coloured text on a phone, so it read as decoration. `CartAddButton` now carries its words by default ("Add to cart",
"In cart" once added; "Add" beside the icon below 640px where a row has no room), with a firmer neutral border, and the phone's
text button (`inline`) is drawn as a bordered button (`cart.css`). Neutral, never a new colour: the buy button stays the one
filled action and the calm three-colour rule holds. Nothing else moved: which rows can be added (open store rows, eBay and
Amazon with a live price; never a marketplace or a search row), the line's buy link and its affiliate tag, the row order, the
buy button and every placement are unchanged. A caller can still ask for the bare icon (`label={false}`).

The quick view gets the same labelled button (owner, 2026-11-14: "there needs to be [one] on the quick view pop-ups"),
over the A/B freeze on his say-so. Its tests (20 November to 3 December) start after this ships and the button is the same in
every arm, so the arms still differ only in what each test changes; the paid rows' order and wording are untouched.

### 2026-11-14 — On a phone, a price row's two buttons get their own line

With "Add to cart" beside the store's button, a phone row's second column took the store's name down to one letter ("T  BEST
PRICE" on the cheapest row). Below 640px a full row is now name and stock, price, host, then the cart button and the store's
button side by side at full width (`globals.css`, after `.or-act`). The name keeps the whole row and the cart button says "Add to
cart" in full. Lean rows, the order of rows and every paid row's wording are unchanged.

## 2026-11-14: Inner-page redesign reviewed; the creators page and the two shared store pages join it

An independent review of today's design work (#214 polish, #216 inner pages) against a build of the commit before it
(62165d2), at 390x844 and 1440x900 in dark and light: 23 URLs' server HTML (every page type, three product pages, 404)
kept their title, meta description, robots, canonical, hreflang, Open Graph, JSON-LD, h1, h2s, internal links and words;
the only differences are #215's (every store read, so store counts, new "Other <type>" links and the Pokémon hub FAQ).
14 page types in both themes: no horizontal overflow, no layout shift over 0.01, no console or hydration errors, focus
visible, no new text under 4.5:1 (the TCGplayer logo's blue word was under it before too), and the hover lift is off under
reduced motion. Sitemap (1,842 URLs, a 60-URL sample all 200 and indexable), robots.txt and the 404 status are sound.

What this entry changes, the pages #216 left in their old look:

- `/creators`: the hero is the inner pages' header (eyebrow, `ph-h1`, `ph-lede`, the same two buttons) instead of a framed
  box with blurred brand and spark blobs and three tilted gradient placeholder cards; "love" is no longer brand-coloured
  (the brand colour is for what is pressed); the tipping box is a `note` with a neutral icon instead of a spark gradient;
  the open-spot tiles' icon is neutral and their hover no longer tints; "Option N" labels are plain eyebrows; section
  headings use `sec-h2` / `sub-h2`.
- `/how-we-pick-stores` and `/list-your-store`: the page draws the h1 (same words) through `.prose-dex h1`, and the shared
  component, which every Compare Empire repo carries byte for byte, is called with its own `showTitle={false}` instead
  of drawing a hand-sized inline h1. The component file is unchanged.
- `.gc-thumb` (guide cards) moves in 200 ms, not 300, inside the 120 to 220 ms motion rule.

No paid link, ad block, placement name, affiliate tag, row order, URL, redirect, title, meta description, canonical,
robots, Open Graph or JSON-LD changed, and the quick view is untouched, so the 19 November clicks-per-placement recheck is
unaffected. Premium and sign-in keep their look (Premium is a sales page; changing it is the owner's call).

## 2026-11-14: the one ad block moves up under the shelf

Owner: eBay clicks dropped right after the minimal redesign and he asked for eBay ads back on the home page. The home pages' one native ad block (eBay and TCGplayer, labelled Ad) had been pushed to the very bottom, under the sets, and the landing page had none; the landing page now draws it (in the visitor's region) under its products. It now sits directly under the product shelf. Still one block a page, still browser-only with its height reserved, no pop-up, no rail, quick view untouched, same placements and customid tags. Click numbers by placement were not readable from the build container; the 19 November recheck stands.

## 2026-11-15: /go counts only a click made on our own pages

The 13 Nov guard cut the crawler's go_clicks from about 12,000 a day to 2,835 on 14 Nov, but that is still more devices clicking (1,381) than the site had visitors (632): 2,383 of the clicks were Chrome on a Mac, spread across the US, Germany, France, Brazil, Singapore, India and Hong Kong, about one per store. It now sends a full browser's headers, so `looksLikeBot` also reads `Sec-Fetch-Site`: a `/go` link exists only on our own pages (no email, feed or widget carries one), so a person's click is `same-origin`, while a collected URL opened directly is `none` and one followed from elsewhere `cross-site`. Those are sent on unrecorded and untagged, as before; an absent header changes nothing. If a crawler ever drives real clicks inside a page this will not catch it; the measure is go_click devices against visitors.

## 2026-11-16: Dex Premium gets real value: no banner ads, a year of collection history, a spreadsheet export

Owner: Dex Premium "had nothing". It held back-in-stock alerts, 200 alerts and a watch list, and said it removed no ads. Members now also get: no banner ads (the inline eBay/TCGplayer strips and the phone dock; `html[data-adfree]`, set before first paint from the cached membership and re-checked hourly by `AdFreeSync`), a 365-day collection value history with a line (free keeps 60 days), and a CSV export of the collection. All client-side, no new backend, no cost. Rules kept: the cheapest price and the store order never change, price tables and their paid rows stay (so the 20 Nov to 3 Dec quick-view A/B is untouched), no pop-up (the free collection page shows one inline line linking /premium), one CDN copy of every page.

## 2026-11-16: An all-nines placeholder price is not "in stock" (Data Quality audit)

Audit of the committed public data (offers.json, 16 Nov): 24 in-stock store rows sat at US$999.99 or US$9,999 (a store hiding a product it cannot sell: a A$9,999 Battle Partners booster box next to A$155 ones; MTG Compare has the same 24). The existing high-outlier rule skips types and old sets on purpose (out-of-print boxes really do ask 3x), so these survived. `demotePlaceholderPrices` (importer.ts) writes a store row at 99999, 999999 or 9999999 cents as sold out when the market median is under a third of it, or, with no median, when it is US$9,999.99 or more. The row and its price stay on the page, as sold out. It runs before `dropLowOutliers`, so later medians no longer count it. A real ask near the market's, or a lone US$999.99, is kept. Not touched: the rows from stores unread for 72 hours, which the page already shows as "Not checked recently" (6 stores on Dex, 6 on MTG on 16 Nov).

## 2026-11-16: Rows test: does listing every store bury the clicks that pay? (Logical / business strategy team)

Question (owner): the more stores we list, the fewer people may click our paid links, so store count could cost money. Evidence so far is only correlational: Dex buy clicks to payers (eBay, TCGplayer, Amazon) were 23%, 29%, 28%, 29% in the four Sydney weeks to 15 Nov (Vercel `buy_click` retailer values, matched by name), and by market the long-store-list markets (UK, CA) show the lowest payer share, but those markets also have no priced TCGplayer or Amazon row, so nothing can be concluded without a test. Since 2026-10-24 (owner: "I want it to be all there visible") every store row is drawn (`VISIBLE_ROWS` 1000).

Test (`lib/rows-test.ts`, `rows-test-client.tsx`, `tests/rows-test.test.ts`): on the PRODUCT PAGE's price table only, 20 Nov to 18 Dec (moved from 17 Nov so the 19 Nov rechecks read an untouched site), 50/50 by a coin in localStorage `rt1`. A: every row (today). B: the pinned rows (eBay, Amazon, TCGplayer) and the cheapest five stores; the rest behind the table's own "Show N more stores" row, one tap away. Only tables with nine or more stores are in the test, so every visit counted could have seen a difference. Cheapest price, order, wording and every pinned row are untouched. The server HTML is the control for everyone; arm B collapses after the page runs (no cloaking). Never the quick view (its tests run 20 Nov to 3 Dec) and never the pre-order page.

Events, one property `k` = `<region>:<arm>`, each once a visit: `rt_seen`, `rt_paid`, `rt_store`, `rt_more`. Primary: rt_paid / rt_seen. Guardrail: (rt_paid + rt_store) / rt_seen must not fall, because affiliate stores pay too. Decide at p < 0.05 two-sided after the full four weeks, never early; no verdict = A stays. Revert B if guardrail visits fall more than 5% with p < 0.1. No spend, no deploy marker: it rides the next release.


## 2026-11-16: A small unpriced "Also on Amazon" link under the product table

The 2026-11-12 rule (Amazon row only with a real price) took Amazon buy clicks from about 40 a day on Dex (about 100 across the sites) to
zero on 13 Nov, and Amazon earnings with them (US$7-12 a day at the 7-12 Nov rate). Not a row: one line under the product page's price table,
"Also on Amazon", only where Amazon sells the item (a known ASIN, else a type Amazon carries), unpriced and labelled paid, hidden when the
priced row shows. Never the quick view (A/B window 20 Nov-3 Dec), never pinned, best, a deal or an alert; the shared region tag, placement
`amazon-below-table`. Read clicks per day against 7-12 Nov. `tests/paid-rows.test.ts` pins it.

## 2026-11-17: "Check on Amazon" is a row again, an ordinary last one

Owner: "I don't really see any Amazon prices on DexCompare or any of our other sites... even if there are no Amazon prices available,
we should have an option to check on Amazon in our price rows." The priced-only rule (2026-11-12) had left the product page with no
Amazon at all, and the 2026-11-16 line under the table was too quiet. Now `amazonRow` returns the unpriced search row (the item's own
page where an ASIN is known, else a search) whenever the region has an Amazon tag and the type is one Amazon carries: an ordinary row
at the END of the list, on the product page AND the quick view (before the A/B freeze of 20 Nov, so the baseline includes it), labelled
"Check on Amazon", affiliate-tagged with the shared region tag, never pinned above the stores, never ranked, never the best price. A
priced Amazon row still pins as before. The separate below-table line is removed (it would duplicate the row). Read Amazon clicks per
day against the 7-12 Nov baseline of about 100 a day.
## 2026-11-16: Dex Premium funnel events, and what the first six days showed

Read from RiftCompare admin (Accounts, DexCompare tab) on 16 Nov, six days after launch: 0 members signed in via Dex, 0 trials, 0 paid, 2 alert emails (price alerts, not Premium). Dex Premium had no event tracking, so page views and button clicks were unknowable. Added GA4 events (`premium_corner_click`, `premium_view`, `premium_trial_click`, `premium_checkout_open`; `trackPremium`) so the next read has a funnel. Verdict for now: keep (no running cost, shared Rift account and Stripe plans), do not build more until `premium_view` shows how many people reach the page.

## 2026-11-17: booster packs on the region home

Owner: the front page "feels like it's just the booster boxes". The shelf gains a "Booster packs" tab (loose and sleeved packs taking
turns, newest set first, up to eight, each at its own per-pack price; `homeRails().packs`), and the hero's fourth way in is "Booster
packs" (`/type/booster-packs`) in place of Pre-orders, which stays a shelf tab, the hero pill and a header menu entry. No pack count is
claimed and no box price is divided. The pack type page, `/cheapest-packs` and their sitemap entries already existed. Homepage only: the
quick view, its paid rows and wording (A/B freeze 20 Nov to 3 Dec) are untouched.

## 2026-11-17: Moving to dexcompare.io

Owner (17 Nov): Google has one Dex page indexed; buy dexcompare.io, make it the main address, and redirect dexcompare.app to it. This is
the owner's one explicit exception to "hosts never change again". Why a new host can help: Search Console's picture of dexcompare.app is
~6.7K dead or rejected URLs from the singles site (836 of the newest 1,000 "crawled, not indexed" are old /card pages), a popunder period
(16 Jun to 29 Jul), 1,067 server errors (Sept) and a dead www (26 Oct to 7 Nov), re-read at about 7 smartphone fetches a day. Fresh hosts
on the same engine were indexed within days (ScentCompare 1.05K in five days; Dex itself in June). Nothing on today's pages was found
wrong: 200, self canonical, indexable, the same HTML for Googlebot.

- `CANONICAL_HOST` is `dexcompare.io` (`src/lib/site.ts`); every canonical, hreflang, sitemap, JSON-LD and OG URL follows SITE_URL. Any
  old host in `NEXT_PUBLIC_SITE_URL` still means dexcompare.io (`OLD_HOSTS`).
- `next.config.js` 301s every page of dexcompare.app, www.dexcompare.app and www.dexcompare.io to the same path and query on
  dexcompare.io, in one hop, before every other rule. `/api/*` is NOT redirected on the old hosts: eBay's account-deletion endpoint is
  registered at dexcompare.app and a POST is not followed through a redirect; Rift's ops check reads `/api/browse` there.
- Vercel (dexcompare project): dexcompare.io serves Production, www.dexcompare.io 308s to it; the .app domains stay attached (the code
  redirects them). Registered at Vercel 17 Nov 2026 for US$14.99, auto-renew OFF (owner), expires 17 Nov 2027: decide by Oct 2027.
- Outside the code: Search Console Domain property for dexcompare.io + sitemap + Change of Address from dexcompare.app; Bing site move;
  IndexNow from the new host; Rift's sister-alerts and sister-premium accept both origins; Google sign-in client gets the new origin;
  GitHub variable `DEXCOMPARE_SITE_URL` = https://dexcompare.io.
- A/B quick-view tests start 20 Nov and keep arms in localStorage, which is per host: the move lands before they start, so no visitor is
  split across hosts mid-test.
- Rollback: set `CANONICAL_HOST` back to dexcompare.app, swap the two hosts in `OLD_HOSTS`, and point the redirect at dexcompare.app.
  `tests/host-move.test.ts` pins the redirect.

## 2026-11-17: Sitemap lastmod is the day a page changed (audit fix, ported from MTG Compare #143)

Bill's SEO audit (17 Nov) asked for a lastmod that reflects a real change, "not every build". Every product, set and type URL
carried the market's last import time, so all of them said "changed today" twice a day: a date crawlers learn to ignore, and a
wasted signal on a site Google crawls about seven pages a day. Now a product's lastmod is the last change-point in
`data/public/price-history.json` (the day its cheapest in-stock price or its in-stock store count last changed), and a set or
type page takes the latest day among its products (`sitemapChanges`, `src/lib/sitemap.ts`). A page the history has no date for
keeps the import time; in `db` mode nothing changes. Shipped urgently with the dexcompare.io move (owner, 2026-11-17: "anything
that was fixed for dexcompare do it urgently").

The audit's other points, checked: the host split (.app, www and http in the Pages report) is closed by the move to
dexcompare.io with one-hop 301s; the 1,067 5xx are September's database outage, not current; the 5,594 crawled-not-indexed are
mostly the retired /card URLs (16 Nov diagnosis). The region boot script (lib/region-boot.ts) moves people, never crawlers; it
is the owner's every-site rule (2026-11-06) and MTG Compare, with the same script, is indexed, so it stays.

## 2026-11-17: live-check workflows follow the host move

The weekly PageSpeed check (`psi-dexcompare.yml`) and the manual probes (`verify-ads`, `probe-pages-dexcompare`, `diagnose-*-live`) still
fetched dexcompare.app, which now 301s: PageSpeed would have scored the redirect, not the page. They read dexcompare.io. The eBay
account-deletion endpoint and the `/api/browse` ops check deliberately stay on dexcompare.app (registered there; `/api` is not redirected).

## 2026-11-17: Quick view: price history at the very bottom, at most 10 rows (owner)

Owner, 2026-11-17: the price-history chart at the top of the quick view is "not even that valuable". It now sits at the very bottom of the panel, below the rows and the ad pair, and the quick view lists at most 10 rows (`maxRows`): the pinned eBay and TCGplayer rows first, then the cheapest others, with "N more listings on the full page" (the page and "See price history and details" still show everything). The Cheapest price box and the Add to cart buttons are unchanged. Paid rows, their order and wording are untouched in every A/B arm (Dex and MTG tests, 20 Nov to 3 Dec).

## 2026-11-17: Fiverr first-time-shopper review: no "Best price" on an ad, totals, a clearer cart hand-off (owner)

The owner bought a professional first-time-shopper QA review of DexCompare (10 findings). What shipped, and what did not:

- **An eBay ad is never "Best price" (F1, fix 1).** The table's eBay row carried the green "Best price" badge at $320 while the quick view's
  "Cheapest price" read $359.99 (a store): the page contradicted itself. `EBAY_CAN_BE_BEST = false` (`lib/ebay-offer-row.ts`) turns off the
  table badge, the best-price card's eBay headline and the sticky bar's eBay swap; the headline and badge always name the cheapest store (or
  TCGplayer when it is cheaper). eBay still leads the list as a labelled ad with its real price. This reverses the owner's 2026-10-11 call
  ("eBay's price counts as the cheapest if it is the cheapest"); flip the constant to roll back.
- **A total on every row that charges postage (F2, fix 2).** `ShipCell.total`: "≈ $366.94 total" (one measured rate) or "from $366.94 total"
  (postage varies), price plus the cheapest measured postage, from the same snapshot as the shipping line. Free postage says "Free shipping" only.
  The quick view's headline box carries the same line. The "Price + shipping" ranking switch is unchanged.
- **Cart hand-off (F3, F4; fix 3, 4).** The note "You pay each store on its own site. We never take payment." is the first thing in the cart drawer
  in normal-size text; "Total before postage" became "Estimated total (before postage)"; the add button's tooltip says you pay at the store.
  **Not done: renaming "Add to cart".** The owner asked for a literal "Add to cart" on every price row (2026-11-14); the hand-off is said at the
  drawer's top and on the button's tooltip instead.
- **Fewer ads above results (F4, fix 5).** The sealed list (search and filter results) no longer gets the layout's two big banners at its top
  (`OWN` in `InlineAds.tsx`): results lead; its listing strip and the query's own marketplace box follow them. The banners stay on every other
  page they were on.
- **Odd ad prices (F5, F6; fix 6).** The mini eBay strip (product page and quick view) leaves out a listing priced under 75% of the stores'
  median (the bar that already keeps a listing from being "Best price") instead of showing a US$130 tile beside a US$360 box.
- **The ad's own button (F6, F7; fix 7).** The eBay row's button is the ink `btn-ad`, as the "Shop eBay" banners'; the orange filled button is a
  store's. The row keeps its place at the top (owner's ordering rule) and its "Ad" label.
- **Tab title and description follow the quick view (F8, fix 9);** both go back on close.
- **One promo line (F10, fix 10).** The Christmas gift-guide pill waits until the Black Friday strip's window (to the day after Cyber Monday) is
  over. The CSP (report-only) frame-src gained the Google ad-quality, ad-services and tag-manager hosts the console reported; it stays report-only.
- **Menu and search focus (F7 in the report, fix 8): already supported** (`NavMenu`: hover with intent, the chevron and Enter/Space toggle it,
  arrows, Escape, outside press); the reviewer's pointer was parked over the open panel, which sat above the search box. No change.

## 2026-11-18: The return nudge, a targeted prompt for a visitor who has clicked a store (owner)

Earnings fell; the owner asked for targeted, subtle ads. About 70% of buy clicks go to stores that pay nothing. After a click on a STORE row, when the
visitor comes back to the tab (away 4 s or more, within 30 minutes), a small dismissible card ("Still comparing?", Ad) offers the page's own sponsored
eBay and TCGplayer links (read through /go by destination, copied unchanged). Once a session, 20 s or ✕ or Esc, never Amazon, no price or "best" claim,
yields to the rating card. It touches nothing in the quick view (the 20 Nov to 3 Dec A/B test is unaffected). **Measured:** half the visitors are the
control arm (localStorage `rn-arm`); `nudge_eligible` {arm} fires for both (Vercel and GA4), `nudge_shown` and `nudge_click` {which} for "on", and GA4
`nudge_paid_click` {arm, via_nudge} on every sponsored click after a store click, so this host's buy event keeps its fixed property set. Lift = paid
clicks per eligible return, on against off. Rollback: remove `<ReturnNudge />` from the root layout.

## 2026-11-18: cart checkout opens every store or none (owner)

Checkout (`openAll`, `src/lib/cart-checkout.ts`) opens one blank tab per store inside the click, and only when every one opens does it send each to its store's own tagged link. If the browser refuses any, it closes the ones that opened, visits nothing, and the drawer shows the allow-pop-ups steps and a "Try again" button. Before, the first store opened and the rest were refused, which left the visitor with one tab. Chrome 157 on dexcompare.io and on url-opener.com (the owner's model, which does the same close-and-ask) both give one tab until pop-ups are allowed for the site; with them allowed, all open. No browser API grants that permission from a click, so the steps stay.

## 2026-11-18: Home pages rank items by demand (owner: "the most popular items should be on the homepage in that order")

The owner wants every site's home page to lead with the items most likely to earn a click, revenue and a purchase. Each home list
(shelf, grid, picks, deals, pre-orders, popular cards) is now ordered by `src/lib/home-rank.ts`, the same pure file in every repo:

- **Demand**, real numbers only: each item's product page views and buy clicks, last 28 days plus the last 7 again (recent counts
  twice), from Vercel Web Analytics through RiftCompare's public `/api/demand/<site>` (`src/lib/analytics/item-demand.ts` there; top
  100 product pages a window, `buy_product` events by product where a site sends them). A buy click weighs 20 views. Log scale, so
  one runaway item cannot take the list.
- **Value**, from the item's own facts: in stock and at how many stores, a paid row with a price, the price (commission is a share of
  it, on a soft curve), a release in the last 30/90 days or an open pre-order, a price under its usual.
- `score = value × (1 + log(1 + views + 20 × clicks))`.
- **Safe fallback:** under 30 views and clicks across a list, demand is ignored and value alone decides; equal scores keep the list's
  old order. `NEXT_PUBLIC_HOME_RANK=off` (Vercel variable) turns it off without a code change.
- **No feedback loop:** the 4th slot, and every 8th after, goes to the best-valued item with no demand yet, so a new item is seen
  before it can be clicked; the 7-day weight lets a leader fall when it stops being clicked.
- **Data path, no database:** the daily data job runs `scripts/pull-demand.sh <site> <file>`, which commits the demand file to
  `main` with no deploy marker (it rides the release). That file's git history is the log of what the ranking saw each day.
- Heroes stay words, search and ways in (owner, 2026-11-13): the ranking orders the lists, it adds no product to a hero.
- Measure: buy clicks per visitor sitewide and on home pages, the week before (11-18 Nov) against the two weeks after the release;
  a demand file under 30 views for a list means that list ran on the fallback and is read apart.

Here: the region home shelf (booster boxes, ETBs, packs: the 150 in stock of each type ranked, eight shown), its deals and pre-orders, and the landing page's ten picks (feature floor first). DexCompare sends `buy_product` with every buy click, so clicks count here from day one. `apps/dexcompare-sealed/data/demand.json`, pulled by `dexcompare-sealed-import.yml`. The quick view is untouched (A/B tests 20 Nov to 3 Dec).

## 2026-11-18: The phone bottom nav, on for every phone visitor (owner)

The owner tried the bar on TCG Prices with `?bn=1` ("looks good … a bit of lag"), it was made smoother there, and he asked for it on
every site. This is TCG Prices' component (`components/BottomNav.tsx`) ported unchanged in what it does: `fixed` at the foot of the
screen with `env(safe-area-inset-bottom)`, moved by `transform` only, no address-bar arithmetic (what got Rift's 2026-09 bar deleted),
browser only, below 768px. It hides on scroll down and shows on the first upward flick; it hides while zoomed, while a text field has
focus, while the quick view, the menu, the cart drawer or any dialog is open, on a page with the buy bar (the product page), and when an
Add to cart button is in its strip. The ad dock yields to it (`html[data-bottomnav]`); the rating card, the return nudge, the Premium
corner and the cart toast sit above it while it shows.

- Dex's links are under a region: a region page uses its own, a page with none (landing, About, cart) the region the visitor picked
  (`dex-region`), else their time zone's, else the US. It never asks `/api/geo` (a function call per view). Tabs: Home (`/<r>`), Search
  (`/<r>/sealed`, whose box searches), Deals (`/<r>/deals`; also current on price moves, back in stock and Black Friday), Cart, Menu.
- `BOTTOM_NAV` in `lib/site.ts`: "on" (shipped; `?bn=0` hides it for that visitor, kept), "optin" (only `?bn=1`), "off" (rollback).
- Checked on five phone sizes (iPhone SE, 15 Pro Max, Pixel 7, Z Fold cover, landscape) and desktop with Playwright: 82 of 82 checks,
  including the quick view and never covering an Add to cart. Scroll at 4x CPU throttle: p95 frame 16.8 ms with and without it.
- A/B tests (20 Nov to 3 Dec): the bar is outside the quick view and the price rows, hidden while the quick view is open, and the same
  in every arm. `tests/bottom-nav.test.ts`.

## 2026-11-18: Creator and social campaigns can be counted, by an extra event only for tagged visits (owner)

The owner asked how to measure what creator outreach and social posts bring. Visitors per campaign were already counted
(`SiteAnalytics` keeps `utm_source/medium/campaign` on the page view); buy clicks per campaign were not, because the tag is gone
after the landing page. `lib/campaign.ts` keeps the tab's first-touch `utm_campaign` (sessionStorage) and `OutboundLink` and
`AmazonLink` send one extra `campaign_buy { campaign, retailer }` event, ONLY when the visit arrived tagged. `buy_click` and
`buy_product` are unchanged (Pro keeps two properties per event and both are used), the quick view and the A/B tests are untouched,
and an untagged visit sends nothing, so event volume barely moves. Convention for every link we hand out:
`?utm_source=<platform>&utm_medium=creator|social&utm_campaign=<handle or post>`. Earnings are not split per creator (affiliate ids
carry the placement, not the campaign). `tests/campaign.test.ts`.

## 2026-11-18: an eBay row may be "Best price" again (owner)

The owner withdrew the 2026-11-17 rule that an eBay ad is never "Best price": the cheapest row is the cheapest row, and it carries the
badge, whichever it is. `EBAY_CAN_BE_BEST = true` (`lib/ebay-offer-row.ts`): a NEW eBay listing in the stores' currency, strictly cheaper than
every in-stock store and not more than 25% under their median (`ebayMayBeBest`), takes the table badge, the best-price card and the sticky
bar; otherwise a store (or TCGplayer when cheaper) keeps it. The row order does not change: eBay, TCGplayer, Amazon, then the stores.

## 2026-11-18: Share for a deal, and guides get the share button (owner)

Owner: sharing should be easy and rewarded ("if you share … you can open Deal Finder … gives incentive"). Pages that pass `deal`
to `ShareButton` (product, set and guide pages) put half of browsers (`share_arm` in localStorage, `pickShareArm`) on
"Share · get a deal": after a share completes, a small card under the button (the visitor's own tap, ✕ to close) points to the
region's `/deals`. The other half is the control. The quick view never passes `deal`, so it is unchanged during its A/B test
(20 Nov to 3 Dec; `tests/share-link.test.ts`). Nothing is gated. Events `share { kind, arm }` (two properties, Vercel's limit)
and `share_unlock { kind }`. Read the share rate per arm after two weeks; keep the offer only if it raises sharing.

## 2026-11-18: the Amazon button is amber, and the quick view's "See full page" is a real button (owner)

Owner: the Amazon row's button was the neutral `.btn-soft`, so it read like any store's. It is now `.btn-amazon` (globals.css):
#F5A524 with #111 ink, #DC8A0B on hover, a #B7791F hairline, the same in both themes. It is the button of the priced "View deal"
row and the unpriced "Check Amazon" row (`OfferRows`), and of the Amazon button on the sold-out, pre-order and marketplace lists
(`Marketplaces`). `rel`, the tracking, the "Ad"/"Paid link" labels, the row order, prices and the Cheapest logic are untouched, and
so are the TCGplayer button and the phone eBay + TCGplayer pair's position (the quick view's A/B test starts 20 Nov). The quick view's
pinned footer link, already visible without scrolling, becomes a 44px bold bordered button reading "See full page: price history
and details" (`data-see-full-page`); it was a 42px ghost button. `tests/amazon-button.test.ts` pins both.

## 2026-11-18: a return-visit beacon, so retention has a number on every site

Owner, 2026-11-18: "we want new visitors and we want to retain those visitors". Vercel Web Analytics cannot tell a returning
visitor from a new one, and Google Analytics runs on only four of the sites (consent-gated on two). `lib/return-visit.ts` keeps one
small localStorage record (`rv`: first day, last day, visit days) and `components/ReturnBeacon.tsx` (root layout, renders nothing)
sends ONE `return_visit` event the first time a returning visitor opens the site on a new day. New visitors send nothing (Vercel's
visitor count is the denominator), so it costs at most one event per returning visitor per day. Properties are buckets only:
`k` = "<days since last visit>:<page type>", `age` = days since first visit, `n` = visit days, `via` (direct, search, email, share,
social, ai, other), plus the arm of each live 50/50 test (`rn`, `ln`, `share`, `cart`, `watch`) so every retention lever reads its
return rate on against off. No id, date or URL leaves the browser. The identical file is in every Compare repo; read weekly by the
retention thread. Rollback: remove `<ReturnBeacon />` from the layout.

## 2026-11-18: the return-visit beacon also carries the `since` arm

Retention lever 2 ("Since your last visit", on the sister sites) is a 50/50 test under `since-arm`; `ARM_KEYS` in
`lib/return-visit.ts` gains `since` so the file stays the same in every repo. Nothing changes on DexCompare until it runs the lever.

## 2026-11-18: Retired card pages answer 410 Gone

The old singles site's `/card/<slug>` pages (June to September) answered 404 since the sealed rebuild on 2026-09-25. They are most
of what Google still re-reads of DexCompare (836 of the newest 1,000 "crawled, not indexed", 16 Nov) at a few pages a day, the
crawl the live pages need on the new host. `/card` and everything under it now answer **410 Gone**, the status for "removed on
purpose", which Google drops a little sooner than a 404 and stops re-checking: `src/app/card/[[...slug]]/route.ts` (edge, no data,
the CDN keeps each answer a day), body and headers in `lib/retired-cards.ts` (noindex, a short page with a link home), pinned by
`tests/retired-cards.test.ts`. No card has a sealed page to stand in for it, so a redirect would be a soft 404; and no cross-host
redirect to a singles site (owner, 2026-11-17). `/card-value` keeps its 301 to the value checker. `audit-indexability.yml`'s dead-URL
probe accepts 410. Rollback: delete the route; the URLs return to the ordinary 404.

## Collection value card (owner, 2026-11-18: "we need more shareable artefacts")

My collection's "Share my collection" now draws a 1200×630 picture of the visitor's own totals (value, change since
added, item count, three most valuable items, "Track yours free at <host>") in the browser with a canvas
(`components/vault/collection-card.ts`, ported from TCG Prices) and hands it to the share sheet as a file; where files
can't be shared it saves the PNG and copies the link. No server, no function, no Vercel image cost, nothing sent to us.
Link: `/?utm_source=share&utm_medium=collection&utm_campaign=collection-card`. Counted in Vercel as `share {kind:
collection, how: image|text|saved|copy}`, only once it really went out.

## Deals page: a share button and its own share image per region (owner, 2026-11-18: "we need more shareable artefacts")

`/[region]/deals` gets a share button (kind and medium `deals`, `utm_source=share&utm_medium=deals`) and
`[region]/deals/opengraph-image.tsx`: "Today's deals in <region>, up to N% under" with the page's own count
(`dealsBySection`, `dealPct`, `dealsCopy.summary`), drawn by `lib/og-card.tsx` (text and the logo, no product photo).
It lists no params, so nothing reads data at build: each region's image is drawn on its first request after a release
and kept until the next. `pageMeta` names it as the page's image. The quick view is untouched.

## The weekly Hot 100 at /<region>/hot-100 — 2026-11-18

**What.** A new page per region, `/<region>/hot-100`, and its share card `/og/hot-100/<region>`: every product whose cheapest
in-stock price rose over the last seven days (up to the newest import), biggest rise first, up to 100, each with its place on
the chart seven days earlier (▲ / ▼ / New). Pure, from `data/public/price-history.json` alone (`lib/hot100.ts`). The weekly
chart's rules with a lower floor: two or more stores in stock on both days, a rise of 1% or more and under 50% (a bigger jump is a
misfiled listing). A short week is the Hot 37, never padded (RiftCompare's Hot 40 rule). Noindex under five rows.

**Why.** Owner, 2026-11-18: RiftCompare's Hot chart works on Reddit as a plain link and title; every site gets one stable URL to post
once a week (tagged `utm_source=reddit&utm_medium=social&utm_campaign=hot100-<site>-<date>`). The dated Sunday chart stays where it
exists. Shipped with `[deploy] [urgent]` on the owner's ask for today's links. `tests/hot100.test.ts`.
## 2026-11-18: The weekly price-drops box on guides, pre-order and release pages (retention)

GA4, last 28 days: people who land on a guide, a pre-order page or the release calendar are among our largest groups of new
visitors and the least likely to come back (MTG: pre-orders 7% returning, guides 4–10%; Dex: guides 5%, releases 6%, against
15–34% for home and sealed). Those pages offered no way to hear from us again. They now carry the same one-field weekly
price-drops box as home, deals and set pages (`WeeklyDropsBox`, placements `guide`, `preorder`, `releases`): inline, below the
content, server-rendered at a fixed height, never a pop-up. Read: `weekly_signup` by placement, and the census's sister
weekly-digest counts, at the retention read of 2 Dec.

## 2026-11-18: Back-in-stock emails are free for everyone (owner)

The owner chose "Free for everyone" for back-in-stock alerts (retention thread, 18 Nov): accounts with an alert came back after
week one at 56% against 25% without one, and accounts given Premium came back at only 23%. `RestockAlert` on a sold-out product
now shows visitors one email field (kind `restock` on RiftCompare's alert service, the same double opt-in as a price alert);
members keep the one-tap button and their watch list. The Premium pages no longer sell it as a perk: Premium is no banner ads,
200 alerts, the watch list and a year of collection history. Event `restock_signup` {member, region}; read on 2 Dec. Needs the
service side (TCGEmpire, same day) live first, or a visitor's form answers "for Premium members".

## 2026-11-18: A plain best price on a plain store (owner)

**Decision (owner, Bill).** When the row that carries "Best price" is a plain store (no affiliate link; not eBay, TCGplayer, Amazon or a partner row), it is no longer the marked row: no raised ground and green edge (`.or-hl`), no green badge. It gets a small neutral "Best price" chip (`.or-tag`: hairline border, muted text, no fill) with its price fully visible, and, only where the list has an eBay row and/or a TCGplayer row, a small "i" with the words "Prices and stock change: also check eBay and TCGplayer" (only the rows that exist are named; a tap shows the line under the row on a phone). When the best price IS one of our paid rows, it keeps the full existing treatment. Applies to the price table (`StoreRow`, `lib/best-tag.ts`) on the product page and in the quick view (the same `OfferRowsWithEbay`). Sort order, the red button, `rel="sponsored"`, tracking, labels, JSON-LD, feeds and alerts are untouched. The quick view's "Cheapest price" box and the best-price card were already neutral and are unchanged.

**Why.** The loud green on a store that pays us nothing pulled clicks away from our paid eBay and TCGplayer rows. We do not claim eBay is cheaper: the hint says only that prices and stock change.

**Measure.** Paid clicks per 100 buy clicks (eBay + TCGplayer + Amazon + affiliate rows against all outbound clicks, by `placement`) for the week before and after the release. `tests/best-tag.test.ts` pins it.

## 2026-11-18 — The bottom nav is a floating pill, and closing the cart gives it back

Owner, 2026-11-18: "after you open the cart and then you close it, the little bottom navigation disappears", and the nav should be
"the little football field kind of shape … floating above the bottom a little bit" (Catchback's), with the eBay / TCGplayer ad dock
sitting on top of it.

- **The bug.** A header that mounts the cart button twice (desktop and phone copies) mounted two `CartDrawer`s. Only one draws, but both
  ran the scroll-lock effect: the second saved the first's `overflow: hidden` as "previous" and put it back on close, so the page stayed
  locked and `BottomNav` (and the ad dock) read it as an open dialog forever. Now only the drawer that draws locks scroll or checks
  live prices (`mounted` in both effects). Sites with one header button never hit it, but carry the same guard.
- **The pill.** Geometry only, colours stay the site's own: 12px from each side (at most 460px wide), rounded ends, a soft shadow, and
  `bottom: var(--bn-gap)` where `--bn-gap` is `max(8px, safe-area − 14px)`, so it floats above the home indicator without the old full
  safe-area band. `--bn-h` (54px) and `--bn-space` (height + gap) are on `:root`; the stacked ad dock, nudges and toasts sit
  `var(--bn-space)` + a small gap up, and the body's bottom padding follows it. Hidden, it slides fully off-screen (transform only, CLS 0).
- **Measured** (local build, dock stacked): Pixel 7 412×915 nav + dock take 129px (14.1%); iPhone 15 393×852 with a 34px safe area
  143px (16.8%); iPhone SE 375×667 129px (19.3%); the old flush bar took about the same plus the full safe area.

## 2026-11-19: The ad-intensity test — DexCompare is a heavy site (owner)

The owner, 2026-11-19, after a week of turning ad ideas on and off: test it instead. "Dex Compare and Yu-Gi-Oh! Compare go super
heavy on ads, much heavier than ever done before. But people can still use the site once they close all the ads." Rift Compare and
MTG Compare "go lighter on ads" (both still rank on Google) and keep the core-update quality pass's placement (#286): ads below the
content, no exit pop-up. Every other site keeps that pass too.

What the heavy set adds here (`lib/ad-heavy.ts`, `components/heavy/HeavyAds.tsx`, mounted by the region layout; `AD_HEAVY` is the one
switch):

- **The banner pair again at the TOP** of every region page, above the page's own content, under its own placements
  (`heavy-top-ebay`, `heavy-top-tcg`). The pair below the content stays. Browser only, with its height held in the server HTML.
- **A "Recommended for you" pop-up** of six TCGplayer products that covers the page until it is closed (✕, "No thanks, continue to
  the site", Esc or the backdrop; scroll is locked while it is open). It never opens on the page a visitor lands on: Google judges
  intrusive interstitials on the landing page from search, so the pop-up opens on the 2nd, 5th and 8th page of a visit, at most three
  a visit (`POPUP_AT`). Placement `heavy-popup`.
- **A slide-in "Recommended on TCGplayer" card** at the bottom corner after 12 s on any page without a pop-up, closable, at most four a
  visit. Placement `heavy-slidein`.
- **TCGplayer only in the pop-up and the slide-in.** Our eBay Partner Network agreement needs EPN's written approval for pop-up
  formats. The owner chose (19 Nov) to keep eBay out of pop-ups until EPN approves; eBay is in the banners, the dock and the rows.
- Everything is labelled "Ad", rel sponsored, and never shown to ad-free members or in the app. `heavy_ad` { kind, view } counts
  each pop-up and slide-in shown.

The read is on 10 Dec, three weeks in and after Google's core update has settled. It compares the heavy pair (Dex, YGO) with the light
pair (Rift, MTG) on paid buy clicks per 100 visitors, Partner Network and Impact earnings per 100 visitors, returning visitors and pages
per visit, each against the same pair's own 4-17 Nov.

Stop rule: switch `AD_HEAVY` off at once if Dex's Google clicks in Search Console fall more than 30% week on week while the light pair's
fall less than 10%, or if Dex's daily visitors fall 30% below the week before. The Dex/MTG quick-view A/B (to 3 Dec) runs on top:
both of its arms get the same heavy set, so its own comparison holds.


## 2026-11-19: The phone ad dock sits above the bottom nav instead of yielding to it (owner)

The owner, 2026-11-19: the eBay/TCGplayer strip right above the phone bottom nav, "I want it for all the sites, so people have like an
ad on their phone right there." Since the bottom nav arrived (18 Nov) the dock hid whenever the nav showed. It now stays up, stacked
just above the nav (`data-dock-stack`, the same geometry as the other sites: `translate` by `--bn-space`). Its own rules are unchanged:
after a scroll, never beside the product page's buy bar, labelled "Ad", ✕ for the visit, never Amazon, never for ad-free members.

## 2026-11-19 — The front page carries the US summary, the regions table and the US FAQ

An outside review (owner pasted it, 19 Nov) found `/` thin beside `/au/`: no summary, FAQ or region table. `/` is the
x-default and what US searchers land on, so it now carries, below everything the 2026-11-13 trim kept (hero, the ten, the
popular links), the same server-rendered reading a region home has, for the US: "Pokémon sealed prices in the US today",
the seven regions side by side (`RegionsCompared`) and the US FAQ with its structured data. Each read failing leaves its block
out, never the page. The review's "no hreflang" claim is wrong: every region page carries `regionAlternates` and `/` names the
seven homes with itself as x-default.

## 2026-11-19: Search-engine-first audit after the November 2026 core update

Google's core-update guidance asks whether a page exists mainly to help people or mainly to catch a search, and names
content "spread across a large network of sites" and re-dating pages to look fresh as warning signs. What changed here:

- **Seasonal sale pages.** The same template put Boxing Day, January sales and Lunar New Year (and Valentine's Day where
  a site has it) pages on every Compare site, indexed all year, each listing the same deals as the Black Friday page.
  `saleIndexable` in `lib/sale-seasons.ts`: Lunar New Year and Valentine's Day pages are never indexed, Boxing Day and
  January sales only from three weeks before the homepage links them until a week after they end; out of season they are
  noindex, follow and out of the sitemap (`withoutOffSeasonSales`). The URLs stay live all year (URL freeze).

Black Friday and Cyber Monday pages are unchanged (in season). Judge the effect on 1 to 8 Dec against 3 to 9 Nov.

## 2026-11-19 — My collection needs an account; Sign in visible at every width

Owner, 19 Nov: "you can only use my collection if you are signed in and the login/signup button should be visible for all
sites", "premium should also be visible". `/collection` shows a sign-in card (benefits, then `/account?next=/collection`) until
this browser holds an account token; "I own this" sends a signed-out visitor to sign in first. The header has the account link
at every width (`AccountHeaderLink`: "Sign in" in words from 400px, the icon below); the Premium star stays from 400px (below that
the search would shrink to nothing, measured on a 375px and 390px phone), and the phone menu opens with "Sign in / Sign up" and
"Premium · 14 days free". `/account` signed in is an account hub. Browser-only, so pages keep one CDN copy; the collection still
lives in the browser (`ce_vault_v1`). Same change as MTG Compare.

## 2026-11-19 — Continue with Google and Discord on /account

Owner, 19 Nov: Google and Discord sign-in on all our sites, accounts for retention. `/account` has "Continue with Google" and
"Continue with Discord" (`OAuthButtons.tsx`): plain links to RiftCompare's `/api/sister-premium/oauth/<provider>`, which runs the
provider's sign-in through RiftCompare's existing apps and comes back to `/account/verify#c=<code>&n=<path>`, the emailed link's own
door. One account across our card sites, linked by the verified address. A site with its own Google client keeps Google's in-page
button instead. `/account/verify` now lands on the page the visitor was headed to (or the account hub), and a failed round trip
shows its reason on `/account`.

## 2026-11-19 — A news article: Jensen Huang left NVIDIA, what it means for Pokémon prices

Owner, 19 Nov: "a very creative article on dexcompare on how Jensen Huang leaving NVIDIA can affect the TCG market and Pokémon
cards. And get it indexed." Checked first: real news (he resigned as NVIDIA's chief executive and left the board on 12 Nov 2026;
CFO Colette Kress is interim CEO; Al Jazeera, linked from the page). The guide `jensen-huang-nvidia-pokemon-card-prices` states only
that, never the allegations around it ("NVIDIA did not give a reason"). Its one table is a FIXED, dated record computed once from
`data/public/price-history.json` (4 → 11 Nov against 11 → 19 Nov, US/CA/AU/UK, every product priced at both ends; within 1%, up or
down more than 5%): the week after looked like the week before. The rest is four clearly labelled "roads" and three what-if
scenarios with no numbers, plus the usual live price-per-pack block. No forecast, no advice. A guide may now name its writers
(`authors` in the registry): the byline links "Bill and George" to /about and the Article JSON-LD lists them as Persons; every
other guide stays "By DexCompare". Rides the next daily release; indexing requested by hand.

## 2026-11-19: eBay's button is eBay blue again

Owner (2026-11-19): "our eBay clicks have still stagnated. We're nowhere near our all-time high … I really need to increase it."
Vercel buy clicks: eBay about 240 a day across the network before 12 Nov, about 170 since; 5-11 Nov vs 12-18 Nov DexCompare 706 to
489, RiftCompare 298 to 165, OP Compare 153 to 61. The fall starts on 12 Nov, when the calm palette made eBay's button ink;
TCGplayer, which kept its own blue button, rose (DexCompare 545 to 779, MTG Compare 160 to 363). So eBay's buttons wear eBay's own
blue again (#3665f3, white ink, fixed in both themes) on every site; nothing else about the rows changes (no outline, tint, order or
label), and the cheapest row keeps its mark. RiftCompare and OP Compare had started a 50/50 the same morning; it ended for
everyone. Read: eBay buy clicks per 100 visitors, the week after release vs 12-18 Nov.

## 2026-11-19: TCGplayer's market price on the price history chart, OP Compare's look (owner)

Owner: "I really really like opcompare's price history where you have the tcgplayer market price as well as the cheapest
price locally. Can we pls copy it across all our tcg websites?" The product page's chart (`PriceHistoryTwoLine.tsx`) now draws
the cheapest in-stock listing in the region (solid red, the existing daily history) against TCGplayer's market price (dashed
gold), with Now / Low / High / change, 7D / 30D / 90D / All tabs and a tooltip reading both lines. Either line draws alone
once it has MIN_DAYS of snapshots.

The TCGplayer line is new data, from the TCGplayer read the import already makes (no extra request): the importer writes
today's `marketPrice` per TCGplayer product id with the day's exchange rates to `data/public/tcg-market.json`, and the export
folds it into `data/public/tcg-history.json` (same change-point format and fold as `price-history.json`, one "US" series per
product slug, US cents). A product is joined to TCGplayer only by the id in its own TCGplayer offer's URL, never by title; a
market file over three days old is not folded in. It starts empty and fills from the next import.

**The one conversion.** Prices are never converted for display, except this line: outside the US it is TCGplayer's US price
at the file's rate, labelled "TCGplayer market (converted)" and said so under the chart. It is never a price row, a best
price, a deal, a sort, an alert, the feed or structured data (`lib/tcg-market.ts`, `tests/tcg-market.test.ts`).

**The quick view keeps its old chart until 3 Dec 2026**, when the quick view A/B test ends: nothing changes there during
it. The quick view route already sends `tcgHistory`, so the switch then is the component alone.

## 2026-11-19 — eBay stand-out row, 50/50

The owner, the same evening eBay's blue came back: the colour change moved eBay clicks, so "we can do something even more than just a
color change … make it stand out even more". Every visitor keeps eBay's blue button; a new 50/50 (localStorage `ebay-pop`, arm on
`<html data-ebaypop>`, `ebay_pop` on buy_click) gives arm "pop" a bolder, larger eBay button with a soft blue halo and tints the list
row that holds an eBay button eBay blue with a blue edge. Shape and colour only: no new words, no new claim (eBay is called the cheapest
only when it is), no position change, no extra eBay API call, white on #0064d2 passes contrast. Run on Rift, Dex, MTG and OP. Read
3 Dec: eBay buy clicks per arm, total buy clicks per arm as the check; keep the winner and roll it out to the other card sites.

## 2026-11-19: Sign in is a filled button at every width, and the sign-in flow never names another site

Owner, 2026-11-19: "there should be a login or sign up button, very visible for new … or non-logged in users … I don't want them to
redirect. I don't want the [RiftCompare] logo to appear on any of the site signups."

- Signed out, the header's account link is a filled button in the site's own colour reading "Sign in" from 340px wide (the icon alone
  below that). Every header was measured at 360, 390, 430, 768, 1024, 1280, 1440 and 1536px: the button is on screen with no
  sideways scroll at each. Where the row was full, other items stepped aside (the Premium pill, a sections row or a sponsored link
  move to a wider breakpoint; the menu carries them), never Sign in.
- Copy on the sign-in, account, Premium, watches, alert and privacy pages says "our shared alert service" and "all our price
  comparison sites", never the name of the site that runs the shared account service.
- `next.config.js` rewrites `/account-service/alerts/(confirm|manage|unsubscribe)` and `/account-service/oauth/(google|discord)[/callback]`
  to the shared service, so alert emails and (once the owner registers the redirect addresses) Google and Discord sign-in keep the
  visitor on this site's own address. A rewrite is not a redirect: the address bar never changes.
## 2026-11-19 — A tag lint that stops the build

From the 19 Nov boardroom review, on the four money sites: paid rows always there, and never untagged. The product page's
Marketplaces panel already draws eBay and TCGplayer in every region (a listing or price when there is one, else each one's tagged
search; TCGplayer steps aside only in the US when it is already the best-price button above). New: `scripts/tag-lint.ts` runs first in
`npm run build` (`src/lib/tag-lint.ts`, `tests/tag-lint.test.ts`). Every eBay builder in every region and placement must carry campaign
5339155912 and a customid, every TCGplayer link must go through Impact (/out/tcgplayer), an eBay listing without our campaign must be
refused by `listingHref`, and no component may hard-code a bare eBay or TCGplayer href. A failure stops the release: a paid link going
out untagged costs more than a late one.

## 2026-11-19: [urgent] needs eight hours too: a network ceiling of 57 builds a day

[urgent] in a commit subject used to skip the 12-hour gap altogether. On 17 and 18 Nov the network built production 94
and 137 times a day, almost all of them [urgent] (about eight builds per site per day), and Vercel reached $10.27 a day
against the $6 cap: every build rewrites the ISR cache and burns build CPU. `scripts/vercel-ignore-build.sh` now builds an
[urgent] commit only when production last built at least `URGENT_MIN_GAP_HOURS` (8) ago; a plain [deploy] still waits 12.
So one site builds at most three times a day, and the 19 production projects at most 57 a day (normally about 25).
Batch urgent changes into one release instead of one per merge. Pinned by `tests/deploy-gap.test.ts`. The same change
went to every Compare site's gate.

## Amazon API allowance: mostly ScentCompare, card sites at zero (owner, 2026-11-19)

Amazon's Creators API limit is per Associates account (one a country), shared by every site on it: 1 call a second and
8,640 a day for the first 30 days (the US until about 8 Dec 2026), then 1 a day per US$0.05 of shipped revenue the API
referred in 30 days. The owner: "be very frugal", no Amazon calls for card sites ("people aren't buying on Amazon"), and
half or more for ScentCompare, the best performer. Each site's daily calls (environment variables can only lower them):

| Site | searchItems a day (US / other) | getItems at build (US / other) |
|---|---|---|
| ScentCompare | 2,000 / 600 | 200 / 100 |
| KaeYoung | 600 / 300 | 100 / 60 |
| DexCompare | 300 | 30 |
| MTG Compare, WargameCompare | 100 | 20 |
| Compare Empire | 100 | 30 |
| CamCompare | 150 (AU only) | about 30 (AU only) |
| Rift, OP, YGO, Lorcana, Cyberpunk, Gundam (and kits), Bandai, SportsCardCompare, TCG Prices, Figure, Motor | 0 | 0 |

US total at most about 3,600 calls a day (ScentCompare about 61%, ScentCompare and KaeYoung together about 81%), against
8,640 until about 8 Dec 2026 and a revenue-based limit after it (1 a day per US$0.05 of API-referred shipped revenue).

Here the defaults are lowered to this table's numbers. Amazon clicks here were real before 13 Nov, so a small share stays.

## 2026-11-19: Set pages get their own price alert

The set pages are among DexCompare's most-read pages (28 days to 19 Nov: /ca/sets/delta-reign 995 views, /uk/sets/30th-celebration
752, /uk/sets/delta-reign 747), and the only alert on them was the weekly-drops box at the foot: a visitor had to open a product
first to set a price alert. Each set page now draws one prominent "Email me when the <set> booster box drops" button under the
hero (the same shared `PriceAlertForm` as the product page, opening in place on a tap), for the set's booster box, else its Elite
Trainer Box, else its booster bundle; within the type a product a store has open first, then the cheapest (`lib/set-alert.ts`,
`tests/set-alert.test.ts`). A set with none of the three gets no button. The id comes from one `productIdBySlug` read (one row,
one column). Nothing about the alert service, the feed or the quick view changes. KPI: `alert_open` / `alert_created` events
on set pages, read 3 Dec.

## 2026-11-20: Creator links tag their visitors' sales, and /go passes the marker into TCGplayer's link

The owner approved paid creators (2026-11-20): up to A$300 a month, paid only per tracked buy click or code, cut on day 21 unless
their visitors earned 1.5x what they were paid. The ledger lives on RiftCompare's earnings dashboard ("Paid creators",
`Specifxx/TCGEmpire` `lib/earnings/creator-deals.ts`); this app only has to make a creator's sales traceable.

- `lib/paid-visit.ts` (the same file as RiftCompare's): a landing with `utm_medium=creator&utm_campaign=<handle>` stores the
  marker `cr` + the first six letters or digits of the handle and adds it to every affiliate sub-id the visitor opens, like the
  ad tests' `fbad`. A paid ad landing still wins.
- `/go` now honours `ad=<marker>` (`withVisitMark` in `lib/go.ts`): the tagger rewrites a `/go?u=…` link to carry `&ad=`, but
  the route ignored it, so a tagged visit's TCGplayer clicks reached Impact untagged (the November Meta tests lost those). Only
  the Impact URL's sub-id values change, so the host check (`goAllowed`) is unaffected.
- Buy clicks per creator were already counted (`campaign_buy`, `lib/campaign.ts`, 2026-11-18).

## The Hot 100's share card is the chart itself, with photos (2026-11-20)

The owner's Rift Compare "rising cards" snapshot posts get about 2,000 Reddit views a day each, and he posts only a link and a
title: the link's thumbnail carries the post. DexCompare's Hot 100 card was text only (the week, the count, the #1 rise), so a Reddit
link post showed nothing a reader would stop for. `/og/hot-100/<region>` now draws the chart: the #1 riser large with its
photo, #2 to #6 beside it with their photos, each with its real 7-day rise, last week's and today's cheapest in-stock price
and its store count, all from `lib/hot100.ts` and the product files, the same rows the page lists.

The photos are TCGplayer's (asked at 200 px) and the stores' own Shopify files (asked at 300 px), fetched when the card is
drawn with a six-second timeout each, and kept only as PNG or JPEG (satori draws nothing else); a photo that fails is a plain
tile. Because it reads the product files the route is no longer prerendered: it is `force-dynamic` and kept by Vercel's CDN
for a day, like `/og/p` (one render per region a day). The page's og:image carries the week (`?w=<through>`), so a link
posted after a release is never shown last week's picture from a cache.

## 2026-11-20: A "Join the Discord" box with a reason, linking the family's one hub

The owner asked why the Discord had 9 members after five months: the only link anywhere went (from RiftCompare's menu) to
a server the owner does not run, with two empty channels and no reason to join. The family now has ONE hub, the owner's
server "TCG Deals & Restocks" (the sealed restock and price-drop feeds on top, a channel per game). This site links its
own never-expiring invite code, so the server's Invites list counts the members each site brings with no tracking of
ours. `DiscordCta` ("Restock and deal alerts, free on Discord") sits under the price table on the product page and
in the footer: never above a price, never a pop-up. `tests/discord-cta.test.ts`.


## 2026-11-20: The Hot 100 share card shows rises AND drops (owner)

A Reddit reply to a Hot 100 link post asked for "the biggest drops. I just want to rip and play"; the owner: every snapshot
thumbnail is half biggest rises, half biggest drops. `/og/hot-100/<region>` (`lib/og/hot100-card.tsx`) now draws the week's
three biggest rises beside its three biggest drops, each with its photo, change and two prices; the page lists up to 20 drops under
the chart ("Biggest drops this week"). `hotDrops` in `lib/hot100.ts` is the Hot 100's own rules mirrored (2+ stores in stock both
days, a fall of 1% or more and under the 50% misfiled-listing cap, the same seven days), from the same history; nothing new is read.
The og:image query gained `&v=2` so a cached rises-only picture is never served for the new one. No ▲/▼ glyphs on the card: the
bundled font lacks them. `tests/hot100.test.ts`.

## 2026-11-20: A Santa hat on the logo and lights under the header

**Owner, 2026-11-20:** "change the logo for all of our websites so that it's Christmas themed now. Put a Santa hat on top
of the logos … and add some decorations here and there, like some Christmas lights … and yeah, Santa Claus." The owner
asked for hats and lights by name, so they come back after the 2026-11-08 tone-down, kept to the header.

- The logo mark wears a Santa hat (class `xmas-cap` on its wrapper), a string of lights hangs under the sticky header
  (`xmas-garland`), and the home page's gift-guide line, where there is one, gets a small Santa. All of it is the
  `xmas-logo` block in `globals.css`, the same block on every Compare site (RiftCompare's DECISIONS has the history).
- CSS only: three inline SVG data URIs (~2.5 KB of stylesheet), no request, no script, no animation. Every piece is
  `position: absolute` and `pointer-events: none`: no layout shift, no tap caught, nothing in the server HTML changes
  but two class names, so titles, metadata and structured data are untouched. Favicons and share images are unchanged.
- Off switch: `CHRISTMAS_FESTIVE_LAYER` (`lib/season.ts`, the `data-festive` attribute on `<html>`); the Christmas window
  also ends it on 27 December by itself. Remove after New Year: delete the block and the two classes.

## The Hot 100 sells, not just ranks (2026-11-20)

Reddit link posts land on `/<region>/hot-100`, and those visitors almost never clicked buy (13–19 Nov: MTG's Hot 100 had 0
buy clickers in 732 visitors; Reddit visitors 2.9% on MTG and 0.7% on Rift, against 23% and 12% from Google; the
buy-clicks boardroom, move 2). The page now opens with "Shop the top risers", the week's top three as `ProductCard`s,
and every chart row (`StockRow` with `buy`) opens the quick view on a plain click and shows a Buy button beside its
cheapest price. The quick view itself is unchanged (the A/B runs to 3 Dec); the rows only link into it. Same data as
before (`cardsFor`), no new read, caching unchanged. Read on 27 Nov and 4 Dec as buy clickers among visitors with a
reddit.com referrer; the target is 8% or more.

## One-tap price and restock alerts for anyone signed in (2026-11-20)

As MTG Compare (its DECISIONS.md, 2026-11-19; boardroom: one-tap restock and price-drop alerts, free for all). Signed in with any
account (free or Premium), the product page's and quick view's alert button is "Alert me under <10% below today's lowest in-stock
price>": one tap saves it through the account's token (no email field), with "Pick my price" beside it
(`components/premium/PriceAlert.tsx`, `setPriceWatch`). Back in stock is one tap for free accounts too. Signed out, both are the
ordinary forms, unchanged. Nothing saves or opens by itself. The set page's alert stays the ordinary form.

## 2026-11-20: Type pages get their own price alert

The type pages are among DexCompare's most-read hubs (28 days to 20 Nov: /uk/type/elite-trainer-boxes 573 views,
/us/type/booster-boxes 534, /ca/type/elite-trainer-boxes 533, /us/type/elite-trainer-boxes 527, /us/type/booster-bundles 469),
and had no alert at all. As the set pages (2026-11-19), each now draws one prominent "Email me when the <product> drops" button
above its products (the shared `PriceAlertForm`, opening in place on a tap), for the type's product most likely to earn by the
home ranking (`rankCards`: demand from `data/demand.json` times stock and price), an open one first, else a sold-out one
("is in stock at my price") (`lib/type-alert.ts`, `tests/type-alert.test.ts`). The id comes from one `productIdBySlug` read.
Nothing about the alert service, the feed, the grid or the quick view changes. KPI: `alert_open` / `alert_created` and buy clicks
on `/<region>/type/*`, read 23 Nov (click guard) and 3 Dec.

## 2026-11-20: A "keep up" strip on the Hot 100 (owned audience)

The Hot 100 is where Reddit posts land, and Reddit visitors rarely buy (about 2.3% click a buy button, against about 19% from
Google), and a Reddit visitor who does not buy is gone. Under the first buy cards, before the chart, the page now offers two ways
to come back: the week's biggest price drops by email (the existing weekly email on RiftCompare's shared alert service, kind
"weekly", double opt-in; this site keeps no address) and the Discord hub through this site's own invite code
(`components/KeepUpStrip.tsx`). Inline, never a pop-up, no heading, a fixed minimum height so nothing moves. It is not an A/B
test: it is on for everyone. Measured as `weekly_signup` with placement `hot-100` (an existing event, no new event name) and
the invite's uses in Discord. The email promises the week's drops, which is what the weekly email sends, not the Hot 100 chart
itself.
emblem is a token: rarity T, or a letter number such as E1. Only those are left out now; a card with a plain number stays.

## 2026-11-20 — Black Friday pages: products furthest under their own 30-day price, with a buy button on every line

Code red plan (20 Nov), Cyber Week buy sprint: the season's pages lead with a list a shopper can act on. `lib/real-drops.ts`: a product
is listed only when its cheapest in-stock price today is 10% or more under the median of its OWN recorded daily prices over the
last 30 days (today left out), with 14+ recorded days, wrong-listing days (under half the median) left out, no claim when the
records swing more than 2x, no placeholder prices (9999.99), and a typical price of 20.00 or more. Each line carries the
cheapest store's buy button (its own link, `offerLink`) and a tagged eBay search, placement `bf-drops`. It replaces the
"Under their own 30-day typical price" list on the same pages (same idea, no buy button, fewer guards). Copy says "under its
30-day typical" and "lowest since <date>", never "was", "dropped" or "ever" (BANNED_COPY). Read 3 Dec: `bf-drops` buy clicks
28 Nov to 1 Dec against the 4 days before. The same file ships on Dex, Rift and OP.

## 2026-11-20: Eight dead store reads retired, their old pages 301

Eight stores had read nothing for two to four weeks (`StoreStat.lastError` "no products read" or a 429). A probe that day
(robots, home page, `collections.json` / the Woo Store API) found none recoverable within our rules: Kuma Cards and South
Texas TCG are behind a password page, Industria 61 and Obsession Gaming answer 403, TCGStore a Cloudflare challenge,
Millennium Comics 429, Eldar's Store API 400, and TwinFuse's Pokémon collection is empty. Each import still spent a read
on every one. They leave `src/data/stores.json`; the importer already prunes the rows and the StoreStat of a store that
leaves the registry. Their store pages were noindex with no listings, but the URLs existed, so `lib/retired-stores.ts`
lists the keys and `/<region>/stores/<key>` answers a permanent redirect to that region's store directory, never a 404
(`tests/retired-stores.test.ts`). Unlike a banned store, a retired one may come back: when it reads live again, add it
back and take its key off the list. `shipping-rates.json` is the weekly probe's and drops them on its next run.

## 2026-11-20: The deal feed sends one drop a day

The Discord hub "TCG Deals & Restocks" takes at most three drops a day (the Discord agent's cap, so a nine-member server is not
buried in bot posts). The Sealed Sniper (tcgprices.app) takes two, one per run; this feed takes one. So `scripts/feed-notify.ts`
now sends ONE message a run (`dropFor`: a header and each event, kept under Discord's 2,000 characters, biggest first) and only
the first run of a UTC day sends (`FeedState.lastDrop`); the evening run records and posts nothing. An event left out stays
eligible for the next drop. Every link carries `utm_content=dex-feed-YYYYMMDDHH` so each drop's clicks can be counted. Telegram
gets the same single message, with link previews off.
