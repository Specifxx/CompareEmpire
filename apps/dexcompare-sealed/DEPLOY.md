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
   | `NEXT_PUBLIC_CONTACT_EMAIL` | optional; default `hello@dexcompare.app`. Make sure it is a mailbox someone reads: the contact page promises a reply. |

   `NEXT_PUBLIC_SITE_URL` is the origin every canonical, hreflang, JSON-LD,
   robots and sitemap URL is built on. The code defaults to
   `https://www.dexcompare.app` and normalises what it is given (trailing slash
   stripped, anything unparseable ignored), and a production build whose value
   does not match the domain Vercel is deploying to prints a loud `[site]`
   warning in the build log — but never fails the build. (2026-09-28: the live
   site said `dexcompare.com` everywhere because this variable was wrong.)

   **Delete** the old app's variables: the old `DATABASE_URL` (a dead Neon
   project), `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `ANTHROPIC_API_KEY`,
   `GEMINI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_HILLTOPADS_SRC`, …
   None are used any more.
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
| `placement` | `product-best`, `product-table`, `product-marketplace`, `product-soldout`, `set-banner`, `type-banner`, `browse-empty`, `region-home`, `store-page` |

- Custom events need the **Pro** plan with Web Analytics enabled (Vercel
  project → **Analytics** → Enable). **Hobby records page views only**; the
  events are simply dropped, and nothing breaks.
- Pro keeps **two properties per event** (extra ones are dropped), which is
  why `buy_click` has exactly `retailer` and `placement`. Don't add a third.
- To see them: Vercel project → **Analytics** → **Events** → `buy_click`,
  then break down by `retailer` or `placement`.
- Money is reported by the networks, not Vercel: eBay Partner Network reports
  by `customid` and TCGplayer's Impact dashboard by Shared ID (`sharedid`),
  both `dex-<region>-<placement>`.

No environment variables are needed. Optional overrides:
`NEXT_PUBLIC_EBAY_CAMPAIGN_ID` and `NEXT_PUBLIC_TCGPLAYER_IMPACT_LINK` (the
built-in defaults are the live campaign and deep link).

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
- **No eBay API**: eBay appears only as tagged search links (campaign
  5339155912). Nothing here can spend Rift Compare's eBay quota.
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
