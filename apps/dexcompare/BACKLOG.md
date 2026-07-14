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
   applies to every scraped sealed product, not just this one.
   `/card/[id]` — DONE (this run, GSC-driven): GSC-TARGETS.md flagged
   `/card/me4-69-tauros` at 30 impr / 0.0% CTR / pos 5.1 (page-1 rank, zero clicks),
   with several sibling ME4 cards similarly stuck. Title rewritten from "{name} ({set}
   {no}) — Pokémon Card Price" to "{name} ({set} {no}) price — compare cheapest
   stores"; description now leads with "See today's cheapest price for…". Applies
   site-wide to every card page.
   `/sets/[set]` — DONE (this run): old title "Pokémon {set} Card Prices, Values & Full
   Card List | DexCompare" ran 66-90+ chars for most sets (well past the ~60-char SERP
   truncation point) and buried the click hook at the very end. Rewritten to "Pokémon
   {set} Cards — Cheapest Prices | DexCompare" (52-68 chars for all but the handful of
   longest promo-set names) — "Cheapest Prices" now lands inside the visible SERP
   snippet. Description condensed to mention the set name once instead of three times
   (was inflating length on long set names like "Scarlet & Violet Black Star Promos").
   Applies to all 173 set pages.
   `/market` — DONE (this run): title was 63 chars with the brand name duplicated
   ("The DexCompare Index — Pokémon Card Market Tracker | DexCompare") and the
   description ran 239 chars — both past SERP truncation, burying the "free to cite"
   linkable-asset hook. Trimmed to a 46-char title and 150-char description, keeping
   the composite/movers/breadth/free-to-cite hooks. `/deals` (54/194) and `/trending`
   (55/144) titles were checked and are already within the ~60-char budget — only their
   descriptions run long, which is lower-priority (title truncation kills a snippet's
   hook; description truncation just loses trailing detail).
   `/most-valuable` — DONE (this run): title was already fine (56 chars); description
   trimmed from 220 → 148 chars, keeping the "every store we track" + "updated daily"
   cues inside the SERP truncation budget instead of losing them mid-sentence. `/deals`
   and `/trending` descriptions (194/144 chars) are the last remaining description-only
   trims in this rotation — lower priority than title fixes but still queued.
   `/deals` description — DONE (this run): trimmed 194 → 145 chars ("Pokémon singles
   selling below TCGplayer market price across AU, NZ, US and UK stores. Updated daily —
   the fastest way to snipe underpriced cards."), swapping full country names for AU/NZ/
   US/UK abbreviations to fit the ~155-char budget without losing any hook. `/trending`'s
   144-char description was re-measured this run and is already within budget — nothing
   left to trim there, which closes out this CTR-sweep rotation. GSC-TARGETS.md's two
   flagged low-CTR pages (`/sealed/pokemon30thcelebrationelitetrainerboxpre`,
   `/card/me4-69-tauros`) were checked but already got dedicated title/description fixes
   via their shared templates on 2026-07-01/07-07 — still showing 0% CTR in the latest
   28d window, but that's expected lag (Google re-crawls and re-renders snippets over
   1-3 weeks), not evidence the fix didn't land. Re-check GSC-TARGETS.md fresh each run
   in case CTR recovers or a genuinely new page surfaces.
   `/sealed/pokemon30thcelebrationelitetrainerboxpre` — root-caused this run (2026-07-11):
   GSC-TARGETS.md still flags it at 128 impr / 0.0% CTR, and position actually got WORSE
   (7.6 → 11.6), despite two prior title rewrites. Dispatched a research agent to find
   out why a title fix wasn't moving CTR. Root cause found: the raw scraped name
   ("Pokemon TCG: 30th Celebration Elite Trainer Box…") is 49 chars after stripping
   preorder noise — over the 34-char preorder truncation budget — and the naive
   word-boundary truncation was silently dropping "Elite Trainer Box" (the actual
   product-type keyword) rather than the redundant "Pokemon TCG:" brand prefix. Fixed
   at the template level (not a one-off): `cleanSealedName()` now strips the leading
   brand tag, and a new `truncatePreservingType()` always keeps the classified
   `productType` (already computed at scrape time) intact, truncating the prefix
   instead. This is a real product-name/template bug that applied to every scraped
   sealed product with a long name, not just this one page — should lift CTR site-wide
   on longer sealed titles, not just the flagged one. NOTE: the deeper structural issue
   the research agent also surfaced — this set ("30th Celebration"/"30th Anniversary")
   has NO entry in `src/lib/pokemon-sets.ts` (auto-generated from the set-data build
   script, not hand-editable), so `setCode`/`setName` are null for this product: no set
   page to link to/from, no "related sealed products" module, and if the one listing
   ever drops the page can't be resynthesized from a slug and would hard-404. Real fix
   is adding a real catalogue entry via `scripts/build-pokemon-data.ts`'s data source
   once that set actually ships — not safely doable by hand-editing the generated file
   in this sandbox. Re-check GSC-TARGETS.md in a few weeks for this page specifically.
   STATUS (2026-07-14): still flagged, position keeps getting WORSE each check (7.6 →
   11.6 → 13.6), impressions dropping (128 → 81) — confirms this is the structural
   ceiling above, not a wording problem; stop re-touching its title/description until
   the catalogue-entry fix lands. `/` (homepage) — DONE (this run): newly appeared in
   GSC's "striking distance" table (rank 20.4, 40 impr) with a 186-char description past
   the SERP budget; trimmed to 138 chars using the same AU/NZ/US/UK-abbreviation pattern
   as the `/deals` fix. Title (46 chars) was already fine.
2. **`/sealed-deals` landing page** — sealed products priced below the market/MSRP guide
   (clone the `/deals` logic for sealed groups). Real data only; BreadcrumbList + FAQPage
   JSON-LD; link from nav + `/deals` + `/sealed`.
   CHECKED (this run) — not shippable as-is: `SealedGroup`/`SealedListing`
   (`sealed-import.ts`, `schema.prisma`) carry no market/MSRP guide field at all, unlike
   `Card.marketPriceCents` (real TCGplayer-sourced guide). A sealed "deals" page needs a
   genuine reference price to compare against — fabricating an MSRP would violate the
   real-data-only rule, and comparing listings only against each other is just `/sealed`
   sorted by price, not a "deal". Defer until a real MSRP source is imported per product.
3. **Sealed "booster box price" intent** — DONE (this run): `/sealed/[slug]` title was
   "{name} — Compare Prices", which buries the "price" keyword after a generic verb
   instead of right after the product name — the exact word order buyers type for
   "[set] booster box price" / "[set] etb price". Reordered to "{name} Price — Compare"
   (preorder: "{name} Preorder Price — Compare") — same or shorter length (16/25 char
   suffix vs the old 17/26), so no title grows past the existing truncation budget;
   applies to every scraped sealed product (~500–1000 pages).
4. **Embeddable Index badge (backlink engine).** DONE (this run): new `/embed/index`
   route (chrome-free HTML, cached 30 min, uses the existing `/embed/*` frame-ancestors
   carve-out in `next.config.js`) renders the live Index level + 1-day move and links
   back to `/market?utm_source=embed`; `/market` gained an "Embed the Index" section
   reusing the existing `EmbedSnippet` component (already used for per-card widgets on
   `/widgets`). Possible follow-up: add the same badge/snippet block to `/widgets` itself
   so both entry points cross-promote each other; not done this run to keep the diff
   scoped to one surface.
5. **Internal-linking depth (crawl + dwell).** Add contextual cross-links where missing:
   guide → the specific cards/sets it mentions; card → "more from {set}" / "same rarity";
   `/market` movers → the mover card pages; set → its sealed products; footer/nav hub
   coverage for orphan pages. One surface per run.
   `set → its sealed products` — DONE (prior run): `/sets/[set]` now shows up to 4
   `SealedTile`s for that set (via `getSealedGroups()` filtered by `setCode`) plus an
   "All {set} sealed →" link to `/sealed?set={code}`; `/sealed/[slug]` already linked
   back to the set page, so this closes the loop both ways.
   `card → "more from {set}"/"same rarity"` and `/market movers → card pages` — audited
   this run and already DONE (pre-existing, not previously logged): `/card/[id]`
   queries `cheaperInSet` (other cards in the same set) and `sameTypeCards` (same
   Pokémon type from a different set, deterministically windowed by `artSeed % 20` so
   internal links spread across the long tail) and renders both as linked `CardTile`
   sections; `/market`'s gainers/losers sections already render each mover as a linked
   `CardTile`. Nothing to do here.
   `footer/nav orphan-page coverage` — DONE (this run): audited every route under
   `src/app` against the footer nav, the header `NAV_SECTIONS` menu, and `sitemap.ts`.
   Found `/forum`, `/deck` and `/decks` had ZERO server-rendered inbound links and ZERO
   sitemap entries — their only reference anywhere was inside `NavMenu`'s dropdown
   panel, which is `{open && (...)}`-gated behind `useState(false)`, so it never
   renders in the initial SSR HTML Googlebot sees (a click-only reveal, not a
   crawlable link). All three are real, indexable, ISR/dynamic-rendered pages
   (deck builder, meta decks, buy/sell forum) with their own canonical + metadata —
   added to the always-server-rendered footer nav in `layout.tsx` and to
   `sitemap.ts`'s static-routes bucket. (`/tools` and `/tools/arbitrage` were already
   in the sitemap, just missing from the footer — not touched this run to keep the
   diff scoped; `/collection` and `/proxy` are intentionally `noindex`'d private pages,
   correctly left out of both.) Still queued: guide → specific cards/sets it mentions —
   audited this run too: guides already link out to `/sets`, `/browse`, `/restock/[slug]`
   and other `/guides/[slug]` articles, but a text scan of all 25 article bodies against
   the 173-set catalogue found only ~7 unlinked plain-text set-name mentions (e.g. bare
   "Team Up", "Sword & Shield" inside bold text) and literally zero mentions of specific
   `/card/[id]` slugs — there's no safe way to link a guide's prose to a *specific* card
   page without a DB-verified slug (this sandbox has no live DB to confirm one), so that
   sub-item stays deferred until it can be done against real data; the set-name-only
   opportunity is real but thin (≈7 links across 25 files) — lower leverage than what
   was just shipped.
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
