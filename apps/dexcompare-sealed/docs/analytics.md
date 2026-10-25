# Analytics: where the clicks are counted

All on Vercel: **Web Analytics** (page views and custom events) and a first-party click redirect, **`/go`**. No third-party analytics, no cookies, no accounts, nothing a visitor types.

## Turn it on (once, in the Vercel dashboard)

1. **Project → Analytics → Enable** (Web Analytics). Page views work on every plan.
2. **Custom events need a Pro (or Enterprise) plan.** On Hobby, Vercel records page views only: none of the events below
   appear. How many properties an event keeps depends on the plan:

   | Plan | Custom events | Properties kept per event |
   | --- | --- | --- |
   | Hobby | none | — |
   | Pro | yes | 2 |
   | Pro + Web Analytics Plus ($10/month, Settings → Billing → Add-ons) | yes | 8 |

   The site sends events in the shape the plan keeps. **Default (Pro): two events of two properties per click.** With Web
   Analytics Plus, set the Vercel environment variable **`NEXT_PUBLIC_ANALYTICS_PROPS=8`** (Production and Preview) and
   redeploy: each click is then one `buy_click` with all eight properties.

   To see your plan: Vercel dashboard → your team → Settings → Billing. If the Events panel under Analytics stays empty after a
   few clicks on the live site, the team is on Hobby.

## Where to look

**Vercel → Project → Analytics → Events** (scroll down on the Web Analytics page). Click an event name to see it broken down by
each property; pick a property value to filter the whole Analytics page by it. The page views panel above it shows the pages.

| You want | Look at |
| --- | --- |
| Clicks by store | `buy_click` → `retailer` (Pro) or `store` (Plus) |
| Clicks by page / surface | `buy_click` → `placement` (e.g. `product-best`, `product-table`, `preorders`, `listings-home-sealed`); with Plus also `page` |
| Clicks by product | `buy_product` → `product` (Pro) or `buy_click` → `product` (Plus) |
| Clicks by region | `buy_product` → `region` (Pro) or `buy_click` → `region` (Plus) |
| Affiliate vs store clicks | Pro: `retailer` is `TCGplayer` or `eBay (…)` for affiliate clicks; Plus: `affiliate` true/false |
| Clicks ad blockers hide | `go_click` (server-side, below) |
| Delta Reign / deals page clicks | `buy_click` → `placement` `preorders`, `preorders-ebay`, `preorders-tcgplayer`; `listings-deals`, `listings-deals-feed` (and with Plus, `page` = `preorders`, `deals`, `black-friday`) |

## The events

All values are ids, slugs, codes and numbers (at most 255 characters): never a name a visitor typed, a query or a URL.

| Event | When | Properties (Pro) | Properties (Plus, `NEXT_PUBLIC_ANALYTICS_PROPS=8`) |
| --- | --- | --- | --- |
| `buy_click` | any outbound buy link: a store, TCGplayer or eBay (`src/components/OutboundLink.tsx`) | `retailer` ("Pokebox (AU)", "TCGplayer", "eBay (ebay.com.au)"), `placement` | `product`, `store` (store key, "tcgplayer" or the eBay retailer), `region`, `price` (the button's price, in the region's currency), `position` (1 = top of the list), `page` (product, preorders, deals, black-friday, set, home…), `affiliate` (true for TCGplayer and eBay), `placement` |
| `buy_product` | the same click, when the link is a product's offer (Pro only) | `product` (slug), `region` | — (in `buy_click`) |
| `go_click` | **server-side**, from `/go` (below): a store or TCGplayer offer's click | `store`, `placement` | the same eight as `buy_click` |
| `search` | a search submitted from a search box | `region`, `kind` (`submit`) | same |
| `search_select` | a typeahead result picked | `kind` (`product`, `all`) | same |
| `region_switch` | a region picked in the header's region menu | `from`, `to` | same |
| `home_region` | the landing page showed a region's products | `region`, `source` (`geo`, `language`, `saved`, `timezone`, `picked`) | same |
| `share` | the share button | `kind` | same |

`buy_click` and `go_click` count the same offer clicks two ways: the browser's (blocked by ad blockers, carries the page) and the
server's (counted by `/go` itself, so no blocker can hide it). Expect `go_click` ≥ `buy_click` for offer placements.

## `/go`, the first-party redirect

A store or TCGplayer **offer** button (the best-price card, the price table, the phone buy bar, the pre-order lists) links to
`/go?u=<destination>&s=<store>&r=<region>&pl=<placement>&p=<product>&c=<price cents>&n=<position>` on our own domain.
`src/app/go/route.ts` (edge, a few ms):

- checks the destination is on **that store's own host** (or TCGplayer's, `tcgplayer.com` / `partner.tcgplayer.com`), else 400:
  it can never be used as an open redirect (`src/lib/go.ts`, `tests/click-events.test.ts`);
- answers **302** to the destination (TCGplayer's is the Impact affiliate URL, exactly as before), `Cache-Control: no-store`,
  `X-Robots-Tag: noindex, nofollow`;
- after responding (`waitUntil`), sends a `go_click` Web Analytics event and writes one JSON log line
  (`{"event":"go_click",…}`) to the function logs: **Vercel → Project → Logs**, filter `go_click`. Known bots and link
  previewers are not counted.

The link keeps its `rel` (`sponsored nofollow noopener noreferrer` on TCGplayer, `nofollow noopener` on stores) and its
"affiliate link" label. `robots.txt` disallows `/go`, and no `/go` URL is in the sitemap. eBay listings and eBay searches
are **not** routed through `/go`: eBay's terms ask for its URL exactly as returned, so those count in `buy_click` only.

## What is not counted (2026-10-23)

Pro bills every page view and event, so `src/components/SiteAnalytics.tsx` (`beforeSend`, rules in `src/lib/analytics-filter.ts`)
sends nothing from previews and local runs (`localhost`, `127.0.0.1`, `*.vercel.app`), automated browsers (`navigator.webdriver`),
bot-looking user agents (headless Chrome, Lighthouse/PageSpeed, crawlers that run scripts) or the owner's own browser. **Owner:
open any page with `?notrack=1` once** on each browser you use (it sets `localStorage` `va-disable` = `1`); `?notrack=0` undoes it.
The server-side `go_click` is unaffected (it already skips known bots).

## Speed Insights: removed (2026-10-23)

The `@vercel/speed-insights` package and component are gone, to cut a metered product (COST.md at the repository root). Core Web
Vitals are still checked weekly by the PageSpeed job (DEPLOY.md, "PageSpeed check"). In the dashboard, Project → Speed Insights →
Disable as well.
