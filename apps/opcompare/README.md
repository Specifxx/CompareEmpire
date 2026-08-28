# OPCompare

**One Piece Card Game database & live price comparison** — the full catalogue
(fetched from apitcg.com), compared across stores in **Australia, New Zealand,
the United States and the United Kingdom**, refreshed daily.

> Not affiliated with or endorsed by Bandai, Shueisha, Toei Animation or Eiichiro Oda.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma** + **Postgres** (Neon in production)
- Deployed on **Vercel**; daily price import + wishlist alerts via **Vercel Cron**
  (`vercel.json` → `/api/cron/refresh-prices`, `/api/cron/price-alerts`)

## Getting started

```bash
npm install          # install dependencies
cp .env.example .env # then set DATABASE_URL (everything else is optional)
npm run setup        # generate Prisma client, push schema, seed the catalogue
npm run dev          # start the dev server
```

To refresh the card catalogue itself from apitcg.com (rather than the committed
`prisma/op-cards.json` snapshot):

```bash
APITCG_API_KEY=xxxx node prisma/fetch-op.mjs   # rewrites op-cards.json + src/lib/one-piece-sets.ts
```

## Features

- **Price comparison** — per-market cheapest in-stock price from Shopify
  stores and TCGplayer (US), with per-condition price spectrum, postage
  transparency and price-history tracking. eBay is a destination only (Partner
  Network affiliate links), not a live price source — no eBay API is called.
- **Characters** (`/characters`, `/character/[slug]`) — every card grouped by
  the One Piece character it depicts, cross-linked with set data.
- **Sealed product** (`/sealed`) — booster boxes and starter decks alongside
  singles pricing.
- **Wishlist + price-drop email alerts** — cookie wishlist (no account needed),
  opt-in email alerts (Resend). Cron: `/api/cron/price-alerts`.
- **Restock alerts** (`/restock`) — track out-of-stock cards/products and get
  notified when a store restocks.
- **Trade calculator** (`/trade`) — value both sides of a trade with live
  prices and the AI "Trade Gremlin" fairness verdict (`ANTHROPIC_API_KEY` or
  `GEMINI_API_KEY`; rules-based fallback without one).
- **Card value tool** (`/card-value`) and **bulk pricer** (`/bulk-pricer`).
- **Collecting guides** (`/guides`) and **learn** (`/learn`) — collector- and
  rules-focused reference content.
- **Monetisation** — eBay Partner Network smart-link tagging, Amazon
  Associates, TCGplayer via Impact, Sovrn Commerce fallback for the Shopify
  long tail, HilltopAds display ads, and an outbound click beacon
  (`/api/click`) to verify earnings independently.
- **SEO** — sitemap (cards, sets, guides), robots, structured data, canonical
  URLs, Search Console verification.

## Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run setup` | Generate client + push schema + seed (first-time setup) |
| `npm run db:seed` | Re-seed the catalogue (resets price data) |
| `npm run import:prices` | Run the full daily price import locally |
| `node prisma/fetch-op.mjs` | Refresh the card catalogue from apitcg.com |

## Project structure

```
prisma/
  schema.prisma      # Card, RetailerPrice, PriceHistory, PriceAlert, ClickEvent…
  op-cards.json       # committed card-data snapshot (apitcg.com)
  seed.ts            # seeds the catalogue + price baselines
src/
  app/               # routes (browse, card/[id], sets, sealed, characters, trade, wishlist…)
  components/        # CardTile-equivalents, Filters, TradeCalculator…
  lib/               # price-import, tcgplayer, affiliate, email, one-piece-sets…
scripts/
  import-prices.ts   # daily import entry point (Vercel Cron)
```

## Known gaps

- The live store price importer's collection-discovery now correctly looks
  for a "One Piece" signal (see `src/lib/price-import.ts`), but the static
  fallback handles in `src/lib/retailers.ts` are still largely unverified
  leftovers from this app's Riftbound/Pokémon-tracking siblings and need
  real per-store verification.
- `src/lib/price-import.ts`'s title-matching vocabulary (`TOK_STOP`) and
  collector-number parser (`parseNumber`, tuned for Pokémon's `n/total`
  format) are not yet tuned for One Piece's rarity vocabulary (Parallel,
  Manga Rare, Alt Art…) or `OP01-025`-style numbering.
