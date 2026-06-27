# DexCompare — backlog (deferred ideas + WHY)

Checked-and-skipped or deferred, so iterations don't re-evaluate blindly.

## Already implemented (do NOT redo)
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
- Per-card meta description enrichment (rarity + lowest price) — verify it's not already rich enough first.
- Trust/urgency: surface the existing 7-day price change as a pill near the card headline + a small sparkline (data already in PriceHistory).
- Card-page comparison: highlight the cheapest-delivered row / "best total" tag. — DONE (this run)
- Accessibility sweep: WishlistDrawer + PriceAlertModal dialog semantics — DONE. Remaining: full focus trap (tab cycles within drawer), alt text audits, heading order sweep.
- Per-route FAQ JSON-LD on `/sealed` — DONE. `/sets/[set]` — DONE. `/stores` — DONE. `/browse` page still todo (force-dynamic; FAQ would be on unfiltered canonical only).
- `error.tsx` boundaries (global + route) for graceful DB-down fallback.
- zod validation on API/query params; lightweight rate-limit on `/api/search`, `/api/cards`.
