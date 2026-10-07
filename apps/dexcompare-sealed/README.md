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
  - **eBay Partner Network** *search links* (Buy It Now, the region's eBay
    site; NZ uses ebay.com.au, SG ebay.com). By default there are **no eBay API
    calls** and no eBay credentials. Opt in with DexCompare's own Browse API keyset
    (`EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`, server-only) and the chase-card strips
    show **real eBay listings** (see "Real eBay listings" below).
  - **TCGplayer via Impact**: every tcgplayer.com link is wrapped in the
    partner deep link at render time; the database only holds plain URLs.
    TCGplayer is a US marketplace: in the US its offer is compared with the
    stores and ranked by price and stock like any store (badged
    "Marketplace", never counted as a store); in other regions it appears only
    in the product page's Marketplaces panel, labelled US$, and never in the
    region's ranking, "from" price or JSON-LD.

  Both carry a sub-id, `dex-<region>-<placement>` (EPN `customid`, Impact
  `sharedid`), so the networks' reports say which surface earned. Placements
  are listed in `PLACEMENTS` (`src/lib/affiliate.ts`) and, with where each
  renders, in DEPLOY.md, "Click events". Store links go out untouched. Every
  group of affiliate links carries its own disclosure, and every outbound buy
  link (`src/components/OutboundLink.tsx`) records a Vercel `buy_click` event
  with `retailer` and `placement`.

### eBay units

eBay is on most pages as a small set of sponsored units (`src/components/Ebay.tsx`):
a header item (desktop, xl and up only: a phone's sticky header would show it beside the page's own unit), a banner (`EbayBanner`: hero on a region's home, section on set /
type / release / store pages, footer above every page's footer), an in-feed tile
in long product grids (`EbayFeedCard`), "Also on eBay" searches
(`EbayQuickSearches`), a "sold out here" link under some sold-out cards
(`EbaySoldOutLink`) and the product page's marketplace panel. All of them:

- are plain `<a>` links to an EPN-tagged eBay **search** (`ebaySearchUrl`), through
  `OutboundLink`, `rel="sponsored nofollow noopener noreferrer"`. The search links, banners and
  tiles use no eBay API and no credentials, so they show **no eBay price, listing count or
  "deal"**; the chase-card strips (below) are the one place a real eBay listing, with its own
  price exactly as eBay returns it, is shown. No eBay logo (the word "eBay" in text);
- are visibly ads: an "Ad" pill, "eBay" in the text, the affiliate disclosure per
  group (a sold-out card's link carries the short form beside it), and a dashed,
  cool-tinted box (`.ad-box`) with outlined `.btn-ad` buttons and dashed `.ad-chip`s: never the
  red `.btn-primary` or the white `.chip` of the site's own actions and navigation;
- never enter a ranked table, headline price, "N stores" count, per-pack, median or
  MSRP maths, JSON-LD, meta/OG or the sitemap; stay off about, terms, privacy,
  contact and the 404 (which has one labelled link);
- keep the layout honest: no sticky or fixed unit of their own (the header item sits in
  the header that was already sticky), no overlay or pop-up, no script or iframe,
  fixed-size markup (no layout shift), never above a content page's H1, and at most one
  unit in a phone viewport (two on a desktop one). The rules that keep
  units apart live in `src/lib/ebay-ads.ts` (pure, unit-tested in
  `tests/affiliate.test.ts`): tiles after the 12th/24th/36th product and only with
  eight products after them, sold-out links sixteen positions apart (the listings strips are
  fixed-size units that follow the same one-per-phone-viewport rule: sweep them too), and a page too
  short to fit its own units beside the footer banner drops the footer banner
  (`<NoPreFooter/>`). On a phone the section banner is a compact strip (no body line,
  no chip row), and a sold-out link's grid row keeps a blank of its height under the other
  cards (`soldOutMates`) so the row stays even; **When adding a unit, run the viewport sweep** (a Playwright
  scroll at 390×844 counting `[data-ad]` elements in view);
- optionally show EPN's own banner image on the hero and footer banners instead of
  the native ones (`NEXT_PUBLIC_EBAY_BANNER_IMAGE` / `_HREF`, see DEPLOY.md).

### Real eBay listings (chase cards)

`src/components/EbayListings.tsx` draws "Chase cards on eBay" strips (home hero, landing,
set, type, product, releases, store pages, a slim one above every footer, a double-width
in-feed tile on the browse page, the 404) from eBay's official **Browse API**, through our
own route `GET /api/ebay/<region>?c=<context>`. Everything is opt-in and degrades:

- **No keys** (or `EBAY_LISTINGS=off`): no API call at all. The home and landing pages show
  six curated chase-card **search** tiles (`src/lib/chase-cards.ts`, `ChaseCards.tsx`: small self-hosted
  card pictures in `public/chase/`, "Search on eBay", labelled as searches, no price); every other
  surface keeps its native banner. Layout is identical to before.
- **Keys**: server-side only (`src/lib/ebay-listings.ts`: OAuth client-credentials token cached in
  memory, one search per query, a per-instance cache with single-flight, a daily call budget,
  stale-on-error, 401/429/5xx handling; pure normalise/filter/round-robin functions with
  unit tests). The route is a whitelist, not a proxy (7 regions × a fixed list of contexts, queries
  hard-coded, ≤ 12 whitelisted fields returned), and **a page never calls eBay while it
  renders**: the strip (a client island) fetches `/api/ebay/...` once it is within ~300 px of the
  viewport, into a box of reserved size (CLS 0), and shows the fallback if nothing comes back.
- Every tile is one plain `<a>` through `OutboundLink` (rel sponsored, one `buy_click`
  `{retailer, placement}`), URL = eBay's `itemAffiliateWebUrl` (campaign 5339155912) with
  `customid=dex-<region>-listings-<surface>`; thumbnails are plain lazy `<img>` from
  `*.ebayimg.com` (no-referrer, never through Vercel image optimisation); the unit is labelled
  "Ad", says the listings come from eBay, are refreshed about hourly and can be up to 3 hours older than on eBay, shows eBay's price
  unconverted and never compares or counts it.
- Setup, eBay's licence/branding rules and how each is met, the call budget: **DEPLOY.md,
  "Real eBay listings"**. Check keys with `npx tsx scripts/ebay-check.ts`.
- Testing without keys: `tests/ebay-*.test.ts` stub `fetch` (fixtures in `tests/fixtures/`); for a
  browser run, preload a fetch stub that answers `https://api.ebay.com/*` with
  `NODE_OPTIONS="--import mock.mjs" next start` (the app has no host override: it can only talk to
  api.ebay.com), and set dummy `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`.

## What this site does not store

No price history, no stock history, no event log, no accounts, no emails. Every table is
current state only (`prisma/schema.prisma`):

| Table | Holds |
| --- | --- |
| `Product` | one row per sealed product (market-agnostic) |
| `Offer` | each store's current listing of a product |
| `ProductStat` | per product × region: cheapest open price (TCGplayer's included), independent stores in stock and listing it (never TCGplayer), and whether TCGplayer has it (`marketplaceOpen`) — recomputed each import |
| `StoreStat` | per store: listings, in stock, last successful read |

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
