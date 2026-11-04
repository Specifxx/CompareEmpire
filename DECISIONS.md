

## DexCompare: store audit — 2026-10-28

**Owner:** check every site's store health and make sure "all the latest and
greatest stores" are on it. Each site probed every store its sisters track
(999 storefronts across the nine registries) through its own probe and
importer rules, from GitHub Actions (this sandbox cannot reach the stores).
DexCompare: 513 stores added (390 → 893; the second round from the official Riftbound
store registry's game stores), 11 dead ones removed, 3 re-pointed;
details and the per-store counts in
`apps/dexcompare-sealed/docs/store-probe-2026-10-28.md`. A store whose other
domain we already list is left out (one stock shown as two stores misleads,
the `ccctcg.ca` rule).
## One family page and "Searching another game?" instead of a hub domain — 2026-10-28

The owner asked whether a separate hub site (tcgcompare.app or "TCG Empire")
should proxy all the compare sites to win generic queries like "compare TCG
card prices". Not built. A proxy that shows the same card pages would copy
the sister sites and split their rankings (the split-query problem fixed on
RiftCompare the day before). A link-only hub on a new domain has no authority
and no card pages to rank with. TCGPriceEmpire, a full multi-game site, was
built once and never launched (archived in CompareEmpire on 2026-10-27).
Buying the domain is the owner's call and is on hold.

What shipped instead, at no cost:

- **"Searching another game?"** Under a search on each of the seven
  card-game sites, a line links the same words to every other card-game site's
  own search (its SearchAction target). Someone typing "Charizard" on
  RiftCompare is pointed to DexCompare instead of a dead end. These are search
  links, so they're `nofollow`: a results page is noindex everywhere. Nothing
  is fetched from the other sites.
- **One `/tcg-price-comparison` page, on RiftCompare only.** It lists every
  game we compare, has a search box that sends the words to that game's site,
  and is linked from RiftCompare's "Compare other TCGs" footer heading. One page
  on the strongest domain, never a copy per site, so the family never competes
  with itself for the generic query.

## DexCompare: a TCGplayer strip of real sealed products — 2026-10-28

**Owner:** "more TCGplayer ads and more eBay ads … with the actual cards there",
on every site but RiftCompare. The eBay side already has its image strips
(EbayStrip); TCGplayer had only rows and text search links.

* `TcgplayerStrip` (server-rendered, `lib/data.ts tcgplayerTiles`): real sealed
  products with their photo and TCGplayer's own in-stock price, each linking to
  the product on TCGplayer through the Impact deep link, plus a "Shop
  TCGplayer" tile. Labelled Ad, disclosed under it, no pop-up.
* Placements `tcgplayer-strip-home` (region home, after the second box rail),
  `tcgplayer-strip-set` (after a set page's products) and
  `tcgplayer-strip-product` (after "More from <set>"): always below a page's
  comparison, never between a buyer and a price.
* Tiles: the newest sets first, headline types first, at most three per set
  site-wide; a set or product page shows its set's own, topped up with the
  newest sets'. The read is scoped to TCGplayer and to one set or the ten newest
  (the egress guard flagged the unscoped one at 0.7 MB).
* Outside the US the price stays US$ and the strip says "The US marketplace".
  TCGplayer Direct reached Australia on 2026-10-07 for singles only, so nothing
  claims sealed ships there.

## DexCompare: navigation from the first page, a sidebar, a full phone menu — 2026-10-28

**Owner:** the "Continue to Australia" button before any navigation was a
barrier; the wide desktop's left side was empty; the phone menu on the landing
page listed only regions. Same change as MTG Compare (mtgcompare, same date).

* The pages with no region of their own (`/`, About, the legal pages, 404s)
  draw the whole header: sections, the "All sealed" dropdown, search and the
  region button. The server's HTML is built for the US (one CDN copy, no cookie
  or header read); the browser moves every link to the visitor's region
  (`useSoftRegion`, the same detection as before: saved, `/api/geo`, time
  zone). Never a redirect: `/` keeps its canonical and hreflang as x-default.
* A region picked there (header, phone menu, the landing grid's chips) switches
  the page in place (`pickRegion`) and is remembered; without script the links
  go to each region's home.
* The hero's "Continue to <region>" button became five shortcuts (Booster
  boxes, Elite Trainer Boxes, Booster bundles, Japanese boxes, Deals).
* From xl (1280px) a sticky sidebar (`components/SideNav.tsx`) lists every
  product type, the eight newest sets, the deal pages and the rest
  (`lib/nav.ts navGroups`); the shell widens to 1480px so pages keep 1200px.
  The phone menu draws the same groups, then the regions. Static links only.
  Region pages never run the suggestion (no extra `/api/geo` call).

## One eBay campaign for every Compare site, hard-coded — 2026-10-30

**Decided (owner).** Every Compare site now sends eBay clicks to ONE EPN campaign, 5339155912 (RiftCompare's,
already set up), hard-coded in the code: no variable overrides it any more, so a forgotten secret or Vercel
value can't split the sites again. The sites are told apart by the `customid` prefix alone, which comes first
in every tag; this site's is `dex-<region>`. DexCompare's importer enforces the same id on every stored listing URL; the dormant apps (camera, phone, car, laptop) were hard-coded too.
Replaced: 5339155911 (WargameCompare, FigureCompare, Compare Empire, K Young), 5339231473 (Lorcana),
5339231474 (Gundam), 5339234013 (YGO). Old secrets/variables (`EBAY_AFFILIATE_CAMPAIGN`,
`NEXT_PUBLIC_EBAY_CAMPAIGN_ID`, `EBAY_CAMPAIGN_ID`) are no longer read and can be deleted.

## 2026-10-30: DexCompare: quick view on every product card (from K Young)

Owner: "I really like the kaeyoung quick view pop ups, can we do that for dexcompare, mtgcompare and all the other sites".
A plain click on a DexCompare product card now opens K Young's quick view at once with what the card shows (photo,
type, name); the product page's own price rows then load from `/api/quick/<region>/<slug>`, a function response
Vercel's CDN keeps for a day like every page, fetched ahead when a mouse rests on a card. The rows come from
`offerRowsData()`, which `OfferTable` itself now uses, drawn by the table's own `OfferRowsWithEbay`: eBay first, then
TCGplayer and Amazon, then the stores, exactly as on the page. Store buttons carry the `quickview-table` placement. The
card is still a real link, so crawlers, new tabs and modified clicks reach the product page and its server HTML.

## 2026-10-31: DexCompare: wrong-price reports and store suggestions go to a private GitHub repo

**Owner:** "for all of these websites … we must have the ability to report any prices that are wrong, for users to
suggest a store … it's just stored within the GitHub … a daily job that checks for that."

* Every Compare Empire site now has the same two forms: **Report a wrong price** (a quiet link under the price table
  that opens in place, never a pop-up) and **Suggest a store**. Both POST to `/api/report`
  (`src/lib/reports-github.ts`, `src/components/ReportForms.tsx`: the same two files in every site repo).
* They are filed in ONE **private** repository, `Specifxx/compare-reports`: one new JSON file per report at
  `inbox/<site>/<day>/…json`, created through GitHub's contents API with `REPORTS_GITHUB_TOKEN` (a fine-grained token
  with Contents read/write on that repo only, Vercel only). Private because the site repos are public and a note is a
  stranger's free text; the K Young reviews branch is public because reviews are meant to be read.
* Nothing about the visitor is stored: no email field, no IP, no hash of one (the per-visitor limit, 6 an hour, lives
  in the function's memory), and email addresses, IP addresses and phone-like numbers in a note are blanked before
  the write. A honeypot field swallows bots.
* Each write creates a new file (no read, no sha), so reports never race, and the commit subject never carries
  `[deploy]`/`[preview]`. The route is POST only: no page view or crawler runs it, so it costs nothing at rest.
* A daily job in that repo (`triage.yml`) keeps one issue per site listing what is still open, flags repeat
  reports of the same product and store, and warns before the token expires. A handled report is moved to
  `done/<site>/`. Until the token is set the route answers 503 and the form says to email the site's address.

## Visitor reports live on each site's own `reports` branch, not a private repo — 2026-10-31

**Owner:** "we don't need a private repo for this … just build it into each site … inside the public GitHub, it's
fine. As long as it's not reflected on the front end." This replaces the private `Specifxx/compare-reports` repo
of the entry before it; everything else in that entry (the forms, no email/IP, redaction, new file per report,
POST only, 503 until the token is set) still holds.

* Each site writes its reports to **its own repo**, on an orphan branch named `reports` (`SITE_REPOS` in
  `src/lib/reports-github.ts`): `inbox/<site>/<day>/…json`, moved to `done/<site>/…` once handled. The branch is
  never merged into `main` and never deploys: `git.deploymentEnabled.reports = false` in `main`'s `vercel.json`
  (pinned by `tests/reports-github.test.ts`) and the branch's own `vercel.json` turns deploys off as well.
* Nothing on any site reads the branch, so no report ever shows on a page. The branch is public with the source,
  which is why nothing about the visitor is stored and notes are redacted before the write.
* One token, `REPORTS_GITHUB_TOKEN` (fine-grained, Contents read/write on the twelve site repos only), set in each
  Vercel project for Production.
* The daily triage moved to RiftCompare (`Specifxx/TCGEmpire`): `.github/workflows/reports-triage.yml` reads all
  twelve `reports` branches through the API and keeps one issue per site there, plus a once-a-day "Reports digest"
  comment. Those issues are public, so they link to each report's file and never quote a note. It fails (and
  GitHub emails the owner) when a site has no `reports` branch, or the token stops working or expires within 14
  days (checked only when the token is also a TCGEmpire Actions secret). The ops monitor's job list watches it.

## 2026-10-31 — DexCompare: every product link opens the quick view

Owner, 2026-10-31: "Whenever I click on any item in dexcompare … I want a quick view open like K Young." Only
`ProductCard` carried `data-qv`, so 75 of the 107 product links on `/us` (home lists, tables, set pages, deals rows,
guides) went straight to the product page. `apps/dexcompare-sealed/src/components/QuickView.tsx` now opens for any plain
click on a link to `/<region>/p/<slug>`, reading the region and slug from the href when the link has no `data-qv`;
`/api/quick` also returns `name`, `sub` and `img` for those. Links inside the quick view and on the product's own page,
and modified, middle and new-tab clicks, navigate as before. Same change as MTG Compare.


## 2026-10-31 — TCG Synergy is banned, and banned stores stay out

The owner reported TCG Synergy (tcgsynergy.myshopify.com, a CA Shopify store first added by the 2026-10-28 store audit)
as a scam site. It is removed from `apps/dexcompare-sealed/src/data/stores.json` and `src/data/shipping-rates.json`, and named in
`apps/dexcompare-sealed/src/lib/blocked-stores.ts`, which every path that could bring it back now checks: `STORES` drops a banned entry even if
it reappears in the registry, `scripts/probe-stores.ts` and `scripts/registry-from-probe.ts` skip it, and the file store
(`lib/public-data/store.ts`) drops its offers and store stats from a data export made before the ban, so it disappears
with the next release rather than waiting for an import to delete the rows. Matching is on the key, name or any part of
the host with punctuation removed, so a custom domain in front of the same shop is caught too
(`tests/blocked-stores.test.ts`). To ban another store, add its key to `BLOCKED_STORES`.
## DexCompare eBay: local sellers and stated postage only (2026-10-31)

A WargameCompare visitor's feedback (the owner passed it on for every sister site; same change as MTG Compare): eBay rows from overseas sellers carried postage
that made "a lot of wasted clicks". The Browse search now asks for items located in the marketplace's own country
(`itemLocationCountry`; eBay Germany, which stands for the EU, keeps every EU seller and the importer drops the rest,
`localSeller`), sends the buyer's country and a central postcode as `contextualLocation` so eBay quotes real postage, and
`baseItem` keeps no listing whose postage eBay does not state. The product's eBay row is the cheapest listing delivered (item +
postage, `pickListing`), still shown at its item price with the postage beside it, as before. NZ and SG keep the AU and US feeds.
Rows stored before this age out with the next import.

## Christmas on DexCompare: 1 November to Boxing Day (2026-11-01)

Owner, 2026-11-01: every Compare site gets a Christmas theme after the Halloween one, each its own take. DexCompare sealed (`apps/dexcompare-sealed`) only: snow over the home hero, corner trees, gifts and a candy cane, a Santa hat on the logo, and a pill to booster boxes, ETBs and tins, cheapest first.

The season window is fixed in `src/lib/season.ts`: 1 November to 26 December, every year, by the visitor's own
date, stamped on `<html data-season>` by an inline boot script before first paint. `?season=christmas` previews it out
of season and `?season=off` hides it in season. Every decoration is CSS-gated on that attribute, `aria-hidden`,
`pointer-events: none`, painted under the content (never over a price or a button), animated with `transform`
only, and stopped under `prefers-reduced-motion`. The page's content and links stay in the server HTML; the season
adds no request, no script beyond the boot line and no database or data read. The shared rules sit between
`xmas-common:start` and `xmas-common:end` in `globals.css` (identical on every sister site); this site's colours sit in
the `xmas-site` block after it. Art is eight small SVGs in `public/xmas/`. To end it early, move the `to` date; after
Boxing Day it switches itself off.

## 2026-11-01: DexCompare gets a beta community forum, no accounts, posts in this repo

The owner asked for "user forums ... you don't need to be able to sign in ...
put your name down ... it'll save your name ... all of this is public data ...
keep it within each website's repository", on every site, to give the sites a
reason to come back that search rankings alone don't. `/forum` (apps/dexcompare-sealed/docs/forum.md):

- **Storage:** `forum.json` on this repo's public orphan branch `forum`
  (never deployed: its own vercel.json, plus `deploymentEnabled.forum: false`
  here). Written only by `POST /api/forum` with the visitor-reports token;
  a write reads the file's sha and retries when two posts race.
- **Cost:** pages read the file from raw.githubusercontent.com inside their
  normal cache life, never per visit; the browser fetches the newest copy from
  GitHub directly, so a new post shows in minutes with no deploy, no function
  and no database. Rebuilding pages for posts would have meant a build per post.
- **Spam:** honeypot, a 2.5 s minimum on the form, per-visitor limits (4 per
  10 min, 20 a day, 4 threads a day) and a per-instance cap, all in memory; no
  IP, email or hash is stored, and emails/IPs/phone numbers in posts are
  blanked. Links to other sites and slurs or strong profanity are HELD (filed
  under `held/` and flagged in the daily reports triage), never published.
- **Not dead when empty:** the site's topics with a line and a few prompts;
  never an invented post.
- **SEO:** threads are in the server HTML; a thread is noindex until it has a
  reply, the forum page until any thread has one; indexed threads carry
  DiscussionForumPosting JSON-LD.
- **Moderation:** the owner asks Claude; a post is removed by an edit to
  `forum.json` (`removeFromForum` in `src/lib/forum/core.ts`).

## 2026-11-01 — DexCompare: visitors land on their own region's pages

Owner, 2026-11-01: "the default region is the region that the visitor is located in. And if they can't determine it,
then the default should be the US." Region-less pages already followed the visitor (US in the server HTML), but a
regional page kept whoever arrived on it. `REGION_BOOT_SCRIPT` (`apps/dexcompare-sealed/src/lib/region-boot.ts`, inline
in the root layout, before paint) now moves a person, never a crawler, link preview or audit tool, to the same page in
their region through the page's own hreflang alternate (a page with no copy there stays): the region they last browsed
(`dex-region`), else their time zone's, else the US. `<main>` is hidden for at most 1.5 s. No request, no cookie; the
same script runs on MTG Compare and WargameCompare.

## DexCompare contact address: compareempire@gmail.com, in the footer — 2026-11-01

The owner: "the sites that they don't [have their own email], just use compareempire@gmail.com", and contact info
"really clear on all of our websites". `apps/dexcompare-sealed` `CONTACT_EMAIL` falls back to the Compare Empire family
inbox instead of riftcompare@gmail.com (another brand's), and the footer now shows it as a mailto beside the Contact
link on every page. `NEXT_PUBLIC_CONTACT_EMAIL` still overrides it. No form and no mail service.

## 2026-11-02 — DexCompare: free price widgets

`apps/dexcompare-sealed` gets MTG Compare's widgets: `/widgets/p/<slug>?region=` is a live Pokémon sealed price badge
any blog, newsletter or store can put in an `<iframe>` (the cheapest in-stock independent store price in the region,
never a marketplace, and how many stores have it), reading only the public data files through `productPage`, noindex,
kept a day by the CDN like every data page. Only `/widgets/:path+` may be framed. `/widgets` shows the snippet (iframe
plus one plain text link, the part search engines credit) with a real in-stock product, and a plain-HTML store badge.
The daily outreach offers it instead of asking for a link (owner, 2026-11-02: growth must be passive). Named
`/widgets` to match MTG Compare, whose `/embed` is taken by an old redirect.


## 2026-11-02 — Every set in the set list gets a pre-order page, guide or not

Pre-order landings were the family's top pages in October, but here a set had one only when a session had written its
`PreorderGuide` (sourced facts) in `apps/dexcompare-sealed/src/lib/preorder-guides.ts`. Now a set in `apps/dexcompare-sealed/src/lib/sets.ts` without a guide gets
`/<region>/preorders/<slug>` from `blankGuide`: the set's name and dates, every store's price list and the generic FAQ,
and nothing a source would have to back (no contents, prerelease, card count or sources line; those sections hide).
Adding the next set to `sets.ts`, which the importer needs anyway, is the whole job; a guide written later fills the
same page. `openPreorderGuides` (nav, header banner, homepage, sitemap) lists every unreleased set. A guide-less page
stays up for 45 days after release (noindexed, saying the set is out, as before) and then 308s to the set page.

## 2026-11-02 — DexCompare seasonal sale pages

`/<region>/boxing-day`, `/<region>/january-sales` and `/<region>/lunar-new-year` (owner-approved growth plan,
2026-11-02): one URL per region, kept every year like `/<region>/black-friday`, built weeks ahead so they are
indexed before the day. One component (`src/components/SaleSeasonPage.tsx`) with exactly the Black Friday
page's rows: furthest under the median of the region's stores, under their own 30-day typical price, and in
the US under MSRP. Every region has its own copy, so nothing is region-locked; the intro states where the day
is a sale day (Boxing Day: Australia, New Zealand, the UK and Canada) as a fact, not as the page's market.
Dates, the year a page is about (it rolls over a week after the event) and the copy are pure in
`src/lib/sale-seasons.ts`, checked against BANNED_COPY in `tests/sale-seasons.test.ts`; Lunar New Year is a
published-date table to 2040 (6 February 2027). Footer and sitemap always; the region home shows a card from
a few weeks before each event. Never a "was" price, a countdown or an invented sale.

## 2026-11-02 — DexCompare: price alerts through RiftCompare's shared service

The owner chose "Yes, one shared service" for email price alerts on the sister sites. The site still has no accounts,
no database read from a page and no mail key; the product page gains an "Email me when the price drops" form.

- **The form** (`components/PriceAlertForm.tsx`, the same file on every sister site) posts
  `{site, productId, region, email, targetCents}` straight to `https://riftcompare.com/api/sister-alerts`.
  RiftCompare keeps the address (its own Neon project, private tables), sends one confirmation email (double opt-in)
  and checks daily. This site stores nothing and holds no key.
- **The prices** come from this site's own static `/alert-feed.json` (`apps/dexcompare-sealed/src/lib/alert-feed.ts`, `force-static`, built with
  each release from `data/public/products.json` and `product-stats.json`): each product's `lowestPriceCents` per
  market (the cheapest open offer, TCGplayer included in the US, never eBay, never converted), with `u` =
  `/{r}/p/<slug>` (the service fills in the region), plus up to three of the site's own deals per market (the
  `isDeal` bar, re-stated in `feedIsDeal` because `deals.ts` reaches the database layer and this file is prerendered;
  a test pins them equal). Another site's alert email of the same group may end with one of them.
- The privacy page says what the form sends and links to RiftCompare's. RiftCompare's `sister-alerts.yml` fails (and
  its ops monitor reports it) when a site with alerts serves no fresh feed.

## 2026-11-02 — DexCompare: share buttons

The owner wants word of mouth to be a big growth driver on every site (RiftCompare's DECISIONS has the twelve-site
entry). The product page's Share button (already the phone's share sheet, else a copied link) now sends a message
with the real price gap in that region (`lib/share-link.ts` `priceGap`: cheapest and dearest in-stock store, never
converted, TCGplayer left out), and the quick view has the same button (`/api/quick` returns the message). When a
region shows a gap, the product's og:image is `/og/p/<region>/<slug>`, a share card drawing it; it is a plain
function kept by Vercel's CDN for a day, never ISR, nothing prerendered, so only shared links cost a render. Every
shared link carries `utm_source=share&utm_medium=<product|set>`. The button sends a Vercel `share` event,
`ShareArrival` one `share_visit` per tab when a shared link brings someone, and RiftCompare's weekly growth report counts both. robots.txt allows `/*utm_source=share` because X's and
Reddit's preview fetchers obey it. No shared-list page: the site has no list to share yet.


## Sites that grow each other: the family feed, cluster blocks and short footers (2026-11-02)

Owner, 2026-11-02: "We need each site to help each other grow as a team effort", and the
footer family lists were "a bit convoluted … I'm wondering if it actually helps". Plan:
"Sites that grow each other" in the consolidation doc (https://claude.ai/artifact/QjrWGrfBqH4sKctwdjwptK).

- **Three clusters** (`src/lib/family-network.ts`, the same file in every repo): card games
  (Rift, OP, Dex, MTG, Gundam, Lorcana, YGO, Cyberpunk), hobby (Wargame, Figure, Gunpla on
  Gundam Compare) and tech (Compare Empire, CamCompare). KaeYoung stays out.
- **The family feed.** Each site's own daily data job writes `family-feed.json` (its best real
  deals and pre-orders today, per region) beside the data it already commits, and copies its
  cluster sisters' feeds from raw.githubusercontent.com into `family-cluster.json`. Pages read
  the committed file: no database of another site, no request-time fetch, no new function. A
  feed older than four days, from the wrong site, with a link off its own host or a saving that
  isn't the arithmetic of its two prices is dropped (`validFeed`), so a block shows less, never a guess.
- **One block per page**, on the deals, Black Friday and pre-order pages: one tile per sister with
  its best item in the visitor's region, else the US price in its own currency. Labels never name
  a country. Plain followed links inside a cluster.
- **Footers: one short line.** The sites of our own cluster by name, then one "A Compare Empire
  site" link to https://compareempire.com/network, which lists every site. Why: nothing counts
  footer clicks, footer links get few, and Google gives little weight to sitewide links between
  one owner's look-alike sites (12 sites all cross-linked in every footer is the pattern it can
  read as a link scheme). Cross-traffic should come from the price blocks, which people have a
  reason to click.
- Here (DexCompare): `apps/dexcompare-sealed/src/lib/family.ts` (deals per region from `dealsInMarket`, the cheapest independent store named), `scripts/family-sync.ts` in `dexcompare-sealed-import.yml` before the publish, the block on `/[region]/deals`, `/[region]/black-friday` and `/[region]/releases`, and the footer's "Other card games" line. `SISTER_SITES` is gone.

## 2026-11-02 — Amazon Associates: following the Operating Agreement's Dos and Don'ts

The owner sent Amazon's own "Operating Agreement: Top Dos and Don'ts" page (2026-11-02: "make sure you
are following these instructions for all amazon affiliates"), and every site was audited against it.
The rules we keep, on every Compare Empire site:

- **Disclosure beside every Amazon link** ("Ad" / "Paid link"), and Amazon's statement "As an Amazon
  Associate I (we) earn from qualifying purchases." in the footer of every page.
- **Amazon's trademark notice** in the footer of every page: "Amazon and the Amazon logo are trademarks
  of Amazon.com, Inc. or its affiliates." No Amazon logo, screenshot, review or Amazon's own colours
  (its orange): the page "Don't use style or color of Amazon site which may cause confusion".
- **Links lead to a specific product** (an ASIN, or a search for that exact product's name), never a
  category or generic search: "All the links or buttons on your site should take customers to specific
  products on Amazon."
- **No Amazon link in a pop-up or layer**: the quick views show none; product pages carry the row.
- **Never Amazon prices in price tracking or alerts** ("Don't track prices or set price alerts"), and no
  Amazon link or trademark in any email, SMS or printed material.
- Every link tagged, rel="sponsored nofollow"; no incentive (cashback, discount) for buying through it.
- DexCompare: the Amazon category searches on set, type and Japanese pages and at the end of each guide
  are gone; the quick view sends no Amazon row; the footer carries the trademark line.

## 2026-11-02 — DexCompare: the region chooser in the hero, with drawn flags

Owner: "the region switcher must be more prevalent on all sites, on the main home page hero etc … and have
the flags as well". Every region home has a "Prices for" row of flag + code chips under its search
(`RegionChips`: plain links to each region home, which every region has, so they are followed), and the
landing page has the same row above its search, picking in place like the header's soft switcher
(`pickRegion`; without script the links go to each region home). The header switcher stays.

- **Flags are inline SVG (`apps/dexcompare-sealed/src/components/Flag.tsx`), not the `REGIONS[].flag` emoji and not image files.**
  Windows draws a flag emoji as two letters ("AU"); image files would be new requests and hosting. No ids or
  clip paths, so a flag works inside the closed `<details>` menu and many times on a page. Every place that
  drew the emoji (header switcher and its list, phone menu tiles, sidebar, footer, region grid, store and
  product pages) now draws it; `REGIONS[].flag` stays for plain-text uses. The same file is in every Compare
  Empire repo that has a region switcher; keep the copies identical.
- Chips show the code, not the name: seven full names wrap even at 1280px. The name is the title and the
  screen-reader text.


## 2026-11-02: Nobody is moved to another region on a guess

Since 2026-11-01 `lib/region-boot.ts` moved every visitor on another region's page to their time zone's copy in the
browser. Crawlers were excluded, but Search Console then read regional copies as duplicates on Compare Empire, which has
the same script, and Google's guidance is not to redirect automatically on a guessed location. Now only a visitor who
PICKED a region (any `[data-region-pick]` link, kept in localStorage) is moved; everyone else stays on the URL they opened
and gets one line at the top, "This page shows <X> prices. Switch to <Y> prices · Stay", linking the page's own hreflang
alternate ("Stay" remembers the page's region). Crawlers never see the line. The script is byte-identical on MTG Compare,
DexCompare, WargameCompare and CamCompare.

## 2026-11-02 — At most one production build every 12 hours, and no branch but production deploys

**Why.** The owner capped Vercel spend at $5–6 a day across every site. 1 November cost $11.82 (normally
$2–4), and Build CPU was the largest line ($4.26), followed by CDN requests and ISR writes, which every
build multiplies (a deploy empties the page cache, so the next crawl re-renders and re-writes every page).
The `[deploy]` gate itself held; its premise did not: sessions landed 7–14 `[deploy]` commits a day per site
(manual "release now" runs and `[deploy]` in merge subjects), RiftCompare, OP, MTG and DexCompare alike.
Compare Empire's site built on every push to its production branch (84 commits that day) and CamCompare on
every three-hourly price commit, because neither had the gate.

**What.**
- `scripts/vercel-ignore-build.sh` skips a production `[deploy]` commit when the last production
  deployment (`VERCEL_GIT_PREVIOUS_SHA`, set by Vercel in that step) is under 12 hours old; the commit
  rides the next release. `[urgent]` in the SUBJECT overrides it, and only when the owner says a release
  cannot wait. An unset or unreadable last deployment builds (fail open). `tests/deploy-gap.test.ts` pins it,
  and the file is the same in every Compare Empire repo.
- `vercel.json` `git.deploymentEnabled` starts with `"**": false` and enables only the production branch
  (Vercel: when a branch matches several rules, any `true` wins). No preview is built for any branch or pull
  request, `[preview]` included; the older per-branch `false` entries stay for orphan commits' own copies.
- So "push to prod" means land on the production branch; the release reaches visitors within a day.

## 2026-11-03 — Footers link only card sites to card sites; every other site lists no sisters

The owner asked whether linking every Compare Empire site together helps or is a risk for search and for how the
sites look. Verdict: a sitewide footer link between sites one person owns carries little ranking value (Google
discounts it), and a mesh of unrelated sites (camera, appliance and figure sites in a card site's footer) can read
as a link network and looks odd to a reader. The owner said do it.

- `footerSisters()` in `lib/family-network.ts` (same file in every repo) now returns the other card sites for a card
  site and nothing for any other site. Gundam's Gunpla side no longer pulls WargameCompare and FigureCompare into its
  footer; the engine footer's heading is "Other card games".
- WargameCompare, FigureCompare, CamCompare and Compare Empire show no sister list in their footers, only one
  "A Compare Empire site" link to compareempire.com/network (Compare Empire: its own /network), the one page that
  lists every site. KaeYoung still links none.
- Anchors stay the brand name only, and links stay plain followed links: they are honest links between sites with
  one owner, not paid, so no `sponsored`/`nofollow`.
- Kept: the "Other card games" / hobby / tech price blocks on deals, Black Friday and pre-order pages
  (`clusterSisters`). They sit on a few pages, show real prices a reader of that page may want, and are not sitewide.

## 2026-11-03 — DexCompare: set guides for every Mega Evolution set, linked from the home pages

The owner said DexCompare's traffic is good but almost none of it comes from search, asked for many more posts on new
and upcoming sets (chase cards, rarities, new mechanics) to catch those searches, and wants the AdSense application,
rejected once, approved.

- Nine guides (`src/content/guides`): one per Mega Evolution series set that had none (Mega Evolution, Phantasmal
  Flames, Ascended Heroes, Perfect Order, Chaos Rising, 30th Celebration) and for Flowing Fists (5 February 2027,
  added to `lib/sets.ts`, so its pre-order hub and release-calendar row build themselves), plus two explainers:
  Legendary Stadiums (Delta Reign's new card type) and every Mega Evolution ex so far. Each set's facts live once,
  in `REVEALS` (`set-reveal.tsx`), with the source and the day it was read; the explainer tables read the same
  entries. Card names, counts and mechanics come only from the publisher's announcement (pokemon.com, its press kit
  as PokéGuardian reprints it, its press site) or, for the Japanese-only details, a named report labelled as such.
  Still no single-card prices, odds or pull rates.
- Not written: release-date or "card list" posts for sets that already have a page owning the query (`/releases`,
  `/preorders/<set>`, `/sets/<set>`): two of our own pages on one query cap both.
- Crawl paths: the newest six guides are plain server-rendered links on every region home and on the landing page
  (`LatestGuides`), and the guides index lists newest first. The landing page grows by that one section; the rest of
  its 2026-10-25 "short page" rule stands.

## 2026-11-03 — DexCompare's logo is a ball again (owner: "bring back the Pokéball")

The owner missed the Pokéball-style mark the site launched with: it said "Pokémon" at a glance in the tab, in
Google's results and in the header. The 2026-11-01 booster pack (#84) is replaced by a red-and-white ball.

- It is ours, not the official ball: the band is tilted (−14°), the button holds the brand's yellow price spark,
  and the colours are DexCompare's red and ink. Don't straighten the band or draw a plain button.
- One source: `apps/dexcompare-sealed/src/lib/logo-mark.ts`. The header/footer/phone-menu mark, `icon.svg`,
  `public/logo.svg` and both share-image renderers draw from it; `favicon.ico` (16/32/48), `apple-icon.png` (180,
  on white) and `public/logo.png` (512, the Organization/publisher logo Google reads) are rendered from it. The
  new `manifest.ts` lists them. `tests/logo.test.ts` fails if a copy drifts. No ids, gradients or clip paths, so a
  copy inside the hidden phone menu still draws.

## 2026-11-03 — The quick view shows the product's own link

**Why.** Owner: "quickview popup should have a link change as well for all sites, instead of using the same link". The
pop-up kept the list page's URL, so a copied or bookmarked link lost the product, and Back left the page instead of
closing the pop-up.

**What.** Opening a quick view pushes the product page's own existing URL (/<region>/p/<slug>) with `history.pushState`
(`src/lib/quick-view-url.ts`, the same file on every site). Back closes it and restores the list's URL, Forward reopens it,
closing it (×, Escape, the backdrop) steps back, so the history never fills with pop-ups. "See price history and details"
only hides the pop-up and navigates to the URL already shown, which Next turns into a replace: Back from the product page
goes to the list. The entry copies Next's own history state (`__NA` and the router tree), so the app router passes the
push through and the page under the pop-up never re-renders.

**SEO.** No new URL exists: the link is the canonical product page, which a reload, a share or a crawler gets in full
server HTML. Never a `?view=` or `#` variant (duplicate URLs, extra CDN copies). Pinned by `tests/quick-view-url.test.ts`.

## 2026-11-03 — DexCompare SEO audit: alt text on every photo; schema and landing already in place

The owner's 2026-11-03 SEO audit asked DexCompare for FAQPage and Product schema, alt text and a fuller homepage.

- Every product, set-logo, eBay, guide-thumbnail, family and embed photo now carries the product, set or listing
  name as its alt. `apps/dexcompare-sealed/tests/seo-audit.test.ts` fails on an `<img>` with `alt=""` outside the
  share images and the quick view.
- Already in place, not rebuilt: Product + AggregateOffer and BreadcrumbList on product pages, FAQPage on `/about`
  and every guide, ItemList on set, type and deal pages, hreflang on region pages.
- The landing page stays short (owner's rule of 2026-11-03, `tests/shell.test.ts`: hero, fair paragraph, newest
  guides, no FAQPage); its FAQ lives on `/about`, and the region homes carry "How DexCompare works".
- The family block's heading is "Deals on other card games", as on MTG Compare: the Black Friday copy test bans
  "on sale" and was failing on `main`.

## DexCompare: Rate us and "What people say", run by RiftCompare (2026-11-03)

The owner wanted RiftCompare's rating pop-up on every site, each site's reviews public, and every written review approved in
RiftCompare's admin; star ratings count at once. DexCompare stores nothing: the corner card
(`apps/dexcompare-sealed/src/components/site-reviews/RateCard.tsx`, in the root layout) posts cross-origin to
`https://riftcompare.com/api/site-reviews`, and the region home's "What people say" reads the score and approved reviews from
`https://riftcompare.com/api/site-reviews/dex` in the browser (public JSON, CDN six hours): no function, no data read. The card
copies RiftCompare's corner card, not its rating drive: never on arrival, after 4 pages and 3 minutes or on return from a store
tab, at most three times 14 days apart, always closable; "Rate us" in the footer opens it. No email asked for, never review
markup. RiftCompare's DECISIONS.md, "Every site's reviews, approved in one queue".

## 2026-11-03 — DexCompare: eBay and TCGplayer rails beside the page, and the mini pair in every quick view

The owner wanted more of the image ads on DexCompare: first "a very small eBay sealed ad" on the home page, then, seeing the
empty space either side of the content on a wide screen, "the left side could be eBay and the right side TCGplayer … only if
you can fit it. If you can't fit it, then don't use the ads", plus "a tiny visual" with every quick view: one side-scrollable
TCGplayer row and one eBay row. Amazon for sealed product stays where it already was: the third pinned row of every product
page (`dexcompare-22` in Australia), never in the pop-up (Associates Operating Agreement, 2026-11-02 entry).

- **Side rails** (`apps/dexcompare-sealed/src/components/SideAds.tsx`, mounted by the region layout): real sealed eBay listings
  stacked down the far left (`listings-side`), the newest sets' TCGplayer products down the far right (`tcgplayer-strip-side`),
  fixed outside the 1480px shell under the sticky header. They exist only in the browser and only from 1864px wide
  (shell + two 160px rails with gutters): nothing in the server HTML, so crawlers, laptops, tablets and phones are unchanged and
  the layout never shifts. As many tiles as the window's height fits, never a clipped one; too short for one tile, no rail. The
  eBay rail reuses the strips' `useListings` (one `/api/ebay/<region>?c=sealed` request, shared with the home strip); the
  TCGplayer tiles are the pre-footer strip's props. Labelled Ad, every link rel sponsored. Not a pop-up: nothing moves or covers
  content, so the pop-up policy (TCGEmpire #293) is untouched.
- **Quick view**: the product page's own `MiniSealedAds` pair (56px tiles: the product's eBay listings, the set's TCGplayer
  products) above the price rows, under `listings-quickview-mini` / `tcgplayer-strip-quickview`. `/api/quick` now returns the
  tagged TCGplayer tiles and the eBay context; a response the CDN kept from before falls back to the eBay search row.
- The home page's existing sealed strip, chase strip and TCGplayer strip stay as they were.

## 2026-11-03 — DexCompare: new Pokémon sets find themselves (TCGplayer's catalogue)

The owner (2026-11-03): "We need a fresh pipeline of new products for all our sites, that's where our demand is. For
example the Pokemon preorder." DexCompare's pre-order pages, Coming soon block and set pages already followed
`lib/sets.ts`, but that list was typed by hand, and until a set was added every store pre-order naming it was refused.
Same fix as MTG Compare's (Specifxx/mtgcompare #66), with TCGplayer as the source because Pokémon has no Scryfall.

**What.** The sealed import first runs `apps/dexcompare-sealed/scripts/discover-sets.ts`: TCGCSV's Pokémon group list
(TCGplayer's catalogue as public JSON) and, for each candidate, its product list. The result is
`apps/dexcompare-sealed/data/sets/discovered.json`, committed with the data snapshot and merged into `SETS`.

- A group is taken when it is due within 180 days (or out within 60), is not a promo, gallery, vault, deck, league or
  event group, and TCGplayer itself lists an Elite Trainer Box or booster product in it.
- `noBoosterBox` unless TCGplayer lists a Booster Box or Display: a store's "booster box" of a set that never had one
  is a store-made lot, so it is refused until TCGplayer shows the real one.
- Name and street date are TCGplayer's (`publishedOn`); code from its abbreviation (ME08 → me8); series from that
  prefix, else the newest hand-written set's. The slug is fixed when first seen (a live URL).
- TCGplayer re-stamps old groups' dates (POP Series read "2026-11-02"), so only group ids above the newest
  year-old known set's are read: ids only grow.
- Refused and listed in the job summary: a name under four letters, and a name inside a known set's name.
- TCGplayer opens a set's group only weeks before release (2026-11-03: Delta Reign yes, Flowing Fists, Feb 2027,
  not yet), so a set announced earlier is still added by hand for its early pre-order page; discovery is the safety net.
- A hand-written entry with the same code or slug always wins. Never fails the import.
  `apps/dexcompare-sealed/tests/set-discovery.test.ts`.
## 2026-11-03: DexCompare gets a Creators page and a homepage bubble, like RiftCompare's

Owner: "having the creators page for all of these sites as well is really, really good. Like just a bubble and then a
really nice formatted creators page, just like how RiftCompare does it." Word of mouth from creators and visitors is the
sites' main growth channel, so every site gets one.

`/creators` (`apps/dexcompare-sealed/src/app/(site)/creators`) is RiftCompare's page in DexCompare's theme, without the
parts that need a database: the list is the static array in `src/content/creators.ts` (empty until the first creator
agrees; the grid shows "Your channel here" spots, never an invented creator), applying is a pre-filled email to
`CONTACT_EMAIL`, and there are no creator codes. "Buy them a pack" is the creator's own Ko-fi, Patreon or tip page: the
site never handles the money. `CreatorsCornerBadge` is the bubble in the landing hero and every region home (top-right
from sm, a centred pill on a phone); the sidebar's "More", the footer and the static sitemap link the page. Prerendered
like /about: no data or request read. Not called "partners" anywhere: that word means the affiliate links.

## 2026-11-03 — DexCompare: the daily Price Duel, on sealed prices

The card sites' share loop (Gundam, Lorcana, YGO, Cyberpunk, OP: `/daily`, a Wordle-shaped "which is worth more?") comes to
sealed. `/<region>/daily` (`src/lib/daily.ts`, `daily-data.ts`, `components/DailyGame.tsx`): ten pairs of in-stock products a day,
the one that costs more at the region's cheapest in-stock store price wins, an emoji grid and a streak to paste anywhere
(`utm_medium=daily`; Vercel events `daily_done { score }` and `share { kind: "daily" }`). Why: price comparisons are not shared,
scores are; the growth report of 3 Nov counted 14 share taps and 0 visits in a week.

- Per region, not global: the answer is the region's own price, in its own currency, from the browse index the region page already
  reads (one `marketProducts` read, CDN-cached a day with a week of puzzles inside; the client picks today's at midnight UTC).
- A product is picked by a hash of (day, slug), so an import that adds or drops products keeps almost every pair; a pair is only
  made from prices 1.25 to 8 times apart so a day's moves don't flip an answer; nothing under 5 units (packs, sleeves) or over
  2,000 (cases) plays; a sold-out or TCGplayer-only row never does. Puzzle #1 is 2026-11-03; never move the epoch.
- Linked from the sidebar's "More", the footer and the sitemap. `tests/daily.test.ts`.

## 2026-11-04 — DexCompare: big-store gap, 7 stores from the per-region research

The owner asked for every big store captured with no gaps, on every site. Research per region named 23 Pokémon sealed
candidates not in `apps/dexcompare-sealed/src/data/stores.json`; a runner probe (`scripts/probe-stores.ts`) read each
the way the import does, and seven read sealed Pokémon in their region's currency: **Eclipse Games** (AU: 167 sealed, 48
in stock), **Hobbyco** (AU: 177 sealed), **Mind Games** (AU, the national chain, WooCommerce: 19 sealed), **Card Chasers**
(CA: 81 sealed, 78 in stock), **Magic Traders** (EU: 323 sealed, 83 in stock), **Game Roost** (NZ), **Gaming Otaku**
(SG, WooCommerce: 36 sealed, 31 in stock). Read but too thin to list (one to three products): Cura Cards, OBO Collectibles,
Card Giants; no Pokémon sealed at all: Games Paradise, Jenes, Gumnut, Eclipse TCG (Japanese only), Toyworld NZ (toys),
Capybara, Card Arena, Games Haven, Jeux Kingdom, Leisure Games, Team Board Game; ILAN TCG and Madatsu state no currency.
Not addable, and why (the same list every card site hit): the biggest US and UK names run platforms with no public feed or a robots.txt that forbids reading — BigCommerce (Star City Games, Game Nerdz, Game Goblins, ToyWiz, Magic Madhouse), CrystalCommerce stores whose robots.txt disallows everything (Three Kings Loot, Carta Magica, Gamekeeper, The Connection, Card Titan, Collector's Cache, Nerd Rage, Pastimes), bot walls that answer 403 or a Cloudflare challenge (Chaos Cards, Big Orbit, Wayland, Firestorm, Mighty Ape AU and NZ, Gamesmen, EB Games, MTG Mate, Imaginaire, Le Valet, Bazaar of Magic, FantasyWelt, Keepseven, Nedgame, Poromagia, Dave & Adam's, Pro-Play, Pokémon Center, Red Hobby) and custom storefronts (Card Kingdom, CoolStuffInc, ABUGames, CoreTCG, Ideal808, Noble Knight, Miniature Market, Play-in, Parkage, Agora Hobby, Hobby Master NZ). A bot wall is never worked around. A BigCommerce reader would unlock the most (Star City Games, Miniature Market, Game Nerdz, Magic Madhouse, Game Goblins) and is the next adapter worth writing.

## 2026-11-04 — DexCompare: stores without a feed, BigCommerce and Shopware read from their category pages

The big-store gap report named BigCommerce as the one platform worth an adapter. `apps/dexcompare-sealed/src/lib/storefront-html.ts`
(the same file as MTG Compare's, ported from OP Compare's `lib/bigcommerce.ts`) reads a BigCommerce Stencil category page
(`/<path>/?limit=100&page=N`: one `<article class="card">` per product with its title, price and "Add to Cart" / "Out of stock" button)
and, since Miniature Market turned out to run Shopware 6 rather than Magento, a Shopware listing (`<div class="card product-box">`,
paged with `?p=N`, a `btn-buy` button or a stock-notify form). The importer (`readHtmlStore`) and `scripts/probe-stores.ts`
(`platform: "bigcommerce" | "shopware"`, `collections` as category paths) put such a store through the same `identify()`, currency,
floor, outlier and staleness rules as a Shopify or WooCommerce read. A first page with no product grid is a failed read, never an
empty category, so a theme that draws its grid in the browser can never empty a store's rows. The pages state a currency only
sometimes ("699.95$ AUD", JSON-LD); a page that states another currency is refused, one that states none is taken on the registry's
word, which the probe says in its output.

Probed from a runner the same day (bot User-Agent, robots.txt honoured): **Miniature Market** (US, Shopware, 90 Pokémon sealed) and
**Grand J Games** (AU, BigCommerce: its general Pokémon category, 20 sealed products in the probe's first three pages, plus its
pre-order category) read and were added. Game Goblins (US, BigCommerce) reads but lists one Pokémon product: not added. Magic
Madhouse (UK) serves a bot challenge on every page but its sitemap: out, never worked around. Star City Games, ToyWiz and Game Nerdz
are BigCommerce stores whose grids are drawn by JavaScript (no product in the HTML): not readable this way, and not worth a headless
browser. Their homepages and category pages were fetched once each for this check and nothing else.

## 2026-11-04 — List your store: stores come to us

The owner stopped cold email outreach ("not really doing anything") and set the aim: be popular enough that stores
ask us, and encourage the ones that do. Every Compare Empire site now has `/list-your-store` (shared
`ListYourStore.tsx` + the `ListStore` form in `ReportForms.tsx`), linked from the footer, `/contact` and the stores
page: what a store gets (free, no contract, never pays to rank), what we need (a readable shop, own currency,
established), and what happens next (checked within a few days, reply through the store's own contact details).
The request is filed as a `suggest-store` report with `issue: "owner"`; RiftCompare's daily reports triage puts
those first and asks for a reply within two days. No email is asked for (the reports branch is public); no pop-up,
no cold email. RiftCompare and OP Compare keep their `/stores/suggest` page (now the owner pitch) and redirect
`/list-your-store` to it.
