# Archived

## riftcompare
RiftCompare runs on its own separate instance and is **not deployed from this
monorepo**. The code is kept under `archived/riftcompare/` for reference only and
is excluded from the hub, the dev launcher, and the deploy docs.

To run it locally anyway: `cd archived/riftcompare && npm install && npm run dev`.

## Moved here 2026-10-27

Bill chose to share one engine across the small sites and stop carrying
unused code (project thread "Decide whether to unify all compare sites"). None
of these is deployed from this repo, and none had a scheduled workflow left:

- `dexcompare/`: the old DexCompare singles app. DexCompare deploys from
  `apps/dexcompare-sealed`.
- `mtgcompare/`, `opcompare/`, `ygocompare/`: early prototypes. The live sites
  are their own repos (`Specifxx/mtgcompare`, `Specifxx/OpCompare`,
  `Specifxx/ygocompare`).
- `tcgpriceempire/`: never built (its `vercel.json` skipped every build).
- `workflows/`: the manual workflows that only ran those apps. GitHub does not
  run files outside `.github/workflows/`. `seed-neon.yml` no longer seeds the
  old DexCompare singles database.

The hub, CameraCompare, CarCompare, PhoneCompare and LaptopCompare stay in
`apps/`, because `DEPLOY.md` lists Vercel projects for them.
