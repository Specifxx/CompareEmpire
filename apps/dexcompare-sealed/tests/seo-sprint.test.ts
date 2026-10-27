// The SEO sprint (2026-10-23): the homepages' market report (lib/market-report.ts), its sentences against the copy rules, the
// server-rendered report and grid, the "Compare other TCGs" block, and breadcrumbs on the pages that lacked them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProductCardData } from "../src/lib/data";
import { findBannedCopy } from "../src/lib/copy-rules";
import { perPackSentence, preorderSentence, rangeSentence, spreadSentence, stockMoves, stockSentence, typeRanges, newestBoxOf, preorderOf, type MarketReport } from "../src/lib/market-report";
import type { PriceHistory } from "../src/lib/price-history";
import { REGIONS } from "../src/lib/regions";
import { SET_BY_CODE } from "../src/lib/sets";

(globalThis as unknown as { React: typeof React }).React = React;

const TODAY = "2026-10-23";
const card = (setCode: string, productType: string, cents: number, stores = 3): ProductCardData => ({
  slug: `${setCode}-${productType.toLowerCase().replace(/[^a-z]+/g, "-")}-${cents}`,
  name: `${SET_BY_CODE.get(setCode)!.name} ${productType}`,
  productType,
  setCode,
  imageUrl: null,
  lowestPriceCents: cents,
  inStockStores: stores,
  listedStores: stores + 1,
  marketplaceOpen: false,
  medianOpenCents: null,
  releaseDate: SET_BY_CODE.get(setCode)!.releaseDate,
});

const PRODUCTS = [
  card("me5", "Booster Box", 26995, 12),
  card("me4", "Booster Box", 24995, 9),
  card("sv10", "Booster Box", 69900, 2),
  card("me5", "Elite Trainer Box", 11900, 15),
  card("me4", "Elite Trainer Box", 12900, 4),
  card("me5", "Booster Bundle", 5499, 8),
];

test("typeRanges: cheapest, dearest, median and the cheapest per pack of each headline type", () => {
  const t = typeRanges(PRODUCTS);
  assert.deepEqual(
    t.map((x) => x.label),
    ["Booster Box", "Elite Trainer Box", "Booster Bundle"],
  );
  const box = t[0];
  assert.equal(box.count, 3);
  assert.equal(box.cheapest.lowestPriceCents, 24995);
  assert.equal(box.dearest.lowestPriceCents, 69900);
  assert.equal(box.medianCents, 26995);
  assert.equal(box.perPack?.packs, 36);
  assert.equal(newestBoxOf(PRODUCTS, TODAY)?.set.code, "me5");
});

test("stockMoves compares the history's last day with a week before it", () => {
  const h: PriceHistory = {
    v: 1,
    since: 20741,
    through: 20748,
    series: { AU: { [PRODUCTS[0].slug]: [[20741, null, 0], [20745, 26995, 12]], [PRODUCTS[1].slug]: [[20741, 24995, 9]], gone: [[20741, 5000, 2], [20746, null, 0]] } },
  };
  const s = stockMoves(h, "AU", PRODUCTS)!;
  assert.equal(s.cameInCount, 1);
  assert.equal(s.cameIn[0].slug, PRODUCTS[0].slug);
  assert.equal(s.wentOut, 1);
  assert.equal(stockMoves(null, "AU", PRODUCTS), null);
});

test("every generated sentence obeys the copy rules", () => {
  const r = REGIONS.au;
  const types = typeRanges(PRODUCTS);
  const pre = preorderOf([card("me6", "Booster Box", 33500, 4), card("me6", "Elite Trainer Box", 16999, 7)], TODAY);
  assert.equal(pre?.set.code, "me6");
  const h: PriceHistory = { v: 1, since: 20741, through: 20748, series: { AU: { [PRODUCTS[0].slug]: [[20741, null, 0], [20745, 26995, 12]] } } };
  const lines = [...types.map((t) => rangeSentence(t, r)), ...types.map(spreadSentence), perPackSentence(types, r), stockSentence(stockMoves(h, "AU", PRODUCTS), r), preorderSentence(pre, r)];
  for (const l of lines.filter((x): x is string => !!x)) assert.equal(findBannedCopy(l), null, l);
});

test("the region report and the seven-region comparison render products as links in the server HTML", async () => {
  const { RegionReport, RegionsCompared } = await import("../src/components/MarketReport");
  const rep: MarketReport = {
    r: REGIONS.au,
    today: TODAY,
    overview: { products: 1396, inStock: 545, stores: 59 },
    types: typeRanges(PRODUCTS),
    newestBox: newestBoxOf(PRODUCTS, TODAY),
    preorder: preorderOf([card("me6", "Booster Box", 33500, 4)], TODAY),
    stock: null,
  };
  const html = renderToStaticMarkup(React.createElement(RegionReport, { rep }));
  assert.match(html, /data-market-report="au"/);
  for (const p of PRODUCTS) assert.match(html, new RegExp(`href="/au/p/${p.slug}"`), p.slug);
  assert.match(html, /href="\/au\/preorders\/delta-reign"/);
  assert.match(html, /<h3[^>]*>/);
  const cmp = renderToStaticMarkup(React.createElement(RegionsCompared, { reports: [rep, { ...rep, r: REGIONS.us }] }));
  assert.match(cmp, /href="\/us\/p\//);
  assert.equal(findBannedCopy(cmp.replace(/<[^>]+>/g, " ")), null);
});

test("Compare other TCGs: the three sister sites, each with a descriptive anchor", async () => {
  const { CompareOtherTcgs } = await import("../src/components/CompareOtherTcgs");
  const html = renderToStaticMarkup(React.createElement(CompareOtherTcgs));
  for (const [url, anchor] of [
    ["https://riftcompare.com", "Riftbound card prices"],
    ["https://opcompare.app", "One Piece Card Game prices"],
    ["https://mtgcompare.app", "Magic: The Gathering sealed prices"],
  ])
    assert.match(html, new RegExp(`<a href="${url}"[^>]*>${anchor}</a>`), url);
  for (const f of ["src/app/[region]/page.tsx", "src/app/[region]/p/[slug]/page.tsx"]) assert.match(readFileSync(f, "utf8"), /<CompareOtherTcgs/, f);
});

test("breadcrumbs (and their BreadcrumbList) on the region home and the trust pages", () => {
  for (const f of ["src/app/[region]/page.tsx", "src/app/(site)/about/page.tsx", "src/app/(site)/contact/page.tsx", "src/app/(site)/terms/page.tsx", "src/app/(site)/privacy/page.tsx"])
    assert.match(readFileSync(f, "utf8"), /<Breadcrumbs items=\{\[\{ href: "\/", label: "DexCompare" \}/, f);
});

test("the FAQ (on /about since the landing page was cut short): each question a real <h3>, the same list as its FAQPage JSON-LD", () => {
  const page = readFileSync("src/app/(site)/about/page.tsx", "utf8");
  assert.match(page, /<h3 className="font-semibold">\{f\.q\}<\/h3>/);
  assert.match(page, /jsonLd\(faqLdOf\(FAQ\)\)/);
  assert.doesNotMatch(page, /<dt/);
});
