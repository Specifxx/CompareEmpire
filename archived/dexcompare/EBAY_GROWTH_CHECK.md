# DexCompare — eBay Application Growth Check

**Request:** raise the **Buy → Browse API** call limit for this application from the
default **5,000 calls/day** to **200,000 calls/day**.

> Copy/adapt the sections below into the eBay Developers Program **Application
> Growth Check** form. Replace every `«PLACEHOLDER»` with your real account
> details before submitting. All volume figures are grounded in how the app
> actually calls eBay (see `src/lib/ebay.ts`).

---

## 1. Application summary

| Field | Value |
|---|---|
| Application name | DexCompare |
| App ID (Client ID) | `«EBAY_CLIENT_ID»` |
| Developer account | `«eBay developer account email»` |
| Production website | https://dexcompare.app |
| eBay Partner Network campaign | `«EBAY_AFFILIATE_CAMPAIGN»` |
| Primary marketplace | eBay Australia (`EBAY_AU`) |
| Additional marketplaces | eBay US (`EBAY_US`), eBay UK (`EBAY_GB`) |
| Contact | `«name / support email»` |

**What it does.** DexCompare is a Pokémon Trading Card Game **price-comparison**
site. For every card and sealed product we aggregate prices from specialist
retailers and present the cheapest place to buy, side by side, per market
(Australia, New Zealand, the US and the UK). eBay is included as a **secondary
market** signal: for each product we surface the lowest legitimate Buy-It-Now
listing and link out to it.

**Why eBay benefits.** Every eBay listing we show is linked through the **eBay
Partner Network** (affiliate-tagged via `X-EBAY-C-ENDUSERCTX` /
`itemAffiliateWebUrl`). The integration is a demand funnel into eBay: high-intent
buyers who are actively comparing prices are sent to eBay listings with the
buy decision already made. We drive qualified, purchase-ready traffic to eBay at
no cost to eBay.

---

## 2. eBay APIs used

| API | Endpoint | Purpose |
|---|---|---|
| **OAuth** | `identity/v1/oauth2/token` | Client-credentials app token (cached until expiry; ~1 call / 2 hours). |
| **Buy → Browse** | `buy/browse/v1/item_summary/search` | The only quota-bearing call. One search per product to find the cheapest legitimate listing. |
| **Developer Analytics** | `developer/analytics/v1_beta/rate_limit` | Read remaining Browse quota before each run so we never exhaust it. Separate limit; does not consume Browse quota. |

We use **only** the official Buy/Browse API — no scraping of eBay, no use of
deprecated Finding/Shopping APIs.

---

## 3. Current vs requested limit

| | Calls/day |
|---|---|
| Current Browse limit (default) | 5,000 |
| **Requested limit** | **200,000** |

At 5,000/day we can only sample a small rotation of the catalogue each night, so
most products carry a stale or missing eBay price. 200,000/day lets us cover the
full catalogue across all three eBay marketplaces daily, with headroom for
intraday refresh of trending products and for retries.

---

## 4. Call-volume justification

All Browse calls are **server-side batch** jobs (a nightly scheduled refresh) —
**never** triggered by end-user page views (see §5). The volume is therefore
deterministic and bounded by the catalogue size.

| Workload | Products | × Markets | Browse calls/day |
|---|---|---|---|
| Single cards — full daily coverage | ~20,000 | × 3 (AU/US/GB) | ~60,000 |
| Sealed products (boxes/ETBs/collections) | ~2,000 | × 3 | ~6,000 |
| Intraday refresh of trending / newly-released cards | ~5,000 | × 3, twice | ~30,000 |
| Retries, pagination, new-set launch spikes | — | — | ~20,000 |
| **Sub-total (steady state)** | | | **~116,000** |
| Headroom for catalogue & traffic growth (≈1.7×) | | | **→ 200,000** |

The single-card line is the floor: ~20,000 catalogued cards × 3 eBay
marketplaces (NZ buyers are served from eBay AU, so NZ adds no calls) = ~60,000
calls just to give every card a current eBay price once per day. The remainder is
sealed coverage, more frequent refresh for the products people actually search
(new-set chase cards move in price hourly), and operational headroom.

200,000/day is sized for the next ~12 months of catalogue and traffic growth so
we are not back asking for another increase immediately.

---

## 5. How calls are made (architecture & safeguards)

This is the part eBay cares about most: the app is engineered **not** to abuse the
quota. Implemented in `src/lib/ebay.ts`.

- **No per-user API calls.** End users never trigger a Browse call. On the site,
  "Search on eBay" is a plain affiliate **link**, not an API request. All Browse
  traffic is the scheduled nightly batch — so user traffic can spike without
  moving our eBay call volume.
- **Quota-aware budget.** Before each run we read the **live** remaining Browse
  quota via the Developer Analytics API and only spend down to a reserve
  (`EBAY_QUOTA_RESERVE`, default 600), so the daily allowance can never hit zero —
  even across multiple runs (schedule delays, redeploys, manual runs).
- **Picks up the new limit automatically.** We read the *actual* `limit` from the
  Analytics API rather than hard-coding 5,000, so the moment eBay grants 200,000
  the app uses it on the next run — no code or config change needed.
- **Hard 429 handling.** A `429` immediately flips a rate-limited flag that aborts
  the rest of the pass; we back off rather than hammering.
- **Shared-budget coordination.** The reserve lets sister sites on the same
  developer account self-coordinate so they collectively stay under the cap.
- **Tight, specific queries.** Each search includes the card's collector number /
  product keywords and `buyingOptions:{FIXED_PRICE}`, sorted by price, so one call
  returns the relevant window — we don't page through thousands of results.
- **Token caching.** The OAuth token is cached until ~30s before expiry, so auth
  is ~1 call per 2 hours, not per request.

---

## 6. Compliance & data handling

- **eBay API License Agreement.** We comply with the eBay API LA and the
  Marketplace policies. eBay data is used to display current listings and route
  buyers to eBay, not to build a competing dataset.
- **Marketplace Account Deletion / Closure notifications.** We host the required
  endpoint at `https://dexcompare.app/api/ebay/marketplace-deletion`
  (`src/app/api/ebay/marketplace-deletion/route.ts`), which verifies eBay's
  challenge and processes deletion notices.
- **Data freshness, not warehousing.** We store only the *current* cheapest
  listing reference (price, shipping, affiliate URL, title, image) for display,
  refreshed on each run; we do not retain historical eBay listing data beyond
  what's needed to show the live comparison.
- **Correct marketplace & currency.** Each query sets
  `X-EBAY-C-MARKETPLACE-ID` (EBAY_AU / EBAY_US / EBAY_GB) so prices and currency
  match the buyer's market.
- **Affiliate attribution.** Outbound clicks use `itemAffiliateWebUrl` /
  the EPN campaign so eBay correctly attributes the referral.
- **Quality filtering.** We exclude non-English printings, bundles/lots, graded
  slabs and mismatched cards so we only ever link buyers to the correct item.

---

## 7. One-paragraph version (for a free-text "describe your use case" box)

> DexCompare (https://dexcompare.app) is a Pokémon TCG price-comparison site. We
> use the eBay **Buy/Browse API** to fetch the cheapest legitimate Buy-It-Now
> listing for each card and sealed product across the AU, US and UK marketplaces,
> and link buyers to those listings through the eBay Partner Network. All calls
> are server-side scheduled batches (never per-user), governed by a quota-aware
> budget that reads our live remaining limit and reserves headroom so we can't
> exhaust the allowance. Covering our ~20,000-card catalogue across three
> marketplaces daily, plus sealed products and intraday refresh of trending
> items, requires roughly 116,000 calls/day today; we request **200,000
> calls/day** to include growth headroom. We host the required Marketplace
> Account Deletion endpoint and comply with the eBay API License Agreement.
