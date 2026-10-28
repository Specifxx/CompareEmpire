
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
