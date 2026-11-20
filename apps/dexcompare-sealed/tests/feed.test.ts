// The deal and restock feed (lib/feed.ts): off by default, real events only, posted once when they become true, rate-limited, and
// messages without urgency or history claims beyond the daily snapshot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findBannedCopy } from "../src/lib/copy-rules";
import { detectEvents, DROP_MAX_CHARS, dropFor, emptyFeedState, feedConfig, feedDropId, messageFor, recordPosts, selectPosts, type FeedEvent, type FeedProduct, type FeedStat } from "../src/lib/feed";
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
  assert.match(wf, /DISCORD_WEBHOOK_URL: \$\{\{ secrets\.DISCORD_WEBHOOK_URL \|\| secrets\.DISCORD_DEALS_WEBHOOK \}\}/);
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
  assert.equal(selectPosts(many, next, T + 2, 20).length, 0, "one drop a day: the day's next run posts nothing");
  assert.equal(selectPosts(many, next, T + 3, 20).length, 6, "left out by the limit: still eligible at the next drop");
});

test("messages: the facts and the product link; no urgency, no banned copy", () => {
  const [d] = detectEvents({ stats: [deal], products, history: null, markets: ["AU"] });
  const [r] = detectEvents({ stats: [{ market: "AU", slug: "pitch-black-booster-box", lowestPriceCents: 29900, medianOpenCents: 31000, inStockStores: 3 }], products, history: restockHistory(), markets: ["AU"] });
  for (const e of [d, r]) {
    const m = messageFor(e);
    assert.equal(findBannedCopy(m), null, m);
    assert.doesNotMatch(m, /hurry|limited|selling fast|ends|act now/i);
    assert.match(m, /https:\/\/dexcompare\.io\/au\/p\//);
  }
  assert.match(messageFor(d), /A\$80\.00, 20% under the median of 5 Australian stores/);
  assert.match(messageFor(r), /Now at 3 Australian stores, from A\$299/);
});

test("one drop a day: one message per run, at most one run a UTC day posts, every link tagged with the drop", () => {
  const ev = (slug: string, pct: number): FeedEvent => ({ kind: "deal", market: "AU", product: { slug, name: `Product ${slug}`, productType: "Booster Box", setCode: "me5" }, stores: 4, cents: 9000, median: 10000, pct });
  const events = [ev("a", 20), ev("b", 15), ev("c", 12)];
  let state = recordPosts(emptyFeedState(), [], [], T - 1); // a first run that recorded nothing
  const posts = selectPosts(events, state, T, 6);
  assert.equal(posts.length, 3);
  const drop = feedDropId(Date.UTC(2026, 10, 20, 20, 47));
  assert.equal(drop, "dex-feed-2026112020");
  const d = dropFor(posts, drop);
  assert.equal(d.events.length, 3);
  assert.match(d.text, /^Dex deal drop: 3 changes/);
  assert.equal((d.text.match(/&utm_content=dex-feed-2026112020/g) ?? []).length, 3);
  assert.equal(findBannedCopy(d.text), null);
  state = recordPosts(state, events, d.events, T);
  assert.equal(state.lastDrop, T);
  assert.deepEqual(selectPosts([...events, ev("new", 30)], state, T, 6), [], "the day's second run posts nothing");
  assert.deepEqual(selectPosts([ev("new", 30)], state, T + 1, 6).map((e) => e.product.slug), ["new"], "next day's drop goes out");
  const many = Array.from({ length: 20 }, (_, i) => ev(`long-product-slug-number-${i}-${"x".repeat(60)}`, 20));
  const big = dropFor(many, drop);
  assert.ok(big.text.length <= DROP_MAX_CHARS && big.events.length < 20, "kept under Discord's limit; the rest wait");
  const src = readFileSync("scripts/feed-notify.ts", "utf8");
  assert.equal((src.match(/await send\(cfg\.discordWebhook/g) ?? []).length, 1, "one Discord send a run, outside any loop");
  assert.doesNotMatch(src, /for \(const e of posts\)/);
});
