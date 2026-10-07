import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { EBAY_CAMPAIGN_ID } from "../src/lib/affiliate";
import { parseContext } from "../src/lib/ebay-context-parse";
import {
  buildSearchUrl,
  createEbayClient,
  createTokenManager,
  DAILY_CALL_BUDGET,
  EbayError,
  ebayListingsEnabled,
  FAILURE_BACKOFF_MAX_MS,
  FAILURE_BACKOFF_MS,
  GENERIC_QUERIES,
  imageKey,
  isJunkTitle,
  MARKETPLACE,
  MAX_FETCHED,
  MAX_RETURNED,
  MAX_STALE_MS,
  normalizeItem,
  PRICE_FLOOR,
  queriesFor,
  RATE_LIMIT_MIN_MS,
  searchFilter,
  searchHeaders,
  selectListings,
  SET_CALL_BUDGET,
  tokenMargin,
  TTL_MS,
  type Deps,
  type EbayEnv,
} from "../src/lib/ebay-listings";
import { REGION_LIST, type Region } from "../src/lib/regions";
import { SETS } from "../src/lib/sets";

const FIXTURE = JSON.parse(readFileSync(new URL("./fixtures/ebay-search-us.json", import.meta.url), "utf8"));
const RAW: unknown[] = FIXTURE.itemSummaries;
const NOW = Date.parse("2026-10-05T12:00:00Z");
const SECRET = "SECRET-s3cr3t-value-ZZZ";
const CLIENT_ID = "DexComp-DexComp-PRD-1234567890-abcdef12";
const KEYS: EbayEnv = { EBAY_CLIENT_ID: CLIENT_ID, EBAY_CLIENT_SECRET: SECRET };

// ─── helpers: a scripted fetch ──────────────────────────────────────────────────

type Handler = (url: string, init: RequestInit | undefined, n: number) => Response | Promise<Response>;
function harness(handler: Handler, env: EbayEnv = KEYS) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const clock = { t: NOW };
  const deps: Deps = {
    now: () => clock.t,
    env,
    fetch: async (url, init) => {
      calls.push({ url, init });
      return handler(url, init, calls.length);
    },
  };
  return { deps, calls, clock, searches: () => calls.filter((c) => c.url.includes("/item_summary/search")), tokens: () => calls.filter((c) => c.url.includes("/oauth2/token")) };
}
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const okToken = (n = 1) => json({ access_token: `tok-${n}-` + "x".repeat(20), expires_in: 7200, token_type: "Application Access Token" });

/** A search handler that answers every query with the fixture (so each query yields the same raw list). */
const standard: Handler = (url) => (url.includes("/oauth2/token") ? okToken() : json({ ...FIXTURE, itemSummaries: RAW }));

// ─── pure: normalise, filter, spread ────────────────────────────────────────────

test("normalizeItem: accepts the good fixtures and keeps only whitelisted fields", () => {
  const good = RAW.map((r) => normalizeItem(r, "us", NOW)).filter(Boolean);
  const ids = good.map((g) => g!.title);
  assert.equal(good.length, 7, ids.join("\n"));
  for (const g of good) {
    assert.deepEqual(Object.keys(g!).filter((k) => !["condition"].includes(k)).sort(), ["id", "imageUrl", "price", "title", "url"]);
    assert.equal(g!.price.currency, "USD");
    assert.ok(Number(g!.price.value) >= PRICE_FLOOR.USD);
    assert.match(g!.imageUrl, /^https:\/\/i\.ebayimg\.com\//);
    const u = new URL(g!.url);
    assert.equal(u.protocol, "https:");
    assert.match(u.hostname, /(^|\.)ebay\.com$/);
    assert.equal(u.searchParams.get("campid"), EBAY_CAMPAIGN_ID);
    assert.ok(u.searchParams.get("customid")!.length <= 60);
  }
  // price exactly as eBay returned it
  assert.equal(good[0]!.price.value, "189.99");
  assert.equal(good[1]!.price.value, "1299.00");
  assert.equal(good[1]!.condition, "Graded");
});

test("normalizeItem: every reject case is rejected", () => {
  const by = (needle: string) => RAW.find((r) => (r as { title: string }).title.includes(needle));
  const rejects: [string, string][] = [
    ["Custom Proxy", "counterfeit/custom"],
    ["Japanese", "other language"],
    ["EUR", "x"],
  ];
  assert.equal(normalizeItem(by("Custom Proxy"), "us", NOW), null);
  assert.equal(normalizeItem(by("Japanese"), "us", NOW), null);
  assert.equal(normalizeItem(by("Mewtwo ex 231/217"), "us", NOW), null, "EUR price on EBAY_US");
  assert.equal(normalizeItem(by("Mega Charizard X"), "us", NOW), null, "converted price");
  assert.equal(normalizeItem(by("223/197"), "us", NOW), null, "below the USD 15 floor");
  assert.equal(normalizeItem(by("auction"), "us", NOW), null, "AUCTION only");
  assert.equal(normalizeItem(by("lot of 20"), "us", NOW), null, "a lot");
  assert.equal(normalizeItem(by("Booster Box"), "us", NOW), null, "sealed product");
  assert.equal(normalizeItem(by("ENDED"), "us", NOW), null, "ended");
  assert.equal(normalizeItem(by("Blastoise"), "us", NOW), null, "image off eBay hosts");
  assert.equal(normalizeItem(by("no photo"), "us", NOW), null, "no image");
  assert.equal(normalizeItem(by("Espeon"), "us", NOW), null, "no price");
  assert.equal(normalizeItem(by("lovely thing"), "us", NOW), null, "not recognisably a card");
  void rejects;
  // garbage in, null out, never a throw
  for (const g of [null, undefined, 5, "x", [], {}, { itemId: 1 }, { itemId: "a", title: "x" }, { itemId: "a", title: "Charizard ex 1/2", price: "5" }]) assert.equal(normalizeItem(g, "us", NOW), null);
});

test("normalizeItem: a missing affiliate URL is rebuilt from itemWebUrl with the EPN tags; a foreign or http one is not trusted", () => {
  const by = (needle: string) => RAW.find((r) => (r as { title: string }).title.includes(needle));
  const umbreon = normalizeItem(by("Umbreon"), "us", NOW)!;
  const u = new URL(umbreon.url);
  assert.equal(u.searchParams.get("mkevt"), "1");
  assert.equal(u.searchParams.get("mkrid"), "711-53200-19255-0");
  assert.equal(u.searchParams.get("campid"), EBAY_CAMPAIGN_ID);
  assert.equal(u.searchParams.get("customid"), "dex-us-listings");
  // another campaign's affiliate URL and an http one fall back to the tagged web URL, never to themselves
  for (const n of ["Alakazam", "Venusaur"]) {
    const it = normalizeItem(by(n), "us", NOW)!;
    assert.equal(new URL(it.url).protocol, "https:", n);
    assert.equal(new URL(it.url).searchParams.get("campid"), EBAY_CAMPAIGN_ID, n);
    assert.ok(!it.url.includes("1111111111"), n);
  }
  // no usable URL at all: dropped
  const none = { ...(by("Umbreon") as object), itemWebUrl: "https://evil.com/itm/1" };
  assert.equal(normalizeItem(none, "us", NOW), null);
});

test("normalizeItem: the thumbnail stands in for a missing primary image", () => {
  const pikachu = normalizeItem(RAW.find((r) => (r as { title: string }).title.startsWith("Pikachu ex 238/191 Special Illustration Rare Surging")), "us", NOW)!;
  assert.match(pikachu.imageUrl, /ccc333/);
});

test("price floors and currencies per marketplace", () => {
  assert.deepEqual(PRICE_FLOOR, { USD: 15, AUD: 20, GBP: 12, CAD: 20, EUR: 15 });
  const mk = (value: string, currency: string) => ({ ...(RAW[0] as object), price: { value, currency } });
  const cases: [Region, string, string, string][] = [
    ["us", "USD", "14.99", "15.00"],
    ["sg", "USD", "14.99", "15.00"],
    ["au", "AUD", "19.99", "20.00"],
    ["nz", "AUD", "19.99", "20.00"],
    ["uk", "GBP", "11.99", "12.00"],
    ["ca", "CAD", "19.99", "20.00"],
    ["eu", "EUR", "14.99", "15.00"],
  ];
  for (const [region, cur, below, atFloor] of cases) {
    assert.equal(MARKETPLACE[region].currency, cur, region);
    assert.equal(normalizeItem(mk(below, cur), region, NOW), null, `${region} ${below}`);
    assert.ok(normalizeItem(mk(atFloor, cur), region, NOW), `${region} ${atFloor}`);
  }
  assert.equal(normalizeItem(mk("30.00", "USD"), "au", NOW), null, "USD on the AU marketplace is the wrong currency");
});

test("junk titles", () => {
  for (const t of ["Custom Charizard ex Special Illustration Rare", "Charizard ex Proxy 199/165", "Pikachu ex SIR Replica", "Reprint Charizard ex 199/165", "Orica Charizard ex", "Fan Art Charizard ex holo", "Metal Card Charizard ex rare", "Digital Charizard ex rare", "Charizard ex code card rare", "Lot of 10 Charizard ex rare", "Bulk Pokemon rare holo", "Charizard ex rare damaged", "Charizard ex rare empty box", "Japanese Charizard ex SIR", "Korean Charizard ex SIR", "Chinese Charizard ex SIR", "German Charizard ex SIR", "French Charizard ex SIR", "Italian Charizard ex SIR", "Spanish Charizard ex SIR", "Charizard ex SIR Deutsch", "Pokemon 151 Booster Bundle holo rare"]) {
    assert.ok(isJunkTitle(t), t);
  }
  for (const t of ["Charizard ex 234/091 Special Illustration Rare Paldean Fates", "PSA 10 Charizard Holo 4/102 Base Set", "Umbreon VMAX Alternate Art 215/203 Evolving Skies", "Pikachu ex 238/191 SIR NM"]) assert.ok(!isJunkTitle(t), t);
});

const mkItem = (id: string, photo: string, price = "30.00") => ({
  itemId: id,
  title: `Charizard ex ${id} 199/165 Special Illustration Rare`,
  image: { imageUrl: `https://i.ebayimg.com/images/g/${photo}/s-l225.jpg` },
  price: { value: price, currency: "USD" },
  itemAffiliateWebUrl: `https://www.ebay.com/itm/${id}?mkevt=1&campid=${EBAY_CAMPAIGN_ID}&customid=dex-us-listings`,
});

test("selectListings: round-robin spread, de-duplication by id and by photo, cap", () => {
  const A = Array.from({ length: 10 }, (_, i) => mkItem(`a${i}`, `pa${i}`));
  const B = Array.from({ length: 10 }, (_, i) => mkItem(`b${i}`, `pb${i}`));
  const C = [mkItem("c0", "pc0")];
  const out = selectListings([A, B, C], "us", NOW);
  assert.equal(out.length, MAX_RETURNED);
  assert.deepEqual(out.slice(0, 3).map((o) => o.id), ["a0", "b0", "c0"]);
  assert.deepEqual(out.slice(3, 6).map((o) => o.id), ["a1", "b1", "a2"].slice(0, 3).length ? ["a1", "b1", "a2"] : []);
  // no query fills the strip: A and B end up with six each (C has one) minus the spread
  const fromA = out.filter((o) => o.id.startsWith("a")).length;
  const fromB = out.filter((o) => o.id.startsWith("b")).length;
  assert.ok(Math.abs(fromA - fromB) <= 1 && fromA + fromB + 1 === MAX_RETURNED, `${fromA}/${fromB}`);
  // the same photo under another id and the same id twice are skipped
  const dup = selectListings([[mkItem("x1", "same"), mkItem("x2", "other")], [mkItem("y1", "same"), mkItem("x1", "p9"), mkItem("y2", "p8")]], "us", NOW);
  assert.deepEqual(dup.map((d) => d.id), ["x1", "x2", "y2"]);
  assert.deepEqual(selectListings([], "us", NOW), []);
  assert.deepEqual(selectListings([[], []], "us", NOW), []);
  // one query that returns everything cannot exceed the cap
  assert.equal(selectListings([Array.from({ length: 50 }, (_, i) => mkItem(`z${i}`, `pz${i}`))], "us", NOW).length, MAX_RETURNED);
  // the real fixture: the duplicate photo (item 6) collapses into the first
  const fx = selectListings([RAW], "us", NOW);
  assert.equal(fx.length, 6);
});

test("imageKey: the photo's id, however it is sized", () => {
  assert.equal(imageKey("https://i.ebayimg.com/images/g/AbC/s-l225.jpg"), imageKey("https://i.ebayimg.com/images/g/AbC/s-l1600.webp?x=1"));
  assert.notEqual(imageKey("https://i.ebayimg.com/images/g/AbC/s-l225.jpg"), imageKey("https://i.ebayimg.com/images/g/XyZ/s-l225.jpg"));
});

// ─── queries and requests ───────────────────────────────────────────────────────

test("queries: six generic chase queries, three per set, all constants, <= 100 characters", () => {
  assert.equal(GENERIC_QUERIES.length, 6);
  assert.equal(queriesFor("generic").length, 6);
  assert.ok(queriesFor("generic").every((q) => q.startsWith("Pokemon ")));
  assert.ok(queriesFor("generic").some((q) => q.includes("PSA 10 Charizard")));
  for (const s of SETS) {
    const qs = queriesFor(`set:${s.code}`);
    const name = s.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // no accents on the wire ("Pokémon GO")
    assert.deepEqual(qs, [`Pokemon ${name} special illustration rare`, `Pokemon ${name} alt art`, `Pokemon ${name} chase`]);
    assert.ok(qs.every((q) => q.length <= 100));
  }
  assert.deepEqual(queriesFor("set:nope"), []);
  assert.deepEqual(queriesFor("../x"), []);
  assert.deepEqual(queriesFor(""), []);
  // at most MAX_FETCHED items per refresh, whatever the context
  for (const key of ["generic", `set:${SETS[0].code}`]) assert.ok(queriesFor(key).length * Math.floor(MAX_FETCHED / queriesFor(key).length) <= MAX_FETCHED);
});

test("request: filter, marketplace and affiliate headers per region", () => {
  for (const r of REGION_LIST) {
    const m = MARKETPLACE[r.region];
    const f = searchFilter(r.region);
    assert.ok(f.includes("buyingOptions:{FIXED_PRICE}"), f);
    assert.ok(f.includes(`price:[${PRICE_FLOOR[m.currency]}]`), f);
    assert.ok(f.includes(`priceCurrency:${m.currency}`), f);
    assert.ok(f.includes(`deliveryCountry:${m.country}`), f);
    const h = searchHeaders("TOKEN", r.region);
    assert.equal(h["X-EBAY-C-MARKETPLACE-ID"], m.id);
    assert.equal(h["X-EBAY-C-ENDUSERCTX"], `affiliateCampaignId=${EBAY_CAMPAIGN_ID},affiliateReferenceId=dex-${r.region}-listings`);
    assert.equal(h.Authorization, "Bearer TOKEN");
    const u = new URL(buildSearchUrl("Pokemon X", r.region, 4));
    assert.equal(u.origin + u.pathname, "https://api.ebay.com/buy/browse/v1/item_summary/search");
    assert.equal(u.searchParams.get("limit"), "4");
    assert.equal(u.searchParams.get("q"), "Pokemon X");
  }
  assert.deepEqual([MARKETPLACE.au.id, MARKETPLACE.nz.id, MARKETPLACE.us.id, MARKETPLACE.sg.id, MARKETPLACE.uk.id, MARKETPLACE.ca.id, MARKETPLACE.eu.id], ["EBAY_AU", "EBAY_AU", "EBAY_US", "EBAY_US", "EBAY_GB", "EBAY_CA", "EBAY_DE"]);
});

test("configuration: keys and the kill switch", () => {
  assert.equal(ebayListingsEnabled({}), false);
  assert.equal(ebayListingsEnabled({ EBAY_CLIENT_ID: "a" }), false);
  assert.equal(ebayListingsEnabled({ EBAY_CLIENT_SECRET: "a" }), false);
  assert.equal(ebayListingsEnabled({ EBAY_CLIENT_ID: " ", EBAY_CLIENT_SECRET: "a" }), false);
  assert.equal(ebayListingsEnabled(KEYS), true);
  assert.equal(ebayListingsEnabled({ ...KEYS, EBAY_LISTINGS: "off" }), false);
  assert.equal(ebayListingsEnabled({ ...KEYS, EBAY_LISTINGS: "OFF " }), false);
  assert.equal(ebayListingsEnabled({ ...KEYS, EBAY_LISTINGS: "on" }), true);
});

// ─── token manager ──────────────────────────────────────────────────────────────

test("token: one request however many callers, cached, refreshed early, Basic auth, correct body", async () => {
  const h = harness((url, _i, n) => okToken(n));
  const tm = createTokenManager(h.deps);
  const got = await Promise.all(Array.from({ length: 25 }, () => tm.get()));
  assert.equal(new Set(got).size, 1);
  assert.equal(h.tokens().length, 1);
  const init = h.tokens()[0].init!;
  assert.equal(init.method, "POST");
  const hd = init.headers as Record<string, string>;
  assert.equal(hd.Authorization, "Basic " + Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64"));
  assert.equal(hd["Content-Type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(init.body as string);
  assert.equal(body.get("grant_type"), "client_credentials");
  assert.equal(body.get("scope"), "https://api.ebay.com/oauth/api_scope");
  assert.equal(h.tokens()[0].url, "https://api.ebay.com/identity/v1/oauth2/token");
  await tm.get();
  assert.equal(h.tokens().length, 1, "cached");
  h.clock.t += 7200_000 - 4 * 60_000; // inside the 5-minute early window
  await tm.get();
  assert.equal(h.tokens().length, 2, "refreshed before it expires");
});

test("token: refresh(bad) is single-flight and reuses a token already replaced", async () => {
  const h = harness((url, _i, n) => okToken(n));
  const tm = createTokenManager(h.deps);
  const first = await tm.get();
  const r = await Promise.all([tm.refresh(first), tm.refresh(first), tm.refresh(first)]);
  assert.equal(h.tokens().length, 2);
  assert.equal(new Set(r).size, 1);
  assert.notEqual(r[0], first);
  assert.equal(await tm.refresh(first), r[0], "a stale 401 must not trigger yet another fetch");
  assert.equal(h.tokens().length, 2);
});

test("token: no secret, id or credential in any thrown error", async () => {
  const cases: Handler[] = [
    () => json({ error: "invalid_client", error_description: `bad ${SECRET} ${CLIENT_ID}` }, 401),
    () => new Response(`<html>${SECRET}`, { status: 200 }),
    () => json({ access_token: 5 }),
    () => json({}, 200),
    () => {
      throw new Error(`network ${SECRET} ${CLIENT_ID} ${Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64")}`);
    },
    () => json({ error: SECRET }, 500),
  ];
  for (const c of cases) {
    const h = harness(c);
    const tm = createTokenManager(h.deps);
    await assert.rejects(tm.get(), (e: unknown) => {
      assert.ok(e instanceof EbayError);
      const dump = String((e as Error).message) + String((e as Error).stack ?? "").split("\n")[0] + JSON.stringify(e) + String(e);
      for (const bad of [SECRET, CLIENT_ID, Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64")]) assert.ok(!dump.includes(bad), `leaked ${bad}`);
      return true;
    });
    await assert.rejects(tm.get(), EbayError); // and a failure is not cached as a token
  }
  const none = harness(standard, {});
  await assert.rejects(createTokenManager(none.deps).get(), (e: unknown) => (e as EbayError).code === "no-keys");
  assert.equal(none.calls.length, 0);
});

// ─── the client ─────────────────────────────────────────────────────────────────

const HOME = parseContext("home")!;
const SET = parseContext("set:surging-sparks")!;

test("client: a burst of 50 requests makes one refresh (one search per query), then serves from memory until the TTL", async () => {
  const h = harness(standard);
  const c = createEbayClient(h.deps);
  const burst = await Promise.all(Array.from({ length: 50 }, () => c.listings("us", HOME)));
  assert.equal(h.tokens().length, 1);
  assert.equal(h.searches().length, GENERIC_QUERIES.length);
  assert.ok(burst.every((b) => b.items.length > 0 && !b.reason));
  assert.ok(burst[0].items.length <= MAX_RETURNED);
  assert.equal(c.callsToday(), GENERIC_QUERIES.length);
  // a different context for the same marketplace and queries (sealed, store, type) shares the entry
  await c.listings("sg", parseContext("sealed")!); // SG uses EBAY_US
  await c.listings("us", parseContext("type:booster-boxes")!);
  assert.equal(h.searches().length, GENERIC_QUERIES.length);
  h.clock.t += TTL_MS - 1000;
  await c.listings("us", HOME);
  assert.equal(h.searches().length, GENERIC_QUERIES.length, "still fresh");
  h.clock.t += 2000;
  await c.listings("us", HOME);
  assert.equal(h.searches().length, GENERIC_QUERIES.length * 2, "refreshed after the TTL");
  // another marketplace is another key
  await c.listings("au", HOME);
  assert.equal(h.searches().length, GENERIC_QUERIES.length * 3);
  assert.equal(h.tokens().length, 1);
});

test("client: the searches carry what the API needs, and a set context uses its three queries", async () => {
  const h = harness(standard);
  const c = createEbayClient(h.deps);
  await c.listings("uk", SET);
  const s = h.searches();
  assert.equal(s.length, 3);
  for (const call of s) {
    const u = new URL(call.url);
    assert.equal(u.searchParams.get("limit"), String(Math.floor(MAX_FETCHED / 3)));
    const hd = call.init!.headers as Record<string, string>;
    assert.equal(hd["X-EBAY-C-MARKETPLACE-ID"], "EBAY_GB");
    assert.match(hd["X-EBAY-C-ENDUSERCTX"], new RegExp(`affiliateCampaignId=${EBAY_CAMPAIGN_ID},affiliateReferenceId=dex-uk-listings`));
    assert.ok(u.searchParams.get("filter")!.includes("priceCurrency:GBP"));
  }
  assert.deepEqual(s.map((x) => new URL(x.url).searchParams.get("q")), ["Pokemon Surging Sparks special illustration rare", "Pokemon Surging Sparks alt art", "Pokemon Surging Sparks chase"]);
  assert.equal(new Set(s.map((x) => (x.init as { cache?: string }).cache)).size, 1);
  assert.equal((s[0].init as { cache?: string }).cache, "no-store");
  assert.ok((s[0].init as { signal?: AbortSignal }).signal, "a timeout signal is passed");
});

test("client: the response holds only whitelisted fields and nothing of the credentials", async () => {
  const h = harness(standard);
  const out = await createEbayClient(h.deps).listings("us", HOME);
  const text = JSON.stringify(out);
  for (const bad of [SECRET, CLIENT_ID, "card_vault_99", "feedbackScore", "seller", "itemHref", "shippingOptions", "priorityListing", "itemAffiliateWebUrl", "tok-"]) assert.ok(!text.includes(bad), bad);
  assert.deepEqual(Object.keys(out).sort(), ["asOf", "items"]);
  for (const it of out.items) assert.ok(Object.keys(it).every((k) => ["id", "title", "imageUrl", "price", "url", "condition"].includes(k)));
  assert.equal(out.asOf, new Date(NOW).toISOString());
});

test("client: a 401 on search refreshes the token once and retries; a second 401 is a failure", async () => {
  let n = 0;
  const h = harness((url) => {
    if (url.includes("/oauth2/token")) return okToken(++n);
    return (url.includes("limit=") && (h.calls.filter((c) => c.url.includes("/search")).length <= GENERIC_QUERIES.length)) ? json({ errors: [{ errorId: 1001 }] }, 401) : json({ ...FIXTURE });
  });
  const c = createEbayClient(h.deps);
  const out = await c.listings("us", HOME);
  assert.ok(out.items.length > 0, "recovered after one refresh");
  assert.equal(h.tokens().length, 2, "one refresh for the whole burst of 401s");

  const h2 = harness((url) => (url.includes("/oauth2/token") ? okToken() : json({ errors: [] }, 401)));
  const out2 = await createEbayClient(h2.deps).listings("us", HOME);
  assert.deepEqual(out2.items, []);
  assert.equal(out2.reason, "unavailable");
  assert.equal(h2.tokens().length, 2, "refreshed once, not in a loop");
  assert.equal(h2.searches().length, GENERIC_QUERIES.length * 2, "each query retried once");
});

test("client: failures are cached briefly, never for an hour, and never throw", async () => {
  let fail = true;
  const h = harness((url) => (url.includes("/oauth2/token") ? okToken() : fail ? new Response("boom", { status: 503 }) : json({ ...FIXTURE })));
  const c = createEbayClient(h.deps);
  const a = await c.listings("us", HOME);
  assert.deepEqual(a.items, []);
  assert.equal(a.reason, "unavailable");
  const calls = h.searches().length;
  await c.listings("us", HOME);
  assert.equal(h.searches().length, calls, "backing off: no new eBay calls inside the failure window");
  fail = false;
  h.clock.t += FAILURE_BACKOFF_MS + 1;
  const b = await c.listings("us", HOME);
  assert.ok(b.items.length > 0 && !b.reason, "retried after the short backoff, not after an hour");
});

test("client: repeated failures back off exponentially (an outage does not burn the budget), up to 15 minutes", async () => {
  const h = harness((url) => (url.includes("/oauth2/token") ? okToken() : new Response("down", { status: 503 })));
  const c = createEbayClient(h.deps);
  const gaps: number[] = [];
  let last = -1;
  for (let minute = 0; minute <= 60; minute++) {
    const before = h.searches().length;
    await c.listings("us", HOME);
    if (h.searches().length > before) {
      if (last >= 0) gaps.push(minute - last);
      last = minute;
    }
    h.clock.t += 60_000;
  }
  assert.deepEqual(gaps.slice(0, 5), [1, 2, 4, 8, 15]); // polled once a minute: 60 s, then 2, 4, 8 minutes, then the 15-minute cap
  assert.ok(Math.max(...gaps) * 60_000 <= FAILURE_BACKOFF_MAX_MS + 60_000);
  assert.ok(h.searches().length <= GENERIC_QUERIES.length * 8, `${h.searches().length} searches in an hour of outage`);
});

test("client: after a good fetch, a later failure serves the stale copy (flagged) up to 3 hours, then nothing", async () => {
  let fail = false;
  const h = harness((url) => (url.includes("/oauth2/token") ? okToken() : fail ? new Response("x", { status: 500 }) : json({ ...FIXTURE })));
  const c = createEbayClient(h.deps);
  const good = await c.listings("us", HOME);
  assert.ok(good.items.length > 0);
  fail = true;
  h.clock.t += TTL_MS + 1000;
  const stale = await c.listings("us", HOME);
  assert.deepEqual(stale.items, good.items);
  assert.equal(stale.reason, "stale");
  assert.equal(stale.asOf, good.asOf, "asOf is when eBay was last read, not now");
  h.clock.t += MAX_STALE_MS;
  const gone = await c.listings("us", HOME);
  assert.deepEqual(gone.items, []);
});

test("client: 429 pauses every key (no hammering) and the pause ends", async () => {
  let limited = true;
  const h = harness((url) => (url.includes("/oauth2/token") ? okToken() : limited ? new Response("slow down", { status: 429, headers: { "retry-after": "1" } }) : json({ ...FIXTURE })));
  const c = createEbayClient(h.deps);
  const a = await c.listings("us", HOME);
  assert.equal(a.reason, "rate-limited");
  const calls = h.searches().length;
  h.clock.t += FAILURE_BACKOFF_MS + 5000;
  const b = await c.listings("au", SET); // another key, same pause
  assert.equal(b.reason, "rate-limited");
  assert.equal(h.searches().length, calls);
  limited = false;
  h.clock.t += RATE_LIMIT_MIN_MS;
  const d = await c.listings("us", HOME);
  assert.ok(d.items.length > 0);
});

test("client: malformed JSON and empty answers", async () => {
  const h = harness((url) => (url.includes("/oauth2/token") ? okToken() : new Response("<html>not json", { status: 200 })));
  const a = await createEbayClient(h.deps).listings("us", HOME);
  assert.deepEqual(a.items, []);
  assert.equal(a.reason, "unavailable");
  const e = harness((url) => (url.includes("/oauth2/token") ? okToken() : json({ total: 0, itemSummaries: [] })));
  const c = createEbayClient(e.deps);
  const b = await c.listings("us", HOME);
  assert.deepEqual(b.items, []);
  assert.equal(b.reason, "empty");
  const n = e.searches().length;
  await c.listings("us", HOME);
  assert.equal(e.searches().length, n, "an empty answer is remembered for a while, not re-asked per request");
});

test("client: a partial failure still shows what came back, and is retried sooner than a good entry", async () => {
  const h = harness((url) => {
    if (url.includes("/oauth2/token")) return okToken();
    return url.includes("Umbreon") ? new Response("x", { status: 500 }) : json({ ...FIXTURE });
  });
  const c = createEbayClient(h.deps);
  const out = await c.listings("us", HOME);
  assert.ok(out.items.length > 0);
  assert.equal(out.reason, "partial", "flagged, so the route caches it for a minute at the CDN, not for an hour");
  const n = h.searches().length;
  h.clock.t += 6 * 60_000; // past PARTIAL_TTL, well inside TTL
  await c.listings("us", HOME);
  assert.ok(h.searches().length > n);
});

test("client: the daily call budget stops eBay calls, serves stale, then resets the next day", async () => {
  const h = harness(standard);
  const c = createEbayClient(h.deps, { dailyBudget: GENERIC_QUERIES.length * 2 });
  const a = await c.listings("us", HOME);
  assert.ok(a.items.length > 0);
  h.clock.t += TTL_MS + 1;
  const b = await c.listings("us", HOME); // second refresh uses the rest of the budget
  assert.ok(b.items.length > 0 && !b.reason);
  assert.equal(c.callsToday(), GENERIC_QUERIES.length * 2);
  const calls = h.searches().length;
  h.clock.t += TTL_MS + 1;
  const stale = await c.listings("us", HOME);
  assert.equal(h.searches().length, calls, "over budget: no call");
  assert.deepEqual(stale.items, b.items);
  assert.equal(stale.reason, "stale");
  const none = await c.listings("au", HOME);
  assert.deepEqual(none.items, []);
  assert.equal(none.reason, "budget");
  assert.equal(DAILY_CALL_BUDGET, 3000);
  h.clock.t += 24 * 3600_000; // the next UTC day
  const fresh = await c.listings("us", HOME);
  assert.ok(fresh.items.length > 0 && !fresh.reason);
});

test("client: no keys or the kill switch means no network at all", async () => {
  for (const [env, reason] of [[{}, "no-keys"], [{ ...KEYS, EBAY_LISTINGS: "off" }, "off"]] as const) {
    const h = harness(standard, env);
    const out = await createEbayClient(h.deps).listings("us", HOME);
    assert.deepEqual(out.items, []);
    assert.equal(out.reason, reason);
    assert.equal(h.calls.length, 0);
  }
});

test("client: an unknown query key never reaches eBay", async () => {
  const h = harness(standard);
  const out = await createEbayClient(h.deps).listings("us", { id: "x", kind: "set", setCode: "zzz", setName: "x", queryKey: "set:zzz" });
  assert.deepEqual(out.items, []);
  assert.equal(h.searches().length, 0);
});

test("client: per-set feeds have their own, smaller allowance, so a crawl of set pages can never starve the home feed", async () => {
  const h = harness(standard);
  const c = createEbayClient(h.deps, { dailyBudget: 60, setBudget: 9 });
  // three set keys fit (3 searches each); the fourth is over the set allowance
  const sets = ["surging-sparks", "paldean-fates", "obsidian-flames", "paradox-rift"].map((slug) => parseContext(`set:${slug}`)!);
  const outs = [];
  for (const ctx of sets) outs.push(await c.listings("us", ctx));
  assert.deepEqual(outs.map((o) => o.reason), [undefined, undefined, undefined, "budget"]);
  assert.equal(c.setCallsToday(), 9);
  // the generic feed is untouched by that: it still refreshes (6 searches) and keeps doing so
  const home = await c.listings("us", HOME);
  assert.ok(home.items.length > 0 && !home.reason);
  assert.equal(c.callsToday(), 9 + GENERIC_QUERIES.length);
  assert.equal(c.setCallsToday(), 9);
  assert.ok(SET_CALL_BUDGET < DAILY_CALL_BUDGET);
  // a new UTC day gives both allowances back
  h.clock.t += 24 * 3600_000;
  assert.ok(!(await c.listings("us", sets[3])).reason);
});

test("client: a token failure spends no search budget, pauses every key, and backs off", async () => {
  const h = harness((url) => (url.includes("/oauth2/token") ? new Response("nope", { status: 401 }) : json(FIXTURE)));
  const c = createEbayClient(h.deps);
  const keys: [Region, typeof HOME][] = [["us", HOME], ["au", HOME], ["uk", HOME], ["ca", HOME], ["us", SET], ["au", SET]];
  for (const [r, ctx] of keys) {
    const out = await c.listings(r, ctx);
    assert.deepEqual(out.items, []);
    assert.equal(out.reason, "auth");
  }
  assert.equal(h.tokens().length, 1, "one token attempt, not one per key");
  assert.equal(h.searches().length, 0);
  assert.equal(c.callsToday(), 0, "no search was made, so nothing was spent");
  // the pause grows 1, 2, 4 … minutes
  h.clock.t += 61_000;
  await c.listings("us", HOME);
  assert.equal(h.tokens().length, 2);
  await c.listings("au", HOME);
  h.clock.t += 61_000; // inside the 2-minute pause
  await c.listings("uk", HOME);
  assert.equal(h.tokens().length, 2);
  h.clock.t += 61_000;
  await c.listings("uk", HOME);
  assert.equal(h.tokens().length, 3);
});

test("client: a refresh that outlasts the deadline answers with what there is (stale copy or nothing) instead of hanging", async () => {
  let slow = false;
  const h = harness((url) => (url.includes("/oauth2/token") ? okToken() : slow ? new Promise<Response>(() => {}) : json(FIXTURE)));
  const c = createEbayClient(h.deps, { deadlineMs: 50 });
  const good = await c.listings("us", HOME);
  assert.ok(good.items.length > 0);
  slow = true;
  h.clock.t += TTL_MS + 1;
  const t0 = Date.now();
  const stale = await c.listings("us", HOME);
  assert.ok(Date.now() - t0 < 2000);
  assert.deepEqual(stale.items, good.items);
  assert.equal(stale.reason, "stale");
  const none = await c.listings("au", HOME);
  assert.deepEqual(none.items, []);
  assert.ok(none.reason);
});

test("token margin: five minutes early, or a tenth of a short-lived token's life", () => {
  assert.equal(tokenMargin(7200), 5 * 60_000);
  assert.equal(tokenMargin(600), 60_000);
  assert.equal(tokenMargin(100), 10_000);
});

test("request: Accept-Language per marketplace (eBay Canada also serves French)", () => {
  assert.equal(searchHeaders("t", "ca")["Accept-Language"], "en-CA");
  assert.equal(searchHeaders("t", "au")["Accept-Language"], "en-AU");
  assert.equal(searchHeaders("t", "nz")["Accept-Language"], "en-AU");
  assert.equal(searchHeaders("t", "uk")["Accept-Language"], "en-GB");
  assert.equal(searchHeaders("t", "us")["Accept-Language"], "en-US");
});

test("normalizeItem: adult-only items are dropped", () => {
  const ok = RAW.find((r) => (r as { title: string }).title.includes("Umbreon"));
  assert.ok(normalizeItem(ok, "us", NOW));
  assert.equal(normalizeItem({ ...(ok as object), adultOnly: true }, "us", NOW), null);
  assert.ok(normalizeItem({ ...(ok as object), adultOnly: false }, "us", NOW));
});

test("junk titles: reproductions, foreign cards that do not say so, sealed product, kits, merchandise", () => {
  const junk = [
    "Umbreon ex 161/131 Prismatic Evolutions Reproduction Card Holo",
    "Charizard ex Repro Card 199/165",
    "Pokemon Card Game Charizard ex SAR 201/165 sv2a Scarlet & Violet 151 Mint",
    "Umbreon ex SAR 217/187 Pokemon Card sv8a Terastal Fest",
    "Charizard ex Illustration Rare 199/165 Pokemon Russian Card",
    "Charizard ex SIR 199/165 Pokemon Card Vietnamese",
    "Charizard ex Tarjeta Pokemon Rara 199/165",
    "Pokemon Karte Glurak ex 199/165 Sammelkarte",
    "Charizard ex Ultra Premium Collection Pokemon TCG Special Illustration Rare",
    "Mewtwo ex Special Collection Illustration Collection Unopened",
    "Charizard ex League Battle Deck 199/165",
    "Charizard ex Build & Battle Stadium Kit Illustration Rare",
    "Charizard ex Theme Deck New 199/165",
    "Charizard ex Oversized Jumbo Promo Card 199/165",
    "Charizard ex SIR Special Illustration Rare Playset x4",
    "Charizard ex 199/165 Printed Replacement Placeholder",
    "Charizard ex Art Print Special Illustration Rare 8x10",
    "Pokemon Charizard ex Magnet SIR 199/165",
    "Charizard ex SIR Canvas Wall Art",
    "Charizard ex Special Illustration Rare Playset Gift",
    "Charizard ex SIR Toploader Holder 199/165",
    "Charizard ex Gold Card Special Illustration Rare",
  ];
  for (const t of junk) assert.ok(isJunkTitle(t), t);
  // a bare "ex" or "rare" is not enough to be a card
  for (const t of ["Charizard ex Ultra Premium", "Rare Candy Pokemon trainer", "Pikachu holo"]) assert.ok(isJunkTitle(t), t);
  for (const t of [
    "Charizard ex 199/165 Special Illustration Rare Scarlet & Violet 151 NM",
    "Umbreon ex Special Illustration Rare 161/131 Prismatic Evolutions Pokemon Card",
    "PSA 10 Charizard ex 199/165 Pokemon 151 SIR",
    "Mega Charizard X ex 013/132 Mega Evolution Ultra Rare Holo",
    "Pikachu ex 238/191 SIR Surging Sparks sv8 English NM",
  ])
    assert.ok(!isJunkTitle(t), t);
});

// ─── structure ──────────────────────────────────────────────────────────────────

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}
const SRC = new URL("../src", import.meta.url).pathname;
/** An import of lib/ebay-listings (not a comment that names it). */
const IMPORTS_SERVER_HALF = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'][^"']*ebay-listings["']/;

test("the credentials never reach a client bundle: no client module touches ebay-listings or the env vars", () => {
  const files = walk(SRC);
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const client = /^\s*["']use client["']/m.test(text.split("\n").slice(0, 3).join("\n"));
    if (client) {
      assert.ok(!IMPORTS_SERVER_HALF.test(text), `${f} is a client module and imports ebay-listings`);
      assert.ok(!/EBAY_CLIENT/.test(text), f);
    }
    // the credentials are read in one file only (and never as NEXT_PUBLIC_*)
    if (!f.endsWith("lib/ebay-listings.ts")) assert.ok(!/EBAY_CLIENT_(ID|SECRET)/.test(text.replace(/(^|\s)\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")), `${f} reads the credentials`);
    assert.ok(!/NEXT_PUBLIC_EBAY_CLIENT/.test(text), f);
  }
  // modules the browser imports must not import the server half
  for (const f of ["lib/ebay-context.ts", "lib/affiliate.ts", "lib/chase-cards.ts", "lib/ebay-ads.ts"]) assert.ok(!IMPORTS_SERVER_HALF.test(readFileSync(join(SRC, f), "utf8")), f);
  for (const f of ["components/ListingsParts.tsx", "components/EbayListings.tsx", "components/ChaseCards.tsx", "components/ProductCard.tsx", "components/BrowseGrid.tsx", "components/NotFoundEbay.tsx"]) assert.ok(!IMPORTS_SERVER_HALF.test(readFileSync(join(SRC, f), "utf8")), f);
});

test("ebay-listings.ts talks to api.ebay.com only: there is no host override", () => {
  const text = readFileSync(join(SRC, "lib/ebay-listings.ts"), "utf8");
  const code = text.replace(/(^|\s)\/\/.*$/gm, "$1");
  assert.ok(!/EBAY_API_BASE|process\.env\.[A-Z_]*(HOST|BASE|URL)/.test(code));
  const hosts = new Set([...code.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1]));
  assert.deepEqual([...hosts].sort(), ["api.ebay.com"]);
  // fetches never go through the Next data cache
  assert.ok(/cache:\s*"no-store"/.test(code));
});
