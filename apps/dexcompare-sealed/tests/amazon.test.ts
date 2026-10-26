// Amazon Associates (Australia), 2026-10-26: the link helper, where Amazon AU appears (Australia and New Zealand only), the links'
// rel and copy (no Amazon price), the disclosure (footer on every page, the disclosure page, beside the buttons), the amazon_click
// event, and the GA4 loader.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AMAZON_ASSOCIATE_STATEMENT,
  AMAZON_AU_DEFAULT_TAG,
  AMAZON_AU_REGIONS,
  AMAZON_REL,
  amazonAuTag,
  amazonAuUrl,
  amazonQuery,
  isAsin,
  showsAmazonAu,
} from "../src/lib/amazon";
import { amazonClickEvent, amazonGa4Params } from "../src/lib/click-events";
import { CONSENT_REGIONS, ga4BootScript, ga4Id } from "../src/lib/ga4";
import { REGION_LIST } from "../src/lib/regions";
import { MarketplacePanel, PreorderMarketplaces, SoldOutCallout } from "../src/components/Marketplaces";
import { Footer } from "../src/components/Footer";
import { staticSitemap } from "../src/lib/sitemap";

(globalThis as unknown as { React: typeof React }).React = React;

function render(el: React.ReactElement): string {
  const err = console.error;
  console.error = () => {};
  try {
    return renderToStaticMarkup(el);
  } finally {
    console.error = err;
  }
}
const src = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
/** Every Amazon link in the markup: href, rel, target, text. */
const amazonLinks = (html: string) =>
  [...html.matchAll(/<a ([^>]*href="https:\/\/www\.amazon\.com\.au[^"]*"[^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    href: (/href="([^"]*)"/.exec(m[1])?.[1] ?? "").replace(/&amp;/g, "&"),
    rel: /rel="([^"]*)"/.exec(m[1])?.[1] ?? "",
    target: /target="([^"]*)"/.exec(m[1])?.[1] ?? "",
    text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  }));

test("the link: a /dp/ page with an ASIN, else a search; amazon.com.au, the owner's tag, nothing else", () => {
  assert.equal(AMAZON_AU_DEFAULT_TAG, "compareempire-22");
  assert.equal(amazonAuTag({}), "compareempire-22");
  assert.equal(amazonAuTag({ AMAZON_AU_TAG: " OtherTag-22 " }), "othertag-22");
  assert.equal(amazonAuTag({ AMAZON_AU_TAG: "not a tag" }), "compareempire-22", "a malformed tag falls back");
  assert.equal(amazonAuUrl({ name: "Phantasmal Flames Elite Trainer Box", asin: "B0ABCDEF12" }, "compareempire-22"), "https://www.amazon.com.au/dp/B0ABCDEF12?tag=compareempire-22");
  const s = new URL(amazonAuUrl({ name: "Phantasmal Flames Elite Trainer Box" }, "compareempire-22"));
  assert.equal(s.origin + s.pathname, "https://www.amazon.com.au/s");
  assert.equal(s.searchParams.get("k"), "Pokemon Phantasmal Flames Elite Trainer Box");
  assert.equal(s.searchParams.get("tag"), "compareempire-22");
  assert.deepEqual([...s.searchParams.keys()].sort(), ["k", "tag"], "no other parameter");
  assert.equal(isAsin("B0ABCDEF12"), true);
  assert.equal(isAsin("b0abcdef12"), false);
  assert.equal(amazonQuery("Pokémon TCG: Mega Evolution Tin [MCAP - 000] - LIMIT 1 PER CUSTOMER"), "Pokemon TCG: Mega Evolution Tin");
});

test("where: Australia and New Zealand only", () => {
  assert.deepEqual(AMAZON_AU_REGIONS, ["au", "nz"]);
  for (const r of REGION_LIST) assert.equal(showsAmazonAu(r.region), r.region === "au" || r.region === "nz", r.region);
  assert.equal(showsAmazonAu(null), false);
});

test("the product page panels: Amazon AU in AU and NZ (sponsored nofollow noopener, new tab, 'Check price', no price, the statement), none elsewhere", () => {
  for (const r of REGION_LIST) {
    const panel = render(React.createElement(MarketplacePanel, { region: r.region, productName: "Phantasmal Flames Elite Trainer Box", productSlug: "phantasmal-flames-elite-trainer-box", preorder: false, tcgplayer: null }));
    const sold = render(
      React.createElement(SoldOutCallout, { region: r.region, productName: "Phantasmal Flames Elite Trainer Box", productSlug: "phantasmal-flames-elite-trainer-box", storesListing: 3, notChecked: 0, tcgplayer: null, ebayQuery: "x" }),
    );
    const pre = render(React.createElement(PreorderMarketplaces, { region: r.region, productName: "Delta Reign Elite Trainer Box", productSlug: "delta-reign-elite-trainer-box", tcgplayer: null }));
    for (const [where, html] of [
      ["panel", panel],
      ["sold out", sold],
      ["pre-order", pre],
    ] as const) {
      const links = amazonLinks(html);
      if (!showsAmazonAu(r.region)) {
        assert.equal(links.length, 0, `${r.region} ${where}: no Amazon`);
        assert.doesNotMatch(html, /amazon/i, `${r.region} ${where}`);
        continue;
      }
      assert.equal(links.length, 1, `${r.region} ${where}: one Amazon link`);
      const [a] = links;
      assert.equal(a.rel, AMAZON_REL);
      assert.equal(AMAZON_REL, "sponsored nofollow noopener");
      assert.equal(a.target, "_blank");
      assert.match(a.text, /Check price on Amazon AU/);
      assert.equal(new URL(a.href).searchParams.get("tag"), "compareempire-22");
      assert.ok(html.includes(AMAZON_ASSOCIATE_STATEMENT), `${r.region} ${where}: the statement beside it`);
      assert.doesNotMatch(a.text, /\$|★|rating|in stock|Prime/i, `${r.region} ${where}: no Amazon price, rating or stock`);
      if (r.region === "nz") assert.match(html, /delivers to New Zealand for many items/);
    }
  }
});

test("set and type pages: Amazon AU in AU and NZ only, a search, labelled", () => {
  for (const p of ["app/[region]/sets/[set]/page.tsx", "app/[region]/type/[type]/page.tsx"]) {
    const s = src(p);
    assert.match(s, /showsAmazonAu\(r\.region\)/, p);
    assert.match(s, /<AmazonLink href=\{amazonAuUrl\(/, p);
    assert.match(s, /AMAZON_ASSOCIATE_STATEMENT/, p);
  }
});

test("disclosure: the statement word for word in every page's footer, and the disclosure page linked from it and in the sitemap", () => {
  assert.equal(AMAZON_ASSOCIATE_STATEMENT, "As an Amazon Associate I earn from qualifying purchases.");
  for (const region of [null, ...REGION_LIST.map((r) => r.region)]) {
    const html = render(React.createElement(Footer, { region }));
    assert.ok(html.includes(AMAZON_ASSOCIATE_STATEMENT), `footer (${region ?? "no region"})`);
    assert.match(html, /href="\/affiliate-disclosure"/);
  }
  assert.ok(existsSync(new URL("../src/app/(site)/affiliate-disclosure/page.tsx", import.meta.url)));
  const page = src("app/(site)/affiliate-disclosure/page.tsx");
  assert.match(page, /\{AMAZON_ASSOCIATE_STATEMENT\}/);
  assert.ok(staticSitemap({}).some((e) => e.url === "https://www.dexcompare.app/affiliate-disclosure"));
});

test("amazon_click: { product, region } on Vercel Pro, { product, region, page } with Plus and in GA4", () => {
  assert.deepEqual(amazonClickEvent({ product: "a-box", pathname: "/au/p/a-box" }, 2), ["amazon_click", { product: "a-box", region: "au" }]);
  assert.deepEqual(amazonClickEvent({ product: "a-box", pathname: "/au/p/a-box" }, 8), ["amazon_click", { product: "a-box", region: "au", page: "product" }]);
  assert.deepEqual(amazonGa4Params({ product: "guide:pokemon-tcg", pathname: "/au/guides/pokemon-tcg-gift-guide-australia" }), { product: "guide:pokemon-tcg", region: "au", page: "guide" });
  const link = src("components/AmazonLink.tsx");
  assert.match(link, /window\.gtag\?\.\("event", "amazon_click", amazonGa4Params/);
  assert.match(link, /onAuxClick/, "middle clicks count");
});

test("GA4: off unless a measurement ID is set; consent defaults to denied in the EEA, UK and Switzerland; no query string", () => {
  assert.equal(ga4Id({}), null);
  assert.equal(ga4Id({ NEXT_PUBLIC_GA4_ID: "nope" }), null);
  assert.equal(ga4Id({ NEXT_PUBLIC_GA4_ID: " g-abc123xyz " }), "G-ABC123XYZ");
  const boot = ga4BootScript("G-ABC123XYZ");
  assert.ok(boot.indexOf("'consent','default'") < boot.indexOf("'config'"), "consent before config");
  for (const c of ["GB", "DE", "FR", "CH", "NO"]) assert.ok(CONSENT_REGIONS.includes(c), c);
  assert.match(boot, /page_location:location\.origin\+location\.pathname/);
  assert.match(src("app/layout.tsx"), /\{GA4_ID && \(/);
});
