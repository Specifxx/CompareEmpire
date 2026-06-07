# Deploying CompareEmpire to Vercel + Neon

We deploy **three** apps from this repo: the **hub**, **CameraCompare** and
**DexCompare**. (RiftCompare runs on its own separate instance and is archived
under `archived/` — it is not deployed from here.)

These are dynamic Next.js apps backed by Postgres, so they need a host that runs
Node + a managed database. **Vercel** (one project per app) + **Neon** (free
Postgres) is the recommended setup. GitHub stores the code; Vercel deploys it.

---

## 1. Create the databases (Neon)

1. Sign up at https://neon.tech and create a project (e.g. `compareempire`).
2. Create **two databases**: `cameracompare` and `dexcompare`
   (Neon dashboard → Branches/Databases → Add database).
3. Copy each database's **pooled connection string** — it looks like:
   `postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/dexcompare?sslmode=require`
   (use the **-pooler** host for serverless/Vercel).

## 2. Push schema + seed data into Neon (run locally, once per app)

Vercel's build does **not** seed — do it first so the live sites have data.

```bash
# CameraCompare
cd apps/cameracompare
DATABASE_URL="<neon cameracompare url>" npx prisma db push
DATABASE_URL="<neon cameracompare url>" npx tsx prisma/seed.ts

# DexCompare (the big one — ~20k cards + ~467k prices incl. UK stores; takes a few minutes)
cd ../dexcompare
DATABASE_URL="<neon dexcompare url>" npx prisma db push
DATABASE_URL="<neon dexcompare url>" npx tsx prisma/seed.ts
```

## 3. Create the Vercel projects

In Vercel: **Add New → Project → import this GitHub repo**, three times. Each
project sets a different **Root Directory** (Settings → Build & Deployment →
Root Directory):

| Vercel project | Root Directory |
| --- | --- |
| compareempire (hub) | `apps/hub` |
| cameracompare | `apps/cameracompare` |
| dexcompare | `apps/dexcompare` |

Framework preset = **Next.js** (auto-detected). The data apps' build runs
`prisma generate && next build` automatically. Set the production branch to the
one you deploy (e.g. `main`).

## 4. Environment variables (Vercel → each project → Settings → Environment Variables)

**cameracompare** and **dexcompare** (each):

| Key | Value |
| --- | --- |
| `DATABASE_URL` | that app's Neon **pooled** connection string |
| `AUTH_SECRET` | random 32-byte hex — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

Optional (off until set): `EBAY_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`,
`DISCORD_CLIENT_ID/SECRET`, `RESEND_API_KEY` — see each app's `.env.example`.

**hub** (so it shows live counts and links to the real sites):

| Key | Value |
| --- | --- |
| `CAMERACOMPARE_DATABASE_URL` | Neon cameracompare string |
| `DEXCOMPARE_DATABASE_URL` | Neon dexcompare string |
| `CAMERACOMPARE_URL` | the deployed cameracompare URL (after step 5) |
| `DEXCOMPARE_URL` | the deployed dexcompare URL (after step 5) |

## 5. Deploy

Trigger each project's deploy. Once cameracompare and dexcompare have URLs, set
the two `*_URL` vars on the hub and redeploy it so its cards link out correctly.
You'll end up with three public URLs (e.g. `compareempire.vercel.app`,
`dexcompare.vercel.app`, `cameracompare.vercel.app`). Add custom domains under
each project's Settings → Domains when you have them.

---

## Notes

- **DexCompare markets:** AU · NZ · US · **UK**. The UK ("UK Mode") aggregates 17
  UK TCG stores (Chaos Cards, Magic Madhouse, Total Cards, Element Games, Goblin
  Gaming, Big Orbit, Axion Now, Manaleak, Patriot Games, Athena, Forbidden Planet,
  GAME, Smyths, Pokémon Center UK, Cards Universe, eBay UK, Amazon UK).
- **CameraCompare markets:** AU · US · UK.
- **Prices are synthesised** for the preview. Live pulls (TCGplayer, eBay,
  Cardmarket, the UK/AU/US stores, camera retailers) need those hosts reachable +
  API keys; wire them into each app's price importer and set the keys as env vars.
- The data apps ship a daily Vercel cron (`vercel.json`) hitting
  `/api/cron/refresh-prices`; it no-ops until price-source keys are configured.
- `typescript.ignoreBuildErrors` / `eslint.ignoreDuringBuilds` are enabled so the
  rapidly-adapted apps deploy; tighten and remove these as you harden.
