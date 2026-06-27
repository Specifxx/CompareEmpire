# DexCompare — autonomous improvement log

Newest first. Each entry: what · why · commit.

- /stores: added FAQ section (4 Q&As: update frequency, delivered-cost ranking, markets covered, price trustworthiness) + FAQPage JSON-LD · SEO rich-result eligibility on the stores page; answers the questions buyers actually type before checking a price comparison · (this commit)

- Accessibility: WishlistDrawer now has `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + auto-focus on the close button when opened; PriceAlertModal gains `aria-labelledby` to complete its dialog semantics · screen-reader/keyboard users now land inside the drawer immediately and AT announces it as a labelled modal dialog · (this commit)

- Guides: new evergreen article "How to Complete a Pokémon TCG Set (Without Buying 200 Packs)" — covers pack maths vs singles strategy, 4-step buying order, timing, and a cost breakdown table; high-traffic search topic linking to sets/browse/collection/wishlist · (this commit)

- Card page: "✓ Best deal" chip on the cheapest-delivered price row (emerald green, only shown when 2+ in-stock stores) + subtle row background tint · makes the top pick instantly scannable and reinforces delivered-cost sorting — faster conversion without any layout change · (this commit)

- /sets/[set]: added set-specific FAQ section (4 Q&As, 2 for coming-soon) + FAQPage JSON-LD (merged into existing ld+json script) · SEO rich-result eligibility on every set page; answers real buyer questions about card counts, where to buy cheapest, price freshness, and value · (this commit)

- /sealed: added market-aware FAQ section (4 Q&As) + FAQPage JSON-LD (canonical view only) · SEO rich-result eligibility on the sealed-product listing page; answers real buyer questions about booster boxes vs ETBs, postage, and price freshness · (this commit)
- /deals: added a small market-aware FAQ section + FAQPage JSON-LD · SEO rich-result eligibility on a high-intent page (visible Q&A backs the schema) · (this commit)
- Card page: mobile sticky buy bar (cheapest delivered store, one-tap View deal, `lg:hidden`) · faster mobile conversion without scrolling back to the table · (this commit)
- Card page: "save vs priciest" badge now computed on delivered totals (matches the already-delivered-ranked table) · consistency / accurate savings · 8ff12d2
