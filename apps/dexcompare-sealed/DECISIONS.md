
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
