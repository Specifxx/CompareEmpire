import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GET } from "../src/app/api/ebay/[region]/route";
import { ebayClient } from "../src/lib/ebay-listings";
import { REGION_LIST } from "../src/lib/regions";
import { SETS } from "../src/lib/sets";

// The route against a stubbed global fetch: no network, no keys of any real kind.
const FIXTURE = JSON.parse(readFileSync(new URL("./fixtures/ebay-search-us.json", import.meta.url), "utf8"));
const SECRET = "ROUTE-SECRET-s3cr3t";
const ID = "RouteApp-PRD-id-0001";
const realFetch = globalThis.fetch;
const saved = { id: process.env.EBAY_CLIENT_ID, secret: process.env.EBAY_CLIENT_SECRET, off: process.env.EBAY_LISTINGS };
let upstream: { url: string; headers: Record<string, string> }[] = [];
let mode: "ok" | "500" | "empty" | "throw" | "partial" = "ok";

beforeEach(() => {
  process.env.EBAY_CLIENT_ID = ID;
  process.env.EBAY_CLIENT_SECRET = SECRET;
  delete process.env.EBAY_LISTINGS;
  ebayClient().reset();
  upstream = [];
  mode = "ok";
  globalThis.fetch = (async (input: string, init?: RequestInit) => {
    const url = String(input);
    upstream.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    if (!url.startsWith("https://api.ebay.com/")) throw new Error("the route must only talk to api.ebay.com: " + url);
    if (mode === "throw") throw new Error(`boom ${SECRET}`);
    if (url.includes("/oauth2/token")) return new Response(JSON.stringify({ access_token: "tok-" + "y".repeat(30), expires_in: 7200 }), { status: 200 });
    if (mode === "500" || (mode === "partial" && url.includes("Umbreon"))) return new Response("down", { status: 500 });
    if (mode === "empty") return new Response(JSON.stringify({ total: 0 }), { status: 200 });
    return new Response(JSON.stringify(FIXTURE), { status: 200 });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const [k, v] of [["EBAY_CLIENT_ID", saved.id], ["EBAY_CLIENT_SECRET", saved.secret], ["EBAY_LISTINGS", saved.off]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

const call = (region: string, c?: string) => GET(new Request(`http://localhost:3071/api/ebay/${region}${c === undefined ? "" : `?c=${encodeURIComponent(c)}`}`), { params: { region } });

test("route: a good answer is 200 JSON with the long CDN cache and only whitelisted fields", async () => {
  const res = await call("us", "home");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type")!, /application\/json/);
  const cc = res.headers.get("cache-control")!;
  assert.match(cc, /public/);
  assert.match(cc, /s-maxage=3600/);
  // stale-while-revalidate keeps the data inside the "up to 3 hours older" the unit discloses (eBay's rule is 6):
  // 45 min server + 1 h CDN + swr + the 5-minute browser cache
  const swr = Number(/stale-while-revalidate=(\d+)/.exec(cc)![1]);
  const maxAge = Number(/max-age=(\d+)/.exec(cc)![1]);
  assert.ok(45 * 60 + 3600 + swr + maxAge <= 3 * 3600, `${swr}`);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ["asOf", "items"]);
  assert.ok(body.items.length >= 3 && body.items.length <= 12);
  assert.ok(!Number.isNaN(Date.parse(body.asOf)));
  for (const it of body.items) {
    assert.deepEqual(Object.keys(it).filter((k) => k !== "condition").sort(), ["id", "imageUrl", "price", "title", "url"]);
    assert.ok(new URL(it.imageUrl).hostname.endsWith(".ebayimg.com"));
    assert.equal(new URL(it.url).searchParams.get("campid"), "5339155912");
  }
  const text = JSON.stringify(body);
  for (const bad of [SECRET, ID, "card_vault_99", "feedback", "tok-"]) assert.ok(!text.includes(bad), bad);
});

test("route: it only ever calls api.ebay.com, with the marketplace and affiliate headers, and never forwards the request's text", async () => {
  await call("uk", "set:surging-sparks");
  assert.ok(upstream.length >= 4);
  for (const u of upstream) assert.ok(u.url.startsWith("https://api.ebay.com/"));
  const searches = upstream.filter((u) => u.url.includes("/item_summary/search"));
  assert.equal(searches.length, 3);
  for (const s of searches) {
    assert.equal(s.headers["X-EBAY-C-MARKETPLACE-ID"], "EBAY_GB");
    assert.match(s.headers["X-EBAY-C-ENDUSERCTX"], /affiliateCampaignId=5339155912,affiliateReferenceId=dex-uk-listings/);
  }
  // extra query parameters (and text in them) are ignored: nothing reaches eBay but constants
  ebayClient().reset();
  upstream = [];
  await GET(new Request("http://localhost/api/ebay/us?c=home&q=evil+query&filter=x&limit=999"), { params: { region: "us" } });
  for (const s of upstream.filter((u) => u.url.includes("/search"))) {
    const u = new URL(s.url);
    assert.ok(!u.searchParams.get("q")!.includes("evil"));
    assert.ok(Number(u.searchParams.get("limit")) <= 24);
    assert.ok(!u.searchParams.get("filter")!.includes("x,") && u.searchParams.get("filter")!.startsWith("buyingOptions:{FIXED_PRICE}"));
  }
});

test("route: a burst makes one set of eBay calls", async () => {
  await Promise.all(Array.from({ length: 30 }, () => call("us", "home")));
  assert.equal(upstream.filter((u) => u.url.includes("/search")).length, 6);
  assert.equal(upstream.filter((u) => u.url.includes("/oauth2/token")).length, 1);
});

test("route: every region and every set context is served (the whitelist), nothing else", async () => {
  for (const r of REGION_LIST) {
    const res = await call(r.region, "generic");
    assert.equal(res.status, 200, r.region);
  }
  assert.equal((await call("us", `set:${SETS[0].slug}`)).status, 200);
  assert.equal((await call("us", `product:${SETS[0].code}`)).status, 200);
  assert.equal((await call("us", "product:none")).status, 200);
  assert.equal((await call("us", "type:tins")).status, 200);
  assert.equal((await call("us")).status, 200, "no context means generic");
});

test("route: bad region or context is a 400 with no eBay call", async () => {
  upstream = [];
  for (const [r, c] of [["AU", "home"], ["foo", "home"], ["us", "../etc"], ["us", "set:nope"], ["us", "x".repeat(500)], ["us", ""], ["us", "type:../x"], ["..", "home"]] as const) {
    const res = await call(r, c);
    assert.equal(res.status, 400, `${r} ${c.slice(0, 20)}`);
    const body = await res.json();
    assert.deepEqual(body.items, []);
    assert.equal(body.reason, "bad-request");
  }
  assert.equal(upstream.length, 0);
});

test("route: failures and empties are 200 with an empty list and a SHORT cache, with no detail", async () => {
  for (const m of ["500", "empty", "throw"] as const) {
    ebayClient().reset();
    mode = m;
    const res = await call("us", "home");
    assert.equal(res.status, 200, m);
    const cc = res.headers.get("cache-control")!;
    assert.match(cc, /s-maxage=60\b/, m);
    assert.ok(!/stale-while-revalidate/.test(cc), m);
    const body = await res.json();
    assert.deepEqual(body.items, [], m);
    assert.ok(typeof body.reason === "string" && body.reason.length < 20, m);
    const text = JSON.stringify(body);
    assert.ok(!text.includes(SECRET) && !text.includes(ID) && !text.includes("boom") && !text.includes("down"), m);
  }
});

test("route: a PARTIAL answer (some queries failed) is shown but cached for a minute, so the server's quick retry is not pinned behind the CDN", async () => {
  mode = "partial";
  const res = await call("us", "home");
  const body = await res.json();
  assert.ok(body.items.length > 0);
  assert.equal(body.reason, "partial");
  const cc = res.headers.get("cache-control")!;
  assert.match(cc, /s-maxage=60\b/);
  assert.ok(!/stale-while-revalidate/.test(cc));
});

test("route: no keys, or the kill switch, makes no eBay call and answers with a short cache", async () => {
  for (const setup of [() => { delete process.env.EBAY_CLIENT_ID; }, () => { delete process.env.EBAY_CLIENT_SECRET; }, () => { process.env.EBAY_LISTINGS = "off"; }]) {
    ebayClient().reset();
    process.env.EBAY_CLIENT_ID = ID;
    process.env.EBAY_CLIENT_SECRET = SECRET;
    delete process.env.EBAY_LISTINGS;
    setup();
    upstream = [];
    const res = await call("us", "home");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("cache-control")!, /s-maxage=60\b/);
    const body = await res.json();
    assert.deepEqual(body.items, []);
    assert.ok(["no-keys", "off"].includes(body.reason));
    assert.equal(upstream.length, 0);
  }
});

test("route: nodejs runtime, dynamic, GET only", () => {
  const src = readFileSync(new URL("../src/app/api/ebay/[region]/route.ts", import.meta.url), "utf8");
  assert.match(src, /export const maxDuration = \d+/);
  assert.match(src, /export const runtime = "nodejs"/);
  assert.match(src, /export const dynamic = "force-dynamic"/);
  assert.ok(!/export async function (POST|PUT|PATCH|DELETE)/.test(src));
});
