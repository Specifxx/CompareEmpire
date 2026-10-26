// Structured data: every builder's output passes tests/helpers/jsonld.ts (schema.org types, Google's product-snippet and breadcrumb
// rules), and on real product pages (rendered from data/public) every value the JSON-LD states is on the page: the low and high prices,
// the number of offers, the currency, the breadcrumb names. Nothing is emitted that a visitor can't see.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { breadcrumbJsonLd, itemListJsonLd, productJsonLd, siteJsonLd, toolJsonLd } from "../src/lib/seo";
import { jsonLdBlocks, nodesOf, validateJsonLd } from "./helpers/jsonld";

(globalThis as unknown as { React: typeof React }).React = React;

test("the builders' output is valid: Product + AggregateOffer, BreadcrumbList, ItemList, the site graph, a tool's FAQ graph", () => {
  const product = productJsonLd({ name: "Pitch Black Elite Trainer Box", path: "/au/p/pitch-black-elite-trainer-box", image: "https://cdn.example/x.jpg", productType: "Elite Trainer Box", setName: "Pitch Black", currency: "AUD", lowCents: 8999, highCents: 11999, offerCount: 7, preorder: false });
  assert.deepEqual(validateJsonLd(product), []);
  assert.equal(product.offers.lowPrice, "89.99");
  assert.equal(product.offers.highPrice, "119.99");
  assert.equal(product.offers.offerCount, 7);
  assert.equal(product.offers.priceCurrency, "AUD");
  assert.equal(product.offers.availability, "https://schema.org/InStock");
  assert.deepEqual(validateJsonLd(breadcrumbJsonLd([{ href: "/au", label: "Australia" }, { href: "/au/sets", label: "Sets" }, { label: "Pitch Black" }])), []);
  assert.deepEqual(validateJsonLd(itemListJsonLd({ name: "x", path: "/au/sets/x", items: [{ path: "/au/p/a", name: "A" }, { path: "/au/p/b", name: "B" }] })), []);
  assert.deepEqual(validateJsonLd(siteJsonLd()), []);
  assert.deepEqual(validateJsonLd(toolJsonLd({ title: "T", description: "D", path: "/au/tools/x", faq: [{ q: "Q?", a: "A." }] })), []);
});

test("the checker catches what Google rejects", () => {
  const bad = { "@context": "https://schema.org", "@type": "Product", name: "X", offers: { "@type": "AggregateOffer", lowPrice: "A$10", highPrice: "5.00", offerCount: 0, priceCurrency: "dollars", availability: "in stock" } };
  const problems = validateJsonLd(bad).join(" | ");
  for (const p of [/lowPrice/, /offerCount/, /priceCurrency/, /availability/]) assert.match(problems, p);
  assert.match(validateJsonLd({ "@context": "https://schema.org", "@type": "Product", name: "X" }).join(), /offers required/);
  assert.match(validateJsonLd({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 2, name: "a", item: "/au" }, { "@type": "ListItem", position: 3, name: "b" }] }).join(), /position|absolute/);
});

test("real product pages (from data/public): valid JSON-LD, and every price, count and currency it states is on the page", async () => {
  process.env.PUBLIC_DATA_MODE = "files";
  // Next's React has cache(); the test's React 18.3 does not: per-request memoising is irrelevant to one render.
  const R = require("react") as { cache?: unknown };
  if (typeof R.cache !== "function") R.cache = (fn: unknown) => fn;
  const { default: ProductPage } = await import("../src/app/[region]/p/[slug]/page");
  const stats = JSON.parse(readFileSync("data/public/product-stats.json", "utf8")) as { productId: string; market: string; inStockStores: number }[];
  const products = JSON.parse(readFileSync("data/public/products.json", "utf8")) as { id: string; slug: string }[];
  const slugOf = new Map(products.map((p) => [p.id, p.slug]));
  // two well-stocked products in two markets, one with few stores, one US (TCGplayer among the offers)
  const pick = (market: string, min: number) => stats.filter((s) => s.market === market && s.inStockStores >= min).map((s) => slugOf.get(s.productId)!).filter(Boolean)[0];
  const cases = [
    { region: "au", slug: pick("AU", 10) },
    { region: "us", slug: pick("US", 5) },
    { region: "uk", slug: pick("UK", 1) },
  ].filter((c) => c.slug);
  assert.ok(cases.length >= 2, "the data files have products to render");
  for (const c of cases) {
    const html = renderToStaticMarkup(await ProductPage({ params: { region: c.region, slug: c.slug } }));
    const { docs, errors } = jsonLdBlocks(html);
    assert.deepEqual(errors, []);
    for (const d of docs) assert.deepEqual(validateJsonLd(d), [], `${c.region}/${c.slug}`);
    const nodes = docs.flatMap(nodesOf);
    const product = nodes.find((n) => n["@type"] === "Product") as { name: string; offers: { lowPrice: string; highPrice: string; offerCount: number; priceCurrency: string } } | undefined;
    const crumbs = nodes.find((n) => n["@type"] === "BreadcrumbList") as { itemListElement: { name: string }[] } | undefined;
    assert.ok(crumbs, `${c.slug}: breadcrumbs`);
    const text = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
    for (const it of crumbs!.itemListElement) assert.ok(text.includes(it.name), `${c.slug}: crumb "${it.name}" on the page`);
    if (!product) continue; // nothing open: no Product markup, as the page shows no price
    const shown = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const plain = text.replace(/[^\d.,\s]/g, " ");
    for (const v of [product.offers.lowPrice, product.offers.highPrice]) {
      const whole = v.endsWith(".00") ? Number(v).toLocaleString("en-US") : null;
      assert.ok(plain.includes(shown(v)) || (whole != null && plain.includes(whole)), `${c.slug}: ${v} is on the page`);
    }
    assert.equal(product.offers.priceCurrency, { au: "AUD", us: "USD", uk: "GBP" }[c.region]);
    // offerCount: the open offers, each a row of the price table with an open stock pill
    const openRows = (html.match(/<li data-offer-row=""[\s\S]*?<\/li>/g) ?? []).filter((r) => !/line-through/.test(r) && !/data-ad=/.test(r) && !(c.region !== "us" && /data-row="tcgplayer"/.test(r))).length; // the eBay row (data-ad) is not an offer, nor TCGplayer's US$ row outside the US
    assert.equal(product.offers.offerCount, openRows, `${c.slug}: offerCount = the table's open rows`);
  }
});
