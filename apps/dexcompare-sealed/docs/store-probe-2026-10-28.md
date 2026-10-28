# Store audit, 28 October 2026

The owner asked, for every site, to check store health and make sure every store
worth listing is on it. Same method and bar as
[`store-probe-2026-10-19.md`](store-probe-2026-10-19.md): `scripts/probe-stores.ts`
from GitHub Actions (one runner per market; this sandbox cannot reach the stores),
the market's currency proven, at least 3 English Pokémon sealed products through
`identify()` and at least one in stock at probe time.

**Candidates, two rounds:**

1. Every store the sister sites track (RiftCompare, OP Compare, MTG Compare, Gundam,
   Lorcana and YGO Compare) that DexCompare did not: 565 stores. 357 cleared 3
   products; 58 of them had nothing in stock and five are a store we already list
   under another address (Cardbot's .co.nz shop, Plenty of Games' own domain, Derpy
   Cards' .com, Abyss's .ca, Union County Games' .com; the `ccctcg.ca` rule).
2. Every Shopify or WooCommerce game store in the official Riftbound store registry
   (UVS; RiftCompare's sweep read it the same morning) that no site tracks: 798
   stores. 220 cleared the bar.

**513 added** (US 234, CA 111, EU 107, AU 37, UK 22, SG 2); each row, with its
counts and source, is in [`store-probe-2026-10-28.csv`](store-probe-2026-10-28.csv).
Europe, the thinnest market, goes from 70 stores to 175.

**Health:** the registered stores the 28 October import could not read, or that
listed under 3 products, were probed again:

- Removed (no public feed any more, or nothing Pokémon sealed): Card and Ink (UK),
  Decal Depot (US), More Than Meeples (AU), Store PR Cards (US), Card Legends TCG
  (CA), TCG Company (EU), Van City TCG (CA), Lachsnacken (EU), Lux Cards (EU),
  Irresistible Force's TCG subdomain (AU, one Pokémon product left; its main shop,
  irresistibleforce.com.au, is added) and Irish Poke Finds (EU, two).
- Re-pointed: Battleground Games, Black Rose Hobbies and Pop Stop, whose feeds were
  cut off mid-collection; the probe found their current sealed collections.
- Kept: Kuma Cards and Obsession Gaming, which started refusing reads on 27 October
  (a block may be temporary; their rows expire on their own after 72 hours).

The registry goes from 390 to 893 stores. The import read 390 in 11 minutes and MTG
Compare's 649 in 14, so the 90-minute job limit has room.
