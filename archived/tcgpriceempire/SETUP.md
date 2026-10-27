# TCGPriceEmpire — launch checklist

The multi-TCG price comparison: Pokémon, Magic: The Gathering, Yu-Gi-Oh!,
One Piece Card Game and Riftbound in one site, with a "which games do you
play?" selector that personalises everything.

The app is fully built and deployable — these are the **owner steps** to take
it live (none of them are code changes):

## 1. Database (Neon)

1. Create a new Neon project/database (separate from dexcompare's).
2. Copy the **pooled** connection string.
3. Add it as the GitHub Actions secret **`TCGPRICEEMPIRE_DATABASE_URL`**
   (repo → Settings → Secrets and variables → Actions). This enables the daily
   17:00 UTC import.

## 2. Validate the data sources (one click, do this first)

Run the **"Probe TCGPriceEmpire data sources"** workflow (Actions tab →
workflow_dispatch). It fetches one sample from each source (TCGplayer × 5
product lines, Scryfall, YGOPRODeck) and prints what it sees — no database
needed. If every probe prints sensible counts/samples, the importers' source
assumptions are confirmed.

## 3. First import

Run the **"Refresh TCGPriceEmpire catalogue"** workflow manually (you can paste
the DB URL as an input if the secret isn't set yet). Expect roughly:

- Riftbound: a couple of minutes (small game)
- Yu-Gi-Oh!: ~5 minutes (~13k cards, one API call)
- One Piece: ~10 minutes
- Pokémon: ~20–40 minutes (per-set TCGplayer pagination)
- Magic: ~20–40 minutes (Scryfall bulk download ~400MB, streamed)

You can also run one game at a time via the `game` input
(`pokemon|magic|yugioh|onepiece|riftbound`).

## 4. Vercel project

1. Vercel → Add New Project → import the **CompareEmpire** repo.
2. **Root Directory: `apps/tcgpriceempire`** (critical).
3. **Production branch: `claude/magical-albattani-64zBr`** (same repo/branch as
   dexcompare — one push deploys both apps, each from its own root dir).
4. Environment variable: `DATABASE_URL` = the Neon pooled URL.
5. Optional env (all have working defaults): `NEXT_PUBLIC_SITE_URL`,
   `CONTACT_EMAIL`, `GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_ADSENSE_CLIENT`,
   `NEXT_PUBLIC_ADSENSE_SLOT_BROWSE/CARD`, `EBAY_AFFILIATE_CAMPAIGN`,
   `AMAZON_ASSOCIATE_TAG`, `TCGPLAYER_IMPACT_LINK`, `AFFILIATE_NETWORK_ID`.

The build runs `prisma db push` automatically on production deploys, so the
schema syncs itself.

## 5. Domain

Buy/point **tcgpriceempire.com** at the Vercel project. If you use a different
domain, set `NEXT_PUBLIC_SITE_URL` accordingly (canonicals/sitemap/JSON-LD all
derive from it).

## 6. Monetisation (already wired, just register the site)

- **TCGplayer (Impact)** — APPROVED; every tcgplayer.com link is already
  wrapped with the contract deep link. Nothing to do.
- **eBay EPN** — links are tagged with the existing campaign (customid
  `tpe-us/uk/au` so this site's earnings are segmentable). Add the domain to
  your EPN property list.
- **Amazon Associates** — add tcgpriceempire.com to the account's site list;
  optionally create a `tcgpriceempire-20` tracking id and set
  `AMAZON_ASSOCIATE_TAG`.
- **AdSense** — same publisher account: AdSense → Sites → Add site →
  tcgpriceempire.com. `/ads.txt` is already served. Enable Auto ads, or create
  display units and set the two slot-id envs.
- **Google Search Console** — add the property, set
  `GOOGLE_SITE_VERIFICATION`, submit `/sitemap.xml`.

## What's in V1

- Unified 5-game database (singles + sealed), `game` selector cookie
  personalising home/search/browse.
- Vendor price comparison per card: TCGplayer (all games), Cardmarket EUR
  (Magic via Scryfall, Yu-Gi-Oh! via YGOPRODeck), eBay/Amazon/CoolStuffInc
  (Yu-Gi-Oh!), affiliate-tagged eBay/Amazon search links on every card.
- Game hubs (/pokemon, /magic, /yugioh, /one-piece, /riftbound), /browse with
  game/sealed filters + sort, /sealed cross-game view, typeahead search.
- SEO: per-page canonicals, Product/FAQ JSON-LD, sitemap (head 45k priced
  cards), robots, 96px favicon.
- Cross-links to DexCompare (Pokémon) and RiftCompare (Riftbound) for
  store-by-store AU/NZ/US/UK coverage.

## V2 roadmap (in priority order)

1. **Yu-Gi-Oh! image mirroring** — YGOPRODeck forbids heavy image hotlinking;
   before real traffic, mirror card images to your own bucket/CDN (R2/S3) and
   rewrite `imageUrl`.
2. Chunked per-game sitemaps (full ~150k-URL coverage vs today's head-45k).
3. Store-by-store scraping for MTG/Yu-Gi-Oh!/One Piece reusing the dexcompare
   Shopify pipeline (the same AU/NZ/UK stores sell all these games).
4. Price history charts + movers (PriceHistory is already being snapshotted
   daily from day one — the data will be waiting).
5. Wishlist + price alerts (port from dexcompare).
