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

**Variables** tab: `DEXCOMPARE_SITE_URL` = `https://www.dexcompare.app` — the
canonical origin with `www`, exactly as in Vercel below. The import job POSTs
`/api/revalidate` there and then reads `/sitemap.xml`; through the apex→www
redirect the POST would lose its `Authorization` header and the job would
report "Page refresh: failed: HTTP 401".

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
   | `NEXT_PUBLIC_SITE_URL` | `https://www.dexcompare.app` — with `www`, no trailing slash |
   | `REVALIDATE_SECRET` | the same value as `DEXCOMPARE_REVALIDATE_SECRET` |
   | `NEXT_PUBLIC_OPERATOR` | who runs the site, as it should read in the Terms and the footer ("operated by …"): a trading name or a person. Optional; until it is set the site name stands in. The code never invents an entity or an address. |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | optional; default `riftcompare@gmail.com`. Keep it a mailbox someone reads: the contact page promises a reply. |

   `NEXT_PUBLIC_SITE_URL` is the origin every canonical, hreflang, JSON-LD,
   robots and sitemap URL is built on. The code defaults to
   `https://www.dexcompare.app` and normalises what it is given (trailing slash
   stripped, anything unparseable ignored), and a production build whose value
   does not match the domain Vercel is deploying to prints a loud `[site]`
   warning in the build log — but never fails the build. (2026-09-28: the live
   site said `dexcompare.com` everywhere because this variable was wrong.)

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

1. Add `www.dexcompare.app` and make it the primary: it is what
   `NEXT_PUBLIC_SITE_URL` says, so it is what every canonical URL says. The old
   DexCompare project may already hold the domains; if so, confirm they are
   attached to this project.
2. Add `dexcompare.app` set to **Redirect to `www.dexcompare.app` (308
   permanent)**. One host serves pages; the other only redirects. Whichever way
   round you choose, `NEXT_PUBLIC_SITE_URL` (Vercel), `DEXCOMPARE_SITE_URL`
   (GitHub) and the primary domain must agree.
3. Follow Vercel's DNS instructions at your registrar if it shows any.
   `.app` domains are HTTPS-only (HSTS-preloaded), which Vercel handles.

Old URLs like `/sealed`, `/sets/<set>` and `/stores` redirect to the Australian
pages; old single-card pages return 404 so Google drops them. Upper-case region
prefixes (`/AU`, `/AU/sets`) 308 to the lower-case page (`src/middleware.ts`);
any other unknown path (`/foo`, `/Au`) is a plain 404.

## 6. Search Console

Add the `www.dexcompare.app` URL-prefix property (or a domain property for
`dexcompare.app`; DNS verification, or set `GOOGLE_SITE_VERIFICATION` in Vercel
to the HTML-tag token and redeploy), then submit
`https://www.dexcompare.app/sitemap.xml`.

That URL is a **sitemap index** (`src/app/sitemap.xml/route.ts`) listing
`/sitemap/0.xml` (the static pages and every store page) and `/sitemap/1.xml` …
`/sitemap/7.xml`, one per region in the order AU, US, UK, CA, NZ, EU, SG
(`src/lib/sitemap.ts`): a region's type pages, set pages and every product at
least one store there has in stock or two stores list. Each file carries the
market's last import as `lastmod`. If a query fails while a file is being
regenerated, the request errors and ISR keeps the previous copy — a sitemap is
never cached with its products missing (the old single sitemap was, for 24
hours at a time). The import job checks the live index after every full run
and goes red if the regional sitemaps total under 1,000 product URLs
(`scripts/import.ts`, `checkLiveSitemap`; a full import lists ~8,000).

## Security headers

`next.config.js` sends HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy` and a **report-only**
Content-Security-Policy. Report-only never blocks anything: a violation shows
in the browser console as `[Report Only] Refused to …`. Before ever switching
it to an enforcing `Content-Security-Policy`, browse the landing page, a region
home, a product page and a store page with the console open and make sure it
is silent — product photos are hotlinked from ~250 store CDNs (`img-src
https:` covers them) and Vercel Analytics posts to `/_vercel/insights` on the
same origin.

## Click events (Vercel Web Analytics)

Every outbound buy link — to a store, TCGplayer or eBay — sends one custom
event, `buy_click`, with exactly two properties:

| Property | Example values |
| --- | --- |
| `retailer` | `Pokebox (AU)`, `TCGplayer`, `eBay (ebay.com.au)` |
| `placement` | `product-best`, `product-table`, `product-marketplace`, `product-soldout`, `set-banner`, `type-banner`, `browse-empty`, `region-home`, `store-page`, and the eBay units below (every `listings-*` and `chase-*` placement too) |

The eBay units (`src/components/Ebay.tsx`) each have their own placement, so
EPN's `customid` report and Vercel's `buy_click` say which surface earned:

| Placement | Where |
| --- | --- |
| `header` | the "eBay" item in the header (desktop nav, xl and up only) |
| `region-home-hero` | banner under the hero on a region's home page |
| `feed` | in-feed tile in a home rail (rails are 8 products, so none shows today) |
| `browse-feed` | in-feed tile in `/<region>/sealed` and its pages |
| `set-feed`, `type-feed` | in-feed tile in the set / type page's product grid |
| `card-soldout` | "Sold out here — search eBay" under a sold-out product card |
| `product-related` | the product's set × type searches inside the marketplace panel / sold-out callout |
| `product-after-table` | the "Still deciding? Search this product on eBay" row closing a long offer table |
| `set-banner`, `set-related` | the set page banner, and the set × type chips inside it |
| `type-banner` | the type page banner (type chips inside it) |
| `releases-card`, `releases-banner` | a release card's own search link; the banner at the bottom of the calendar |
| `store-banner` | the banner on the store directory and on a store's page |
| `pre-footer` | the banner above the footer of every region page (not on about, terms, privacy, contact or the 404) |
| `footer` | the "Shop Pokémon sealed on eBay" link in the footer: phones only, and only on pages that dropped the banner above it (it would sit next to it) |
| `not-found` | the 404 page (on the eBay site of the region in the URL, US outside one) |
| `listings-home` | region home: the "Chase cards on eBay" strip of real listings, under the stats row (8 tiles on a phone's scroll row, 6 from lg) |
| `listings-landing` | the root landing page (`/`): the same strip from the US feed, labelled "eBay US" |
| `listings-product` | product page: "Chase cards from <set> on eBay" (the product's set; generic chase cards when it has none): directly below the offer table where the table is long enough to sit a screen below the marketplace panel (it replaces the "Still deciding?" group), else at the bottom of the page in place of the generic strip above the footer, where the page has room for a unit there; none on a page too short for either |
| `listings-set` | set page: the set's chase cards, in place of the banner |
| `listings-type` | type page: chase cards (type-agnostic), in place of the banner |
| `listings-browse` | `/<region>/sealed`: the first in-feed position becomes a double-width listings tile from lg (below lg the native tile stays) |
| `listings-store` | store directory and store page: in place of the banner |
| `listings-releases` | release calendar: the closing strip, in place of the banner |
| `listings-footer` | every content page: the slim four-tile strip above the footer (on a region home, tiles 9-12 of the feed, since the hero shows the first eight) |
| `listings-notfound` | the 404 page: a slim strip in place of the single search link |
| `chase-home`, `chase-landing` | the no-keys fallback of the home / landing strip: six chase-card SEARCH tiles (card art self-hosted in `public/chase/`), labelled as searches. Also what the strip shows when eBay returns nothing |

Where a `listings-*` unit has no listings (no keys, `EBAY_LISTINGS=off`, an error,
nothing returned) the surface keeps its native banner (`set-banner`, `type-banner`,
`store-banner`, `releases-banner`, `product-after-table`, `pre-footer`, `not-found`), and
the home and landing pages show the `chase-*` search tiles.

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

### eBay banners: native by default, EPN's own creative optionally

Every eBay unit is a labelled ("Ad"), plain link to a tagged eBay **search**
(or, with the API keys below, a real eBay **listing**): no third-party script, no
iframe, no eBay logo. If you would rather show an
official EPN banner image on the two big spots (the region home hero and the
banner above every footer), copy it from EPN Campaign Manager (**Tools →
Banners**) and set, in Vercel (they are inlined at build, so redeploy after):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_EBAY_BANNER_IMAGE` | the banner's `https://` image URL (on eBay's own hosts: `ebay.<tld>`, `ebayimg.com`, `ebaystatic.com`) |
| `NEXT_PUBLIC_EBAY_BANNER_HREF` | the EPN tracking link for it (`https://rover.ebay.com/…` or an `ebay.<tld>` link carrying `campid=<our campaign id>`; or an `https://ebay.us/…` short link) |
| `NEXT_PUBLIC_EBAY_BANNER_WIDTH`, `_HEIGHT` | optional, the image's size in px (default 728 × 90; width 100–1200, height 30–700) |
| `NEXT_PUBLIC_EBAY_BANNER_ALT` | optional alt text |

Both image and link must be set and valid, or the native banners stay: a
non-`https` URL, a link that is not on an eBay domain or lacks our `campid`,
an image from any other host, or a size out of range is ignored whole. The image is rendered with explicit width and height and
`loading="lazy"` (no layout shift), under the same "Ad" label and affiliate
note, through the same click tracking (`placement` is the surface). The link is
used as pasted, with `customid=dex-<region>-<placement>` filled in when it has none (short
`ebay.us` links are left alone), so EPN's report can split the hero from the footer banner;
`buy_click`'s retailer names the host the link really goes to (the creative is one link for
every region, whatever the region's own eBay site). Unset them to go back to
the native banners. The privacy page mentions the picture automatically
(your browser loads it from eBay) when they are set.

## Real eBay listings (chase cards): the Browse API

The home page's "Chase cards on eBay" strip, and strips on the landing, set, type,
product, release and store pages, a double-width tile in the browse grid and a slim strip above
every footer, show **real eBay listings** (title, photo, price) for chase cards such as
Charizard ex and Umbreon ex special illustration rares, from eBay's official Browse API.
It is **off until you add keys**: without them nothing changes except that the home
page shows six chase-card *search* tiles (small self-hosted card pictures, "Search on
eBay", no price). Scraping eBay is a Terms violation and eBay blocks it; the API is the
only compliant source.

### Get DexCompare's own keyset (do not reuse Rift Compare's)

1. [developer.ebay.com](https://developer.ebay.com) → sign in → join the eBay Developers
   Program (free) if this account has not. Use a **new application for DexCompare**, under
   its own keyset: the 5,000 calls/day default limit is per application, so Rift Compare's
   quota stays untouched.
2. **Hi, <you> → Application Keys → Production**: create a keyset ("App ID" is the client id,
   "Cert ID" the client secret). A Sandbox keyset does not work: the code only calls
   `api.ebay.com`.
3. The Buy APIs are access-controlled. eBay's Buy API requirements say production use needs
   approval ("application for production use of the APIs" via the eBay Partner Network
   questionnaire, up to 10 business days, no guarantee) and acceptance of the API License
   Agreement. If the check below says the token works but searches answer 403, the keyset has
   not been granted Buy API access yet: apply from the application's page.
4. The campaign id is already DexCompare's EPN one (`5339155912`, `NEXT_PUBLIC_EBAY_CAMPAIGN_ID`):
   `itemAffiliateWebUrl` only comes back when the request header carries a campaign id
   registered in the Partner Network, so check in EPN that it is active for every site we link
   to (US, AU, UK, CA, DE; NZ buyers use eBay Australia and SG eBay US, neither has its own
   program).

### Turn it on

Vercel → Settings → Environment Variables → **Production** (add to Preview only if you want
listings on preview deployments):

| Name | Value |
| --- | --- |
| `EBAY_CLIENT_ID` | the keyset's App ID / client id |
| `EBAY_CLIENT_SECRET` | its Cert ID / client secret |
| `EBAY_LISTINGS` | optional kill switch: `off` shows the native banners and the search tiles again, with no eBay calls. Unset or anything else = on |

They are **server-only**: never `NEXT_PUBLIC_`, never in the browser bundle, never logged
or put in an error message or response (`tests/ebay-listings.test.ts` checks this, and the
build's client chunks contain no eBay API code). Then **redeploy**: whether a page shows
listings is decided when the page is rendered (keys present or not), so pages cached before
the change keep their old look until they re-render (daily, or at the next import's refresh).
Listings themselves are never baked into a page: the browser fetches them.

Check the keys work (prints token status, counts per context and the first five listings per
region; never the secrets; exit code 1 on failure):

```bash
cd apps/dexcompare-sealed
EBAY_CLIENT_ID=… EBAY_CLIENT_SECRET=… npx tsx scripts/ebay-check.ts          # all regions, ~45 calls
EBAY_CLIENT_ID=… EBAY_CLIENT_SECRET=… npx tsx scripts/ebay-check.ts au us    # some regions
```

Then open `/au` after the redeploy: the strip should show cards with photos and prices in AUD.

### How it works

- `GET /api/ebay/<region>?c=<context>` (`src/app/api/ebay/[region]/route.ts`, Node runtime). The
  region is one of the seven; the context is from a fixed list (`home`, `generic`, `sealed`,
  `store`, `releases`, `set:<slug>`, `type:<slug>`, `product:<set code|none>`;
  `src/lib/ebay-context-parse.ts`, server only: the browser never downloads the sets table) and is
  mapped **on the server** to hard-coded queries
  (`src/lib/ebay-listings.ts`): six generic chase queries ("Charizard ex special illustration
  rare", "Umbreon ex …", "Pikachu ex …", "Mega Charizard X ex", "Mewtwo ex …", "PSA 10
  Charizard"), or "<set> special illustration rare / alt art / chase" for a set. Nothing the
  visitor sends reaches eBay. A set that has not been released yet (no cards exist, so anything
  listed is custom or mislabelled) and a set named like its series or a common word ("Scarlet &
  Violet", "Mega Evolution", "Evolutions", "Generations", "Celebrations": a keyword search
  returns every set's cards) get the generic chase feed and the generic heading instead.
- Search: `GET https://api.ebay.com/buy/browse/v1/item_summary/search` with `q` (prefixed
  "Pokemon"), `limit` (24 divided by the number of queries: at most 24 fetched), `filter=
  buyingOptions:{FIXED_PRICE},price:[floor],priceCurrency:<cur>,deliveryCountry:<cc>`, header
  `X-EBAY-C-MARKETPLACE-ID` (EBAY_US/AU/GB/CA/DE) and `X-EBAY-C-ENDUSERCTX:
  affiliateCampaignId=5339155912,affiliateReferenceId=dex-<region>-listings`, so each item
  carries `itemAffiliateWebUrl`, and `Accept-Language` for the marketplace (en-CA for Canada,
  which also serves French). Token: client-credentials grant against
  `/identity/v1/oauth2/token`, cached in memory (about 2 h, renewed 5 minutes early), one
  request however many callers, refreshed once on a 401. A token failure spends no search budget
  and pauses every key (1, 2, 4 … 15 minutes).
- Region → marketplace as for the search links: AU, NZ → EBAY_AU; US, SG → EBAY_US; UK →
  EBAY_GB; CA → EBAY_CA; EU → EBAY_DE.
- Kept: single-card, Buy It Now, not ended, price in the marketplace's own currency (never
  converted) and over a floor (USD 15, AUD 20, GBP 12, CAD 20, EUR 15), photo on `*.ebayimg.com`,
  a link that carries our campaign id; adult-only items are dropped. Dropped: titles with proxy /
  custom / replica / reprint / reproduction / orica / fan art / metal card / digital / code card /
  lot / bulk / damaged / empty / a non-English language (including Japanese product codes like
  "sv2a" and "Pokemon Card Game"), sealed product, decks, kits, playsets and merchandise (prints,
  magnets, canvas, gold cards); a title must also name a card (a card number such as 199/165, an
  illustration rare / alt art / SIR, or a grading company), and duplicates by photo. This is a
  title filter only. eBay's own `category_ids` (CCG Individual Cards) with
  `aspect_filter=categoryId:…,Language:{English}` would do the same upstream, but the category
  id and aspect name could not be verified without a keyset and may differ per marketplace, and
  a wrong one would empty every feed; try it with `scripts/ebay-check.ts` once keys exist. The queries are spread
  round-robin so one cannot fill the strip; at most 12 are returned.
- The response holds only `id`, `title`, `imageUrl`, `price {value, currency}`, `url`,
  `condition` and `asOf`: no seller, raw eBay JSON or token. The browser re-validates each item.
- Caching: in memory per server instance (keyed marketplace + query set, so NZ shares AU's and SG
  shares US's), 45 minutes, one refresh per key however many requests arrive at once; a failed
  refresh backs off (1, 2, 4 … 15 minutes) and serves the previous copy up to 3 hours; a 429
  pauses every key; at most 3,000 searches per UTC day per instance (of which at most 1,000 for
  per-set feeds, so a crawl of set pages can never starve the home feed), then stale or nothing.
  A request waits at most 7 s for a refresh (`maxDuration = 10`), then answers with the stale
  copy or nothing. CDN: `public, max-age=300, s-maxage=3600, stale-while-revalidate=3600` for a
  good answer, `s-maxage=60` for an empty, failed, stale or partial one (never an hour).
- A page never calls eBay while it renders (they stay ISR). Until the data is known a strip
  shows its native fallback (the banner, or the chase search tiles) over an invisible box of the
  listings' size, and fetches only when it comes within about 300 px of the viewport, so an
  off-screen unit costs nothing; the same request is shared by every unit that wants it.
  Listings replace the box at the same height (CLS 0). When there are none (no Buy API access
  yet, an error, too few) the unit collapses to the fallback's own height instead of leaving a
  gap; that happens just below the viewport, but on a page where the unit is already on screen
  at load (short desktop pages) the content under it moves once.
- On a phone the set / type / store / release / product strips use a horizontal tile (thumbnail
  beside the text, about a third of the height of the tall tile) so they do not fill the first
  screen; from `sm` up, and always on the home page, the tile is tall.
- `EBAY_LISTINGS=off` stops the API route at once, but the pages that were already rendered keep
  asking it until they are re-rendered: redeploy (or wait for the daily revalidate) for the
  units to disappear completely; they fall back to the banners meanwhile.

### eBay's rules, and how each is met

Read 2026-10-05 from eBay's documentation; the header of `src/lib/ebay-listings.ts` has the
sources and the full list.

| Rule (source) | How |
| --- | --- |
| "Item listing information … may not be more than six (6) hours older" than on eBay (API License Agreement 8.1(c)) | Server TTL 45 min; CDN 1 h + 1 h stale at most (not the 6 h `stale-while-revalidate=21600` would add: the oldest a visitor can see is about 2 h 50 min); the server serves its own stale copy up to 3 h; the browser refuses data over 3 h old, re-fetches a long-open tab after 2 h (timer, not only on return) and drops it at 3 h. The licence also says a copy that is not current must disclose how much older it can be: every unit says "refreshed about hourly and up to 3 hours older than on eBay" |
| Intermediate copies deleted when no longer needed (3.1(b)) | Only whitelisted fields of at most 12 items, in process memory; nothing in a database, file or the Next data cache (`cache: "no-store"`) |
| eBay content not "co-mingled or combined with non-eBay Content" (8.1(b)(2)) | A listings unit holds eBay listings only; store prices and our ranking never share it. The no-keys search tiles are a different unit that says "Search" and shows no price |
| No derived statistics such as average price (8.1(d)) | None: each price is shown alone, as returned, never converted, compared, ranked or in JSON-LD, meta, OG or the sitemap |
| "Only surface FIXED PRICE items"; "The image of the item must be an eBay image"; delivery country = marketplace; "indicate when the item is not new"; shipping separate (Buy APIs Requirements) | `buyingOptions:{FIXED_PRICE}`; `*.ebayimg.com` images, plain `<img>`; `deliveryCountry` filter; the condition text is shown; the unit says prices are before shipping |
| "you must use the URL returned in the `itemAffiliateWebUrl` field" (Browse API) | Every link is that URL (validated), or `itemWebUrl` tagged with the same EPN parameters as our search links; the browser only sets `customid` to `dex-<region>-<placement>` |
| 5,000 calls/day default (API call limits) | Budget guard, below |

### Call volume and the 5,000/day limit

eBay's default Browse API limit is **5,000 calls a day per application**; the **Application
Growth Check** (in the developer account, "Application Growth Check" / "Increase call
limits") raises it after eBay confirms the app follows the License Agreement and makes efficient
use of the API.

A refresh of a key costs 6 searches (generic feed) or 3 (a set). Keys are marketplace × query
set, so five marketplaces share seven regions. Per server instance a key refreshes at most
every 45 minutes and only when someone looks at a strip that needs it:

- worst case, every context of every marketplace in constant use: 5 marketplaces × (1 generic +
  70 sets) keys × 32 refreshes a day × (6 or 3 searches) is far beyond 5,000 (about 33,600 for
  the sets alone), because a crawler that runs the page scripts reaches every set and product
  page. So the budget is split per instance: 3,000 searches a day, of which per-set feeds may use
  at most 1,000 (333 set refreshes), leaving the generic feeds (home, sealed, type, store,
  releases, footer: at most 5 × 32 × 6 = 960 a day) always funded. A set feed over its allowance
  serves stale or nothing, and its page keeps the native banner;
- instances: each Vercel instance has its own memory and its own 3,000, so N busy instances can
  spend N × 3,000 against eBay's 5,000: eBay's own limit (429: every key pauses for 5-15
  minutes and the fallbacks show) is the real backstop, and `DAILY_CALL_BUDGET` /
  `SET_CALL_BUDGET` in `src/lib/ebay-listings.ts` should be lowered if the project runs many
  instances;
- typical: a handful of keys (US, AU, UK home feeds and a few popular sets) = a few hundred a
  day. Vercel runs several instances and each has its own memory, but the CDN caches each
  URL for an hour first.

Watch eBay's usage page for the application after launch; if it nears 5,000, apply for the
Application Growth Check or lengthen `TTL_MS` (the "up to 3 hours" the units disclose
assumes 45 minutes: lengthening it needs that sentence changed too, and never beyond 6 h).

### Owner checklist

1. Get the keyset and Buy API access (above); set the two variables; redeploy; run
   `scripts/ebay-check.ts`.
2. EPN: confirm campaign `5339155912` is active for the sites we link to; the report's
   Custom ID column splits revenue by surface (`dex-au-listings-home`, `dex-us-chase-landing`…).
3. Card art: the six chase-card search tiles use small WebP copies of the card pictures
   (`public/chase/`, made from images.pokemontcg.io's PNGs, 20-35 KB each) so the strip does
   not depend on that host (its API is being retired). The artwork belongs to The Pokémon
   Company and its artists; it is shown only as a thumbnail of the card a search is for. Swap
   or drop the files if that is not acceptable.
4. Decide on the eBay logo: eBay's Buy API requirements ask apps that display listings on View
   Item and Cart pages to show it. DexCompare links out to eBay's own View Item page and
   shows text "eBay" only, as decided; if eBay's approval review asks for the logo, add it
   to the unit header (`src/components/ListingsParts.tsx`).
5. The privacy page already explains the thumbnails (your browser loads them from eBay's
   image servers); the About, Terms and Privacy pages switch to the listings wording when the
   keys are present at build time.

## Checking it works

- `https://www.dexcompare.app/au` shows products, "Last checked" a few minutes/hours ago.
- `https://www.dexcompare.app/sitemap.xml` lists eight files, and
  `/sitemap/2.xml` (US) has a couple of thousand `/us/p/…` URLs. A regional
  file with no products means the database is empty or unreachable (the build
  writes empty regional files when it cannot reach the database; the first
  import's page refresh fills them).
- `view-source:` of any page: `<link rel="canonical">` and every `hrefLang`
  say `https://www.dexcompare.app/…`. If they say another host, fix
  `NEXT_PUBLIC_SITE_URL` and redeploy.
- `/AU` answers 308 to `/au`; `/foo` answers 404 with the branded page.
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
- **eBay API: opt-in, DexCompare's own keyset.** Without `EBAY_CLIENT_ID` and
  `EBAY_CLIENT_SECRET` there are no eBay API calls at all and eBay appears only as tagged
  search links (campaign 5339155912). With them, only `/api/ebay/<region>` calls eBay, with
  DexCompare's own keyset, so nothing here can spend Rift Compare's eBay quota (see "Real eBay
  listings" below).
- **TCGplayer** links go through Impact (`partner.tcgplayer.com/c/7385758/…`),
  the same approved account as Rift Compare. Every page carries Impact's
  `impact-site-verification` tag (the same token as the other CompareEmpire
  sites); in Impact, check that `www.dexcompare.app` is listed as a promotional
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
