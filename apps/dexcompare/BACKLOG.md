# DexCompare — backlog (deferred ideas + WHY)

Checked-and-skipped or deferred, so iterations don't re-evaluate blindly.

## Already implemented (do NOT redo)
- SearchBar arrow-key navigation — ArrowDown/ArrowUp cycle results, Enter opens QuickView, aria-activedescendant (DONE this run).
- Markdown table support — `|`-delimited tables now render as styled HTML tables (DONE).
- Delivered-cost ranking of the card-page store table (`card/[id]/page.tsx` sorts by `delivered`).
- BreadcrumbList JSON-LD on the card page; Product/FAQ structured data; per-card metadata.
- Set page: rich `generateMetadata` + `SetCompletion` component already exist (`sets/[set]/page.tsx`).
- QuickView already ranks by delivered cost.
- Homepage already minimal/database-first (search hero + browse grid + deals + FAQ).

## Deferred — needs care / not safely shippable here
- **Sealed `/sealed/[slug]` ISR**: it's `force-dynamic` because the layout reads the country cookie; adding `revalidate` won't make it static and may conflict. Skip unless the cookie dependency is removed.
- **Denormalised columns (lowestDeliveredCents, viewsWeek) + new tables (SavedSearch, Notification, StoreHealth) + matchConfidence**: additive but they hit the PRODUCTION Neon DB via build-time `prisma db push --accept-data-loss`, with no staging DB to verify. Do only one at a time, very deliberately, ideally on a preview branch.
- **PriceHistory partitioning / cleanup**: risky raw-SQL/migration against prod; needs a DB copy to test.
- **Affiliate-revenue dashboard, conversion pixels**: need external network API keys — not available here.
- **Freemium/premium tier, real payments**: business decision + Stripe; out of autonomous scope.
- **Grading/PSA market, public API, web-push**: large bets; design first.
- **Lint-on-build (`eslint.ignoreDuringBuilds: false`)**: only after auditing/fixing existing lint, else it could break the prod build.

## Candidate safe wins (code-only) to pick from next
- BrowseGrid infinite-scroll skeleton loaders — DONE (this run).
- Guide: "How to Sell Your Pokémon Cards" — DONE (this run, slug: how-to-sell-pokemon-cards, new "Selling your cards" topic group).
- Guide: "Pokémon Card Grading — PSA vs CGC" — DONE (this run, slug: pokemon-card-grading-psa-vs-cgc).
- Per-card meta description enrichment (rarity + lowest price) — verify it's not already rich enough first.
- Trust/urgency: ~~surface the existing 7-day price change as a pill~~ — DONE (coloured Metric tile with sentiment prop, green/rose).
- Card-page comparison: highlight the cheapest-delivered row / "best total" tag. — DONE (this run)
- Accessibility sweep: WishlistDrawer + PriceAlertModal dialog semantics — DONE. Focus trap in WishlistDrawer — DONE. Focus trap in PriceAlertModal — DONE. Remaining: alt text audits, heading order sweep.
- Per-route FAQ JSON-LD on `/sealed` — DONE. `/sets/[set]` — DONE. `/stores` — DONE. `/browse` — DONE (canonical unfiltered page 1 only).
- /guides topic grouping — DONE (Getting started / Value & grading / Buying strategy / Care & safety).
- Guides: sealed products explained — DONE. How to Value Your Collection — DONE. Related articles section in ArticleView — DONE. Further guide ideas: "Pokémon Cards as an Investment — Honest Take", "Buying Pokémon Cards Internationally".
- /sets index redesigned to grouped-by-era layout — DONE.
- `error.tsx` boundaries (global + route) for graceful DB-down fallback — DONE. Branded `not-found.tsx` 404 page — DONE.
- zod validation on API/query params; lightweight rate-limit on `/api/search`, `/api/cards`.
- Per-route `not-found.tsx` for `/card/[id]`, `/sets/[set]`, `/guides/[slug]`, `/blog/[slug]` — DONE (this run).
- Blog article: "Pokémon Cards as an Investment — Honest Take" — DONE (this run).
- Blog article: "Buying Pokémon Cards Internationally" — DONE (this run).

## SEO ranking queue (CURRENT PRIORITY — work these first, top-down; one per run; keep useful + human)
1. Sealed page price-intent title/description — DONE (`{name} price — compare the cheapest stores`).
2. Organization `contactPoint` + `sameAs` (RiftCompare + any socials) in the root `@graph` (`layout.tsx`).
3. BreadcrumbList JSON-LD on `/sealed/[slug]` and `/restock/[slug]` — DONE (this run).
4. Card image alt enrichment: `"{name} ({setCode} {collectorNumber})"` in `CardImage.tsx`/`CardTile.tsx` — DONE (added `setCode?: string` to `CardImageData`; all six rendering contexts automatically pick it up).
5. New high-intent, genuinely-useful landing page: `/cheapest` — DONE (three price bands, 8 cards each, BreadcrumbList + FAQPage JSON-LD, nav link added). Sibling `/sealed-deals` page (sealed below MSRP) still to do.
6. "Popular/trending" hub (`/trending` or `/popular`) listing most-viewed cards (views already tracked) + link it from nav + footer — concentrates internal link equity. DONE (this run — `/trending` page + nav-sections.ts "Trending cards" entry in Market section).
7. Related-link blocks on card pages: "Cheaper cards in {set}" and "Other {type} cards" (more crawl paths + dwell time).
8. About page (who/why, data sourcing + freshness + Index methodology) for E-E-A-T; add author to guides if not already.
9. Market-wrap editions: ensure each carries unique substantive analysis (named movers + why), not just price deltas (avoid auto-generated/thin-content risk). `src/lib/market-wrap.ts`.
10. Sitemap index: split `sitemap.ts` into a sitemap index + child sitemaps (cards/sets/sealed/content) with per-section revalidate, so new cards are discovered faster at scale.
11. CWV: explicit width/height (aspect-ratio) on card art to lock CLS; ensure the card-page hero image is NOT lazy-loaded (LCP).
12. Heading-order + remaining alt-text sweep across pages.
- Deferred (need care / data): ISR conversion of the `force-dynamic` price pages requires rendering a market-neutral baseline for the no-cookie crawler case — do deliberately, verify. hreflang / path-based locales (`/au` etc.) — defer until Search Console shows real NZ/US/GB demand.
