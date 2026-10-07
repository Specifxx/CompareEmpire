import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { CHASE_CARDS, CHASE_IMAGE } from "../src/lib/chase-cards";
import { ebayCardSearchUrl, EBAY_CAMPAIGN_ID } from "../src/lib/affiliate";
import { REGION_LIST } from "../src/lib/regions";

test("chase cards: six, unique, self-hosted WebP thumbnails that exist and are small, every query non-empty", () => {
  assert.equal(CHASE_CARDS.length, 6);
  assert.equal(new Set(CHASE_CARDS.map((c) => c.id)).size, 6);
  assert.equal(new Set(CHASE_CARDS.map((c) => c.image)).size, 6);
  for (const c of CHASE_CARDS) {
    // same-origin: no third-party image request, no host to depend on
    assert.equal(c.image, `/chase/${c.id}.webp`);
    const file = new URL(`../public${c.image}`, import.meta.url);
    assert.ok(existsSync(file), `${c.image} is missing from public/`);
    assert.ok(statSync(file).size > 2_000 && statSync(file).size < 60_000, `${c.image} should be a small thumbnail`);
    // provenance: the catalogue picture it was made from
    const u = new URL(c.source);
    assert.equal(u.protocol, "https:");
    assert.equal(u.hostname, "images.pokemontcg.io");
    assert.match(u.pathname, /^\/[a-z0-9]+\/\d+\.png$/);
    // the id is <set>-<number> and the source path says the same
    assert.equal(`${u.pathname.split("/")[1]}-${u.pathname.split("/")[2].replace(".png", "")}`, c.id);
    assert.ok(c.name.trim() && c.set.trim() && c.rarity.trim() && c.query.trim(), c.id);
    assert.ok(c.query.toLowerCase().includes(c.name.toLowerCase().split(" ")[0]), c.id);
  }
  assert.ok(CHASE_IMAGE.width > 0 && CHASE_IMAGE.height > CHASE_IMAGE.width);
});

test("chase cards: each is a tagged eBay card SEARCH on every region's site, never 'sealed'", () => {
  for (const r of REGION_LIST) {
    for (const c of CHASE_CARDS) {
      const u = new URL(ebayCardSearchUrl(c.query, r.region, "chase-home"));
      assert.equal(u.protocol, "https:");
      assert.equal(u.pathname, "/sch/i.html");
      assert.equal(u.searchParams.get("campid"), EBAY_CAMPAIGN_ID);
      assert.equal(u.searchParams.get("customid"), `dex-${r.region}-chase-home`);
      assert.equal(u.searchParams.get("mkevt"), "1");
      const q = u.searchParams.get("_nkw")!;
      assert.ok(q.startsWith("Pokemon "), q);
      assert.ok(!/sealed/i.test(q), q);
    }
  }
});
