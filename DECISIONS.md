

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
