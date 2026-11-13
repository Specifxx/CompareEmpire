// The minimal look (owner, 2026-11-13: "we're making things too complicated … get rid of the products on the hero … cull the
// features that we show … minimalistic, dynamic, aesthetic and smooth"; DECISIONS.md, "The minimal look"). Pinned here: a hero of
// words, a search and a few ways in (never a product); products straight after it, on one shelf; the reading matter folded but in
// the HTML; one ad block; motion that is CSS only and off for prefers-reduced-motion; and that what a crawler reads did not move.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { findBannedCopy } from "../src/lib/copy-rules";
import { Fold, Folds } from "../src/components/Fold";
import { Tabs } from "../src/components/Tabs";
import { Hero, HeroPill, WaysIn, riseAt } from "../src/components/home/Hero";
import { jsonLdBlocks, validateJsonLd } from "./helpers/jsonld";

(globalThis as unknown as { React: typeof React }).React = React;

const src = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const css = src("app/globals.css");
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/\s+/g, " ");

function render(el: React.ReactElement): string {
  const router = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} };
  const err = console.error;
  console.error = () => {};
  try {
    return renderToStaticMarkup(React.createElement(AppRouterContext.Provider, { value: router as never }, el));
  } finally {
    console.error = err;
  }
}

async function regionHome(region: "us" | "au"): Promise<string> {
  process.env.PUBLIC_DATA_MODE = "files";
  const R = require("react") as { cache?: unknown };
  if (typeof R.cache !== "function") R.cache = (fn: unknown) => fn;
  const { default: Page } = await import("../src/app/[region]/page");
  return render(await Page({ params: { region } }));
}

test("the hero: a section of words, a pill, a search and ways in; server markup, no script of its own", () => {
  const html = render(
    React.createElement(
      Hero,
      null,
      React.createElement(HeroPill, { href: "/us/preorders/flowing-fists", children: "Flowing Fists pre-orders" }),
      React.createElement("h1", { className: "hero-h1 rise-solid" }, "Headline"),
      React.createElement(WaysIn, { label: "Popular pages", links: [{ href: "/us/type/booster-boxes", label: "Booster boxes", icon: "box" }, { href: "/us/deals", label: "Deals", icon: "tag" }] }),
    ),
  );
  assert.match(html, /^<section class="hero"><div class="hero-bg" aria-hidden="true"><\/div><div class="hero-in">/);
  assert.match(html, /<a class="hero-pill rise" href="\/us\/preorders\/flowing-fists">/);
  assert.match(html, /<ul class="ways rise" style="--i:4"[^>]*aria-label="Popular pages"|<ul [^>]*aria-label="Popular pages"[^>]*class="ways rise"/);
  assert.match(html, /<li class="flex"><a class="way flex-1" href="\/us\/type\/booster-boxes"><span class="way-icon" aria-hidden="true"><svg /);
  assert.equal((html.match(/class="way flex-1"/g) ?? []).length, 2);
  assert.deepEqual(riseAt(3), { "--i": 3 });
  assert.equal(render(React.createElement(HeroPill, null, "United States")), '<p class="hero-pill rise">United States</p>');
  const hero = src("components/home/Hero.tsx");
  assert.doesNotMatch(hero, /^"use client"/, "a server component");
  assert.doesNotMatch(hero, /ProductCard|<img|useEffect|useState/, "never a product, a photo or a script");
  // Its ground is gradients only: nothing to download, nothing to decode.
  const bg = css.slice(css.indexOf(".hero-bg"), css.indexOf(".hero-in"));
  assert.match(bg, /radial-gradient/);
  assert.doesNotMatch(bg, /url\(/, "no image in the hero's ground");
});

test("Tabs: every panel is in the server HTML (a crawler reads all of them), the first chosen, the rest hidden", () => {
  const html = render(
    React.createElement(Tabs, {
      label: "In stock today",
      tabs: [
        { label: "Booster boxes", count: 8, panel: React.createElement("a", { href: "/us/p/a" }, "A") },
        { label: "Elite Trainer Boxes", panel: React.createElement("a", { href: "/us/p/b" }, "B") },
        { label: "Deals", panel: React.createElement("a", { href: "/us/p/c" }, "C") },
      ],
    }),
  );
  assert.match(html, /<div role="tablist" aria-label="In stock today" class="tabs-list">/);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 3);
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
  assert.match(html, /<button type="button" role="tab" id="[^"]+-t0" aria-selected="true" aria-controls="[^"]+-p0" tabindex="0" class="tab">Booster boxes<span class="tab-count">8<\/span><\/button>/);
  assert.equal((html.match(/role="tabpanel"/g) ?? []).length, 3);
  assert.equal((html.match(/role="tabpanel"[^>]* hidden=""/g) ?? []).length, 2, "the panels not chosen are hidden, not absent");
  for (const h of ["/us/p/a", "/us/p/b", "/us/p/c"]) assert.match(html, new RegExp(`href="${h}"`), `${h} is in the HTML`);
  assert.equal(render(React.createElement(Tabs, { label: "x", tabs: [] })), "", "no tabs, no markup");
  const tabs = src("components/Tabs.tsx");
  for (const k of ["ArrowRight", "ArrowLeft", '"Home"', '"End"', "aria-controls", "aria-labelledby"]) assert.ok(tabs.includes(k), `the WAI-ARIA tabs pattern: ${k}`);
  assert.doesNotMatch(tabs, /fetch\(|useEffect/, "a change of tab costs no request");
});

test("Fold: reading matter stays in the HTML as a closed <details>, its heading still an <h2> of the page", () => {
  const html = render(React.createElement(Folds, { label: "More", children: React.createElement(Fold, { id: "report-h", title: "Prices this week", "data-market-report": "us", children: React.createElement("p", null, "Words a crawler reads.") }) }));
  assert.match(html, /^<section aria-label="More" class="mt-20 border-t border-line sm:mt-24"><details class="fold" data-fold="report-h" data-market-report="us"><summary><h2 id="report-h">Prices this week<\/h2>/);
  assert.match(html, /<div class="fold-body"><p>Words a crawler reads\.<\/p><\/div><\/details>/);
  assert.doesNotMatch(html, /<details[^>]* open/, "closed until asked for");
  assert.match(render(React.createElement(Fold, { id: "x", title: "T", open: true, children: "y" })), /^<details class="fold" open=""/);
  assert.doesNotMatch(src("components/Fold.tsx"), /^"use client"|useState|onClick/m, "a native <details>: no script");
});

test("the region home in order: hero, the shelf, the sets, one ad block, the folds, the questions; nothing the owner cut", () => {
  const page = src("app/[region]/page.tsx");
  const order = ["<Hero>", "</Hero>", "<FeaturedAds", "<Tabs tabs={shelf}", 'title="Latest sets"', "<WeeklyDropsBox", "<InlineAds", "<Folds", "<RegionReport", "<RegionsCompared", "<SetIndex", "<HubSummaryText", "<HubFaqSection", "<CompareOtherTcgs", "<RecentlyViewed"];
  let at = -1;
  for (const k of order) {
    const i = page.indexOf(k, at + 1);
    assert.ok(i > at, `${k} comes next`);
    at = i;
  }
  const hero = page.slice(page.indexOf("<Hero>"), page.indexOf("</Hero>"));
  assert.doesNotMatch(hero, /ProductCard|ProductGrid|HeroCards|<img|PreorderBanner|HypeNow|CreatorsCornerBadge|EbayStrip|InlineAds/, "words, a search and ways in: no product and no ad in the hero");
  assert.match(hero, /<h1 className="hero-h1 hero-h1-long rise-solid">\s*Compare Pokémon booster box &amp; ETB prices in <span className="text-brand">\{r\.inName\}<\/span>/, "the same headline");
  assert.match(hero, /<SearchBox region=\{r\.region\} size="lg" \/>/);
  // What left the page (each still a page of its own, in the header's menus or the footer): the hype shelf, the creators badge, the
  // sale cards, the reviews row, the older-sets list, both eBay strips and the second and third product grids' own sections.
  assert.doesNotMatch(page, /HypeNow|CreatorsCornerBadge|HeroCards|HeroSparks|SiteReviews|olderInStockData|<EbayStrip|PreorderBanner|PremiumSlides/);
  for (const f of ["components/HypeNow.tsx", "components/HeroSparks.tsx", "components/SideNav.tsx", "components/creators/CreatorsCornerBadge.tsx", "components/home/HeroCards.tsx", "components/home/SoftHeroCards.tsx"])
    assert.ok(!existsSync(new URL(`../src/${f}`, import.meta.url)), `${f} is deleted, not hidden`);
  assert.equal((page.match(/<InlineAds/g) ?? []).length, 1, "one ad block");
  // What a crawler is told is the page's own business: untouched by the redesign.
  assert.match(page, /export async function generateMetadata/);
  assert.match(page, /const getOverview = cache\(/);
});

test("the region home as a crawler reads it: one h1, every shelf list and every fold in the HTML, valid JSON-LD, honest copy", async () => {
  for (const region of ["us", "au"] as const) {
    const html = await regionHome(region);
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, `${region}: one h1`);
    assert.match(html, /^<div><section class="hero">/);
    const hero = html.slice(0, html.indexOf("</section>"));
    assert.doesNotMatch(hero, new RegExp(`href="/${region}/p/|pc-link|data-ad`), `${region}: no product and no ad in the hero`);
    assert.match(hero, /role="search"/);
    for (const k of ["/type/booster-boxes", "/type/elite-trainer-boxes", "/type/booster-bundles", "/releases", "/deals", "/sets"]) assert.match(hero, new RegExp(`class="way flex-1" href="/${region}${k}"`), `${region}: ${k} is a way in`);
    // The shelf: at least the two product lines, all of their products in the HTML whichever tab is chosen.
    const tabs = [...html.matchAll(/role="tab"[^>]*>([^<]+)/g)].map((m) => m[1]);
    assert.deepEqual(tabs.slice(0, 2), ["Booster boxes", "Elite Trainer Boxes"], region);
    const panels = html.split('role="tabpanel"').slice(1);
    assert.equal(panels.length, tabs.length);
    for (const [i, p] of panels.entries()) {
      const until = p.indexOf('role="tabpanel"') > 0 ? p.indexOf('role="tabpanel"') : p.length;
      assert.ok((p.slice(0, until).match(new RegExp(`href="/${region}/p/`, "g")) ?? []).length >= 1, `${region}: the "${tabs[i]}" list is in the HTML`);
    }
    // The outline: the shelf, the sets, then the reading matter (folded) and the questions, by their own headings.
    const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => text(m[1]).trim());
    assert.deepEqual(h2.slice(0, 2), ["In stock today", "Latest sets"], region);
    assert.equal(h2.at(-1), "Questions about these prices");
    const folds = [...html.matchAll(/<details class="fold" data-fold="([^"]+)"/g)].map((m) => m[1]);
    for (const id of ["report-h", "regions-compared-h", "every-set-h", "today-h"]) assert.ok(folds.includes(id), `${region}: the ${id} fold`);
    assert.doesNotMatch(html, /<details class="fold"[^>]* open/, "folds start closed");
    assert.ok((html.match(/<details class="faq">/g) ?? []).length >= 2, `${region}: the questions open one by one`);
    // Every set page is still linked from the region home (inside the "every set" fold).
    assert.ok((html.match(new RegExp(`href="/${region}/sets/[a-z0-9-]+"`, "g")) ?? []).length >= 20, `${region}: the set index`);
    for (const r of ["au", "us", "uk", "ca", "nz", "eu", "sg"]) assert.match(html, new RegExp(`href="/${r}"`), `${region}: links ${r}`);
    const { docs, errors } = jsonLdBlocks(html);
    assert.deepEqual(errors, []);
    for (const d of docs) assert.deepEqual(validateJsonLd(d), []);
    const types = docs.flatMap((d) => (Array.isArray(d) ? d : [d])).map((d) => (d as { "@type"?: string })["@type"]);
    for (const t of ["BreadcrumbList", "FAQPage"]) assert.ok(types.includes(t), `${region}: ${t} JSON-LD`);
    assert.equal(findBannedCopy(text(html)), null, `${region}: "${findBannedCopy(text(html))}"`);
    // Ads: none in the server HTML (the one block is drawn in the browser into a box of its height), never in the hero or the header.
    assert.doesNotMatch(html, /data-ad="listings|ebay\.[a-z.]+\//i, `${region}: no eBay unit in the server HTML`);
  }
});

test("motion is CSS only: transforms and opacity, off for prefers-reduced-motion, and the headline is never hidden", () => {
  const motion = css.slice(css.indexOf("/* Motion."));
  assert.ok(motion.length > 0);
  // Everything that moves by itself sits inside the no-preference query (screen only: a printed page shows everything).
  const block = motion.slice(motion.indexOf("@media screen and (prefers-reduced-motion: no-preference)"), motion.indexOf("@keyframes rise "));
  for (const k of [".rise {", ".rise-solid {", ".hero-bg::before", ".reveal {"]) assert.ok(block.includes(k), `${k} only without a reduced-motion preference`);
  assert.doesNotMatch(css.replace(block, ""), /^\s*\.(rise|rise-solid|reveal) \{[^}]*animation:/m, "no entrance animation outside that query");
  // The headline moves 10px but keeps its opacity: the largest paint is not held back.
  assert.match(motion, /@keyframes rise-solid \{\s*from \{\s*transform: translateY\(10px\);\s*\}\s*\}/);
  // Scroll reveals only where the browser ties them to the scroll position itself; elsewhere the content is simply there.
  assert.match(motion, /@supports \(animation-timeline: view\(\)\) \{\s*\.reveal \{/);
  for (const k of ["rise", "rise-solid", "reveal", "drift-a", "drift-b"]) {
    const kf = new RegExp(`@keyframes ${k} \\{([\\s\\S]*?)\\n\\}`).exec(motion)?.[1] ?? "";
    assert.ok(kf.length > 0, k);
    assert.doesNotMatch(kf, /\b(width|height|margin|padding|top|left|right|bottom|font-size)\s*:/, `${k} moves nothing in the layout`);
  }
  assert.match(motion, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.tab-panel,[\s\S]*?animation: none;[\s\S]*?transition: none;[\s\S]*?transform: none;/);
  // No animation library, no scroll listener, no observer for looks.
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { dependencies?: Record<string, string> };
  for (const d of ["framer-motion", "motion", "gsap", "aos", "lottie-web", "animejs"]) assert.ok(!(d in (pkg.dependencies ?? {})), `${d} is not a dependency`);
  for (const f of ["components/home/Hero.tsx", "components/Fold.tsx", "components/Tabs.tsx", "components/home/SoftWaysIn.tsx"]) assert.doesNotMatch(src(f), /IntersectionObserver|addEventListener\("scroll"|requestAnimationFrame/, f);
});
