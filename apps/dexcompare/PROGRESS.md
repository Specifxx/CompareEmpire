# DexCompare — autonomous improvement log

Newest first. Each entry: what · why · commit.

- Card page: "✓ Best deal" chip on the cheapest-delivered price row (emerald green, only shown when 2+ in-stock stores) + subtle row background tint · makes the top pick instantly scannable and reinforces delivered-cost sorting — faster conversion without any layout change · (this commit)

- /sets/[set]: added set-specific FAQ section (4 Q&As, 2 for coming-soon) + FAQPage JSON-LD (merged into existing ld+json script) · SEO rich-result eligibility on every set page; answers real buyer questions about card counts, where to buy cheapest, price freshness, and value · (this commit)

- /sealed: added market-aware FAQ section (4 Q&As) + FAQPage JSON-LD (canonical view only) · SEO rich-result eligibility on the sealed-product listing page; answers real buyer questions about booster boxes vs ETBs, postage, and price freshness · (this commit)
- /deals: added a small market-aware FAQ section + FAQPage JSON-LD · SEO rich-result eligibility on a high-intent page (visible Q&A backs the schema) · (this commit)
- Card page: mobile sticky buy bar (cheapest delivered store, one-tap View deal, `lg:hidden`) · faster mobile conversion without scrolling back to the table · (this commit)
- Card page: "save vs priciest" badge now computed on delivered totals (matches the already-delivered-ranked table) · consistency / accurate savings · 8ff12d2
