# DexCompare

**Pokémon TCG card database & live price comparison** — every English card
(20k+ across 170+ sets), compared across stores in **Australia, New Zealand,
the United States and the United Kingdom**, refreshed daily.

> Not affiliated with or endorsed by Nintendo, The Pokémon Company or Game Freak.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma** + **Postgres** (Neon in production)
- Deployed on **Vercel**; daily price import via GitHub Actions
  (`.github/workflows/refresh-dexcompare-prices.yml` at the monorepo root)

## Getting started

```bash
npm install          # install dependencies
cp .env.example .env # then set DATABASE_URL (everything else is optional)
npm run setup        # generate Prisma client, push schema, seed the catalogue
npm run dev          # start the dev server
```

## Features

- **Price comparison** — per-market cheapest in-stock price from 50+ Shopify
  stores, eBay (AU/US/UK), TCGplayer (US) and Cardmarket (UK), with per-condition
  (NM→DMG) price spectrum, postage transparency and daily price-history charts.
- **Market price guide with source** — every card carries a TCGplayer-sourced
  market price, always shown labelled with its source and NEVER used as the
  cheapest/"from" price (that's strictly real, buyable store listings). The card
  page notes the guide can be cheaper or dearer than local stores.
- **eBay import** — quota-aware (reads the live remaining/limit from eBay's
  Analytics API each run), budget split across AU/US/GB by weight, hot-cards +
  stale-rotation card selection, per-card upserts, foreign-print (JP/CN/KR)
  filtering and median-based outlier pruning. Tunables in `.env.example`.
- **Wishlist + price-drop email alerts** — cookie wishlist (no account needed),
  opt-in email alerts (Resend) with a daily digest of drops and one-click
  unsubscribe. Cron: `/api/cron/price-alerts` (after the price refresh).
- **Collecting guides** (`/guides`) — buying, conditions & grading, spotting
  fakes, storage, rarities. Collector-focused (no how-to-play content).
- **Trade calculator** (`/trade`) — value both sides of a trade with live
  prices, per-side value %, store-price overrides, and the AI "Trade Gremlin"
  fairness verdict (`ANTHROPIC_API_KEY` or `GEMINI_API_KEY`; rules-based
  fallback without one).
- **Monetisation** — eBay Partner Network smart-link tagging on every eBay URL,
  Amazon Associates, TCGplayer via Impact, Sovrn Commerce fallback for the
  Shopify long tail, Google AdSense (see `ADSENSE_SETUP.md`), and an outbound
  click beacon (`/api/click` → `ClickEvent`) to verify earnings independently.
- **SEO** — sitemap (cards, sets, guides), robots, JSON-LD (Organization,
  WebSite, Product, TechArticle), canonical URLs, Search Console verification.

## Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run setup` | Generate client + push schema + seed (first-time setup) |
| `npm run db:seed` | Re-seed the catalogue (resets price data) |
| `npm run import:prices` | Run the full daily price import locally |
| `npx tsx scripts/refresh-ebay.ts` | eBay-only refresh |

## Project structure

```
prisma/
  schema.prisma      # Card, RetailerPrice, PriceHistory, PriceAlert, ClickEvent…
  seed.ts            # seeds the full Pokémon catalogue + price baselines
src/
  app/               # routes (browse, card/[id], sets, guides, trade, wishlist…)
  components/        # CardTile, QuickView, TradeCalculator, PriceAlertModal…
  lib/               # price-import, ebay, tcgplayer, affiliate, email, articles…
scripts/
  import-prices.ts   # daily import entry point (GitHub Actions)
```
