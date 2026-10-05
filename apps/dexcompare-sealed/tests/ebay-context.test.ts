import { test } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { acceptListing, acceptResponse, cleanImageUrl, cleanText, cleanPrice, contextHeading, isContextString, listingsUrl, MAX_DISPLAY_AGE_MS, parseRegion, requestContext } from "../src/lib/ebay-context";
import { hasSetChase, parseContext, productContext } from "../src/lib/ebay-context-parse";
import { EBAY_CAMPAIGN_ID, epnTagUrl, listingHref, PLACEMENTS } from "../src/lib/affiliate";
import { REGION_LIST } from "../src/lib/regions";
import { PRODUCT_TYPES } from "../src/lib/sealed-title";
import { SETS } from "../src/lib/sets";

test("context parser: only the fixed whitelist parses", () => {
  for (const c of ["home", "generic", "sealed", "store", "releases"]) {
    const p = parseContext(c);
    assert.ok(p, c);
    assert.equal(p!.id, c);
    assert.equal(p!.queryKey, "generic");
    assert.equal(p!.setCode, null);
  }
  const now = new Date("2026-10-05T12:00:00Z");
  for (const s of SETS) {
    const p = parseContext(`set:${s.slug}`, now);
    assert.ok(p, s.slug);
    if (hasSetChase(s, now)) {
      assert.equal(p!.setCode, s.code);
      assert.equal(p!.setName, s.name);
      assert.equal(p!.queryKey, `set:${s.code}`);
      // a product page shares its set's cache entry and queries
      assert.equal(parseContext(`product:${s.code}`, now)!.queryKey, `set:${s.code}`);
    } else {
      // an unreleased set, or one named like its series / a common word: the generic chase context, with no set name
      assert.equal(p!.queryKey, "generic", s.slug);
      assert.equal(p!.setName, null, s.slug);
      assert.equal(p!.setCode, null, s.slug);
      assert.equal(parseContext(`product:${s.code}`, now)!.queryKey, "generic");
    }
  }
  for (const t of PRODUCT_TYPES) assert.equal(parseContext(`type:${t.slug}`)!.queryKey, "generic");
  assert.equal(parseContext("product:none")!.queryKey, "generic");
});

test("context parser: rejects odd, hostile and oversized values", () => {
  const bad: unknown[] = [
    "", " ", "../etc/passwd", "set:../x", "set:", "set", "set:nope", "set:SURGING-SPARKS", "SET:surging-sparks", "Home", "home ", "home\n", "home/../x", "home?x=1", "a".repeat(49), "a".repeat(5000),
    "type:", "type:nope", "type:../booster-boxes", "product:", "product:zzz", "product:NONE", "product:none:extra", "set:surging-sparks:x", "charizard", "%2e%2e", "set:%73urging", ":set", "set::", null, undefined, 5, {}, [], ["home"],
  ];
  for (const b of bad) assert.equal(parseContext(b), null, JSON.stringify(b));
  assert.equal(productContext("sv8"), "product:sv8");
  assert.equal(productContext("not-a-set"), "product:none");
  assert.equal(productContext(null), "product:none");
});

test("region parser accepts the seven regions only", () => {
  for (const r of REGION_LIST) assert.equal(parseRegion(r.region), r.region);
  for (const b of ["AU", "foo", "", "au/../x", "au ", null, undefined, 3]) assert.equal(parseRegion(b), null);
});

test("headings and request URLs", () => {
  assert.equal(contextHeading(parseContext("home")!), "Chase cards on eBay");
  assert.equal(contextHeading(parseContext("set:surging-sparks")!), "Chase cards from Surging Sparks on eBay");
  assert.equal(listingsUrl("au", "set:surging-sparks"), "/api/ebay/au?c=set%3Asurging-sparks");
});

test("placements: the listing placements exist and every customid fits", () => {
  const want = ["listings-home", "listings-landing", "listings-product", "listings-set", "listings-type", "listings-browse", "listings-store", "listings-releases", "listings-footer", "listings-notfound", "chase-home", "chase-landing"];
  for (const p of want) assert.ok((PLACEMENTS as readonly string[]).includes(p), p);
  assert.equal(new Set(PLACEMENTS).size, PLACEMENTS.length);
  for (const r of REGION_LIST) for (const p of PLACEMENTS) assert.ok(`dex-${r.region}-${p}`.length <= 60, `${r.region}-${p}`);
});

const AFF = `https://www.ebay.com/itm/123456789012?_skw=pokemon&hash=item1&mkevt=1&mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${EBAY_CAMPAIGN_ID}&customid=dex-us-listings&toolid=20006`;

test("listingHref: only https eBay hosts carrying our campaign id; customid per placement", () => {
  for (const r of REGION_LIST) {
    const href = listingHref(AFF, r.region, "listings-home")!;
    const u = new URL(href);
    assert.equal(u.searchParams.get("customid"), `dex-${r.region}-listings-home`);
    assert.equal(u.searchParams.get("campid"), EBAY_CAMPAIGN_ID);
    assert.equal(u.protocol, "https:");
  }
  assert.equal(listingHref(AFF.replace("https://", "http://"), "us", "listings-home"), null);
  assert.equal(listingHref(AFF.replace("www.ebay.com", "www.ebay.com.evil.com"), "us", "listings-home"), null);
  assert.equal(listingHref(AFF.replace("www.ebay.com", "evil.com"), "us", "listings-home"), null);
  assert.equal(listingHref(AFF.replace(EBAY_CAMPAIGN_ID, "1111111111"), "us", "listings-home"), null);
  assert.equal(listingHref(AFF.replace("https://", "https://user:pw@"), "us", "listings-home"), null);
  assert.equal(listingHref("javascript:alert(1)", "us", "listings-home"), null);
  assert.equal(listingHref("not a url", "us", "listings-home"), null);
  assert.equal(listingHref(AFF + "&x=" + "a".repeat(2100), "us", "listings-home"), null);
});

test("epnTagUrl: the same EPN parameters as a search link, https eBay hosts only", () => {
  const u = new URL(epnTagUrl("https://www.ebay.co.uk/itm/1?hash=item1", "uk", "dex-uk-listings")!);
  assert.equal(u.searchParams.get("mkevt"), "1");
  assert.equal(u.searchParams.get("mkcid"), "1");
  assert.equal(u.searchParams.get("mkrid"), "710-53481-19255-0");
  assert.equal(u.searchParams.get("siteid"), "3");
  assert.equal(u.searchParams.get("campid"), EBAY_CAMPAIGN_ID);
  assert.equal(u.searchParams.get("customid"), "dex-uk-listings");
  assert.equal(u.searchParams.get("hash"), "item1");
  assert.equal(epnTagUrl("http://www.ebay.com/itm/1", "us", "x"), null);
  assert.equal(epnTagUrl("https://www.example.com/itm/1", "us", "x"), null);
  assert.equal(epnTagUrl("https://ebay.com.evil.io/itm/1", "us", "x"), null);
});

test("image and price cleaning", () => {
  assert.equal(cleanImageUrl("https://i.ebayimg.com/images/g/abc/s-l225.jpg"), "https://i.ebayimg.com/images/g/abc/s-l225.jpg");
  assert.equal(cleanImageUrl("https://thumbs.ebayimg.com/images/g/abc/s-l225.jpg") !== null, true);
  for (const bad of ["http://i.ebayimg.com/x.jpg", "https://ebayimg.com/x.jpg", "https://i.ebayimg.com.evil.com/x.jpg", "https://evil.com/i.ebayimg.com/x.jpg", "https://u:p@i.ebayimg.com/x.jpg", "", null, 4]) assert.equal(cleanImageUrl(bad), null, String(bad));
  assert.deepEqual(cleanPrice({ value: "24.99", currency: "USD" }), { value: "24.99", currency: "USD" });
  for (const bad of [{ value: "0", currency: "USD" }, { value: "-5", currency: "USD" }, { value: "1e3", currency: "USD" }, { value: 5, currency: "USD" }, { value: "5", currency: "usd" }, { value: "5", currency: "US" }, { value: "12.345", currency: "USD" }, null, "5"]) assert.equal(cleanPrice(bad), null, JSON.stringify(bad));
});

const GOOD = { id: "v1|1|0", title: "Charizard ex 234/091 SIR", imageUrl: "https://i.ebayimg.com/images/g/abc/s-l225.jpg", price: { value: "24.99", currency: "USD" }, url: AFF, condition: "Ungraded" };

test("acceptListing re-validates, whitelists fields and sets the placement's customid", () => {
  const a = acceptListing({ ...GOOD, seller: "leak", itemId: "leak", extra: { x: 1 } }, "au", "listings-set")!;
  assert.deepEqual(Object.keys(a).sort(), ["condition", "href", "id", "imageUrl", "price", "title", "url"]);
  assert.equal(new URL(a.href).searchParams.get("customid"), "dex-au-listings-set");
  assert.equal(a.price.value, "24.99");
  assert.equal(acceptListing({ ...GOOD, url: "https://evil.com/x" }, "us", "listings-home"), null);
  assert.equal(acceptListing({ ...GOOD, imageUrl: "https://evil.com/x.jpg" }, "us", "listings-home"), null);
  assert.equal(acceptListing({ ...GOOD, price: { value: "x", currency: "USD" } }, "us", "listings-home"), null);
  assert.equal(acceptListing({ ...GOOD, title: "" }, "us", "listings-home"), null);
  assert.equal(acceptListing({ ...GOOD, id: "" }, "us", "listings-home"), null);
  assert.equal(acceptListing(null, "us", "listings-home"), null);
  assert.equal(acceptListing({ ...GOOD, title: "<b>x</b>\u0000\n" + "y".repeat(200) }, "us", "listings-home")!.title.length <= 80, true);
});

test("acceptResponse: stale, malformed and duplicated responses are shown as nothing or deduplicated", () => {
  const fresh = new Date().toISOString();
  assert.equal(acceptResponse({ items: [GOOD, GOOD], asOf: fresh }, "us", "listings-home").items.length, 1);
  assert.equal(acceptResponse({ items: [GOOD], asOf: new Date(Date.now() - MAX_DISPLAY_AGE_MS - 60_000).toISOString() }, "us", "listings-home").items.length, 0);
  assert.equal(acceptResponse({ items: [GOOD], asOf: new Date(Date.now() + 3 * 3600_000).toISOString() }, "us", "listings-home").items.length, 0);
  for (const bad of [null, "x", 5, {}, { items: "x", asOf: fresh }, { items: [GOOD], asOf: "nope" }, { items: [GOOD] }]) assert.equal(acceptResponse(bad, "us", "listings-home").items.length, 0, JSON.stringify(bad));
  assert.equal(acceptResponse({ items: Array.from({ length: 60 }, (_, i) => ({ ...GOOD, id: `v1|${i}|0` })), asOf: fresh }, "us", "listings-home").items.length, 24);
});

test("set contexts: an unreleased set and a series-named set are the generic chase context (no 'Chase cards from <set>')", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  const delta = SETS.find((s) => s.code === "me6")!; // Delta Reign, 2026-11-06: no cards exist yet
  assert.ok(delta.releaseDate > "2026-10-05");
  assert.equal(parseContext("set:delta-reign", now)!.queryKey, "generic");
  assert.equal(contextHeading(parseContext("set:delta-reign", now)!), "Chase cards on eBay");
  assert.equal(parseContext("product:me6", now)!.queryKey, "generic");
  // the day after it releases it is a set context
  assert.equal(parseContext("set:delta-reign", new Date("2026-11-07T00:00:00Z"))!.queryKey, "set:me6");
  // series names match every card of the series
  for (const slug of ["scarlet-violet", "sword-shield", "sun-moon", "xy", "mega-evolution", "evolutions", "generations", "celebrations"]) {
    assert.equal(parseContext(`set:${slug}`, now)!.queryKey, "generic", slug);
    assert.equal(parseContext(`set:${slug}`, now)!.setName, null, slug);
  }
  assert.equal(parseContext("set:surging-sparks", now)!.queryKey, "set:sv8");
});

test("browser-side context helpers: shape check and the canonical request context", () => {
  for (const c of ["home", "generic", "sealed", "store", "releases", "set:surging-sparks", "type:booster-boxes", "product:sv8", "product:none"]) assert.ok(isContextString(c), c);
  for (const c of ["", "../x", "set:", "set:A", "Home", "x:y", "set:a b", "a".repeat(80), null, 5, "set:" + "a".repeat(41)]) assert.ok(!isContextString(c), String(c));
  // everything answered from the generic query set is requested as "home": one request, one CDN entry
  for (const c of ["home", "generic", "sealed", "store", "releases", "type:tins", "product:none"]) assert.equal(requestContext(c), "home", c);
  assert.equal(requestContext("set:surging-sparks"), "set:surging-sparks");
  assert.equal(requestContext("product:sv8"), "product:sv8");
  // the client module never imports the sets table or the product-type table (they are 30 KB the browser must not download)
  const text = readFileSync(new URL("../src/lib/ebay-context.ts", import.meta.url), "utf8");
  assert.ok(!/from\s+["']\.\/(sets|sealed-title|release)["']/.test(text));
});

test("cleanText strips control, zero-width and bidi-override characters from seller text", () => {
  assert.equal(cleanText("Charizard\u202Eex 199/165\u200B holo", 80), "Charizard ex 199/165 holo");
  assert.equal(cleanText("a\u2066b\u2069c\ufeffd", 80), "a b c d");
  assert.equal(cleanText("ok\u0000\n title", 80), "ok title");
});

test("acceptResponse refuses data older than the 3 hours the unit discloses", () => {
  assert.equal(MAX_DISPLAY_AGE_MS, 3 * 3600_000);
  const item = { id: "1", title: "Charizard ex 199/165", imageUrl: "https://i.ebayimg.com/images/g/a/s-l225.jpg", price: { value: "30.00", currency: "USD" }, url: `https://www.ebay.com/itm/1?campid=${EBAY_CAMPAIGN_ID}` };
  const at = (ageMs: number) => acceptResponse({ items: [item], asOf: new Date(Date.now() - ageMs).toISOString() }, "us", "listings-home").items.length;
  assert.equal(at(2.9 * 3600_000), 1);
  assert.equal(at(3.1 * 3600_000), 0);
});
