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
    site; NZ uses ebay.com.au, SG ebay.com). There are **no eBay API calls**
    anywhere, and no eBay credentials.
  - **TCGplayer via Impact**: every tcgplayer.com link is wrapped in the
    partner deep link at render time; the database only holds plain URLs.
    TCGplayer is a US marketplace: in the US its offer is compared with the
    stores and ranked by price and stock like any store (badged
    "Marketplace", never counted as a store); in other regions it appears only
    in the product page's Marketplaces panel, labelled US$, and never in the
    region's ranking, "from" price or JSON-LD.

  Both carry a sub-id, `dex-<region>-<placement>` (EPN `customid`, Impact
  `sharedid`), so the networks' reports say which surface earned. Placements:
  `product-best`, `product-marketplace`, `product-soldout`, `product-table`,
  `set-banner`, `type-banner`, `browse-empty`, `region-home`, `store-page`.
  Store links go out untouched. Every group of affiliate links carries its own
  disclosure, and every outbound buy link (`src/components/OutboundLink.tsx`)
  records a Vercel `buy_click` event with `retailer` and `placement` — see
  DEPLOY.md, "Click events".

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
