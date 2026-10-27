// The deal and restock feed (lib/feed.ts): off by default, real events only, posted once when they become true, rate-limited, and
// messages without urgency or history claims beyond the daily snapshot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findBannedCopy } from "../src/lib/copy-rules";
import { detectEvents, emptyFeedState, feedConfig, messageFor, recordPosts, selectPosts, type FeedProduct, type FeedStat } from "../src/lib/feed";
import { dayOf, updatePriceHistory, type PriceHistory } from "../src/lib/price-history";

const T = dayOf("2026-10-22");
const products = new Map<string, FeedProduct>([
  ["pitch-black-booster-box", { slug: "pitch-black-booster-box", name: "Pitch Black Booster Box", productType: "Booster Box", setCode: "me5" }],
  ["old-tin", { slug: "old-tin", name: "Old Tin", productType: "Tin", setCode: "swsh1" }],
  ["x-etb", { slug: "x-etb", name: "X Elite Trainer Box", productType: "Elite Trainer Box", setCode: "sv2" }],
]);
const deal: FeedStat = { market: "AU", slug: "x-etb", lowestPriceCents: 8000, medianOpenCents: 10000, inStockStores: 5 };
const restockHistory = (): PriceHistory => {
  let h = updatePriceHistory(null, [{ market: "AU", slug: "pitch-black-booster-box", cents: null, stores: 0 }], T - 1);
  h = updatePriceHistory(h, [{ market: "AU", slug: "pitch-black-booster-box", cents: 29900, stores: 3 }], T);
  return h;
};

test("off by default: nothing is enabled without FEED_ENABLED=1 and a destination; secrets come only from the environment", () => {
  assert.equal(feedConfig({}).enabled, false);
  assert.equal(feedConfig({ FEED_ENABLED: "1" }).enabled, false, "no destination");
  assert.equal(feedConfig({ DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/1/x" }).enabled, false, "not switched on");
  assert.equal(feedConfig({ FEED_ENABLED: "1", DISCORD_WEBHOOK_URL: "https://evil.example/hook" }).enabled, false, "only Discord's webhook host");
  const on = feedConfig({ FEED_ENABLED: "1", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "@c", FEED_REGIONS: "au, us", FEED_MAX_POSTS: "3" });
  assert.equal(on.enabled, true);
  assert.deepEqual(on.markets, ["AU", "US"]);
  assert.equal(on.maxPosts, 3);
  const src = readFileSync("src/lib/feed.ts", "utf8") + readFileSync("scripts/feed-notify.ts", "utf8");
  assert.doesNotMatch(src, /discord\.com\/api\/webhooks\/\d|bot\d{6,}:/, "no hard-coded webhook or bot token");
  const wf = readFileSync("../../.github/workflows/dexcompare-sealed-import.yml", "utf8");
  assert.match(wf, /DISCORD_WEBHOOK_URL: \$\{\{ secrets\.DISCORD_WEBHOOK_URL \}\}/);
  assert.match(wf, /TELEGRAM_BOT_TOKEN: \$\{\{ secrets\.TELEGRAM_BOT_TOKEN \}\}/);
  assert.match(wf, /name: Deal and restock feed[\s\S]*?continue-on-error: true/, "never fails the import");
});

test("events: a deal by the /deals rule; a restock of a popular product after a snapshot with none in stock", () => {
  const stats: FeedStat[] = [
    deal,
    { market: "AU", slug: "pitch-black-booster-box", lowestPriceCents: 29900, medianOpenCents: 31000, inStockStores: 3 },
    { market: "AU", slug: "old-tin", lowestPriceCents: 1000, medianOpenCents: 4000, inStockStores: 6 }, // under half: a misfiled listing
    { market: "US", slug: "x-etb", lowestPriceCents: 8000, medianOpenCents: 10000, inStockStores: 5 }, // not a wanted market
  ];
  const ev = detectEvents({ stats, products, history: restockHistory(), markets: ["AU"] });
  assert.deepEqual(
    ev.map((e) => `${e.kind}:${e.market}:${e.product.slug}`).sort(),
    ["deal:AU:x-etb", "restock:AU:pitch-black-booster-box"],
  );
  const steady = updatePriceHistory(null, [{ market: "AU", slug: "pitch-black-booster-box", cents: 29900, stores: 3 }], T);
  assert.equal(detectEvents({ stats, products, history: steady, markets: ["AU"] }).filter((e) => e.kind === "restock").length, 0, "no zero-stock snapshot before: no restock");
});

test("posting: the first run only records; an event is posted once when it becomes true, not every run; at most max per run", () => {
  const ev = detectEvents({ stats: [deal], products, history: null, markets: ["AU"] });
  let state = emptyFeedState();
  assert.deepEqual(selectPosts(ev, state, T, 6), [], "first run: nothing sent");
  state = recordPosts(state, ev, [], T);
  assert.deepEqual(selectPosts(ev, state, T, 6), [], "still a deal: not posted again");
  state = recordPosts(state, ev, [], T);
  state = recordPosts(state, [], [], T + 1); // stops being a deal for a run
  assert.equal(selectPosts(ev, state, T + 9, 6).length, 1, "true again after a break and out of the cooldown");
  assert.equal(selectPosts(ev, state, T + 3, 6).length, 0, "within the cooldown");
  const many = Array.from({ length: 10 }, (_, i) => ({ ...ev[0], product: { ...ev[0].product, slug: `p${i}` }, pct: 10 + i }));
  const posts = selectPosts(many, state, T + 2, 4);
  assert.equal(posts.length, 4);
  assert.deepEqual(posts.map((p) => (p as { pct: number }).pct), [19, 18, 17, 16], "the deepest first");
  const next = recordPosts(state, many, posts, T + 2);
  assert.equal(selectPosts(many, next, T + 2, 20).length, 6, "left out by the limit: still eligible next run");
});

test("messages: the facts and the product link; no urgency, no banned copy", () => {
  const [d] = detectEvents({ stats: [deal], products, history: null, markets: ["AU"] });
  const [r] = detectEvents({ stats: [{ market: "AU", slug: "pitch-black-booster-box", lowestPriceCents: 29900, medianOpenCents: 31000, inStockStores: 3 }], products, history: restockHistory(), markets: ["AU"] });
  for (const e of [d, r]) {
    const m = messageFor(e);
    assert.equal(findBannedCopy(m), null, m);
    assert.doesNotMatch(m, /hurry|limited|selling fast|ends|act now/i);
    assert.match(m, /https:\/\/dexcompare\.app\/au\/p\//);
  }
  assert.match(messageFor(d), /A\$80\.00, 20% under the median of 5 Australian stores/);
  assert.match(messageFor(r), /Now at 3 Australian stores, from A\$299/);
});
