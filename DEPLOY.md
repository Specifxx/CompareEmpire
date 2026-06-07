# Deploying CompareEmpire to Vercel + Neon

The monorepo deploys as separate Vercel projects from one repo. Current sites:

| Vercel project | Root Directory | Neon database |
| --- | --- | --- |
| compareempire (hub) | `apps/hub` | — (reads the others) |
| cameracompare | `apps/cameracompare` | `cameracompare` |
| dexcompare | `apps/dexcompare` | `dexcompare` |
| carcompare | `apps/carcompare` | `carcompare` |
| phonecompare | `apps/phonecompare` | `phonecompare` |

> **RiftCompare** runs on its own separate instance — it's shown on the hub as an
> external link (set `RIFTCOMPARE_URL` on the hub), not deployed from here.

These are dynamic Next.js apps backed by Postgres. **Vercel** + **Neon** (free
tiers) is the setup. GitHub stores the code; Vercel deploys it.

---

## 1. Databases (Neon) — already provisioned

All four databases (`cameracompare`, `dexcompare`, `carcompare`, `phonecompare`)
have been **created and seeded** in your Neon project via the
**"Seed Neon databases"** GitHub Action (`.github/workflows/seed-neon.yml`).

To re-seed or refresh later: Actions tab → *Seed Neon databases* → Run workflow,
tick the sites you want and paste their Neon URLs. The workflow:
- pulls **real Pokémon prices** (pokemontcg.io) for DexCompare,
- fetches **real product photos** (Wikipedia) for Camera/Car/Phone,
- **auto-creates** the carcompare / phonecompare databases if missing.

## 2. Vercel projects

For each app: **Add New → Project → import `Specifxx/CompareEmpire`**, then set
**Root Directory** to the app's path (table above). Framework auto-detects as
Next.js (pinned via each app's `vercel.json`). Production branch = your deploy
branch.

## 3. Environment variables (Vercel → each project → Settings → Env Vars)

**Each data app** (camera/dex/car/phone):

| Key | Value |
| --- | --- |
| `DATABASE_URL` | that app's Neon **pooled** connection string |
| `AUTH_SECRET` | random 32-byte hex (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

**hub** — to show live counts + link out correctly:

| Key | Value |
| --- | --- |
| `CAMERACOMPARE_DATABASE_URL` / `DEXCOMPARE_DATABASE_URL` / `CARCOMPARE_DATABASE_URL` / `PHONECOMPARE_DATABASE_URL` | the four Neon strings |
| `CAMERACOMPARE_URL` / `DEXCOMPARE_URL` / `CARCOMPARE_URL` / `PHONECOMPARE_URL` | each app's deployed URL (after first deploy) |
| `RIFTCOMPARE_URL` | your existing RiftCompare site URL |

## 4. Deploy

Deploy all projects. After the data apps have URLs, set the hub's `*_URL` vars
and redeploy the hub so its cards link out correctly.

---

## Notes
- **Prices**: DexCompare uses real TCGplayer/Cardmarket data. Camera/Car/Phone
  prices are realistic synthesised figures (no free price API for those verticals);
  the importers are stubbed and ready for a live feed.
- **Listing links**: TCGplayer/Cardmarket link to the real product page; other
  stores use a precise name+model search (exact product URLs need per-store
  scraping — a future enhancement).
- `typescript.ignoreBuildErrors` / `eslint.ignoreDuringBuilds` are on so the
  rapidly-adapted apps deploy; tighten later.
- 🔐 Rotate your Neon password when convenient (it was passed as a workflow input).
