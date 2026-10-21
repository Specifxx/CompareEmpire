// The SEO release (2026-10-21): the tools (src/content/tools, src/app/[region]/tools), their arithmetic (lib/tools.ts) and fee table
// (lib/fees.ts), the product page's and store page's new intros, and the sitemap's tool URLs.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { findBannedCopy } from "../src/lib/copy-rules";
import { FEE_BY_KEY, FEE_SCHEDULES, schedulesFor, sellingFees } from "../src/lib/fees";
import { productIntro } from "../src/lib/product-copy";
import { STORE_MIN_LISTED, storeIndexable, storeIntro } from "../src/lib/hub-copy";
import { REGION_LIST, REGIONS } from "../src/lib/regions";
import { staticSitemap } from "../src/lib/sitemap";
import { SITE_URL } from "../src/lib/site";
import { checkDeck, creditValue, formatDeckList, gradingResult, isBasicEnergy, parseDeckList, parseMoney, parsePct, pricePosition, tradeResult } from "../src/lib/tools";
import { GUIDE_BY_SLUG } from "../src/content/guides";
import { TOOLS, toolMetaTitle } from "../src/content/tools";
import ToolPage from "../src/app/[region]/tools/[tool]/page";
import ToolsIndex from "../src/app/[region]/tools/page";

(globalThis as unknown as { React: typeof React }).React = React;
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

test("registry: five tools, unique slugs, descriptions ≤ 160, titles that fit a <title>, an FAQ of four or more, guides that exist, no banned copy", () => {
  assert.deepEqual(
    TOOLS.map((t) => t.slug),
    ["value-checker", "trade-calculator", "selling-fee-calculator", "grading-value-calculator", "deck-builder"],
  );
  for (const t of TOOLS) {
    assert.ok(t.description.length <= 160, `${t.slug}: description ${t.description.length}`);
    const title = toolMetaTitle(t.title);
    assert.ok((typeof title === "string" ? `${title} | DexCompare` : title.absolute).length <= 65, t.slug);
    assert.ok(t.faq.length >= 4, t.slug);
    assert.ok(t.about.length >= 3 && t.steps.length >= 3, t.slug);
    for (const g of t.guides) assert.ok(GUIDE_BY_SLUG.has(g), `${t.slug}: guide ${g}`);
    const all = [t.title, t.description, t.lede, ...t.about, ...t.steps, ...t.faq.flatMap((f) => [f.q, f.a])].join(" ");
    assert.equal(findBannedCopy(all), null, `${t.slug}: "${findBannedCopy(all)}"`);
    assert.doesNotMatch(all, /pull[-\s]*rates?|expected value|\bEV\b|invest/i, t.slug);
  }
});

test("every tool page, in every region: one H1, the steps, the FAQ in the HTML and in FAQPage JSON-LD, links inside the region, no banned copy", () => {
  for (const r of REGION_LIST) {
    for (const t of TOOLS) {
      const html = renderToStaticMarkup(React.createElement(ToolPage, { params: { region: r.region, tool: t.slug } }));
      assert.equal((html.match(/<h1/g) ?? []).length, 1, `${t.slug}/${r.region}`);
      for (const f of t.faq) assert.ok(html.includes(f.q.replace(/'/g, "&#x27;")) || html.includes(f.q), `${t.slug}: FAQ "${f.q}"`);
      assert.match(html, /"@type":"FAQPage"/);
      assert.match(html, /"@type":"WebApplication"/);
      assert.match(html, /data-tool=""/, "the tool itself renders on the server");
      assert.equal(findBannedCopy(text(html)), null, `${t.slug}/${r.region}`);
      const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      for (const h of hrefs) if (h.startsWith("/")) assert.ok(h.startsWith(`/${r.region}/`) || h === `/${r.region}`, `${t.slug}/${r.region}: ${h}`);
      assert.ok(hrefs.filter((h) => h.startsWith(`/${r.region}/guides/`)).length >= 1, `${t.slug}/${r.region}: links a guide`);
    }
    const index = renderToStaticMarkup(React.createElement(ToolsIndex, { params: { region: r.region } }));
    for (const t of TOOLS) assert.ok(index.includes(`href="/${r.region}/tools/${t.slug}"`), `${r.region} index: ${t.slug}`);
  }
});

test("the fee calculator's page prints eBay's published rates where we keep them (AU, US), and says to use Custom elsewhere", () => {
  const au = text(renderToStaticMarkup(React.createElement(ToolPage, { params: { region: "au", tool: "selling-fee-calculator" } })));
  assert.match(au, /13\.4% of the total up to A\$4,000, then 2\.5% above it, plus A\$0\.30 an order/);
  assert.match(au, /2026-10-21/);
  const us = text(renderToStaticMarkup(React.createElement(ToolPage, { params: { region: "us", tool: "selling-fee-calculator" } })));
  assert.match(us, /13\.25% of the total up to \$7,500, then 2\.35% above it/);
  const uk = text(renderToStaticMarkup(React.createElement(ToolPage, { params: { region: "uk", tool: "selling-fee-calculator" } })));
  assert.match(uk, /choose Custom/);
  assert.deepEqual(schedulesFor("UK"), []);
});

test("fees: tiered final value fee on item + postage, the per-order fee by order size, free selling is free", () => {
  const au = FEE_BY_KEY.get("ebay-au-standard")!;
  // A$60 + A$12 = A$72: 13.4% = 964.8 → 965, + 30
  assert.deepEqual(sellingFees(6000, 1200, au), { totalCents: 7200, variableCents: 965, orderCents: 30, feesCents: 995, afterFeesCents: 6205, effectivePct: (995 / 7200) * 100 });
  // A$5,000: 13.4% of 4,000 + 2.5% of 1,000 = 536 + 25 = A$561, + 0.30
  assert.equal(sellingFees(500_000, 0, au).feesCents, 53_600 + 2_500 + 30);
  const us = FEE_BY_KEY.get("ebay-us-ccg")!;
  assert.equal(sellingFees(800, 0, us).orderCents, 30, "an order of $10 or less");
  assert.equal(sellingFees(1500, 0, us).orderCents, 40);
  assert.equal(sellingFees(10_000, 0, FEE_BY_KEY.get("ebay-au-free")!).feesCents, 0);
  assert.equal(sellingFees(0, 0, au).feesCents, 0, "nothing sold, nothing charged");
  assert.equal(sellingFees(10_000, 0, { ratePct: 10, orderFeeCents: 50 }).feesCents, 1_050);
  for (const s of FEE_SCHEDULES) assert.match(s.source, /^https:\/\/www\.ebay\.com(?:\.au)?\//, s.key);
});

test("parsing: money in the forms people type, and percentages", () => {
  assert.equal(parseMoney("12.50"), 1250);
  assert.equal(parseMoney("A$1,299"), 129_900);
  assert.equal(parseMoney("12,50"), 1250);
  assert.equal(parseMoney("€ 1.299,95"), 129_995);
  assert.equal(parseMoney(""), null);
  assert.equal(parseMoney("abc"), null);
  assert.equal(parseMoney("-5"), null);
  assert.equal(parsePct("13.4%"), 13.4);
  assert.equal(parsePct("140"), 100);
  assert.equal(parsePct("x"), null);
});

test("trade calculator: totals, the gap as a share of the bigger side, even within 2%, store credit", () => {
  const give = [{ name: "ETB", qty: 2, cents: 6000 }];
  const get = [{ name: "Box", qty: 1, cents: 15_000 }];
  const r = tradeResult(give, get);
  assert.equal(r.giveCents, 12_000);
  assert.equal(r.diffCents, 3_000);
  assert.equal(r.verdict, "you-gain");
  assert.equal(Math.round(r.diffPct), 20);
  assert.equal(tradeResult([{ name: "a", qty: 1, cents: 10_000 }], [{ name: "b", qty: 1, cents: 9_900 }]).verdict, "even");
  assert.equal(tradeResult([], []).verdict, "empty");
  assert.equal(creditValue(10_000, 70), 7_000);
});

test("grading: what raw leaves, each grade against it, the break-even graded price and the weighted average", () => {
  // raw 100, fee 10%: raw leaves 90. Costs 45. Break-even: (90 + 45) / 0.9 = 150.
  const g = gradingResult({
    rawCents: 10_000,
    gradingFeeCents: 3_000,
    shippingCents: 1_500,
    sellFeePct: 10,
    grades: [
      { label: "10", saleCents: 30_000, chancePct: 20 },
      { label: "9", saleCents: 15_000, chancePct: 50 },
      { label: "8", saleCents: 9_000, chancePct: 30 },
    ],
  });
  assert.equal(g.rawNetCents, 9_000);
  assert.equal(g.breakEvenCents, 15_000);
  assert.deepEqual(
    g.lines.map((l) => l.netCents),
    [27_000 - 4_500, 13_500 - 4_500, 8_100 - 4_500],
  );
  assert.equal(g.lines[1].vsRawCents, 0, "a 9 here is exactly break-even");
  assert.equal(g.weightedNetCents, Math.round(22_500 * 0.2 + 9_000 * 0.5 + 3_600 * 0.3));
  assert.equal(g.chanceTotalPct, 100);
});

test("deck builder: reads a Pokémon TCG Live export, counts sections, the four-copy rule by name, basic Energy exempt, and writes it back", () => {
  const list = [
    "Pokémon: 12",
    "4 Pikachu ex SSP 57",
    "3 Pikachu ex SVP 106",
    "4 Raichu PAF 21",
    "1 Iron Hands ex PAR 70",
    "",
    "Trainer: 36",
    "4 Ultra Ball SVI 196",
    "32 Boss's Orders PAL 172",
    "",
    "Energy: 12",
    "8 Basic {L} Energy SVE 4",
    "4 Lightning Energy",
    "Total Cards: 60",
    "a line that isn't a card",
  ].join("\n");
  const { cards, unread } = parseDeckList(list);
  assert.deepEqual(unread, ["a line that isn't a card"]);
  assert.deepEqual(cards[0], { section: "pokemon", count: 4, name: "Pikachu ex", set: "SSP 57" });
  const c = checkDeck(cards);
  assert.equal(c.total, 60);
  assert.deepEqual(c.bySection, { pokemon: 12, trainer: 36, energy: 12 });
  assert.deepEqual(
    c.overLimit.map((o) => `${o.name} ${o.count}`),
    ["Boss's Orders 32", "Pikachu ex 7"],
  );
  assert.equal(c.ok, false);
  assert.ok(isBasicEnergy("Basic {L} Energy") && isBasicEnergy("Lightning Energy") && !isBasicEnergy("Double Turbo Energy"));
  const out = formatDeckList(cards);
  assert.match(out, /^Pokémon: 12\n4 Pikachu ex SSP 57/);
  assert.match(out, /Total Cards: 60$/);
  assert.deepEqual(parseDeckList(out).cards, cards, "round trip");
});

test("value checker: where an offered price sits against today's cheapest and median", () => {
  assert.equal(pricePosition(9_000, 10_000, 12_000), "below-cheapest");
  assert.equal(pricePosition(10_050, 10_000, 12_000), "at-cheapest");
  assert.equal(pricePosition(11_000, 10_000, 12_000), "below-median");
  assert.equal(pricePosition(12_100, 10_000, 12_000), "around-median");
  assert.equal(pricePosition(14_000, 10_000, 12_000), "above-median");
  assert.equal(pricePosition(14_000, 10_000, null), "above-cheapest");
});

test("product intro: what it is, the set, packs and per pack, stores and the median, no banned copy; sold out says so", () => {
  const base = {
    name: "Pitch Black Elite Trainer Box",
    productType: "Elite Trainer Box",
    about: "An Elite Trainer Box holds 8–9 booster packs.",
    set: { name: "Pitch Black", series: "Mega Evolution", releaseDate: "2026-07-17" },
    preorder: false,
    packs: 9,
    market: "AU",
    inName: "Australia",
    adjective: "Australian",
    cheapest: { cents: 8_999, storeName: "Good Games", marketplace: false },
    medianCents: 9_999,
    openStores: 12,
    storeCount: 20,
    elsewhere: 4,
  };
  const t = productIntro(base).join(" ");
  assert.match(t, /Pokémon Pitch Black Elite Trainer Box is an Elite Trainer Box from Pitch Black, part of the Mega Evolution series/);
  assert.match(t, /released on 17 Jul 2026/);
  assert.match(t, /It holds 9 booster packs\./);
  assert.match(t, /A\$89\.99 at Good Games, or A\$10\.00 a pack/);
  assert.match(t, /12 Australian stores of the 20 stores we track/);
  assert.match(t, /The median of those stores is A\$99\.99/);
  assert.match(t, /4 other regions/);
  assert.equal(findBannedCopy(t), null);
  const sold = productIntro({ ...base, cheapest: null, openStores: 0 }).join(" ");
  assert.match(sold, /None of the 20 Australian stores we track that list it has it in stock right now/);
  assert.equal(findBannedCopy(sold), null);
});

test("store intro: its own numbers, its range of sets, how often it is cheapest; and a store needs three listings to be indexed", () => {
  const rows = [
    { productType: "Booster Box", listed: 14, inStock: 9, cheapest: 3, sets: ["me5", "me4", "sv8"] },
    { productType: "Elite Trainer Box", listed: 22, inStock: 11, cheapest: 0, sets: ["me5", "sv10"] },
    { productType: "Tin", listed: 5, inStock: 5, cheapest: 1, sets: [] },
  ];
  const t = storeIntro({ name: "Card Shop", host: "cardshop.com.au", platform: "shopify", r: REGIONS.au, rows, storesInRegion: 61, dormant: false }).join(" ");
  assert.match(t, /Card Shop \(cardshop\.com\.au\) is one of the 61 Australian online stores/);
  assert.match(t, /lists 41 sealed products, 25 of them in stock/);
  assert.match(t, /22 Elite Trainer Boxes, 14 Booster Boxes and 5 Tins/);
  assert.match(t, /from Surging Sparks to Pitch Black/);
  assert.match(t, /4 products it has in stock are at the cheapest price/);
  assert.equal(findBannedCopy(t), null);
  assert.match(storeIntro({ name: "X", host: "x.com", platform: "shopify", r: REGIONS.au, rows: [], storesInRegion: 61, dormant: false }).join(" "), /haven’t found any/);
  assert.equal(STORE_MIN_LISTED, 3);
  assert.equal(storeIndexable({ listed: 2, dormant: false }), false);
  assert.equal(storeIndexable({ listed: 3, dormant: false }), true);
});

test("sitemap: the tools index and every tool in every region, once each", () => {
  const urls = staticSitemap({}).map((e) => e.url);
  for (const r of REGION_LIST) {
    assert.ok(urls.includes(`${SITE_URL}/${r.region}/tools`), r.region);
    for (const t of TOOLS) assert.equal(urls.filter((u) => u === `${SITE_URL}/${r.region}/tools/${t.slug}`).length, 1, `${r.region}/${t.slug}`);
  }
  // and the new guides, AU-only ones in AU only
  assert.ok(urls.includes(`${SITE_URL}/au/guides/where-to-buy-pokemon-cards-australia`));
  assert.ok(!urls.includes(`${SITE_URL}/us/guides/where-to-buy-pokemon-cards-australia`));
  for (const r of REGION_LIST) assert.ok(urls.includes(`${SITE_URL}/${r.region}/guides/pokemon-tcg-market-wrap`), r.region);
});
