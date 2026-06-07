# Deploying CompareEmpire to Vercel + Neon

These are dynamic Next.js apps backed by Postgres, so they need a host that runs
Node plus a managed database. **Vercel** (one project per app, from this one repo)
+ **Neon** (free Postgres) is the recommended setup. Both have free tiers.

> GitHub itself can't run these apps — GitHub Pages is static-only. The repo lives
> on GitHub; Vercel deploys *from* it.

There are **4 apps** to deploy: `hub`, `riftcompare`, `cameracompare`, `dexcompare`.

---

## 1. Create the databases (Neon)

1. Sign up at https://neon.tech and create a project (e.g. `compareempire`).
2. Create **three databases** in it: `riftcompare`, `cameracompare`, `dexcompare`.
3. Copy each database's **pooled connection string** — looks like:
   `postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/riftcompare?sslmode=require`

## 2. Push schema + seed data into Neon (run locally, once per app)

The Vercel build does **not** seed — do it first so the live sites have data.
For each app, point it at its Neon DB and seed:

```bash
cd apps/riftcompare
DATABASE_URL="<neon riftcompare url>" npx prisma db push
DATABASE_URL="<neon riftcompare url>" npx tsx prisma/seed.ts

cd ../cameracompare
DATABASE_URL="<neon cameracompare url>" npx prisma db push
DATABASE_URL="<neon cameracompare url>" npx tsx prisma/seed.ts

cd ../dexcompare
DATABASE_URL="<neon dexcompare url>" npx prisma db push
DATABASE_URL="<neon dexcompare url>" npx tsx prisma/seed.ts   # ~20k cards; takes a few minutes over the network
```

## 3. Create the Vercel projects

In Vercel, **Add New → Project → import this GitHub repo** *four times*. Each
project points at a different **Root Directory** (Settings → General → Root Directory):

| Vercel project | Root Directory | Framework |
| --- | --- | --- |
| compareempire | `apps/hub` | Next.js |
| riftcompare | `apps/riftcompare` | Next.js |
| cameracompare | `apps/cameracompare` | Next.js |
| dexcompare | `apps/dexcompare` | Next.js |

Build/Install commands are auto-detected (the data apps' build runs
`prisma generate && next build`). Set the production branch to whichever branch you
deploy (e.g. `main`).

## 4. Environment variables (Vercel → each project → Settings → Environment Variables)

**riftcompare / cameracompare / dexcompare** (each):

| Key | Value |
| --- | --- |
| `DATABASE_URL` | that app's Neon pooled connection string |
| `AUTH_SECRET` | a random 32-byte hex — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

Optional (off until set): `EBAY_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`,
`DISCORD_CLIENT_ID/SECRET`, `RESEND_API_KEY` — see each app's `.env.example`.

**hub** (so it shows live counts and links to the real sites):

| Key | Value |
| --- | --- |
| `RIFTCOMPARE_DATABASE_URL` | Neon riftcompare string |
| `CAMERACOMPARE_DATABASE_URL` | Neon cameracompare string |
| `DEXCOMPARE_DATABASE_URL` | Neon dexcompare string |
| `RIFTCOMPARE_URL` | the deployed riftcompare URL (after step 5) |
| `CAMERACOMPARE_URL` | the deployed cameracompare URL |
| `DEXCOMPARE_URL` | the deployed dexcompare URL |

## 5. Deploy

Trigger each project's first deploy. Once the three data sites have URLs, set the
`*_URL` vars on the hub and redeploy it so its cards link out correctly.

You'll end up with four public URLs (e.g. `compareempire.vercel.app`,
`dexcompare.vercel.app`, …). Add custom domains under each project's
Settings → Domains when you have them.

---

## Notes

- **Prices are synthesised** for the preview. Live price pulls (TCGplayer, eBay,
  Cardmarket, camera retailers) need those hosts reachable + API keys; wire them
  into each app's price importer and set the keys as env vars.
- **RiftCompare** has no seeded retailer prices (its importer needs live feeds),
  so its comparison tables are empty until that runs — the catalogue is populated.
- The data apps ship a daily Vercel cron (`vercel.json`) hitting
  `/api/cron/refresh-prices`; it no-ops until price-source keys are configured.
- `typescript.ignoreBuildErrors` / `eslint.ignoreDuringBuilds` are enabled so the
  rapidly-adapted clones deploy; tighten types and remove these as you harden.
