# Phase 0 — DexCompare price-pipeline findings

Read-only diagnosis. No feature code written. All numbers are from production on
2026-08-07 via `.github/workflows/sitemap-coverage-report.yml` (run `31166353533`)
and the daily import run `30527466414`.

---

## TL;DR — the audit's coverage number is wrong, and that changes the priority

> Audit claim: *"~3,800 of ~20,000 cards have live prices, from only ~8 AU stores."*

Measured reality:

| Metric | Value |
|---|---|
| Total cards | 20,324 |
| Any market priced (`hasLivePrice`) | **18,133 (89.2%)** |
| **AU priced** (`lowestPriceCents`) | **12,153 (59.8%)** |
| US priced | 16,802 (82.7%) |
| GB priced | 10,150 (49.9%) |
| Priced somewhere but **not AU** | **5,980** |
| AU stores producing rows | **25** (of 40 configured) |
| AU in-stock listings | 39,805 |

So AU coverage is ~60%, not ~19%, and there are 25 live AU stores, not 8.

**Where "3,800" probably came from:** `scripts/verify-data.ts` prints
`72/3927 cards` for its check-B population, which is the much narrower set of
cards having *both* an AU price *and* a TCGplayer guide. That is a QA cohort, not
coverage. Two other plausible sources: the figure predates the 2026-07-30 reseed +
reimport, or it counted `Deal` rows (166).

**Consequence for Phase 1:** "raise coverage from 19% to X" is the wrong goal.
The real gaps are (a) the 5,980-card AU hole where we *know* the card is buyable
elsewhere, (b) 15 dead AU integrations, and (c) — most important — see below.

---

## The finding that actually blocks Phase 1

Phase 1 says: *raise coverage on high-search-volume cards specifically*.

**We cannot currently identify those cards.** Coverage by demand rank:

```
Top 100  by demand — AU-priced:   82/100  (82.0%)   [100 have any recorded demand]
Top 1000 by demand — AU-priced:  590/1000 (59.0%)   [241 have any recorded demand]
Top 5000 by demand — AU-priced: 3809/5000 (76.2%)   [241 have any recorded demand]
```

Only **241 cards in the entire catalogue have any recorded `searchCount` or
`viewCount`**. Past that, "demand rank" is an arbitrary tie-break — which is why
the percentage moves *non-monotonically* (82% → 59% → 76%). That's noise, not signal.

This matters beyond reporting, because demand ordering is load-bearing in the
importer: `verifyCheapestListings` (`src/lib/price-import.ts:251`) re-confirms only
the top `CONFIRM_CAP` (1,500) cards by demand, and IndexNow submits the top 1,000
by `searchCount` (`src/lib/indexnow.ts:87`). Both are currently ordering by a
column that is ~99% zeros.

`viewCount` is incremented per card-page open (`src/app/api/card/[id]/view/route.ts`)
and `searchCount` in the search path — so this is a traffic problem, not a bug.
**Recommendation: seed demand externally before optimising against it** (Google
Search Console query export, or a static "chase card" list), otherwise Phase 1
optimises against noise. This is the one thing I'd want your steer on first.

---

## 1. How prices are ingested

**Cadence.** One scheduled job: `.github/workflows/refresh-dexcompare-prices.yml`,
`cron: "30 18 * * *"` (04:30 Sydney). It runs on GitHub Actions, not Vercel,
because the import takes ~67 minutes and serverless caps out in minutes
(`apps/dexcompare/vercel.json` has no crons). Last run: 67 min, exit 0.

**Entry point.** `scripts/import-prices.ts` → `importPrices()` in
`src/lib/price-import.ts`. Sequence:

1. **Store walk** (`price-import.ts` store loop) — for each of 86 retailers, read
   public Shopify `products.json` feeds. Collections are auto-discovered from
   `/sitemap.xml` with a configured fallback list. Market pricing is forced with
   `?country=XX`. Result last run: **224,891 matched, 86,821 unmatched, 407s.**
2. **Cheapest-listing re-confirmation** (`verifyCheapestListings`, `:251`) — fetches
   the live product page for the cheapest listing of the top-1,500 demand cards,
   because the collection feed lags. Last run corrected **916 stale prices**.
3. **TCGplayer market guide** (`src/lib/tcgplayer.ts`) — US market price as a guide,
   refreshed on 4,808 cards.
4. **Per-market lowest recompute** — writes `lowestPriceCents{,Us,Gb}` and
   `hasLivePrice` (`price-import.ts:950`). 18,120 cards changed.
5. **Deal precompute** — 166 rows across 3 markets.
6. **Sealed import** (`src/lib/sealed-import.ts`) — 8,411 listings.
7. **IndexNow ping**, then `scripts/verify-data.ts` as a blocking QA gate.

**No eBay API** is called anywhere (removed 2026-07-30, commit `91e7201`); eBay is
affiliate search links only (`src/lib/affiliate.ts`).

## 2. How listings are matched to catalogue cards

All in `src/lib/price-import.ts`. It builds an in-memory index of the catalogue
(`byKey` = `num/total`, `byNum`, `byName`) and returns a `resolve(title)` closure
(`:445`). Order of operations:

1. **Hard rejects** — `MULTI_CARD` (`:88`, playsets/lots/bundles: a set price would
   be recorded as a single-card price) and `NON_CARD` (`:99`, sealed/accessories/merch).
2. **Celebrations/Classic Collection special-case** (`:473`) — these reprints reuse
   the *original* card's collector number, so they're routed by name+reprint-set or
   dropped, never allowed to pollute the vintage card.
3. **Exact `num/total` key** (`:487`) — most precise, but **the card name must also
   appear in the title**; number alone is deliberately never sufficient (many cards
   share a number across sets).
4. Progressive fallbacks — number-only with name check, then name-token matching.
5. **Variant guard** (`variantOk`, `:459`) — the marker following the card's core
   name must match its variant class (base ≠ V ≠ ex ≠ GX ≠ LV.X), so "Charizard ex"
   can't take "Charizard" pricing.
6. **Condition ranking** (`conditionRank`, `:113`) — records the *best available*
   condition, not the absolute cheapest, so a damaged copy doesn't undercut the
   headline NM price shown on the store's own page.

This is a genuinely careful matcher; its guards exist because each one previously
caused a mispricing. **I would not loosen it globally** — see risk note below.

## 3. Why cards lack an AU price — ranked by evidence

Not one cause. In order of size:

**(a) Dead AU integrations — 15 of 40 AU stores returned 0 products.**
From run `30527466414`: Steel City Games, Vault Games, Spindown, Chimera Gaming,
Banter Toys, King of Cards, Sky Foxes Cards, Tabletop Gaming Hub, KanZenGames,
JRW Hobby Station, Kingdom of Geek, Epic TCG, Timeless Collectables, Hobbymaster,
Good Grief TCG (+ GameForce, Collector's Cache, Chu's Cards, Hills Cards, Pristine
Pokemon, Eternal Cardboard, Next Level Games across markets).
0 products = the feed itself returned nothing — dead domain, changed platform, or
renamed collections. **This is config rot, not a matcher problem, and it's the
cheapest fix available.**

**(b) Near-dead AU stores — matcher or feed shape.**
`gapgames` 1 row (32 products), `gamescapital` 6, `goodgames` 6, `finalboss` 207,
`tcgsingles` 280. GAP Games returning 32 products for a full TCG store means we're
reading the wrong collection.

**(c) Catalogue-side: 2,162 cards (Tier 3) have no price in any market** and are
already `noindex` + excluded from the sitemap (`src/app/sitemap.ts`). Many are
likely genuinely untraded (obscure promos, non-English-market prints).

**(d) Genuine long tail** — AU stores simply don't stock every card. The 5,980
"priced elsewhere but not AU" cards are the honest target: we *know* they're real,
tradeable cards.

**(e) Unmatched listings — 86,821 last run (28% of titles).** Two visible patterns
worth investigating, both suggesting *matcher* rather than stock gaps:
- `Lvl Up Gaming UK`: 7,257 products → **94** priced (98.7% unmatched)
- `CardRush UK`: 7,898 products → **90** priced (98.9% unmatched)
- `Dice Saloon`: 3,021 → **20**
These three are almost certainly a title-format mismatch, not empty stores.
(GB, so they don't move the AU number — but they're free coverage.)

Also logged: TCGplayer unmatched samples are dominated by the newest sets
(`ME01`–`ME05`), i.e. **catalogue lag** on brand-new releases.

## 4. Adding a store — the cost

Low, *if* the store is Shopify. `RetailerInfo` (`src/lib/retailers.ts`) needs:

```ts
key, name, base, collections[], shippingFlatCents, freeOverCents, shippingNote,
country?: "AU" | "US" | "GB"   // omitted = AU
```

No per-store scraping code — the generic Shopify `products.json` walker handles it,
and collections are auto-discovered from the sitemap. So a new Shopify store is a
~8-line config entry. **Non-Shopify stores would need a new adapter**; none exists
today, and every one of the 86 current integrations is Shopify or TCGplayer.

## 5. Incidental accuracy bugs found

- **The homepage claims "40 AU stores"** (`src/app/page.tsx` hero stats) but only
  **25** produce any rows. The count comes from `RETAILER_LIST.filter(...)` — config,
  not reality. It also does not change when you switch region, and is labelled
  "AU stores" unconditionally. Same root cause as the deals bug fixed in `65fbf8f`:
  ISR-cached pages can't read the country cookie, so anything market-specific has to
  be localised client-side.
- **`verifyCheapestListings` and IndexNow order by a ~99%-zero column** (see above).

---

## Proposed Phase 1 (for your approval — nothing implemented)

Ordered by expected AU coverage gained per unit of effort:

1. **Audit the 15 dead AU feeds** — probe each base URL, classify (dead / moved /
   renamed collections / non-Shopify), fix configs, drop the truly dead. Pure config;
   no schema change. *Biggest, cheapest win.*
2. **Fix the three ~99%-unmatched GB stores** — sample their titles, extend the
   matcher for that format. Contained, testable against real titles.
3. **Seed demand data** (needs your input) — GSC export or a curated chase list, so
   "high-search-volume" becomes measurable. **Blocks doing Phase 1's actual stated goal well.**
4. **Coverage monitoring** — persist the per-market numbers daily so we can see the
   trend. This needs **one new table** (`CoverageSnapshot`, ~3 rows/day, fixed-width) —
   I will show you the migration and wait for approval before touching Neon.
5. **"No live price" pages** — they're already `noindex`d and excluded from the
   sitemap; I'd revisit whether Tier-3 cards should instead show the TCGplayer guide
   plus AU eBay search links so they still convert.

**Risk note:** loosening the matcher globally is the tempting fix and the dangerous
one. Every guard in it exists because it previously caused a real mispricing, and
`verify-data.ts` will fail the daily run if guide prices leak into headlines. Any
matcher change should be per-store-format and validated against `verify-data.ts`.
