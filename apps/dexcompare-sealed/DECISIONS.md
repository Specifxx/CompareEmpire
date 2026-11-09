
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
