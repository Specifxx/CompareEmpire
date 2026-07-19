# DexCompare — autonomous improvement log

Newest first. Each entry: what · why · commit.

- SEO: dedicated OG share images for `/sets/[set]` — added
  `src/app/sets/[set]/opengraph-image.tsx`, a `next/og` `ImageResponse` card showing
  the set name, series, card count, and release year, in the same on-brand red-accent
  style as the guides/blog/market-wrap OG images shipped in prior runs. All 173 set
  pages previously fell through to the single generic site-wide default (purple/
  lightning-bolt card). Reads only the static `setBySlug()`/`POKEMON_SETS` catalogue —
  no DB call — so it's unaffected by this sandbox's Prisma-auth build limitation ·
  GSC-TARGETS.md was read first this run: its one low-CTR/high-impression page
  (`/sealed/pokemon30thcelebrationelitetrainerboxpre`) is unchanged in kind from the
  last four checks (72 impr / 0.0% CTR / pos 14.8, position still trending worse
  7.6→11.6→13.6→14.0→14.8) — PROGRESS.md/BACKLOG.md already document this as a
  structural ceiling (no `pokemon-sets.ts` catalogue entry for this un-shipped set),
  not a wording problem, so redoing its title/description again would be wasted
  effort; the `/` striking-distance entry (45 impr, pos 18.7) already got its
  description-length fix two runs ago and needs no further metadata change. Picked
  BACKLOG SEO queue item #8's explicitly-named next target (`/sets/[set]` OG image)
  instead, continuing the OG-coverage rotation · confirmed the pre-existing `next
  build` failure in this sandbox (Prisma auth against a fake local DB, on `/`,
  `/trending`, `/deals`, `/most-valuable`, `/restock`, `/blog/market-wrap`, sitemap
  buckets 1/2 — identical page list to every prior run) reproduces identically with
  this file added — unrelated to this change (compiles successfully; `/sets/[set]`
  doesn't appear in the failing-page list); `tsc --noEmit` is clean · (this commit)
- SEO: dedicated OG share images for `/guides/[slug]` and `/blog/[slug]` — both
  templates previously had no `openGraph.images` override and fell through to the
  single generic site-wide `opengraph-image.tsx` (a static purple/lightning-bolt card,
  off-brand for the site's current red-accent market-terminal look), so every one of
  the ~25 guide/blog links shared on social or shown in a rich SERP preview looked
  identical and didn't say what the article was about. Added
  `src/lib/article-og.tsx` — a shared `next/og` `ImageResponse` renderer (brand D-mark,
  red wordmark accent, ink gradient) that reads the article's title + excerpt + read
  time, mirroring the on-brand style already shipped for the Daily Market Wrap OG
  image — plus a thin `opengraph-image.tsx` per route folder. Both read the article via
  the existing static, in-memory `getArticle()` (no DB call), so they're unaffected by
  this sandbox's known Prisma-auth build limitation · GSC-TARGETS.md was read first
  this run: its one low-CTR/high-impression page
  (`/sealed/pokemon30thcelebrationelitetrainerboxpre`) is unchanged from the last check
  (78 impr / 0.0% CTR / pos 14.0) and BACKLOG.md documents three prior title/description
  fixes with position getting steadily WORSE (7.6→11.6→13.6→14.0) — confirmed structural
  (no `pokemon-sets.ts` catalogue entry for this un-shipped set, so no set page/related-
  products; not fixable by hand-editing the auto-generated catalogue), so redoing wording
  again would be wasted effort; the `/` striking-distance entry was already fixed last
  run. Picked BACKLOG SEO queue item #8 (OG image coverage) instead — the CTR-sweep
  rotation (item #1) is fully done across every major template · confirmed the
  pre-existing `next build` failure in this sandbox (Prisma auth against a fake local
  DB, on `/`, `/trending`, `/deals`, `/most-valuable`, `/restock`, `/blog/market-wrap`,
  sitemap buckets 1/2 — same page list as prior runs) reproduces identically with these
  new files added — unrelated to this change (compiles successfully; `/guides/[slug]`
  and `/blog/[slug]` don't appear in the failing-page list); `tsc --noEmit` is clean ·
  (this commit)
- SEO CTR: homepage (`/`) meta description trimmed from 186 → 138 chars ("Compare live
  Pokémon card prices across AU, NZ, US and UK stores, plus eBay, and find the cheapest
  place to buy every card. Updated daily."), replacing full country names with AU/NZ/US/
  UK abbreviations (matching the `/deals` fix pattern) to fit inside Google's ~155-char
  SERP truncation budget; title (46 chars) was already fine, untouched · GSC-TARGETS.md
  was read first this run: its one low-CTR/high-impression entry
  (`/sealed/pokemon30thcelebrationelitetrainerboxpre`, 81 impr / 0.0% CTR / pos 13.6) has
  now had three prior dedicated title/description fixes (2026-07-01, 07-07, 07-11) and
  its position has kept getting WORSE each check (7.6 → 11.6 → 13.6) despite the
  template-level root-cause fix — PROGRESS.md documents the real blocker as structural
  (this set has no entry in the auto-generated `pokemon-sets.ts`, so it has no set page/
  related-products links and can't be resynthesized if delisted), not further fixable via
  wording, so redoing it again would be wasted effort. Instead acted on the NEW signal in
  this run's file: `/` newly appeared in the "striking distance" table (rank ~20.4, 40
  impressions) with a description well past budget — a first-time, concrete, actionable
  target · confirmed the pre-existing `next build` failure in this sandbox (Prisma auth
  against a fake local DB, on `/`, `/trending`, `/deals`, `/most-valuable`, `/restock`,
  `/blog/market-wrap`, sitemap buckets 1/2 — same page list as documented in the prior
  entry) reproduces identically on a clean `main` checkout with this change stashed —
  unrelated to this edit; `tsc --noEmit` is clean · (this commit)
- SEO: internal-linking — `/forum`, `/deck` and `/decks` added to the footer nav
  (`layout.tsx`) and `sitemap.ts`'s static-routes bucket. Audit found all three had
  ZERO server-rendered inbound links and ZERO sitemap entries anywhere on the site —
  their only reference was inside `NavMenu`'s dropdown panel, which only renders
  `{open && (...)}` after a click (`useState(false)` initial state), so it's absent
  from the SSR HTML Googlebot actually crawls. All three are real, valuable,
  independently-indexable pages (deck builder, meta decks list, buy/sell forum board —
  each with its own canonical + metadata), not thin/doorway content, so this was a
  genuine crawl/discovery gap rather than intentional exclusion (`/collection` and
  `/proxy` are correctly `noindex`'d and were left alone) · GSC-TARGETS.md was checked
  first this run: its two flagged low-CTR pages (`/sealed/pokemon30thcelebrationelitetrainerboxpre`,
  `/card/me4-69-tauros`) were re-verified against current source — both already carry
  their fixed titles from prior runs, still trailing the 28-day GSC window, so redoing
  them would be wasted effort. Picked BACKLOG's SEO queue item #5's last open sub-item
  (footer/nav orphan-page coverage) instead — also audited "card → more from
  {set}/same rarity" and "`/market` movers → card pages" while in that section and
  found both were already implemented (undocumented) via `cheaperInSet`/`sameTypeCards`
  on `/card/[id]` and `CardTile` on `/market`, so no further work needed there ·
  confirmed the pre-existing `next build` failure in this sandbox (Prisma auth against
  a fake local DB, on `/`, `/trending`, `/deals`, `/most-valuable`, `/restock`,
  `/blog/market-wrap`, sitemap buckets 1/2) reproduces identically on a clean `main`
  checkout with this change stashed — unrelated to this edit; `tsc --noEmit` is clean
  and the build compiles successfully · (this commit)
- SEO: CTR title/meta sweep — `/deals` meta description trimmed from 194 → 145 chars ("Pokémon singles selling below TCGplayer market price across AU, NZ, US and UK stores. Updated daily — the fastest way to snipe underpriced cards."), replacing full country names with AU/NZ/US/UK abbreviations to fit inside Google's ~155-char SERP truncation budget · GSC-TARGETS.md's two flagged low-CTR pages (`/sealed/pokemon30thcelebrationelitetrainerboxpre`, `/card/me4-69-tauros`) already received dedicated title/description rewrites in prior runs (2026-07-01, 2026-07-07) via their shared page templates, so re-touching them again this run would be redundant churn without new signal — GSC CTR data lags 1-3 weeks behind a snippet fix as Google re-crawls. Instead picked the next explicitly-queued item in BACKLOG's CTR sweep: `/deals`'s description was the last over-budget description left in the rotation (`/trending`'s 144-char description was already within budget on recount) · (this commit)
- SEO: embeddable "Index badge" — new `/embed/index` route (chrome-free HTML
  fragment, cached 30 min, reuses the `/embed/*` frame-ancestors carve-out already
  in `next.config.js`) rendering the live DexCompare Index level + 1-day move,
  linking back to `/market?utm_source=embed`; `/market` gains an "Embed the Index"
  section reusing the existing `EmbedSnippet` component (already powering the
  per-card widgets on `/widgets`) for a copy-paste `<iframe>` snippet · GSC-TARGETS.md
  was checked first: its two flagged low-CTR pages (`/sealed/…elitetrainerboxpre`,
  `/card/me4-69-tauros`) already carry their fixed titles from prior runs — the
  28-day GSC window is still trailing those fixes, so redoing them would be wasted
  effort. Picked BACKLOG's SEO queue item #4 (embeddable Index badge) instead — the
  last undone CTR-sweep items are minor description-only trims on `/deals`/`/trending`,
  lower leverage than a genuinely new, self-updating backlink/brand-mention source
  that compounds every time someone embeds it · confirmed the pre-existing `next
  build` failure in this sandbox (Prisma auth against a fake local DB) reproduces
  identically on a clean `main` checkout with this change stashed — unrelated to
  this edit; `tsc --noEmit` is clean and neither `/market` nor `/embed/index` appear
  in the build's failing-page list · (this commit)
- SEO CTR: `/sealed/[slug]` title reordered from "{name} — Compare Prices" to "{name}
  Price — Compare" (preorder: "{name} Preorder Price — Compare") — puts the "price"
  keyword directly after the product name instead of after a generic verb, matching
  the exact word order of the "[set] booster box price" / "[set] etb price" long-tail
  buyers actually type. Both new suffixes are the same length or shorter than what
  they replace (16 vs 17 chars normal, 25 vs 26 preorder), so no title grows past the
  existing truncation budget · GSC-TARGETS.md was checked first this run: its two
  flagged pages (`/sealed/pokemon30thcelebrationelitetrainerboxpre`,
  `/card/me4-69-tauros`) already carry their fixed titles in source (re-verified by
  reading the current `generateMetadata` for both routes) — the 28-day GSC window is
  still trailing those fixes from prior runs, so redoing them would be wasted effort.
  Picked SEO queue item #3 (sealed booster-box price intent) instead, the next
  unclaimed item in the CTR rotation · confirmed the pre-existing `next build` failure
  in this sandbox (Prisma auth against a fake local DB) reproduces identically on a
  clean `main` checkout with this change stashed — unrelated to this edit, `tsc
  --noEmit` is clean · (this commit)
- CTR title/meta sweep: `/most-valuable` — description trimmed from 220 chars ("...See what the chase cards actually cost today — vintage holos, alt arts and Special Illustration Rares — updated daily.") to 148 chars ("...vintage holos, alt arts, SIRs. Updated daily."), keeping the "every store we track" trust cue and "updated daily" freshness cue inside Google's ~155-char SERP budget instead of losing them to truncation; title was already fine at 56 chars, untouched · GSC-TARGETS.md was checked first this run: its two flagged low-CTR pages (`/sealed/pokemon30thcelebrationelitetrainerboxpre`, `/card/me4-69-tauros`) were re-verified against current source and are already fixed (`cleanSealedName`/`truncateAtWord` on sealed, "price — compare cheapest stores" on card) from the prior two runs — confirmed by diffing against main with a stash test, so redoing them would be wasted effort; the GSC 28-day window is just still trailing those fixes. This was the last flagged item explicitly called out as a follow-up in BACKLOG.md's CTR queue (item 1) · (this commit)
- Internal linking: `/sets/[set]` now shows a "{set} sealed products" section (up to 4 `SealedTile`s — booster boxes, ETBs, etc. — pulled from `getSealedGroups()` filtered by `setCode`, plus an "All {set} sealed →" link to `/sealed?set={code}`) when the set has any. `/sealed/[slug]` already links back to its set page, but the reverse link was missing, so 173 set pages dead-ended instead of surfacing the sealed products collectors landing there would want next · GSC-TARGETS.md was checked first this run: both flagged low-CTR pages (`/sealed/pokemon30thcelebrationelitetrainerboxpre`, `/card/me4-69-tauros`) already carry their fixed titles in code (verified against source) — the 28-day GSC window is just still trailing the fix, so redoing that work would be wasted effort. Backlog SEO queue item #2 (`/sealed-deals`, MSRP-vs-price landing page) was ruled out this run: `SealedGroup`/`SealedListing` carry no market/MSRP guide field, so a "deals" page would need fabricated reference prices — deferred to BACKLOG with that reasoning. Picked queue item #5 (internal-linking depth, set → sealed) instead — reuses the existing memoized `getSealedGroups()` call (60 min in-process cache) so no new per-request DB cost, and the set page is ISR (`revalidate: 86400`), not a hot dynamic path · (this commit)
- SEO CTR fix: `/sets/[set]` `generateMetadata` — title rewritten from "Pokémon {set} Card Prices, Values & Full Card List | DexCompare" (66-90+ chars, past Google's ~60-char SERP truncation, hook buried at the very end) to "Pokémon {set} Cards — Cheapest Prices | DexCompare" (52-68 chars for all but the longest promo-set names) so the "Cheapest Prices" hook renders inside the visible snippet; description condensed to mention the set name once instead of three times, which had been inflating length on long set names like "Scarlet & Violet Black Star Promos" · continues the CTR title/meta sweep from BACKLOG.md — `/sealed/[slug]` and `/card/[id]` were fixed the prior two runs (GSC-driven); `/sets/[set]` was next in the still-queued rotation and covers all 173 set pages · GSC-TARGETS.md was checked first this run but its two flagged pages (`/sealed/pokemon30thcelebrationelitetrainerboxpre`, `/card/me4-69-tauros`) were already fixed in the last two commits — the 28-day GSC window just hasn't refreshed past those fixes yet · (this commit)

- SEO: sitemap split into index + three child sitemaps via Next.js `generateSitemaps` — `/sitemap.xml` is now a proper `sitemapindex` pointing to `/sitemap/0.xml` (static + content + sets + market wraps), `/sitemap/1.xml` (card singles, ~20k URLs), `/sitemap/2.xml` (sealed products, ~500 URLs); revalidate reduced from 24h to 1h so new card slugs surface in Google within an hour of a price snapshot instead of the next day; `/about` page added to static routes (was missing); each child section handles DB failures independently so one unavailable bucket never blocks the rest · splitting the monolithic sitemap gives Google independent crawl budgets per content type and lets it revisit high-churn card prices without re-fetching static content; the 24h cadence was a known bottleneck for new card discovery · (this commit)

- CWV/LCP: card page hero image now loads eagerly — added `priority?: boolean` prop to `CardImage`; when true, sets `loading="eager"` + `fetchPriority="high"` instead of `loading="lazy"`; the card page passes `priority` on its hero `<CardImage>` which is the largest above-the-fold element and the LCP candidate on every `/card/[id]` page · `loading="lazy"` caused the browser to defer fetching the hero until intersection — even though it's always in the viewport — costing 100-400 ms of extra LCP time; `fetchPriority="high"` also signals the preload scanner to queue the image immediately · (this commit)

- SEO/E-E-A-T: new `/about` page — covers mission, data sourcing methodology (daily crawl, set-code card matching), delivered-cost index methodology, markets (AU/NZ/US/GB), price freshness, card database sourcing, affiliate transparency, and contact; includes `AboutPage` JSON-LD with `BreadcrumbList`; "About" link added to the footer nav · E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) is a major Google quality signal; the site had no self-disclosure of methodology — About page is the canonical place Google/users look to assess trustworthiness of a price-comparison tool · (this commit)

- SEO: related-link blocks on every card page — two new horizontal-scroll sections added below "Other printings": "More cards from {setName}" (up to 8 cheapest singles in the same set, with a "See all → /sets/{slug}" link) and "Other {type} cards" (up to 8 cheapest cards of the same Pokémon type from other sets); both reuse the existing `cardTileSelect` + `CardTile` pattern with zero new components; deepens crawl paths from every card page into its set and into the same Pokémon type cluster, increases internal link equity across ~20k card URLs, and gives buyers a natural discovery path for related singles · (this commit)

- SEO: new `/trending` landing page — most-viewed cards per market (uses existing `viewCount` + `getPopularCards`), BreadcrumbList + FAQPage JSON-LD, "Live" pill in hero, nav entry added to Market section; targets "trending Pokémon cards", "popular Pokémon singles", "what Pokémon cards are hot right now" — concentrates internal link equity on a high-intent discovery cluster · (this commit)

- SEO: new `/cheapest` landing page — three price bands (under $5, $5–$10, $10–$50), 8 real card tiles per band pulled live from the DB for the visitor's market, BreadcrumbList + FAQPage JSON-LD, "Cheapest cards" nav link added to "Shop prices" section; targets "cheapest Pokémon cards", "cheap Pokémon singles", "Pokémon cards under $5/$10/$50" — a high-intent search cluster with no dedicated page previously · (this commit)

- SEO: card image alt text enriched to `"{name} ({setCode} {collectorNumber})"` — added `setCode?: string` to `CardImageData` so every real card image now carries a precise alt like "Charizard (OBF 004)"; applies automatically to all six rendering contexts (CardImage in the card page hero, QuickView, CardTile browse grid, CollectionView, and SellForm); the canonical setCode+collectorNumber identifier is exactly what a collector types when searching, so it's strong signal for Google Images and screen-reader users · the previous alt included only name+collectorNumber; adding the set code makes the identifier unambiguous (many cards share a name across sets) · (this commit)

- SEO: BreadcrumbList JSON-LD added to `/sealed/[slug]` and `/restock/[slug]` — both pages already had Product structured data; adding a BreadcrumbList alongside unlocks Google SERP breadcrumb display (Home › Sealed products › {name} and Home › Restock trackers › {name}) for ~500 sealed product URLs and all featured restock tracker pages · these were the last two high-traffic page types missing breadcrumb markup (card/set/article pages all already have it) · (this commit)

- eBay monetization: every card now has an eBay affiliate touchpoint — high-key "Search eBay →" store row when eBay has no price, and a "Search eBay for more listings →" affiliate link when eBay is already a priced store; raised `EBAY_HOT_SHARE` default 0.35→0.6 so the capped 5k/day Browse budget concentrates on the most-viewed/searched cards (tail covered by the affiliate row) · eBay is the top revenue source — maximise affiliate clicks + keep chase cards fresh under the API limit · (this commit)

- SEO focus: pointed the autonomous loop at a prioritized "SEO ranking queue" in BACKLOG.md + a CURRENT-PRIORITY Google-ranking directive in the improver prompt · makes organic search the loop's default workstream so SEO compounds every run · (this commit)
- /sealed/[slug]: price-intent title + description (`{name} price — compare the cheapest stores`) replacing the generic "— compare prices" · captures "[product] price"/"cheapest [product]" long-tail across ~500–1000 sealed pages · (this commit)
- BrowseGrid: replaced the infinite-scroll spinner with skeleton card tiles — when `loading` is true, 12 pulsing skeleton tiles (matching the card tile's aspect ratio, border, and padding structure) are appended inside the card grid; the IntersectionObserver sentinel is now an invisible 1 px div after the grid rather than the old `flex justify-center py-8` wrapper; the always-visible spinner that previously showed even when not actively loading is removed entirely · the browse grid is the highest-traffic surface in the app; showing placeholder shapes instead of a text spinner communicates exactly what's loading (more cards), reduces perceived wait time, and is consistent with the skeleton pattern already used on initial page load (`browse/loading.tsx`) · (this commit)

- Guides: new evergreen guide "How to Sell Your Pokémon Cards — Where to Sell & Get the Best Price" — covers the full seller workflow: identifying cards precisely (set code + collector number + condition), the 80/20 sort, a channel-by-channel breakdown (eBay, local game stores, Facebook groups, TCGplayer, Cardmarket) with when to use each, how to price from real sold-listing data vs wishful market guides, the bulk-vs-individual crossover point, graded slab specifics, packing/shipping safely, realistic net-proceeds maths, and the five common mistakes; links to /card-value, /collection, and the conditions guide; added to a new "Selling your cards" topic group on the guides listing page; guides page title and description updated to reflect buy+sell scope · "how to sell pokemon cards" and "where to sell pokemon cards" are among the highest-intent search queries in the hobby with no article on the site; selling content completes the buy/own/sell lifecycle and gives existing buying-content readers a natural next step · (this commit)

- ArticleView: replaced the plain "← All guides / All posts" back-link with a three-level breadcrumb trail (Home › Guides/Blog › Article Title) with `aria-current="page"` on the last segment, and added a second `BreadcrumbList` JSON-LD block alongside the existing article structured data — applies to all 15+ guides and blog posts · visual breadcrumbs give readers an orientating "you are here" path and a one-click return to the category listing; the JSON-LD unlocks Google SERP breadcrumb display for every article URL, which is confirmed to improve CTR on editorial content · (this commit)

- Guides: new evergreen article "Pokémon Card Grading — PSA vs CGC, Costs & What Gets a 10 (2026)" — covers what grading does, a side-by-side PSA vs CGC comparison table, the full submission economics (decision formula with a concrete numeric example), a self-grading checklist for the four graded dimensions, practical submission tips for non-US collectors, and when to buy raw vs graded; links to /card-value, /collection, and the existing conditions guide; added to the "Value & grading" topic group on the guides listing page · targets "PSA vs CGC pokemon cards", "should I get my pokemon cards graded", "pokemon card grading worth it 2026" — the most searched grading decision topic with no dedicated article on the site previously · (this commit)

- SearchBar: added arrow-key navigation to the live search dropdown — ArrowDown/ArrowUp cycle through results (wrapping), the active row gets a distinct `bg-ink-700` highlight, Enter opens the highlighted card's QuickView, Escape closes; `aria-activedescendant` + `role="option"` + `aria-selected` wired for screen readers; `activeIndex` resets on every new result set so stale highlights never persist · users expect arrow-key navigation in any search-as-you-type box; without it the dropdown is mouse-only which feels unfinished and forces keyboard users to tab through results one by one · (this commit)

- Markdown renderer: added table support (`|`-delimited markdown tables now render as styled HTML `<table>` elements with a dark rounded border, uppercase column headers, alternating row tints, and overflow-x-auto for narrow screens) · two existing articles ("How to Value Your Collection" condition-haircut table; "How to Complete a Set" tier cost breakdown) were previously displaying as blobs of pipe-separated text instead of readable tables; this fix makes the content actually usable · (this commit)

- Guides listing page: redesigned from flat 2-column grid → topic-grouped layout with four sections (Getting started, Value & grading, Buying strategy, Care & safety), a rounded-pill jump-nav at the top, and article counts per section; any future guide slugs not yet assigned fall into a graceful "More guides" overflow section · with 9 guides the flat list was already hard to scan; grouping by intent lets buyers navigate straight to the topic they need (beginner vs valuation vs care), and the jump-nav makes the page useful on mobile without scrolling · (this commit)

- Per-route `not-found.tsx` for `/card/[id]`, `/sets/[set]`, `/guides/[slug]`, `/blog/[slug]` — each shows a contextual message (e.g. "Card not found — search by name or collector number" with an inline search form for the card route; set/guide/blog variants link to their respective listing pages) instead of the generic root 404; the card variant includes a plain-HTML search form that submits to `/browse?q=` without JS · when users hit a broken card URL or mistyped set slug the recovery CTA is now relevant to where they were, keeping them in the right part of the site · (this commit)

- Branded 404 page (`not-found.tsx`) — shows "404 / Page not found" in the site's dark aesthetic with a muted large-number background, a plain-HTML search form that submits to `/browse?q=` (no JS required), and three ghost-button links (home / browse all / browse sets); exports `robots: { index: false }` metadata; replaces Next.js's raw default 404 screen · keeps users on-site when they hit a broken or mistyped URL, matches the site's visual language, and the inline search form turns a dead end into a discovery moment without any extra JS bundle cost · (this commit)

- Blog: new article "Buying Pokémon Cards Internationally — What You Need to Know" — covers why price gaps exist between markets, how the country switcher surfaces stores that actually ship to you, when importing saves money (US→AU/NZ/UK with bundled orders), when it doesn't (customs duty above AU/NZ/UK thresholds, condition disputes, small orders eaten by postage), the Japanese vs English language trap, and the delivered-price discipline; links to /browse, /wishlist, /guides; targets "import pokemon cards", "buying pokemon cards internationally", "pokemon cards from overseas" searches · fresh evergreen buying-angle content that explains the country-switcher value prop in natural search language · (this commit)

- Card page: 7-day trend Metric now colour-coded — green (emerald) when the price has dropped, rose when it has risen, with a matching subtle background tint on the metric tile; the `Metric` helper extended with an optional `sentiment` prop so the convention can be reused; no layout change · buyers scan prices, not text: a coloured number communicates "cheaper this week" or "getting pricier" at a glance before they read the percentage; standard e-commerce convention (green=cheaper=go, red=rising) · (this commit)

- Blog: new article "Pokémon Cards as an Investment — Honest Take (2026)" — covers the 2020–21 boom and crash, what actually held value (vintage high-grade, sealed vintage, loved modern sets), what hasn't (modern bulk boxes above MSRP, graded commons, raw "investment" holds), honest 5-year maths with carrying costs and liquidity discount, three scenarios where it makes more sense, and links to /collection and /browse for tracking cost basis; tone is deliberately sober and differentiated from typical hype content · targets high-intent "pokemon cards investment 2026" / "are pokemon cards worth investing in" searches; honest voice builds trust and distinguishes DexCompare from influencer hype · (this commit)

- /sets index: redesigned from flat paginated grid → grouped-by-era layout with 17 series buckets (Mega Evolution → Base), each section with an anchor, card count per tile (`s.total`), year-range in the header, and a quick-jump era nav at the top; removed pagination — all 173 sets visible at once grouped logically; purely static (no DB query) · a paginated flat grid offers no sense of era or scale; grouped layout lets collectors navigate straight to the era they collect, and shows card counts to compare set sizes · (this commit)

- Discovery: "More guides/posts you might like" section added at the bottom of every article (ArticleView) — ranked by tag overlap with the current article, shows up to 3 related articles in a responsive 3-column card grid; boosts internal linking, reduces bounce from guide pages, and surfaces related content automatically without manual curation · (this commit)

- Guides: new evergreen article "How to Value Your Pokémon Card Collection" — covers the 5-step valuation process (identify by set code/collector number, look up the market guide, apply condition haircut, distinguish collection vs resale value, when grading changes the number); includes a condition-grade table, the 80/20 bulk-sorting tip, and links to /card-value, /collection, /browse, and the grading guide; targets high-intent "pokemon card collection value" searches · (this commit)

- /browse: added FAQ section (4 Q&As: which sets are in the database, how to find the cheapest price, why the same Pokémon appears multiple times, and how often prices update) + FAQPage JSON-LD; gated to canonical unfiltered page 1 only · SEO rich-result eligibility on the main card database landing page — the highest-traffic page on the site, which was the last major page without FAQ markup · (this commit)

- Accessibility: PriceAlertModal now has a full keyboard focus trap (Tab cycles forward, Shift+Tab backward through all focusable elements inside the modal; Escape still closes; body scroll locked while open; `role="dialog"` moved to the modal panel, not the backdrop wrapper) · completes WCAG 2.1 SC 2.1.2 (No Keyboard Trap) for both dialogs — WishlistDrawer was done last run; PriceAlertModal was the remaining gap · (this commit)

- Accessibility: WishlistDrawer now has a full keyboard focus trap — Tab cycles forward through all focusable elements in the drawer, Shift+Tab cycles backward; focus never escapes to the page behind the dialog · completes the dialog accessibility work started two runs ago; required for WCAG 2.1 SC 2.1.2 (No Keyboard Trap) · (this commit)

- Guides: new evergreen article "Pokémon TCG Sealed Products Explained — Booster Boxes, ETBs, Tins & More" — covers every sealed product format (Booster Box, ETB, tins, blisters, Premium Collections, Build & Battle), what's inside each, per-format pricing, and when to buy which; cross-links to /sealed, /restock, and /deals; targets high-volume buyer searches like "what is an elite trainer box" and "pokemon booster box vs etb" · (this commit)

- /stores: added FAQ section (4 Q&As: update frequency, delivered-cost ranking, markets covered, price trustworthiness) + FAQPage JSON-LD · SEO rich-result eligibility on the stores page; answers the questions buyers actually type before checking a price comparison · (this commit)

- Accessibility: WishlistDrawer now has `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + auto-focus on the close button when opened; PriceAlertModal gains `aria-labelledby` to complete its dialog semantics · screen-reader/keyboard users now land inside the drawer immediately and AT announces it as a labelled modal dialog · (this commit)

- Guides: new evergreen article "How to Complete a Pokémon TCG Set (Without Buying 200 Packs)" — covers pack maths vs singles strategy, 4-step buying order, timing, and a cost breakdown table; high-traffic search topic linking to sets/browse/collection/wishlist · (this commit)

- Card page: "✓ Best deal" chip on the cheapest-delivered price row (emerald green, only shown when 2+ in-stock stores) + subtle row background tint · makes the top pick instantly scannable and reinforces delivered-cost sorting — faster conversion without any layout change · (this commit)

- /sets/[set]: added set-specific FAQ section (4 Q&As, 2 for coming-soon) + FAQPage JSON-LD (merged into existing ld+json script) · SEO rich-result eligibility on every set page; answers real buyer questions about card counts, where to buy cheapest, price freshness, and value · (this commit)

- /sealed: added market-aware FAQ section (4 Q&As) + FAQPage JSON-LD (canonical view only) · SEO rich-result eligibility on the sealed-product listing page; answers real buyer questions about booster boxes vs ETBs, postage, and price freshness · (this commit)
- /deals: added a small market-aware FAQ section + FAQPage JSON-LD · SEO rich-result eligibility on a high-intent page (visible Q&A backs the schema) · (this commit)
- Card page: mobile sticky buy bar (cheapest delivered store, one-tap View deal, `lg:hidden`) · faster mobile conversion without scrolling back to the table · (this commit)
- Card page: "save vs priciest" badge now computed on delivered totals (matches the already-delivered-ranked table) · consistency / accurate savings · 8ff12d2
- GSC-driven CTR fix: `/sealed/[slug]` `generateMetadata` — the `<title>`/description were built straight from the raw scraped store title, which for preorder SKUs carries junk like "(Pre-Order - Ships Sept 16)" that blew the tag well past Google's ~60-char SERP truncation, burying the "compare prices" hook. Added `cleanSealedName()` (strips preorder noise into one controlled signal) + `truncateAtWord()` (caps the product name so the full title always renders), and a preorder-aware title/description ("… Preorder — Compare Prices" / "… price comparison…") · GSC-TARGETS.md flagged `/sealed/pokemon30thcelebrationelitetrainerboxpre` at 118 impressions / 0.0% CTR / pos 7.6 — this template covers that page plus every other scraped sealed product, so the fix compounds across hundreds of pages, not just one · (this commit)
- GSC-driven CTR fix: `/card/[id]` `generateMetadata` — title rewritten from the flat "{name} ({set} {no}) — Pokémon Card Price" to "{name} ({set} {no}) price — compare cheapest stores", and the description now leads with "See today's cheapest price for…" instead of burying the buy hook mid-sentence · GSC-TARGETS.md flagged `/card/me4-69-tauros` at 30 impressions / 0.0% CTR / pos 5.1 (ranking on page 1, zero clicks) alongside several sibling ME4 cards in the same boat — this template covers every card page site-wide, so the "price" + "cheapest" hook now compounds across the full catalogue · (this commit)
- CTR title/meta sweep: `/market` — title was 63 chars (`"The DexCompare Index — Pokémon Card Market Tracker | DexCompare"`, brand name duplicated twice) and the description ran 239 chars, both well past Google's SERP truncation points, so the "free to cite" linkable-asset hook never rendered. Trimmed title to 46 chars (`"DexCompare Index — Pokémon Card Market Tracker"`, single brand mention) and description to 150 chars, keeping the global composite / movers / breadth / free-to-cite hooks intact · this was the last un-swept page in the SEO queue's CTR rotation (`/sealed/[slug]`, `/card/[id]`, `/sets/[set]` done in prior runs; `/deals` 54/194 and `/trending` 55/144 titles were already within budget on inspection, `/most-valuable` 56/220 title fine but description over budget — noted in BACKLOG for a follow-up pass) · (this commit)
- GSC-driven CTR fix (root cause, not just wording): `/sealed/[slug]` `generateMetadata` was still 0.0% CTR at 128 impressions / pos 11.6 for `/sealed/pokemon30thcelebrationelitetrainerboxpre` after two prior title rewrites. Investigated why: the raw scraped title is `"Pokemon TCG: 30th Celebration Elite Trainer Box (Pre-Order…)"` — after stripping the preorder noise, the remaining 49-char name blew the 34-char preorder truncation budget, and the naive word-boundary cut silently dropped "Elite Trainer Box" entirely (the exact product-type term buyers search), leaving a generic, duplicative-looking title. Fixed at the template level: (1) `cleanSealedName()` now also strips the redundant leading "Pokemon"/"Pokémon TCG:" brand tag (the site is already a Pokémon-card price site — repeating the brand wastes truncation budget across every scraped product name), and (2) new `truncatePreservingType()` truncates the part *before* the classified `productType` (already computed at scrape time, e.g. "Elite Trainer Box"/"Booster Box") and always keeps the type intact instead of leaving it to chance — bumped the preorder budget 34→37 to match. Applies to every scraped sealed product, not just the flagged one · (this commit)
- New evergreen guide: "First Edition, Shadowless & Unlimited Pokémon Cards Explained" (slug: `first-edition-vs-unlimited-pokemon-cards`) — explains WOTC's three vintage print runs (1st Edition stamp, Base-Set-only Shadowless, Unlimited), how to tell them apart without guessing, why the price premium depends on the specific card (not just the stamp), and the authenticity risk of doctored "1st Edition" stamps on Unlimited cards; links to the grading, fake-spotting and value-checker pages. Added to the "Value & grading" topic group on `/guides` · GSC-TARGETS.md's only flagged page this run (`/sealed/pokemon30thcelebrationelitetrainerboxpre`) is the one already root-caused and marked "stop re-touching" in BACKLOG (structural — no catalogue entry — not a wording problem, position still worsening on repeat checks), and the last several runs were all meta/OG-tag micro-edits, so this run shifted to genuine new content: "1st edition pokemon cards"/"shadowless vs unlimited" is a real, high-intent vintage-buyer query with zero prior coverage on the site despite being referenced in passing across three other articles · (this commit)
- SEO: dedicated OG share image for `/restock/[slug]` — added `src/app/restock/[slug]/opengraph-image.tsx`, a `next/og` `ImageResponse` card in the same on-brand red-accent style as the sets/guides/blog/market-wrap OG images, showing the product name, series and an "in stock now?" hook. Reads only the static `FEATURED_RESTOCKS` config from `src/lib/restocks.ts` (no DB call), so it's unaffected by this sandbox's Prisma-auth build limitation. These are high-intent "is it back in stock" pages that get shared on Reddit/Discord and previously fell back to the generic site-wide OG card · GSC-TARGETS.md was read first this run: its only flagged page (`/sealed/pokemon30thcelebrationelitetrainerboxpre`, now 64 impr / 0.0% CTR / pos 17.4) is the same structural, already-root-caused issue documented in BACKLOG as "stop re-touching" — position keeps degrading regardless of wording (7.6→…→17.4), confirming it's the missing-catalogue-entry ceiling, not fixable from here; the homepage's striking-distance entry (59 impr, pos 11.7) already has its trimmed 138-char description from a prior run, nothing new to fix. Picked BACKLOG SEO queue item #8's explicitly-named next target instead (`/restock/[slug]` OG coverage) · verified with a clean `.next` rebuild that the exact same 8 pages fail (`/`, `/trending`, `/deals`, `/most-valuable`, `/restock`, `/blog/market-wrap`, sitemap buckets 1/2 — the pre-existing fake-`DATABASE_URL` Prisma-auth limitation) with or without this file present; `/restock/[slug]/opengraph-image` builds and compiles cleanly; `tsc --noEmit` is clean · (this commit)
- SEO: dedicated OG share image for `/decks/[slug]` — added `src/app/decks/[slug]/opengraph-image.tsx`, a `next/og` `ImageResponse` card in the same on-brand red-accent style as the sets/restock/guides/blog OG images, showing the deck name, tier, legend Pokémon and live card count. Reads only the static `META_DECKS` seed data via `getDeckSeed()` in `src/lib/meta-decks.ts` (no DB call), so it's unaffected by this sandbox's Prisma-auth build limitation. Meta-deck pages get shared on Reddit/Discord and previously fell back to the generic site-wide OG card · GSC-TARGETS.md was read first this run: its only flagged page (`/sealed/pokemon30thcelebrationelitetrainerboxpre`, now 56 impr / 0.0% CTR / pos 19.1, worse than the last 3 checks) is the same structural, already-root-caused "stop re-touching" issue in BACKLOG (no catalogue entry — position degrades regardless of wording); the homepage's striking-distance entry actually improved (pos 20.4→11.5) since its earlier description trim, nothing new to fix there. Picked BACKLOG SEO queue item #8's explicitly-named next target instead (`/decks/[slug]` OG coverage) · verified with a clean `.next` rebuild (with vs. without this file, same fake `DATABASE_URL`) that the exact same 8 pre-existing pages fail identically (`/`, `/trending`, `/deals`, `/most-valuable`, `/restock`, `/blog/market-wrap`, sitemap buckets 1/2) — this change adds none; `tsc --noEmit` clean · (this commit)
