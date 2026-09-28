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

**Variables** tab: `DEXCOMPARE_SITE_URL` = `https://dexcompare.app`.

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
   | `NEXT_PUBLIC_SITE_URL` | `https://dexcompare.app` |
   | `REVALIDATE_SECRET` | the same value as `DEXCOMPARE_REVALIDATE_SECRET` |

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

1. Add `dexcompare.app` and make it the primary. The old DexCompare project
   may already have it; if so, just confirm it's attached to this project.
2. Add `www.dexcompare.app` set to **Redirect to `dexcompare.app`
   (308 permanent)**.
3. Follow Vercel's DNS instructions at your registrar if it shows any.
   `.app` domains are HTTPS-only (HSTS-preloaded), which Vercel handles.

Old URLs like `/sealed`, `/sets/<set>` and `/stores` redirect to the Australian
pages; old single-card pages return 404 so Google drops them.

## 6. Search Console

Add the `dexcompare.app` property (DNS verification, or set
`GOOGLE_SITE_VERIFICATION` in Vercel to the HTML-tag token and redeploy), then
submit `https://dexcompare.app/sitemap.xml`.

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

- `https://dexcompare.app/au` shows products, "Last checked" a few minutes/hours ago.
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
  sites); in Impact, check that `dexcompare.app` is listed as a promotional
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
