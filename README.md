# CompareEmpire

A monorepo for **CompareEmpire** and its family of price-comparison websites.
Every site runs the same comparison engine (Next.js 14 + Prisma + Postgres +
Tailwind), tuned to its vertical.

| App | Path | Port | What it compares |
| --- | --- | --- | --- |
| **CompareEmpire** (hub) | `apps/hub` | 3000 | Tracks all subsidiaries with live counts |
| **CameraCompare** | `apps/cameracompare` | 3002 | Cameras, across **AU · US · UK** |
| **DexCompare** | `apps/dexcompare` | 3003 | Pokémon TCG — **all 20,324 cards** across 173 sets, markets **AU · NZ · US · UK** |
| **CarCompare** | `apps/carcompare` | 3004 | New cars (72 models, 18 makes), across **AU · US · UK** |
| **PhoneCompare** | `apps/phonecompare` | 3005 | Smartphones (33 models, 9 brands), across **AU · US · UK** |
| **LaptopCompare** | `apps/laptopcompare` | 3006 | Laptops (32 models, 10 brands), across **AU · US · UK** |

> **RiftCompare** (Riftbound) is owned but runs on its **own separate instance**.
> It's shown on the hub as an external subsidiary (set `RIFTCOMPARE_URL`); a
> reference copy is kept under `archived/riftcompare/`.

> Each app is self-contained (its own `node_modules` and generated Prisma client)
> so the three different database schemas don't collide. Extracting shared
> `packages/ui` and `packages/compare-core` is a clean next step.

## Prerequisites

- Node 20+
- A PostgreSQL server (local is fine). The apps expect these databases in the
  cluster: `cameracompare`, `dexcompare`, `carcompare`, `phonecompare`, `laptopcompare`.

```bash
createdb cameracompare && createdb dexcompare && createdb carcompare && createdb phonecompare && createdb laptopcompare
```

## Setup

```bash
# 1. Install each app's dependencies
npm run install:all          # or: cd apps/<app> && npm install

# 2. Point each app at its database (copy and edit)
#    apps/<app>/.env  ->  DATABASE_URL="postgresql://postgres@127.0.0.1:5432/<db>"

# 3. Create schema + seed data
npm run seed:cameracompare
npm run seed:dexcompare      # the full Pokémon catalogue (incl. UK Mode stores)
npm run seed:carcompare
npm run seed:phonecompare

# 4. Run everything (hub 3000, camera 3002, dex 3003, car 3004, phone 3005)
npm run dev                  # or run one: npm run dev:phonecompare
```

### DexCompare data

The exhaustive Pokémon catalogue is built from the open
[`PokemonTCG/pokemon-tcg-data`](https://github.com/PokemonTCG/pokemon-tcg-data)
mirror. The built seed input (`apps/dexcompare/prisma/pokemon-cards.json`) is
committed so seeding works offline. To refresh from source:

```bash
cd apps/dexcompare
npx tsx scripts/fetch-pokemon-data.ts   # downloads every set/card (needs network)
npx tsx scripts/build-pokemon-data.ts   # rebuilds pokemon-cards.json + pokemon-sets.ts
```

Prices (TCGplayer, Troll and Toad, Cardmarket, eBay) are currently **synthesised**
for the preview. Wiring live price pulls needs those hosts allow-listed plus API
keys — see each app's `.env.example`.

## Notes / follow-ups

- **RiftCompare** is a verbatim copy of TCGEmpire; its retailer prices come from
  a live importer (`scripts/import-prices.ts`) that needs network access, so its
  comparison tables are empty until that runs.
- **CameraCompare** uses a curated camera dataset (`apps/cameracompare/prisma/cameras.ts`).
  Swap it for a live feed when one is available.
- Shared design system / comparison core → extract into `packages/` later.
