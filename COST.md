# Vercel cost audit (2026-10-23)

Team bill, Oct 10 – Nov 10 so far (given by the owner, not measured here): Fluid Active CPU $11.58, Fast Origin Transfer $10.41
(171 GB), ISR Writes $8.76 (2.19M), Web Analytics $2.47, Function Invocations $1.89 (3.15M), ISR Reads $1.75 (4.38M), Build CPU
$1.51 — $41.53.

## What could and could not be measured

- **Not measurable here**: per-project usage. There is no Vercel token or dashboard access in this environment, so which app
  spends what is unknown. Nothing below is a measured saving.
- **Measured**: a local `next build` + `next start` of `apps/dexcompare-sealed` (files mode, the committed `data/public/`), page
  sizes with `curl` (bytes, uncompressed / gzip):

  | Page | HTML | RSC | HTML gzip |
  | --- | ---: | ---: | ---: |
  | `/` | 190,127 | 97,045 | 30,541 |
  | `/au` | 339,734 | 174,820 | 34,414 |
  | `/au/sealed` | 213,793 | 48,859 | 25,237 |
  | `/au/sets` | 223,778 | 119,308 | 23,758 |
  | `/au/stores` | 235,728 | 121,645 | 24,004 |
  | `/au/deals` | 407,877 | 210,838 | 34,271 |
  | `/us/p/ancient-origins-booster-box` | 164,894 | 78,797 | 29,610 |

  The weight is rendered markup, not embedded data: in the RSC of `/au/deals`, `/au` and the product page `className` strings
  alone are 94 KB, 77 KB and 23 KB; the largest data chunk is the deals page's schema.org ItemList (11 KB, SEO, kept). No full
  history, all-store list or unused-field payload was found, so no payload was cut.
- Grep counts (all apps, `src/`): see "Findings" per app.

## Which apps actually deploy

Only **DexCompare (`apps/dexcompare-sealed`)** builds from git: its `ignoreCommand` builds a production commit only with `[deploy]`
in the subject (one release a day) and no previews. Every other app's `vercel.json` has `"ignoreCommand": "exit 0"`, which skips
**every** git build: hub, camera, car, phone, laptop, mtg, op, ygo, tcgpriceempire serve their last deployment and none of the
changes below reaches them until someone redeploys by hand. That gate is stricter than asked and was left alone. `apps/dexcompare`
is the retired singles app (no Vercel project points at it).

## Findings and changes

### DexCompare (`apps/dexcompare-sealed`)

Already done before this audit (DEPLOY.md, "Where the data lives" / "Caching"): every data page is `force-dynamic` and cached by
Vercel's CDN (`next.config.js` `CDN_PAGES`, `s-maxage=86400, stale-while-revalidate=86400`), no ISR on data pages, no
`generateStaticParams` on them, no cookie/header/session reads (`tests/cache-ttl.test.ts`); `/api/revalidate` is a no-op in files
mode and the data publish commits only when the export changed; middleware only matches the upper-case region prefixes;
`images.unoptimized` (store CDN photos are hotlinked); `robots.txt` already blocked 13 scraper bots.

Changed:
- **Speed Insights removed** (package, component, its CSP `connect-src` host).
- **Analytics `beforeSend`** (`src/components/SiteAnalytics.tsx`, rules in `src/lib/analytics-filter.ts`, pinned by
  `tests/analytics-filter.test.ts`): drops page views and events from `localhost`/`127.0.0.1`/`*.vercel.app`, `navigator.webdriver`,
  bot-like user agents (incl. headless Chrome and Lighthouse, which the weekly PageSpeed job uses) and the owner's browser after
  `?notrack=1` (localStorage `va-disable`). Still strips the query string. Mounted once, in the root layout (the test checks).
- **robots.txt**: `AhrefsBot` and `SemrushBot` added to the blocked list. AI crawlers (GPTBot etc.) stay allowed, as before.
- Custom events kept (documented in `docs/analytics.md`, used for affiliate reporting): `buy_click`, `buy_product`, `search`,
  `search_select`, `region_switch`, `home_region`, `share` (client) and `go_click` (server, `/go`).

### Hub, Camera, Car, Phone, Laptop, MTG, OP, YGO, TCGPriceEmpire

Changed (inert until a manual redeploy): Speed Insights removed; the same `SiteAnalytics` + filter; `robots.txt` blocks AhrefsBot,
SemrushBot, MJ12bot, DotBot, PetalBot, Bytespider, DataForSeoBot, BLEXBot (search engines and AI crawlers allowed). TTLs under six
hours raised to 21600: mtgcompare `/decks`, `/decks/[slug]` (900), opcompare `/widgets` (3600), `/embed/card/[id]` (300, and its
`s-maxage` 300 → 21600), tcgpriceempire `/[game]` (3600). No custom `track()` calls in these apps.

Not changed, follow-up: their card/set pages are still ISR (`revalidate = 86400`: mtg/op/ygo/camera `card/[id]`, `sets/[set]`,
op `cards/[facet]/[value]`, `character/[slug]`, `stores/[key]`; op `card/[id]` also prewarms 200 cards). Moving them to the CDN
pattern needs each page tree proven cookie-free first (these apps have accounts, a marketplace and session reads; mtg `card/[id]`
reads one directly), plus an equivalent of DexCompare's `cache-ttl` test. Not worth the risk while they cannot deploy. Their
`/api/card/[id]` JSON keeps `s-maxage=120`. Lint is not configured in these apps (`next lint` prompts for setup), and typecheck
has the same pre-existing errors as `main` (camera 4, car/phone/laptop 3, ygo 2, mtg 1; none in changed files).

## Expected effect (qualitative)

- Web Analytics: fewer billed events — previews, automation, bot-like agents and the owner's visits are no longer sent.
- Speed Insights: no more data points (also disable it in each project's dashboard).
- Function invocations, Active CPU, Fast Origin Transfer: lower to the degree SEO scrapers obey robots.txt; the Firewall rules
  below handle those that do not.
- ISR writes on the frozen apps: lower only once they are redeployed with the raised TTLs.
