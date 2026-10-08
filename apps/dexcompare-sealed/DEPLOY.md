# Reviving DexCompare on Vercel + Neon

DexCompare now deploys from **`apps/dexcompare-sealed`** (sealed products only).
Everything below uses free tiers. It takes about 30 minutes, most of which is
waiting for the first import.

## 1. Neon — a new, separate database

Don't reuse an old DexCompare database, and don't share Rift Compare's projects:
each Neon free project has its own 5 GB/month transfer allowance, and this
site should never be able to eat into Rift Compare's.

1. [console.neon.tech](https://console.neon.tech) → **New project**.
   - Name: `dexcompare`. Postgres 16 or 17.
   - Region: **AWS US East (N. Virginia)** — the same place Vercel runs
     functions by default (`iad1`), so page renders are one short hop.
2. On the project dashboard → **Connect**. Copy two strings:
   - **Pooled** (the "Connection pooling" toggle ON; the host contains
     `-pooler`) → this goes to **Vercel**.
   - **Direct** (toggle OFF) → this goes to **GitHub Actions**.

There's nothing to create by hand: the first import creates the tables.

## 2. GitHub — secrets for the import job

Repo **Specifxx/CompareEmpire** → Settings → Secrets and variables → Actions.

**Secrets** tab:

| Name | Value |
| --- | --- |
| `DEXCOMPARE_SEALED_DATABASE_URL` | the Neon **direct** string |
| `DEXCOMPARE_REVALIDATE_SECRET` | a long random string — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep it for step 4. |
| `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | the Production keyset (App ID / Cert ID) of DexCompare's own eBay application. Used **only** by the daily eBay import (below), never by Vercel. |

**Variables** tab: `DEXCOMPARE_SITE_URL` = `https://www.dexcompare.app` — the
canonical origin with `www`, exactly as in Vercel below. The import job POSTs
`/api/revalidate` there and then reads `/sitemap.xml`; through the apex→www
redirect the POST would lose its `Authorization` header and the job would
report "Page refresh: failed: HTTP 401".

> Use the new secret name. The old singles app's paused workflows read
> `DEXCOMPARE_DATABASE_URL`, and some of them reset the database they point at.

## 3. Merge, then run the first import

1. Merge the `claude/peaceful-euler-bplz47` branch into `main`. GitHub only
   runs **scheduled** workflows from the default branch.
2. Actions → **DexCompare sealed import** → **Run workflow** (branch `main`,
   leave "only" blank). The first run creates the tables and reads every store
   (about 20 minutes).
   The job summary shows stores read, offers per region, and any store that
   failed (its rows are simply kept until the next run).
3. After that it runs by itself at 20:47 and 08:47 UTC.

## 4. Vercel — point the DexCompare project at the new app

In the existing **dexcompare** project (or a new one importing
`Specifxx/CompareEmpire`):

1. Settings → **General**
   - **Root Directory**: `apps/dexcompare-sealed`
   - Framework Preset: Next.js · Node.js Version: 20.x
2. Settings → **Git** → Production Branch: `main`.
3. Settings → **Environment Variables** (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | the Neon **pooled** string |
   | `NEXT_PUBLIC_SITE_URL` | `https://www.dexcompare.app` — with `www`, no trailing slash |
   | `REVALIDATE_SECRET` | the same value as `DEXCOMPARE_REVALIDATE_SECRET` |
   | `NEXT_PUBLIC_OPERATOR` | who runs the site, as it should read in the Terms and the footer ("operated by …"): a trading name or a person. Optional; until it is set the site name stands in. The code never invents an entity or an address. |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | optional; default `riftcompare@gmail.com`. Keep it a mailbox someone reads: the contact page promises a reply. |

   `NEXT_PUBLIC_SITE_URL` is the origin every canonical, hreflang, JSON-LD,
   robots and sitemap URL is built on. The code defaults to
   `https://www.dexcompare.app` and normalises what it is given (trailing slash
   stripped, anything unparseable ignored), and a production build whose value
   does not match the domain Vercel is deploying to prints a loud `[site]`
   warning in the build log — but never fails the build. (2026-09-28: the live
   site said `dexcompare.com` everywhere because this variable was wrong.)

   **Delete** the old app's variables: the old `DATABASE_URL` (a dead Neon
   project), `ANTHROPIC_API_KEY`,
   `GEMINI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_HILLTOPADS_SRC`, …
   None are used any more. **Also remove `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` from Vercel**
   if they are there (they were, for the earlier on-demand listings): the website no longer calls
   eBay, so it needs no eBay credential, and keeping them there only widens who could read them
   (least privilege). They live in GitHub Actions now (see "eBay listings: the daily import").
4. Deployments → **Redeploy** the latest `main` commit (untick "use existing
   build cache"). The build does not need the database to be filled.

The old app's Vercel crons (price alerts, newsletter) disappear with this
deploy: the new `vercel.json` defines none. Its `ignoreCommand` skips builds
for pushes that don't touch `apps/dexcompare-sealed` (every production build
empties the page cache, so unrelated pushes shouldn't trigger one). If a
deploy shows **"Canceled by Ignored Build Step"** when you wanted it, push any
change under `apps/dexcompare-sealed`, or clear Settings → Git → Ignored Build
Step for that one deploy.

## 5. Domains

Vercel project → Settings → **Domains**:

1. Add `www.dexcompare.app` and make it the primary: it is what
   `NEXT_PUBLIC_SITE_URL` says, so it is what every canonical URL says. The old
   DexCompare project may already hold the domains; if so, confirm they are
   attached to this project.
2. Add `dexcompare.app` set to **Redirect to `www.dexcompare.app` (308
   permanent)**. One host serves pages; the other only redirects. Whichever way
   round you choose, `NEXT_PUBLIC_SITE_URL` (Vercel), `DEXCOMPARE_SITE_URL`
   (GitHub) and the primary domain must agree.
3. Follow Vercel's DNS instructions at your registrar if it shows any.
   `.app` domains are HTTPS-only (HSTS-preloaded), which Vercel handles.

Old URLs like `/sealed`, `/sets/<set>` and `/stores` redirect to the Australian
pages; old single-card pages return 404 so Google drops them. Upper-case region
prefixes (`/AU`, `/AU/sets`) 308 to the lower-case page (`src/middleware.ts`);
any other unknown path (`/foo`, `/Au`) is a plain 404.

## 6. Search Console

Add the `www.dexcompare.app` URL-prefix property (or a domain property for
`dexcompare.app`; DNS verification, or set `GOOGLE_SITE_VERIFICATION` in Vercel
to the HTML-tag token and redeploy), then submit
`https://www.dexcompare.app/sitemap.xml`.

That URL is a **sitemap index** (`src/app/sitemap.xml/route.ts`) listing
`/sitemap/0.xml` (the static pages and every store page) and `/sitemap/1.xml` …
`/sitemap/7.xml`, one per region in the order AU, US, UK, CA, NZ, EU, SG
(`src/lib/sitemap.ts`): a region's type pages, set pages and every product at
least one store there has in stock or two stores list. Each file carries the
market's last import as `lastmod`. If a query fails while a file is being
regenerated, the request errors and ISR keeps the previous copy — a sitemap is
never cached with its products missing (the old single sitemap was, for 24
hours at a time). The import job checks the live index after every full run
and goes red if the regional sitemaps total under 1,000 product URLs
(`scripts/import.ts`, `checkLiveSitemap`; a full import lists ~8,000).

## Security headers

`next.config.js` sends HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy` and a **report-only**
Content-Security-Policy. Report-only never blocks anything: a violation shows
in the browser console as `[Report Only] Refused to …`. Before ever switching
it to an enforcing `Content-Security-Policy`, browse the landing page, a region
home, a product page and a store page with the console open and make sure it
is silent — product photos are hotlinked from ~250 store CDNs (`img-src
https:` covers them) and Vercel Analytics posts to `/_vercel/insights` on the
same origin.

## Click events (Vercel Web Analytics)

Every outbound buy link — to a store, TCGplayer or eBay — sends one custom
event, `buy_click`, with exactly two properties:

| Property | Example values |
| --- | --- |
| `retailer` | `Pokebox (AU)`, `TCGplayer`, `eBay (ebay.com.au)` |
| `placement` | `product-best`, `product-table`, `product-marketplace`, `product-soldout`, `browse-empty`, `region-home`, `store-page`, and the eBay listing strips below (every `listings-*` placement) |

The eBay units each have their own placement, and Vercel's `buy_click` ({retailer, placement}) says which
surface earned. **EPN's `customid` report is coarser for listing tiles**, on purpose: eBay's spec says to use the
`itemAffiliateWebUrl` it returns exactly as returned, so the browser does not edit the stored URL, and one stored
URL serves every surface that shows the feed. The importer therefore asks eBay (header `X-EBAY-C-ENDUSERCTX`,
`affiliateReferenceId`) for a sub-id **per feed**, which eBay copies into the URL's `customid`:
`dex-<market>-<feed kind>`, with market `us`, `au`, `uk`, `ca` or `eu` (NZ buyers are served `au`, SG buyers `us`) and
feed kind `chase`, `sealed`, `type`, `set` or `item`: for example `dex-us-chase`, `dex-au-item`, `dex-uk-set`. So EPN
splits earnings by marketplace and feed kind (25 values); the surface within it (home, set page, footer...) is in
the Vercel event. Our own SEARCH links (the header item, the compact "search eBay" CTA, the product page's marketplace
rows) are built by us and still carry `dex-<region>-<placement>` (at most 60 characters). Every strip tile, its
compact "search" CTA and the in-feed tile report under the strip's own placement:

| Placement | Where |
| --- | --- |
| `header` | the "eBay" item in the header (desktop nav, xl and up only): a search link |
| `listings-home` | region home: the chase-card strip under the stats row (6 tiles) |
| `listings-home-sealed` | region home: the sealed-Pokémon strip after the first rail (booster boxes) |
| `listings-landing` | the root landing page (`/`): the chase strip from the US feed, labelled "eBay US" |
| `listings-product` | product page, in stock: the product's own listings (cascade: its type's, then generic sealed) directly below the offer table where the table is long enough to sit a screen below the marketplace panel, else at the bottom of the page in place of the pre-footer strip where the page has room; none on a page too short for either |
| `listings-product-soldout` | product page, sold out: the same strip directly under the sold-out callout (the highest-intent spot) |
| `listings-set` | set page: the set's chase cards (cascade: generic chase cards), on a row of its own after the first four products |
| `listings-type` | type page: the type's listings (cascade: generic sealed), on a row of its own after the first four products |
| `listings-browse` | `/<region>/sealed`, page 1 only (unfiltered list): the sealed strip on a row of its own after the first four products |
| `listings-browse-feed` | `/<region>/sealed` and its pages: ONE real listing as a labelled sponsored card after the 12th product |
| `listings-store` | store directory and store pages: the chase strip, after the list (it replaces the pre-footer strip there) |
| `listings-releases` | release calendar: the closing strip (it stands in for the pre-footer one) |
| `listings-footer` | every content page: the slim four-tile strip above the footer (the feed the page's own strip is not; none on a region home, which has two strips of its own) |
| `listings-notfound` | the 404 page: a slim strip (on the eBay site of the region in the URL, US outside one) |
| `product-best`, `product-table`, `product-marketplace`, `product-soldout`, `browse-empty`, `region-home`, `store-page` | the page's own store/TCGplayer buttons, and the functional marketplace rows of a product's "Marketplaces" panel (an eBay search and TCGplayer) |

When a strip has nothing to list (no import yet, a kill switch, rows older than the age bound) it is a single
compact row: the eBay wordmark, "Ad", and a "Search Pokémon sealed on eBay" button (under the same
placement). There are no text-only banners, chip rows or "Still deciding?" rows any more.

- Custom events need the **Pro** plan with Web Analytics enabled (Vercel
  project → **Analytics** → Enable). **Hobby records page views only**; the
  events are simply dropped, and nothing breaks.
- Pro keeps **two properties per event** (extra ones are dropped), which is
  why `buy_click` has exactly `retailer` and `placement`. Don't add a third.
- To see them: Vercel project → **Analytics** → **Events** → `buy_click`,
  then break down by `retailer` or `placement`.
- Money is reported by the networks, not Vercel: eBay Partner Network reports
  by `customid` and TCGplayer's Impact dashboard by Shared ID (`sharedid`). TCGplayer's and eBay's search links carry
  `dex-<region>-<placement>`; eBay listing tiles carry `dex-<market>-<feed kind>` (see above).

No environment variables are needed. Optional overrides:
`NEXT_PUBLIC_EBAY_CAMPAIGN_ID` and `NEXT_PUBLIC_TCGPLAYER_IMPACT_LINK` (the
built-in defaults are the live campaign and deep link).

## eBay listings: the daily import

The image strips on the site ("Chase cards on eBay", "Sealed Pokémon on eBay", "<Set> chase cards on
eBay", "<Product> on eBay") show **real eBay listings**: photo, title, price as eBay returns it, shipping,
and how old the data is, each tile an affiliate link. They are **imported once a day** by a GitHub Actions
job (`.github/workflows/dexcompare-ebay-import.yml`, `scripts/ebay-import.ts`) with DexCompare's own eBay keys
and stored in two small tables; the website only **reads** them. Scraping eBay is a Terms violation and eBay
blocks it; the Browse API is the only compliant source.

> **READ THIS FIRST: the 5,000 calls/day limit belongs to the eBay APPLICATION (the keyset), not to this site.**
> The database counter (`EbayCallDay`) counts only the searches THIS importer makes; it cannot see the owner's other site if that site uses the
> same App ID / Cert ID, and eBay's own counter (which a 429 comes from) adds the two. If both sites run on one keyset, either
> **(a) create a separate eBay application (a separate keyset) for DexCompare** and put its id and secret in `DEXCOMPARE_EBAY_CLIENT_ID` /
> `DEXCOMPARE_EBAY_CLIENT_SECRET` (the recommendation: each site then has its own 5,000), or
> **(b) agree each site's share of the 5,000 and set `EBAY_DAILY_CAP` to that share on BOTH sites** (the default 2,400 leaves 2,600 for the other
> one; the importer's hard maximum is 2,500). Until one of these is done, a busy day on the other site can exhaust the shared limit
> and this import will meet 429s (it stops the run and keeps the previous rows). The importer prints its running total against the caps in
> the log (before the first search and every 250 searches), and `scripts/ebay-check.ts` prints eBay's own count and reset time for the
> keyset, which includes the other site's calls: compare the two numbers after the first live run.

```
GitHub Actions, once a day (secrets live here only)        Vercel (Next.js, ISR)
scripts/ebay-import.ts                                      pages stay static; a strip fetches, near the viewport,
  ├─ plan: which searches, in priority order                GET /api/ebay/<region>?c=<context>
  ├─ reserve each Browse call in the DB first                 └─ reads ≤ 8 rows of EbayListing (no eBay call,
  ├─ search (3 at a time), normalise, filter                      no token, no secret), never older than
  └─ REPLACE each feed's rows (one transaction)                   EBAY_LISTING_MAX_AGE_HOURS (default 26)
```

### Why daily, and the licence risk (read this)

**The owner chose a once-a-day import knowingly.** eBay's API License Agreement (https://www.edp.ebay.com/join/api-license-agreement,
section **8.1(c) "Age of Displayed eBay Content"**; the page numbers its sections automatically, so quote the headings too: 8 "EBAY CONTENT",
8.1 "Using and Displaying eBay Content", (b) "Public Display", (c) "Age of Displayed eBay Content", (d) "Prohibited Use and Derivation of
Information"; re-read on the live page 2026-10-08) says, in **two prongs**:

> **Prong 1, listing information (6 hours):** "Displayed item listing information may not be more than six (6) hours older than information displayed on the eBay Site,"
>
> **Prong 2, other eBay Content (24 hours):** "and other eBay Content must be no more than twenty-four (24) hours older than content displayed on the eBay Site."
>
> **Disclosure:** "If your displayed item listing is not as current as the listing on the eBay Site, you will disclose in your Application ... how much older your displayed item listing is than the same listing on the eBay Site."

A daily import **does not meet prong 1**, and the default 26-hour bound is also beyond prong 2's 24 hours for the other content (titles,
photos): the strips never show anything older than 26 hours, and the compliant mode below brings both inside their limits (a bound of
`24` meets prong 2 alone, at the cost of the two hours of slack for a late GitHub run). Two more clauses bear on it: 8.1(b)(1) "When the eBay Content is
no longer publicly available, you must delete it from your Application" (the importer keeps a feed's previous rows when a refresh comes back
empty, the owner's rule that a blip must not blank a strip; the bound deletes them within 30 hours), and 3.1(b) "All intermediate copies must be
deleted when they are no longer required for the purpose for which they were created". eBay could act on the keyset (a warning, a limit, a
suspension; the Growth Check that raises call limits also reviews compliance). What is done about it:

* **Disclosure, everywhere**: every strip shows "Updated 9 h ago" (rounded up, never fresher than it is) and
  says "Listings are imported from eBay about once a day (updated 9 h ago), so price and availability may have
  changed; check eBay" (the cadence words follow the age bound the route reports: "several times a day" in the compliant mode). The About,
  Terms and Privacy pages say the same. That satisfies the disclosure half of the Age clause.
* **A hard bound**: a listing older than `EBAY_LISTING_MAX_AGE_HOURS` (default **26**) is never shown. The route
  never returns such a row, and the browser re-checks the bound the route reports (every minute and when a tab comes
  back), so a tab left open for a day drops to the plain search link.
* **Deleted when no longer needed (3.1(b), 8.1(b)(1))**: each import run purges rows older than the bound + 4 hours at its start
  and end, and the twice-daily store import (`scripts/import.ts`) does the same with one `DELETE` through the SAME helper
  (`purgeCutoff` in `src/lib/ebay-context.ts`, reading the same `EBAY_LISTING_MAX_AGE_HOURS`), so a stopped eBay job
  cannot leave old listings behind and the two can never disagree. A refresh REPLACES a feed's rows in one transaction: nothing is appended, no
  history is kept. A failed or empty refresh keeps the previous rows until the bound.
* **Reversible**: see the switch below (the cron, one variable in two places, and the run cap; the strips' wording follows by itself).

### The switch to compliant mode (six hours)

Three settings; nothing else changes. The strips already say how old they are, and **their wording follows the bound by itself**: the route
reports the bound it applied (`maxAgeMs`) and the strips say "imported from eBay several times a day" instead of "about once a day" when
it is 12 hours or less, so the copy stays true in either mode (the About, Terms and Privacy pages say "once a day, in the default setting").

1. **The cron** in `.github/workflows/dexcompare-ebay-import.yml`: `"37 8 * * *"` becomes `"13 */4 * * *"` (every four hours, six runs a day; all six fall
   inside one Pacific budget day in summer and in winter).
2. **`EBAY_LISTING_MAX_AGE_HOURS=5.5`**, set in **two** places that read it:
   * **Vercel** (the route reads it and tells the browser; a changed environment variable needs a redeploy),
   * the **GitHub repository variable** `EBAY_LISTING_MAX_AGE_HOURS` (Settings → Secrets and variables → Actions → Variables): the eBay import and,
     through the same variable, the store import (`dexcompare-sealed-import.yml`) read it for their purges.
3. **Lower `EBAY_RUN_CAP` to `380`** (GitHub variable). Six runs of 380 searches are 2,280 a day, under the 2,400 daily cap with 120 to spare for a
   manual run; the default 2,000 would use the whole day in the first run and the later ones would stop at once. 380 searches a run cover the
   generic, type and set feeds (265) and the 115 most valuable product feeds: the other product pages fall back to their type's strip. (Retries
   count inside the run cap, so 380 is a hard ceiling. Run caps of 400 leave no slack at all: six of them are exactly the daily cap.)

The skip-fresh window is `min(2 h, a quarter of the bound)`: 1.4 h in compliant mode, so a four-hourly run always buys every feed again. Switching
back is the same three settings in reverse. Raising the call limit (the eBay Application Growth Check, below) is what would let a compliant mode
also cover every product.

### What to set up

1. **A Production keyset for DexCompare's own eBay application** (developer.ebay.com → Application Keys → Production:
   "App ID" is the client id, "Cert ID" the secret; a Sandbox keyset does not work: the code only calls `api.ebay.com`).
   The Buy APIs are access-controlled: if the token works but searches answer 403, the keyset has not been granted Buy API
   access yet (apply from the application's page; eBay's Partner Network questionnaire, up to 10 business days). The 5,000
   calls/day default limit is **per application**: if DexCompare's keyset is also the other site's, the two share it (see the box above).
2. **GitHub secrets** (Settings → Secrets and variables → Actions → Secrets): `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET`
   (the names the owner set), plus the existing `DEXCOMPARE_SEALED_DATABASE_URL`. `DEXCOMPARE_EBAY_CLIENT_ID` /
   `DEXCOMPARE_EBAY_CLIENT_SECRET` are accepted too and win when set (to give this site a different keyset from a shared
   one without renaming anything). The secrets are passed to the **import step only**.
3. **Optional repository variables** (Variables tab): `EBAY_DAILY_CAP` (default 2400, at most 2500), `EBAY_RUN_CAP` (2000),
   `EBAY_LISTING_MAX_AGE_HOURS` (26), and `NEXT_PUBLIC_EBAY_CAMPAIGN_ID` **only if** you override the EPN campaign id: the importer enforces
   its own value (default `5339155912`) on every URL it stores and asks eBay to tag the URLs with it. The website no longer compares a listing's
   campaign id with its own build's (it checks only that an eBay item URL carries a numeric `campid`), so an override in Vercel alone can no longer
   blank the strips; it changes only the site's own search links. The simplest course is to override neither.
4. **Merge to `main`** (GitHub runs scheduled workflows from the default branch only). The schedule is 08:37 UTC daily: **after** eBay's
   daily counter resets (midnight Pacific = 07:00 UTC in summer, 08:00 in winter), so the scheduled run is always the first run of its
   budget day and gets the full run cap, whatever manual runs were made the day before. (An earlier slot, before the reset, was the LAST
   run of its day: a manual "run it now" earlier that day left it only the 400-call slack, and most product strips went dark for ~18 h.)
   It is also a good time for the audience: 09:37 / 10:37 in the UK / central Europe, 19:37 in Sydney, 04:37 in New York, 01:37 in Los Angeles.
5. **Run it now**: Actions → **DexCompare eBay import** → **Run workflow**. Inputs: `only` (a comma-separated
   subset of `chase, sealed, types, sets, items`), `force` (buy every feed again; a normal run does not re-buy a feed whose rows are less than 2 hours old, so an accidental second dispatch, or a re-run after a failure, spends nothing on what is already fresh), `dry_run` (prints the plan and the expected calls: no eBay call, no
   database write). The job runs `prisma db push` first (two new tables, no data loss), and the importer creates the
   tables itself if they are missing. Without the eBay secrets the job writes a skip message to its summary and exits 0.
   A full run takes minutes (about 2,000 searches, three at a time). **A manual run prints its budget before the first search**:
   the Pacific budget day, how many Browse calls are reserved so far today and how many are left of the daily cap, the most searches
   this run may make (and which limit that is: run cap, daily room or `--max-calls`), what the plan buys per bucket, how many feeds it
   skips as fresh, and when it stops early; then a progress line every 250 searches (this run's searches and today's total against the
   caps). Its summary shows calls used today, feeds refreshed/failed/skipped per bucket, items stored, product keys covered vs
   eligible, and the oldest row's age. Use `dry_run` first to read the same numbers without spending anything.
6. **Vercel needs nothing eBay-related.** `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` are no longer read by the site: remove
   them from Vercel (least privilege). Optional there: `EBAY_LISTINGS=off` (a kill switch: the route answers empty and the
   strips become the plain search row) and `EBAY_LISTING_MAX_AGE_HOURS` (the age bound; default 26).
7. **Check the keys** (prints the token status and, per marketplace, how many listings two searches would keep; counts
   only, never the secrets; 10 calls, not recorded in the daily counter):

   ```bash
   cd apps/dexcompare-sealed
   EBAY_CLIENT_ID=… EBAY_CLIENT_SECRET=… npx tsx scripts/ebay-check.ts            # all five marketplaces
   DATABASE_URL=… npx tsx scripts/ebay-budget.ts                                  # read-only: today's counter, feeds, their ages, rows
   DATABASE_URL=… npx tsx scripts/ebay-import.ts --dry-run                        # the plan and the capacity model, no network, no writes
   ```

### How it works

* **Feeds.** A feed is up to 8 stored listings (a strip shows six, the slim one four, the browse page's in-feed card the seventh), keyed `<marketplace>|<kind>[:<arg>]` in `EbayListing`:
  `EBAY_US|chase`, `EBAY_AU|sealed`, `EBAY_GB|set:surging-sparks`, `EBAY_US|type:booster-boxes`, `EBAY_US|item:<productId>`.
  Marketplaces: au+nz share `EBAY_AU`, us+sg share `EBAY_US`, uk `EBAY_GB`, ca `EBAY_CA`, eu `EBAY_DE` (NZ and SG have no
  affiliate programme of their own). Rows hold the title, the eBay photo URL (upgraded from `s-l225` to `s-l500`), the
  price exactly as eBay returned it, the first shipping option, the condition and the affiliate URL; `EbayCallDay` holds one
  counter per budget day.
* **The route** `GET /api/ebay/<region>?c=<context>` reads the rows for the feeds a context maps to and answers with the
  first feed that has at least two live rows (a CASCADE): `item:<slug>` → the product's feed, then its type's, then sealed;
  `set:<slug>` → the set's feed, then chase; `type:<slug>` → the type's feed, then sealed; `chase` and `sealed` stand alone.
  One indexed query (a unique-index lookup of the product first, for `item:` only). The response is
  `{ feed, items, fetchedAt (the OLDEST row used), maxAgeMs, reason? }`: whitelisted fields only. Region and context are
  whitelists (a product slug is checked against the database), the SQL is parameterised, an unknown product or a missing
  table answers "empty" with no error text. CDN cache: 5 minutes (60 s for an empty answer).
* **The strips** (`src/components/EbayStrip.tsx`): the server-rendered page holds only the compact search row inside an
  invisible, strip-sized box (no layout shift); within about 300 px of the viewport the strip fetches and replaces it. Six
  tiles (four in the slim strip above the footer; a scroll-snap row inside itself on phones), the whole tile one sponsored
  link, a thumbnail that hides its tile if it fails to load, shipping called out ("Free shipping" in green, or "+ A$12.00
  shipping"), the condition when it is not new, and the disclosure under the row. A product page's own listings say "Lowest price first,
  before shipping" (they are stored in that order). **New Zealand and Singapore** are served the Australian and US feeds, whose shipping was
  priced to Australia and the US (and the items may not ship to NZ or SG at all): their tiles make **no shipping claim**, only "Shipping on eBay"
  (never "Free shipping" or a cost), and the disclosure under the strip says "These are eBay Australia listings ... delivery to New Zealand is not
  shown here" (eBay US / Singapore for SG).
* **Placement rules** (`src/lib/ebay-ads.ts`, tested): at most one unit in a phone viewport and two on a desktop one (the
  header's own "eBay" item is always one of the two on xl and up). On set, type and browse pages the strip sits on a row of its own **after
  the first four products** (one row on a desktop, two on a phone), not above them: at the top it filled half the first screen, pushed the
  list below the fold and became the page's largest paint on a slow phone. Store directory and store pages carry theirs after the list. A region's
  home page carries two strips (chase cards under the stats row, sealed after the first rail) and no strip above the footer: a feed holds 8
  listings, too few for a third unit of four tiles the page does not already show.
  The browse page's one in-feed listing card sits in the product grid (an ad-labelled, framed card): the one place an eBay listing is a
  neighbour of store listings; it is not a table row and is visibly marked, but if eBay's "visually isolated" reading is strict, remove
  `listingsTile` in `BrowseGrid.tsx`. On a product page: sold out, the strip sits directly under
  the callout; in stock, below the offer table where the page is long enough, else at the bottom in place of the pre-footer strip.
  A page too short for its units drops the pre-footer strip (`<NoPreFooter/>`).

### The import's plan, caps and failure handling

Priority order (spent until the run cap; a cap hit drops the **least valuable**, never a hole in the middle):

| # | Bucket | What | Calls |
| --- | --- | --- | ---: |
| 1 | chase | generic chase cards, 8 queries round-robin per marketplace | 40 |
| 2 | sealed | generic sealed Pokémon, 6 queries per marketplace, kept only if `identify()` accepts the title | 30 |
| 3 | types | one query per high-value type (booster boxes, ETBs, Pokémon Center ETBs, UPCs, booster-box / ETB / bundle cases, Build & Battle Stadiums, collections) | 45 |
| 4 | sets | chase cards of the 30 most recently released sets (never a series-named or common-word set), one query each | 150 |
| 5 | items | one query per (marketplace, **eligible** product): "Pokemon <cleaned name> sealed" | the rest |

* **Eligible products.** Always (from US$25): booster box, booster-box / ETB / bundle case, ETB, Pokémon Center ETB,
  Ultra-Premium Collection, Build & Battle Stadium. Only from a best-known price of about **US$50** (the **core**): collection,
  tin, deck, booster bundle, Build & Battle box, blister. **Never**: booster packs and sleeved boosters, or anything under
  **US$25**; a reference price over US$600 for those gated types is a placeholder ask ("CA$9,999" blisters are in the data) and is
  not eligible. Best-known = the market's cheapest open price, else its cheapest listed (sold-out) one; only regions where the
  product has a `ProductStat` row count, and a marketplace takes the higher price of its regions. Core keys are bought first;
  if budget remains, the **extension** (US$25-50) follows, downward by price. Within a tier, keys are ranked by reference
  price (US$) x market weight (US 1.0, UK 0.6, AU/NZ 0.6, CA 0.5, EU 0.4), sold-out products x1.5 (highest intent).
  Thresholds in each market's money (the importer's rough FX table, never shown): **US$50 = A$75 / NZ$82.50 / US$50 / £39 / C$68.50 / €45 / S$65**, and
  **US$25 = A$37.50 / NZ$41.25 / US$25 / £19.50 / C$34.25 / €22.50 / S$32.50**.
* **Relevance** (`src/lib/ebay-normalise.ts`): a listing is kept for a product only if the repo's own title classifier accepts it as
  sealed Pokémon and says the same **type and set** (a set product's identity is exactly that); for collections, tins, decks and
  blisters the classifier's identifying words must all be in the title, with nothing extra but seller filler ("fast", "USA",
  "NIB"…). Singles, cases when the product is a box, lots, empty or opened boxes, damaged ones, other languages and other
  sets or types are refused, and so is anything under the type's price floor. Up to 8 de-duplicated listings are stored,
  **lowest price first** (the strip says nothing more than "before shipping": never "cheapest" or "deal"). Chase feeds keep the
  junk / counterfeit / language filters of the previous round.
* **Caps.** The run cap is `min(EBAY_RUN_CAP, what is left of today's daily cap, --max-calls)` and is a **strict upper bound on the searches of
  a run, retries and the repeat after a 401 included** (a search is claimed against it before it is made, so three workers cannot overshoot;
  retries therefore take their calls from the least valuable feeds at the end of the plan). The daily cap
  (`EBAY_DAILY_CAP`, default 2,400 of eBay's 5,000 default, the ~400 slack being for manual re-runs, token calls and the other site) is kept in the
  database, per **budget day = the Pacific day** (eBay's limit resets at midnight Pacific; the official page was not readable
  from the build sandbox, a third-party summary says "midnight Pacific Time", and eBay's own field documentation says the reset is "current time
  plus the time window", which some developers see at other times than midnight: **this boundary is an assumption**. `scripts/ebay-check.ts`
  prints eBay's own counter and reset time from the Analytics API's `getRateLimits`: compare it with 07:00/08:00 UTC once. The counter also cannot see
  the owner's other site's calls on a shared keyset: see the box at the top of this section.)
  **Every Browse search reserves its call first with ONE atomic statement**:

  ```sql
  INSERT INTO "EbayCallDay" ("day","total","updatedAt") VALUES ($day, $n, now())
  ON CONFLICT ("day") DO UPDATE SET "total" = "EbayCallDay"."total" + $n
    WHERE "EbayCallDay"."total" + $n <= $cap
  RETURNING "total"
  ```

  so overlapping runs and manual dispatches can never pass the cap between them (verified: three runs started together made
  2,400 searches between them, equal to the counter and to the mock's own count). Token requests are identity-API calls, not
  Browse searches: nothing in eBay's documentation says they count, and the slack covers them if they do.
* **Failures.** Concurrency 3; **a circuit breaker protects the daily budget**: a 403 (or a 401 that survives the token refresh: no Buy API
  access) stops the run at once, **6 searches in a row that fail** (a 400 or 5xx after its retry, malformed JSON, or HTTP 200 with no listings and a
  warning from eBay) stop it, and so do 30 in a row that come back with no listings at all; each ends with one `::error::` that names only the error
  category (`search-http-403`, `search-malformed`, `search-warning`) and exits 1, so a persistent failure costs a handful of calls, not the run cap; a run that
  ends by using up its retry allowance reports "retries", one that reaches its cap "cap". A **feed refreshed in the last 2 hours (a quarter of the
  bound at most) is not bought again** (an accidental second dispatch, an overlapping run, a re-run after a crash; `force` overrides), so reruns
  spend their calls further down the plan. Two runs replacing the same feed take a Postgres advisory lock per feed. Retries count inside the run
  cap (at most 5% of the plan plus 5); the daily cap holds regardless. A search gets one retry on a 5xx or a timeout; a 400 on a search that carries a price
  filter retries once without it (the `[N..]` range syntax could not be exercised without keys); a **429 stops the whole run**
  (logged, previous rows kept); a **token failure fails the run** (`::error::` with only eBay's OAuth category, e.g.
  `token-http-401:invalid_client`, never a secret, id or eBay's own text); fewer than half of the planned feeds refreshed fails
  the run. A feed is replaced only after a successful, **non-empty** normalisation; an empty or failed one keeps its old rows
  until the bound.

### Capacity model (local data, 2026-10-07)

From the full local database (6,684 products, 14,166 product x region rows), `npx tsx scripts/ebay-import.ts --dry-run`:

| Bucket | Feeds | Calls |
| --- | ---: | ---: |
| chase | 5 | 40 |
| sealed | 5 | 30 |
| types | 45 | 45 |
| sets | 150 | 150 |
| **fixed** | **205** | **265** |
| items wanted | 7,701 (4,848 core + 2,853 extension; 4,357 distinct products) | 7,701 |
| items bought at a 2,000-call run | **1,735** (35.8% of the core keys, 22.5% of all) | 1,735 |

**Do ALL eligible keys fit? No.** All core keys need 265 + 4,848 = **5,113** calls a day; every eligible key (extension too)
needs **7,966**. One run is capped at 2,000 and the day at 2,400 (and eBay's own default limit is 5,000 a day for the whole
application, shared with the owner's other site), so a day covers about 1,735 of them. The extension (US$25-50) is not
reached at all at a 2,000-call run, and the cheapest key bought is about US$100. By marketplace (covered / eligible product keys):
US 690 / 1,947 (35%), AU+NZ 399 / 1,715 (23%), CA 363 / 1,895 (19%), UK 144 / 971 (15%), EU 139 / 1,173 (12%). By type
(covered / eligible): booster-box cases 113/113, ETB cases 155/155, bundle cases 61/61, Ultra-Premium Collections 53/70,
Booster Boxes 205/260, Pokémon Center ETBs 99/145, Build & Battle Stadiums 14/48, ETBs **123/293**, collections 571/2,956,
tins 163/1,870, blisters 84/806, decks 69/650, Build & Battle boxes 18/146, booster bundles 7/128. Weighted by reference price x
market weight x sold-out boost (a proxy: there is no traffic data), the plan covers **82%** of the eligible weight; every key
of US$500 or more (642) is covered, 1,458 of the 1,640 keys of US$200 or more. Sold-out products: 697 of 3,857 eligible keys
covered. The weighting is a price proxy, not traffic: **ETBs, the most-searched product, are only 42% covered** because they are
cheap next to cases and boxes; if that matters, raise their rank (a per-type multiplier in `itemKeys`).

What would cover more: `EBAY_RUN_CAP` 2,500 (+500 keys), dropping the sets bucket (`only` without `sets`: +150), or the Application
Growth Check (below), which raises the 5,000/day limit: covering every core key needs about 5,100 calls a day by itself.
A product whose key is not covered still shows its type's listings (or generic sealed), so no strip is empty.

### Troubleshooting

* **`token-http-401:invalid_client`**: the id or secret is wrong, a Sandbox keyset, or the keyset is not enabled for Production.
* **Searches answer 403**: the keyset has no Buy API access yet (apply from the application's page). The run stops after the first refusal (the
  circuit breaker), so it costs a handful of calls, not the day's budget. the same breaker stops the run after "6 searches in a row failed" or "30 in a row returned nothing" (a rejected filter, a changed response).
* **What EPN reports for listing tiles**: the importer asks eBay for `affiliateReferenceId=dex-<market>-<feed kind>` on every search, eBay puts it
  in the URL's `customid`, and the site uses that URL exactly as eBay returned it (eBay's spec says to; nothing in the browser edits it). So EPN's
  report by custom id shows `dex-us-chase`, `dex-au-item`, `dex-uk-set` and so on: earnings by marketplace and feed kind, **not by page**. If
  you see only `dex-listings` or no custom id, eBay did not echo the reference: check one stored URL (`SELECT "url" FROM "EbayListing" LIMIT 3`)
  and the importer's request header; the campaign id, and so the earnings, are unaffected either way. Which surface earned is in Vercel's
  `buy_click` placement.
* **The route is public**: each distinct `?c=` value that is not cached reaches the database once; CDN caching covers the repeats. Put a Vercel
  Firewall rate limit on `/api/ebay/*` (Security → Firewall → Rate limiting) if its traffic ever looks abnormal; each answer reads at most 8 rows
  (about 5 KB).
* **A 429 in the log**: eBay's daily or burst limit; the run stopped and kept the old rows. Check the other site's use of the same keyset.
* **Scheduled runs can be delayed or skipped by GitHub** (and are disabled after 60 days without repository activity). Rows older
  than the bound simply stop showing (the strips become the search row): that is the intended failure mode, not an error.
* **The strips show only the search row**: nothing imported yet, the kill switch is on, or the rows are older than the bound;
  `scripts/ebay-budget.ts` shows which. Vercel's function log shows a Prisma "relation does not exist" line for each uncached
  request until the first import has created the tables: harmless.
* **Application Growth Check**: developer.ebay.com → your application → "Application Growth Check" raises the 5,000/day limit after eBay
  reviews that the application follows the License Agreement and uses the API efficiently; it will look at the six-hour rule.

### eBay's rules, and how each is met

| Rule (source) | How |
| --- | --- |
| "Displayed item listing information may not be more than six (6) hours older" (prong 1) and "other eBay Content ... no more than twenty-four (24) hours older" (prong 2) (API License Agreement 8.1(c), "Age of Displayed eBay Content") | **Not met in the default daily mode** (26 h bound): disclosed ("Updated 9 h ago", "imported about once a day"), bounded (26 h), and switchable to a compliant mode (above) |
| Delete copies when no longer required (3.1(b)); delete eBay Content that is no longer publicly available (8.1(b)(1)) | Rows are deleted when older than the bound + 4 h, by the importer (start and end of each run) and the store import; a refresh replaces, never appends; no history |
| eBay content not "co-mingled or combined with non-eBay Content" (8.1(b)(2)) | A strip holds eBay listings only, in a dashed unit of its own, never inside a ranked table or row |
| No derived statistics (8.1(d)) | None: no average, median, "% below"; prices shown as returned, never converted, compared, ranked against the stores', counted, or in JSON-LD, meta, OG or the sitemap; the order within a product's feed is "lowest price first, before shipping" (shown on the strip) and says nothing else |
| "Only surface FIXED PRICE items"; eBay's own image; shipping separate; "indicate when the item is not new" (Buy APIs Requirements) | `buyingOptions:{FIXED_PRICE}`; `*.ebayimg.com` thumbnails as plain `<img>`; the first shipping option is shown on the tile; the condition is shown when it is not new |
| Use the URL returned in `itemAffiliateWebUrl` | Every link is that URL **exactly as returned** (the importer checks it is one eBay item page with our campaign id and stores eBay's own string; the browser checks an eBay item URL with a numeric `campid` and changes nothing in it). `customid` is the per-feed `affiliateReferenceId` the importer sent (`dex-<market>-<feed kind>`). Only when eBay sends no usable one is `itemWebUrl` tagged with the same EPN parameters |
| 5,000 calls/day default (API call limits), per application | Daily cap 2,400 (max 2,500) for THIS site's runs, reserved atomically in the database before each call; **the counter cannot see another site on the same keyset** (box at the top of this section) |

### The eBay wordmark

Every strip starts with the multicolour "ebay" wordmark as small inline text (`src/components/EbayMark.tsx`: e #e53238, b #0064d2,
a #f5af02, y #86b817, `aria-label="eBay"`): **one swappable component**. The owner chose a wordmark style; eBay Partner Network's brand
guidelines apply to how its marks are shown (clear space, no recolouring, no implied endorsement): check them in EPN Campaign
Manager before changing its size or colours, and swap the file's body for eBay's official logo artwork if EPN asks for it.

### Not verified without real keys

The exact `price:[N..]` filter syntax (a 400 retries without it), the real response shape of `shippingOptions` for every
marketplace (a missing cost shows "Shipping on eBay"), that `i.ebayimg.com` serves `s-l500` for every photo (eBay's own pages
use it; a tile whose picture fails hides itself), which keys eBay counts as "Browse" calls, and the Pacific reset time itself.
Run `scripts/ebay-check.ts` once the keys are in, then one manual import, and read its summary.

## Checking it works

- `https://www.dexcompare.app/au` shows products, "Last checked" a few minutes/hours ago.
- `https://www.dexcompare.app/sitemap.xml` lists eight files, and
  `/sitemap/2.xml` (US) has a couple of thousand `/us/p/…` URLs. A regional
  file with no products means the database is empty or unreachable (the build
  writes empty regional files when it cannot reach the database; the first
  import's page refresh fills them).
- `view-source:` of any page: `<link rel="canonical">` and every `hrefLang`
  say `https://www.dexcompare.app/…`. If they say another host, fix
  `NEXT_PUBLIC_SITE_URL` and redeploy.
- `/AU` answers 308 to `/au`; `/foo` answers 404 with the branded page.
- A product page lists stores with *In stock* / *Sold out* and "checked … ago".
- Neon → Monitoring → **Network transfer**: expect a small fraction of the
  5 GB allowance; each import reads well under 10 MB, and each page render
  reads only its own product or region.

## Costs and limits to know

- **GitHub Actions**: a full import of the 344 stores took 18 minutes in
  testing (three stores at a time, to stay under Shopify's rate limits).
  `Specifxx/CompareEmpire` is a public repository, so standard runner minutes
  are free. If the repo is ever made private, twice a day is ~2,000+ minutes a
  month — change the two `cron:` lines in
  `.github/workflows/dexcompare-sealed-import.yml` to one.
- **eBay API: DexCompare's own keyset, in GitHub Actions only.** One import a day makes at most 2,000 Browse
  calls (cap 2,400 a day across every run, kept in the database); the website makes none. Nothing here can
  spend Rift Compare's eBay quota unless both sites share one keyset (the owner's other site shares the
  5,000-call daily limit with this one: see "Capacity model").
- **TCGplayer** links go through Impact (`partner.tcgplayer.com/c/7385758/…`),
  the same approved account as Rift Compare. Every page carries Impact's
  `impact-site-verification` tag (the same token as the other CompareEmpire
  sites); in Impact, check that `www.dexcompare.app` is listed as a promotional
  property of that account.
- **When the import goes red**: fewer than half the stores read, nothing
  requested read at all, or TCGplayer not read for 48 hours (its offers show
  "not checked recently" after 72 hours and are dropped after 14 days). A
  single failed TCGplayer read only adds a warning to the run and keeps its
  previous offers; a TCGplayer read that comes back with under 70% of the
  offers it had last time counts as failed in the same way.
- **Schema changes reach the database through the import job** (its "Sync
  the schema" step, `prisma db push` without `--accept-data-loss`), not the
  Vercel build. A push to `main` that changes `prisma/schema.prisma` starts
  that job on its own (a two-minute TCGplayer-only run, which also recomputes
  every product's stats), so a new column — e.g. `ProductStat.marketplaceOpen`
  — lands at about the same time as the deploy. Check Actions → **DexCompare
  sealed import** went green after such a merge; until the column exists, new
  pages that aren't cached yet fail to render. An added column with a default
  is safe for the old code.
