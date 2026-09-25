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
| `RESEND_API_KEY` | optional now; needed for restock emails (step 6) |
| `DEXCOMPARE_EMAIL_FROM` | optional; e.g. `DexCompare <alerts@dexcompare.com>` |

**Variables** tab: `DEXCOMPARE_SITE_URL` = `https://dexcompare.com`.

> Use the new secret name. The old singles app's paused workflows read
> `DEXCOMPARE_DATABASE_URL`, and some of them reset the database they point at.

## 3. Merge, then run the first import

1. Merge the `claude/peaceful-euler-bplz47` branch into `main`. GitHub only
   runs **scheduled** workflows from the default branch.
2. Actions → **DexCompare sealed import** → **Run workflow** (branch `main`,
   leave "only" blank). The first run creates the tables and reads every store.
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
   | `NEXT_PUBLIC_SITE_URL` | `https://dexcompare.com` |
   | `REVALIDATE_SECRET` | the same value as `DEXCOMPARE_REVALIDATE_SECRET` |
   | `RESEND_API_KEY`, `EMAIL_FROM` | optional — confirmation email on first alert signup |

   **Delete** the old app's variables: the old `DATABASE_URL` (a dead Neon
   project), `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `ANTHROPIC_API_KEY`,
   `GEMINI_API_KEY`, `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_HILLTOPADS_SRC`, …
   None are used any more.
4. Deployments → **Redeploy** the latest `main` commit (untick "use existing
   build cache"). The build does not need the database to be filled.

The old app's Vercel crons (price alerts, newsletter) disappear with this
deploy: the new `vercel.json` defines none. Its `ignoreCommand` skips builds
for pushes that don't touch `apps/dexcompare-sealed`.

## 5. Domains

Vercel project → Settings → **Domains**:

1. Add `dexcompare.com` and `www.dexcompare.com` (follow Vercel's DNS
   instructions at your registrar). Make `dexcompare.com` the primary.
2. Add `dexcompare.app` and set it to **Redirect to `dexcompare.com`
   (308 permanent)**; the same for `www.dexcompare.app`.

Old URLs like `/sealed`, `/sets/<set>` and `/stores` redirect to the Australian
pages; old single-card pages return 404 so Google drops them.

## 6. Restock emails (Resend)

1. [resend.com](https://resend.com) → Domains → add `dexcompare.com`, add the
   DNS records it shows, wait for "Verified".
2. API Keys → create one with "Sending access" → put it in GitHub
   (`RESEND_API_KEY`) and Vercel (`RESEND_API_KEY`), with
   `EMAIL_FROM` / `DEXCOMPARE_EMAIL_FROM` = `DexCompare <alerts@dexcompare.com>`.

Until this is done, signups are saved and nothing is lost: alerts that come
due simply wait, and go out on the first import after the key is set.

## 7. Search Console

Add the `dexcompare.com` property (DNS verification, or set
`GOOGLE_SITE_VERIFICATION` in Vercel to the HTML-tag token and redeploy), then
submit `https://dexcompare.com/sitemap.xml`.

## Checking it works

- `https://dexcompare.com/au` shows products, "Last checked" a few minutes/hours ago.
- A product page lists stores with *In stock* / *Sold out* and "checked … ago".
- Sign up for an alert on a sold-out product → a row appears in Neon's
  `RestockAlert` table (Neon → Tables).
- Neon → Monitoring → **Network transfer**: expect a small fraction of the
  5 GB allowance; each import reads well under 10 MB, and each page render
  reads only its own product or region.

## Costs and limits to know

- **GitHub Actions**: a full import takes roughly 15–25 minutes (≈250 stores,
  three at a time). Twice a day is about 1,000–1,500 minutes a month — inside
  the 2,000 free minutes of a private repo, but it's the biggest user of them.
  Change the two `cron:` lines in `.github/workflows/dexcompare-sealed-import.yml`
  to run once a day if you need the minutes back.
- **No eBay API**: eBay appears only as tagged search links (campaign
  5339155912). Nothing here can spend Rift Compare's eBay quota.
