# DexCompare (sealed)

Pokémon TCG **sealed product** — booster boxes, Elite Trainer Boxes, booster
bundles, collections, tins, blisters, decks and packs — compared across
independent stores in seven regions (AU, US, UK, CA, NZ, EU, SG), with live
stock.

This replaces the old singles-focused DexCompare in `apps/dexcompare` (20k
cards, price history, eBay Browse API, marketplace, forum). That app is left in
place untouched; nothing deploys from it once the Vercel project points here.

## What it does

- **Compares** every tracked store's listing of a product in one region, in
  that region's currency: in stock first, cheapest first.
- **Tells the truth about stock**: each listing is *In stock*, *Pre-order*
  (in stock, set not yet released), *Sold out*, or *Not checked recently* (the
  store couldn't be read for 72h). The headline "from" price is only ever an
  orderable listing. (Ported from Rift Compare's `sealed-offers.ts`.)
- **Earns** through affiliate links, and only two kinds (`src/lib/affiliate.ts`):
  - **eBay Partner Network**: *search links* (Buy It Now, the region's eBay site; NZ uses
    ebay.com.au, SG ebay.com) and **real eBay listings** as image strips. The listings are
    imported **once a day** by a GitHub Actions job with DexCompare's own Browse API keys and
    stored in the database; the website never calls eBay and holds no eBay credential (see
    "eBay listing strips" below and DEPLOY.md, "eBay listings: the daily import").
  - **TCGplayer via Impact**: every tcgplayer.com link is wrapped in the
    partner deep link at render time; the database only holds plain URLs.
    TCGplayer is a US marketplace: in the US its offer is compared with the
    stores and ranked by price and stock like any store (badged
    "Marketplace", never counted as a store); in other regions it appears only
    in the product page's Marketplaces panel, labelled US$, and never in the
    region's ranking, "from" price or JSON-LD.

  Search links and TCGplayer links carry a sub-id, `dex-<region>-<placement>` (EPN `customid`, Impact
  `sharedid`), so the networks' reports say which surface earned; eBay LISTING tiles use eBay's affiliate URL exactly as eBay
  returned it, whose `customid` is a per-feed `dex-<market>-<feed kind>` (the surface is in the `buy_click` event). Placements
  are listed in `PLACEMENTS` (`src/lib/affiliate.ts`) and, with where each
  renders, in DEPLOY.md, "Click events". Store links go out untouched. Every
  group of affiliate links carries its own disclosure, and every outbound buy
  link (`src/components/OutboundLink.tsx`) records a Vercel `buy_click` event
  with `retailer` and `placement`.

### eBay listing strips

eBay is on most pages as image banners of real listings (`src/components/EbayStrip.tsx`, the look of Rift
Compare's "Chase cards on eBay" strip): the eBay wordmark, "AD · LIVE LISTINGS ON EBAY", a headline per feed
("Chase cards on eBay", "Sealed Pokémon on eBay", "<Set> chase cards on eBay", "<Product> on eBay",
"<Type> on eBay") and **how old the data is** ("Updated 9 h ago"), a row of six tiles (four in the slim strip above
every footer): portrait photo, title, price exactly as eBay returned it (A$717.90, US$24.99, never converted),
shipping called out ("Free shipping" / "+ A$12.00 shipping"; NZ and SG, served the AU / US feeds, make no shipping claim), the condition when it is not new, and an arrow link.
Under every strip: "Affiliate link: as an eBay Partner Network affiliate, DexCompare earns from qualifying purchases — at
no extra cost to you. Listings are imported from eBay about once a day (updated 9 h ago), so price and availability may
have changed; check eBay."

* **Where**: the region home (a chase strip under the stats row and a sealed strip after the first rail), the landing page
  (US feed), product pages (an eligible product's own listings, directly under the sold-out callout when sold out, below the
  offer table when in stock; any other product its type's or generic sealed), set pages, type pages, `/<region>/sealed`
  (a strip on a row of its own after the first four products of page 1 and ONE real listing as a labelled sponsored card after the 12th product),
  releases, store pages (after the list), the 404 and a slim strip above every footer except a region's home. On set and type pages the strip is also
  after the first four products, so the list the visitor came for stays the first and largest thing on the screen. The header keeps its small "eBay" search item, and a product's
  Marketplaces panel its eBay and TCGplayer search rows. With **nothing to list** (before the first import, the kill switch, rows
  older than the age bound) a unit is one compact row: wordmark, "Ad" and a "Search Pokémon sealed on eBay" button.
  There are no text-only banners, chip rows or "Still deciding?" rows.
* **Data flow**: `scripts/ebay-import.ts` (once a day, GitHub Actions) → `EbayListing` (≤ 8 rows per feed, REPLACED per feed,
  never appended, deleted after the age bound + 4 h) → `GET /api/ebay/<region>?c=<context>` (a read of those rows: no eBay call,
  no token, a cascade item → type → sealed, set → chase, type → sealed) → the strip, which fetches from the browser once it is
  within ~300 px of the viewport, into a box of reserved size (CLS 0). Pages stay ISR.
* **Always**: plain `<a>` links through `OutboundLink` (`rel="sponsored nofollow noopener noreferrer"`, one `buy_click`
  `{retailer, placement}` per click, the href eBay's own URL, unedited), thumbnails from `*.ebayimg.com` as plain lazy `<img>`
  (no-referrer; a tile whose picture fails hides itself), an "Ad" label and the disclosure, a unit of their own (never inside a
  ranked table or row), no derived statistics, no script or iframe, no sticky or overlay, never in JSON-LD, meta, OG or the sitemap,
  and at most one unit in a phone viewport (two on a desktop one: the header's item is one of them). The rules that keep units apart
  live in `src/lib/ebay-ads.ts` (pure, tested). **When adding a unit, run the viewport sweep** (a Playwright scroll at 390×844
  counting `[data-ad]` elements in view, and the layout-shift total).
* **Licence**: eBay's API License Agreement 8.1(c) asks listing information to be at most six hours old (and other eBay Content 24 hours); a daily import is not, which
  is disclosed on every strip and **switchable to a compliant mode: the cron, `EBAY_LISTING_MAX_AGE_HOURS` (GitHub variable and Vercel) and a lower `EBAY_RUN_CAP`**; the strips' wording follows the bound by itself (DEPLOY.md, "The switch to compliant mode").
* **Call budget**: 2,400 of eBay's 5,000 calls a day for the keyset (the owner's other site may share it: DEPLOY.md says what to do), counted in the database per
  Pacific day; the schedule is 08:37 UTC, the first slot after the Pacific reset in both PST and PDT. The importer stops on a 403 or 6 failed searches in a row.
* **Testing without keys**: `tests/ebay-*.test.ts` use fake fetch/database (fixtures in `tests/fixtures/`). For a browser run, import
  against a mock: preload a fetch stub that answers `https://api.ebay.com/*` with `NODE_OPTIONS="--import mock.mjs" npx tsx
  scripts/ebay-import.ts` (the code has no host override: it can only talk to api.ebay.com), then start the site on the same database.

## What this site does not store

No price history, no stock history, no event log, no accounts, no emails. Every table is
current state only (`prisma/schema.prisma`):

| Table | Holds |
| --- | --- |
| `Product` | one row per sealed product (market-agnostic) |
| `Offer` | each store's current listing of a product |
| `ProductStat` | per product × region: cheapest open price (TCGplayer's included), independent stores in stock and listing it (never TCGplayer), and whether TCGplayer has it (`marketplaceOpen`) — recomputed each import |
| `StoreStat` | per store: listings, in stock, last successful read |
| `EbayListing` | the eBay strips' data: ≤ 8 listings per feed, replaced per feed by the daily eBay import, deleted after the age bound + 4 h (transient, not history) |
| `EbayCallDay` | eBay Browse calls made per budget day (one small row a day) |

## How it works

```
GitHub Actions (twice a day)               Vercel (Next.js 14, ISR)
.github/workflows/dexcompare-sealed-import.yml
  └─ scripts/import.ts                      pages read ProductStat/Offer,
       ├─ src/lib/importer.ts               scoped to one region/product
       │    reads each store (feeds.ts)     └─ cached until the next import
       │    identify() every title          ← POST /api/revalidate
       │    replaces that store's offers
       │    recomputes ProductStat
       └─ POST /api/revalidate

GitHub Actions (once a day)                 /api/ebay/<region> reads EbayListing
.github/workflows/dexcompare-ebay-import.yml  (no eBay call, no secret) for the strips
  └─ scripts/ebay-import.ts  → EbayListing (replace per feed) + EbayCallDay (atomic call counter)
```

- **Stores** live in `src/data/stores.json`: Shopify stores are read through
  `/collections/<handle>/products.json`, WooCommerce stores through the public
  Store API. Both check robots.txt, pause between requests, and back off on 429.
- **Currency guard**: a store is only read if it charges in its region's
  currency (`/meta.json` for Shopify, the feed itself for Woo), and every
  Shopify read passes `?country=` — without it, a Shopify Markets store
  answers a US machine (including GitHub's runners) in converted USD.
- **Title → product** (`src/lib/sealed-title.ts`, tested in
  `tests/sealed-title.test.ts`): refuses singles, graded cards, accessories,
  other languages, other games and store-made bundles; set products group by
  set + type; collections, tins, blisters and decks by type + set + their
  distinctive words. It prefers leaving a listing out to putting it on the
  wrong product.
- **Egress**: the rules at the top of `src/lib/db.ts` (from Rift Compare). No
  page is prerendered against the database at build, and no request reads a
  whole table.
- **Regions in URLs** (`src/lib/regions.ts`): every page under `/[region]`
  starts with `regionOrNotFound(params.region)`, which 404s an unknown or
  upper-case segment before anything dereferences it; `src/middleware.ts`
  308s the exact upper-case prefixes (`/AU/…` → `/au/…`). hreflang
  (`regionAlternates` in `src/lib/seo.ts`) advertises only the regions a page
  is indexable in, plus `x-default`.
- **Sitemap**: `/sitemap.xml` is an index of `/sitemap/0.xml` (static pages,
  store pages) and one file per region (`src/lib/sitemap.ts`,
  `src/app/sitemap.ts`). A failed query throws so ISR keeps the last good copy;
  the import job counts the live product URLs afterwards and fails under 1,000.
- **Trust pages** (`src/app/(site)`): `/about` (which stores and why, what we
  refuse, freshness), `/terms`, `/privacy`, `/contact` (report a listing). The
  operator name comes from `NEXT_PUBLIC_OPERATOR` (`src/lib/site.ts`).

## Local development

```bash
cd apps/dexcompare-sealed
npm install
cp .env.example .env               # point DATABASE_URL at a local Postgres
npx prisma db push
DATABASE_URL=… npx tsx scripts/import.ts --only AU   # or: --only pokebox,cherry
npm run dev                        # http://localhost:3003
```

Checks: `npm run typecheck`, `npm run lint`, `npm test`. `SITE_URL` defaults
to `https://www.dexcompare.app`; set `NEXT_PUBLIC_SITE_URL` to override it.

## Adding a store

1. Put candidates in a JSON file: `[{ "name": "…", "base": "https://…", "country": "AU" }]`.
2. `npx tsx scripts/probe-stores.ts --in candidates.json --out probe.json`
   reads each store live: platform, currency, which collections hold Pokémon
   sealed, and how many products it would list.
3. `npx tsx scripts/registry-from-probe.ts probe.json` merges the stores that
   pass (≥ 3 sealed products, right currency) into `src/data/stores.json`.

Keep the probe at its default concurrency (3). Shopify rate-limits by IP across
every storefront it hosts.

## Adding a set

Add an entry at the top of `SETS` in `src/lib/sets.ts` (name, slug, release
date). Products group under it from the next import. Until a new set is added,
its set products are refused as "no set" rather than filed under the series'
first set.
