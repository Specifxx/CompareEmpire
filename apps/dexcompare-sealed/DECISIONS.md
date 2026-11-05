
## 2026-11-05: Amazon's own price on the product page's Amazon row, from the Creators API

The owner's US Associates account was approved today and he asked for Amazon's API prices as price rows on every site.
Ported from MTG Compare the same day. Here, in two script-side steps and one reader:

- `scripts/amazon-asins.ts` runs in the daily import after the export (`dexcompare-sealed-import.yml`), in every region with its
  OWN Amazon (AU, US, UK, CA, DE for the eurozone; NZ and SG link to Amazon Australia as a search and stay a search, since an
  AUD price is not a New Zealand price). It searches the region's Amazon for each in-stock product (most stores first,
  `AMAZON_SEARCH_BUDGET` a region a day) and keeps a result ONLY when `identifyAny()` in `lib/sealed-title.ts` reads the
  Amazon title as the same product (the same groupKey): the rule that matches the stores matches Amazon, a wrong merge
  being worse than a missing price. ASINs and misses go in `data/amazon/asins-<region>.json` (ASINs may be stored; a miss
  is retried after 30 days) and ride the publish commit; `status-<region>.json` says what the last run did.
- `scripts/fetch-amazon-prices.ts` runs first in every Vercel build, fetches today's prices for those ASINs (`getItems`,
  ten a call, one a second, `AMAZON_BUILD_CALLS` a region, 30 by default) into the git-ignored `data/amazon-live/`, and
  drops a price under 60% or over 160% of the product's in-stock store median. Prices are never committed: Amazon's
  licence lets a price be kept 24 hours and shown with its time.
- `lib/amazon-live.ts` gives the product page the item's own tagged `/dp/` link and, while under 24 hours old, the price;
  the page passes it to the table's pinned Amazon row (`OfferTable` `pinned.amazon`), which shows it with "as of <time>
  <region clock>" and the licence's disclaimer, and the browser hides the price after 24 hours (`AmazonPrice.tsx`) because
  the page sits in the CDN for a day. The row stays an ad outside the store order: never ranked, never the best price,
  never in deals, alerts, history, the feed, metadata, JSON-LD or the quick view (`tests/amazon-api.test.ts` pins the
  reader to the product page and the client to the scripts). Both files are traced into the functions
  (`next.config.js`).

One credential serves every store: `AMAZON_CREATORS_AU_CLIENT_ID` / `_CLIENT_SECRET` / `_VERSION` as GitHub secrets and
Vercel Production variables (the same values as Compare Empire's and MTG Compare's; `AMAZON_CREATORS_<REGION>_*` would override for one
store). Access is per marketplace and opens by itself once that store's account has qualifying sales (about 10 in 30
days); a refused store is skipped, so the feature costs nothing until then and switches on without a code change.
