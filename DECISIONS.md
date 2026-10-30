

## DexCompare: store audit — 2026-10-28

**Owner:** check every site's store health and make sure "all the latest and
greatest stores" are on it. Each site probed every store its sisters track
(999 storefronts across the nine registries) through its own probe and
importer rules, from GitHub Actions (this sandbox cannot reach the stores).
DexCompare: 513 stores added (390 → 893; the second round from the official Riftbound
store registry's game stores), 11 dead ones removed, 3 re-pointed;
details and the per-store counts in
`apps/dexcompare-sealed/docs/store-probe-2026-10-28.md`. A store whose other
domain we already list is left out (one stock shown as two stores misleads,
the `ccctcg.ca` rule).
## One family page and "Searching another game?" instead of a hub domain — 2026-10-28

The owner asked whether a separate hub site (tcgcompare.app or "TCG Empire")
should proxy all the compare sites to win generic queries like "compare TCG
card prices". Not built. A proxy that shows the same card pages would copy
the sister sites and split their rankings (the split-query problem fixed on
RiftCompare the day before). A link-only hub on a new domain has no authority
and no card pages to rank with. TCGPriceEmpire, a full multi-game site, was
built once and never launched (archived in CompareEmpire on 2026-10-27).
Buying the domain is the owner's call and is on hold.

What shipped instead, at no cost:

- **"Searching another game?"** Under a search on each of the seven
  card-game sites, a line links the same words to every other card-game site's
  own search (its SearchAction target). Someone typing "Charizard" on
  RiftCompare is pointed to DexCompare instead of a dead end. These are search
  links, so they're `nofollow`: a results page is noindex everywhere. Nothing
  is fetched from the other sites.
- **One `/tcg-price-comparison` page, on RiftCompare only.** It lists every
  game we compare, has a search box that sends the words to that game's site,
  and is linked from RiftCompare's "Compare other TCGs" footer heading. One page
  on the strongest domain, never a copy per site, so the family never competes
  with itself for the generic query.

## DexCompare: a TCGplayer strip of real sealed products — 2026-10-28

**Owner:** "more TCGplayer ads and more eBay ads … with the actual cards there",
on every site but RiftCompare. The eBay side already has its image strips
(EbayStrip); TCGplayer had only rows and text search links.

* `TcgplayerStrip` (server-rendered, `lib/data.ts tcgplayerTiles`): real sealed
  products with their photo and TCGplayer's own in-stock price, each linking to
  the product on TCGplayer through the Impact deep link, plus a "Shop
  TCGplayer" tile. Labelled Ad, disclosed under it, no pop-up.
* Placements `tcgplayer-strip-home` (region home, after the second box rail),
  `tcgplayer-strip-set` (after a set page's products) and
  `tcgplayer-strip-product` (after "More from <set>"): always below a page's
  comparison, never between a buyer and a price.
* Tiles: the newest sets first, headline types first, at most three per set
  site-wide; a set or product page shows its set's own, topped up with the
  newest sets'. The read is scoped to TCGplayer and to one set or the ten newest
  (the egress guard flagged the unscoped one at 0.7 MB).
* Outside the US the price stays US$ and the strip says "The US marketplace".
  TCGplayer Direct reached Australia on 2026-10-07 for singles only, so nothing
  claims sealed ships there.

## DexCompare: navigation from the first page, a sidebar, a full phone menu — 2026-10-28

**Owner:** the "Continue to Australia" button before any navigation was a
barrier; the wide desktop's left side was empty; the phone menu on the landing
page listed only regions. Same change as MTG Compare (mtgcompare, same date).

* The pages with no region of their own (`/`, About, the legal pages, 404s)
  draw the whole header: sections, the "All sealed" dropdown, search and the
  region button. The server's HTML is built for the US (one CDN copy, no cookie
  or header read); the browser moves every link to the visitor's region
  (`useSoftRegion`, the same detection as before: saved, `/api/geo`, time
  zone). Never a redirect: `/` keeps its canonical and hreflang as x-default.
* A region picked there (header, phone menu, the landing grid's chips) switches
  the page in place (`pickRegion`) and is remembered; without script the links
  go to each region's home.
* The hero's "Continue to <region>" button became five shortcuts (Booster
  boxes, Elite Trainer Boxes, Booster bundles, Japanese boxes, Deals).
* From xl (1280px) a sticky sidebar (`components/SideNav.tsx`) lists every
  product type, the eight newest sets, the deal pages and the rest
  (`lib/nav.ts navGroups`); the shell widens to 1480px so pages keep 1200px.
  The phone menu draws the same groups, then the regions. Static links only.
  Region pages never run the suggestion (no extra `/api/geo` call).

## One eBay campaign for every Compare site, hard-coded — 2026-10-30

**Decided (owner).** Every Compare site now sends eBay clicks to ONE EPN campaign, 5339155912 (RiftCompare's,
already set up), hard-coded in the code: no variable overrides it any more, so a forgotten secret or Vercel
value can't split the sites again. The sites are told apart by the `customid` prefix alone, which comes first
in every tag; this site's is `dex-<region>`. DexCompare's importer enforces the same id on every stored listing URL; the dormant apps (camera, phone, car, laptop) were hard-coded too.
Replaced: 5339155911 (WargameCompare, FigureCompare, Compare Empire, K Young), 5339231473 (Lorcana),
5339231474 (Gundam), 5339234013 (YGO). Old secrets/variables (`EBAY_AFFILIATE_CAMPAIGN`,
`NEXT_PUBLIC_EBAY_CAMPAIGN_ID`, `EBAY_CAMPAIGN_ID`) are no longer read and can be deleted.
