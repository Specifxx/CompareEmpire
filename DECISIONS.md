# Decisions

Repository-wide decisions, newest at the bottom. DexCompare's own record is `apps/dexcompare-sealed/DEPLOY.md`.

## Speed Insights removed from every app (2026-10-23)

Speed Insights is metered on Pro and duplicated what the weekly PageSpeed job (`psi-dexcompare.yml`) already checks. The package,
the component and DexCompare's CSP entry for `vitals.vercel-insights.com` are gone; Web Analytics stays. Disable Speed Insights in
each Vercel project too. COST.md.

## Web Analytics sends real visitors only (2026-10-23)

Every app mounts Analytics once, through `src/components/SiteAnalytics.tsx`, whose `beforeSend` returns null for previews and local
runs, `navigator.webdriver`, bot-like user agents and a browser that opted out with `?notrack=1` (localStorage `va-disable`,
`?notrack=0` clears it). Each of those was a billed event that was not an audience. The owner should open `?notrack=1` once per
browser. DexCompare's rules are pinned by `tests/analytics-filter.test.ts`; its custom events are unchanged (`docs/analytics.md`).

## SEO-tool crawlers are disallowed; search engines and AI crawlers are not (2026-10-23)

AhrefsBot and SemrushBot join DexCompare's blocked list; the other apps get the same eight-bot list. GPTBot and other AI crawlers
remain allowed, as DexCompare's existing list (which never blocked them) chose. Bots that ignore robots.txt are for the Vercel
Firewall (COST.md).

## The frozen apps' card pages stay ISR for now (2026-10-23)

Only DexCompare builds from git; every other app's `ignoreCommand` is `exit 0`. Their TTLs under six hours were raised to 21600,
but their card and set pages were not moved to the CDN pattern: those trees include sessions and a marketplace, and a CDN copy of
a per-visitor page would serve one visitor's page to all. Do it per app, with a cookie-free test like DexCompare's
`tests/cache-ttl.test.ts`, before re-enabling its builds.
