# DexCompare — autonomous improvement log

Newest first. Each entry: what · why · commit.

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
