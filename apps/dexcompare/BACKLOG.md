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

Prior queue (v1, items 1–12) shipped — see PROGRESS.md. This is the refreshed
**agentic-SEO** queue: compounding on-page + content + internal-linking + linkable-asset
wins, ONE verified change per run, highest-leverage undone item first. NEVER ship thin/
doorway pages or keyword-stuffed titles; every new page must carry real data + real value.

1. **CTR title/meta sweep (highest ROI — a good rewrite can lift CTR ~20% on pages that
   already rank).** Each run, pick ONE page-type and rewrite its `<title>` + meta
   description to be more click-worthy for its real buyer query — lead with intent + a
   concrete hook (price / "cheapest" / rarity / set / "compare"). Rotate through
   `/sealed/[slug]`, `/sets/[set]`, `/card/[id]`, `/deals`, `/trending`, `/market`,
   `/most-valuable`. Titles ≤ ~60 chars, descriptions ≤ ~155, human, no stuffing. When
   `GSC_SA_KEY` is configured, prioritise the pages the daily GSC monitor shows as
   HIGH impressions + LOW CTR — that's where a better title converts fastest.
   `/sealed/[slug]` — DONE (this run, GSC-driven): GSC-TARGETS.md flagged
   `/sealed/pokemon30thcelebrationelitetrainerboxpre` at 118 impr / 0.0% CTR / pos 7.6.
   Root cause: the `<title>` was built from the raw scraped store title, which for
   preorder SKUs carries junk like "(Pre-Order - Ships Sept 16)" that pushed the tag
   well past Google's ~60-char truncation, burying the "compare prices" hook. Added
   `cleanSealedName()` + `truncateAtWord()` + a preorder-aware title/description —
   applies to every scraped sealed product, not just this one. Still queued for future
   runs: `/sets/[set]`, `/card/[id]`, `/deals`, `/trending`, `/market`, `/most-valuable`.
2. **`/sealed-deals` landing page** — sealed products priced below the market/MSRP guide
   (clone the `/deals` logic for sealed groups). Real data only; BreadcrumbList + FAQPage
   JSON-LD; link from nav + `/deals` + `/sealed`.
3. **Sealed "booster box price" intent** — confirm each `/sealed/[slug]` box `<title>`
   reads like "{Set} Booster Box price — cheapest {market}" so it captures the fat
   "[set] booster box price" / "[set] etb price" long-tail across ~500–1000 products.
4. **Embeddable Index badge (backlink engine).** Add an "Embed this" section on `/market`
   with a copy-paste HTML snippet / small iframe others can drop on their site
   (e.g. "Pokémon singles index 103.2 ▲ · DexCompare") that links back — a natural,
   scalable backlink generator. This is our best off-page lever; make it genuinely nice.
5. **Internal-linking depth (crawl + dwell).** Add contextual cross-links where missing:
   guide → the specific cards/sets it mentions; card → "more from {set}" / "same rarity";
   `/market` movers → the mover card pages; set → its sealed products; footer/nav hub
   coverage for orphan pages. One surface per run.
6. **One new evergreen guide per run**, targeting a real query with real value — e.g.
   "Is a {set} booster box worth it?", "How to price your Pokémon cards", "Spot fake
   {set} cards", per-country buying guides. Hub-and-spoke: link each to ≥5 card/set pages.
7. **Freshness + rich results.** Add `dateModified` + FAQPage/HowTo JSON-LD to guides/blog
   that lack it; keep the Daily Market Wrap substantive (named movers + why, never bare
   deltas) so it never reads as auto-generated thin content.
8. **OG image coverage** — ensure every indexable template renders a compelling
   `opengraph-image` (SERP + social CTR); add per-type images where the default is generic.
9. **CWV pass** — audit above-the-fold images on `/sets`, `/sealed`, `/market` for LCP;
   keep CLS locked (explicit dimensions / aspect-ratio). Trim any unused client JS.
10. **Programmatic depth (careful):** where a template already ranks, deepen it with real
    on-page value (price history blurb, "X stores from $Y", related products) rather than
    spinning up new thin pages — quality over page count.
- Deferred (need care / data): ISR of the `force-dynamic` price pages via a market-neutral
  crawler baseline — do deliberately, verify. hreflang / `/au` locales — defer until Search
  Console shows real NZ/US/GB demand.
