# Store audit, 28 October 2026

The owner asked, for every site, to check store health and make sure every store
worth listing is on it. Same method and bar as
[`store-probe-2026-09-28.md`](store-probe-2026-09-28.md): `scripts/probe-stores.ts`
from GitHub Actions (one runner per market), the market's currency proven, at least
3 English Pokémon sealed products through `identify()`.

**Candidates:** every store the sister sites track (RiftCompare, OP Compare, MTG
Compare, Gundam, Lorcana and YGO Compare) that DexCompare did not: 565 stores. 357
cleared the bar; five of those are a store we already list under another address
(Cardbot's .co.nz shop, Plenty of Games' own domain, Derpy Cards' .com, Abyss's .ca,
Union County Games' .com) and were left out, as `ccctcg.ca` was. **352 added**
(AU 40, CA 102, EU 9, UK 31, US 170); each row, with its counts,
is in [`store-probe-2026-10-28.csv`](store-probe-2026-10-28.csv).

**Health:** the registered stores the 28 October import could not read, or that
listed under 3 products, were probed again:

- Removed (no public feed any more, or nothing Pokémon sealed): Card and Ink (UK),
  Decal Depot (US), More Than Meeples (AU), Store PR Cards (US), Card Legends TCG
  (CA), TCG Company (EU), Van City TCG (CA), Lachsnacken (EU), Lux Cards (EU),
  Irresistible Force (AU, one Pokémon product left) and Irish Poke Finds (EU, two).
- Re-pointed: Battleground Games, Black Rose Hobbies and Pop Stop, whose feeds were
  cut off mid-collection; the probe found their current sealed collections.
- Kept: Kuma Cards and Obsession Gaming, which started refusing reads on 27 October
  (a block may be temporary; their rows expire on their own after 72 hours).

The registry goes from 390 to 731 stores. The import read 390 in 11 minutes and MTG
Compare's 649 in 14, so the 90-minute job limit stands.
