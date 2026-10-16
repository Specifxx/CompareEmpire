import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findBannedCopy } from "../src/lib/copy-rules";
import { money } from "../src/lib/format";
import { titleText } from "../src/lib/hub-copy";
import { packsFor, perPackCents } from "../src/lib/packs";
import { glanceFacts, msrpPerPack, msrpValueSentence, preorderDescription, preorderFaqs, preorderTitle } from "../src/lib/preorder-copy";
import { guideShowsMsrp, openPreorderGuides, preorderGuide, preorderGuideBySlug, preorderPath, PREORDER_GUIDES } from "../src/lib/preorder-guides";
import { formatRelease, isPreorderSet } from "../src/lib/release";
import { REGION_LIST, REGIONS } from "../src/lib/regions";
import { usMsrpCents } from "../src/lib/rrp";
import { TYPE_BY_KEY } from "../src/lib/sealed-title";
import { SET_BY_CODE } from "../src/lib/sets";
import { SITE_URL } from "../src/lib/site";
import { staticSitemap } from "../src/lib/sitemap";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("every pre-order guide is for a known set, with known product types, sourced and dated", () => {
  assert.ok(PREORDER_GUIDES.length > 0);
  for (const g of PREORDER_GUIDES) {
    const set = SET_BY_CODE.get(g.setCode);
    assert.ok(set, `${g.setCode} is in lib/sets.ts`);
    for (const p of g.products) assert.ok(TYPE_BY_KEY.has(p.type), `${g.setCode}: ${p.type} is a product type`);
    assert.equal(new Set(g.products.map((p) => p.type)).size, g.products.length, "one entry per type");
    assert.ok(g.sources.length > 0 && g.sources.every((s) => s.url.startsWith("https://")), "sourced");
    assert.match(g.checked, /^\d{4}-\d{2}-\d{2}$/);
    for (const d of [g.prereleaseFrom, g.liveDate]) if (d) assert.ok(d < set!.releaseDate, "dates before release day");
  }
});

test("Delta Reign: the dates The Pokémon Company announced", () => {
  const g = preorderGuide("me6");
  assert.ok(g);
  assert.equal(SET_BY_CODE.get("me6")?.releaseDate, "2026-11-06");
  assert.equal(g.prereleaseFrom, "2026-10-24");
  assert.equal(g.liveDate, "2026-11-05");
  assert.deepEqual(preorderGuideBySlug("delta-reign")?.set.code, "me6");
  assert.equal(preorderGuideBySlug("chaos-rising"), null, "no guide, no page");
  assert.equal(preorderGuideBySlug("no-such-set"), null);
  assert.equal(preorderPath("au", "me6"), "/au/preorders/delta-reign");
  assert.equal(preorderPath("au", "me4"), null);
  // The Build & Battle Box's list price is disputed (announcement vs lib/rrp.ts): not printed.
  assert.equal(guideShowsMsrp(g, "build-battle"), false);
  assert.equal(guideShowsMsrp(g, "booster-box"), true);
});

test("pre-order pages retire themselves on release day", () => {
  assert.deepEqual(
    openPreorderGuides("2026-10-14").map((x) => x.set.code),
    ["me6"],
  );
  assert.deepEqual(openPreorderGuides("2026-11-06"), [], "release day: no longer a pre-order");
  assert.equal(isPreorderSet("me6", new Date("2026-11-05T23:59:00Z")), true);
  assert.equal(isPreorderSet("me6", new Date("2026-11-06T00:00:00Z")), false);

  const before = new Set(staticSitemap({}, undefined, "2026-10-14").map((e) => e.url));
  for (const r of REGION_LIST) assert.ok(before.has(`${SITE_URL}/${r.region}/preorders/delta-reign`), r.region);
  const after = staticSitemap({}, undefined, "2026-11-06").map((e) => e.url);
  assert.ok(!after.some((u) => u.includes("/preorders/")), "out of the sitemap once released");
});

test("the pre-order page says PreOrder, never InStock, and uses its own placement", () => {
  const page = src("src/app/[region]/preorders/[set]/page.tsx");
  assert.match(page, /schema\.org\/PreOrder/);
  assert.doesNotMatch(page, /schema\.org\/InStock/);
  assert.match(page, /placement="preorders"/);
  assert.match(page, /regionOrNotFound\(params\.region\)/);
  assert.match(page, /export const revalidate = 86400/);
  assert.match(page, /noindex: !pre/);
});

test("set page, release calendar and region home link the pre-order page", () => {
  assert.match(src("src/app/[region]/sets/[set]/page.tsx"), /preorderPath\(r\.region, s\.code\)/);
  assert.match(src("src/app/[region]/releases/page.tsx"), /preorderPath\(r\.region, s\.code\)/);
  assert.match(src("src/app/[region]/page.tsx"), /openPreorderGuides\(\)/);
});

// ─── The release-date content merged into the page (the growth pack's "Delta Reign release date" piece, 2026-10-16) ─────

const DR = preorderGuide("me6")!;
const DR_SET = SET_BY_CODE.get("me6")!;

test("Delta Reign: the set's make-up, the new card type, the prerelease and the notes are each attributed; nothing unconfirmed is printed", () => {
  assert.ok(DR.makeup.length >= 5);
  assert.match(DR.makeupSource, /PokéGuardian.*20 August 2026/);
  assert.ok(DR.makeup.some((m) => m.startsWith("4 Mega Evolution Pokémon ex")), "the four Mega ex");
  for (const h of DR.headliners) assert.ok(DR.makeup.join(" ").includes(h), h);
  assert.equal(DR.newFeature?.name, "Legendary Stadiums");
  assert.match(DR.newFeature!.source, /\d{4}/);
  assert.deepEqual(DR.prerelease?.promos, ["Masquerain", "Magmortar", "Enamorus", "Kommo-o"]);
  assert.match(DR.prerelease!.source, /ICv2, 1 October 2026/);
  for (const n of DR.notes) assert.match(n.source, /\d{4}$/, `${n.text}: dated`);
  const bb = DR.products.find((p) => p.type === "build-battle")!;
  assert.match(bb.contents, new RegExp(`^${packsFor("build-battle", "me6")} Delta Reign booster packs, a 40-card ready-to-play deck`), "pack count is packs.ts's");
  assert.ok(DR.sources.some((x) => x.url.startsWith("https://icv2.com/")), "ICv2 cited");
  assert.ok(DR.sources.some((x) => x.url.startsWith("https://press.pokemon.com/")), "TPCi's press site cited");
  assert.equal(DR.checked, "2026-10-16");
  const all = JSON.stringify(DR);
  assert.doesNotMatch(all, /\[VERIFY|\[live price|secret rare|18-pack|\$\d/i, "no unconfirmed claims and no typed prices");
});

test("Delta Reign page title and description: the pre-order prices AND the release date, in every region", () => {
  for (const r of REGION_LIST) {
    const t = titleText(preorderTitle(DR_SET, r, true));
    assert.match(t, /^Delta Reign pre-orders in /);
    assert.ok(t.includes(r.inName), `${r.region}: ${t}`);
    assert.match(t, /prices & release date$/);
    assert.ok(t.length <= 65, `${r.region}: ${t.length}`);
    const d = preorderDescription(DR_SET, DR, r, true);
    assert.ok(d.length <= 160, `${r.region}: description is ${d.length} characters`);
    assert.ok(d.includes(formatRelease(DR_SET.releaseDate)), d);
    assert.match(d, /prerelease from 24 October/);
    assert.ok(d.includes(r.currency) && d.includes(r.adjective), d);
    assert.equal(findBannedCopy(`${t} ${d}`), null);
  }
  assert.doesNotMatch(titleText(preorderTitle(DR_SET, REGIONS.au, false)), /pre-order/, "released: no pre-order title");
  assert.match(preorderDescription(DR_SET, DR, REGIONS.au, false), /released on 6 November 2026/);
});

test("the release date at a glance: release, prerelease, TCG Live and the set's size, from the guide and sets.ts", () => {
  const f = glanceFacts(DR_SET, DR);
  assert.deepEqual(
    f.map((x) => [x.key, x.iso ?? x.value]),
    [
      ["release", "2026-11-06"],
      ["prerelease", "2026-10-24"],
      ["live", "2026-11-05"],
      ["cards", "Over 135 cards"],
    ],
  );
  assert.match(f[1].note!, /Build & Battle Boxes, at participating Play! Pokémon stores/);
});

test("US per-pack list prices are rrp.ts ÷ packs.ts, US only, and never the Build & Battle Box's (disputed) or the Pokémon Center ETB's", () => {
  assert.deepEqual(msrpPerPack(DR_SET, DR, REGIONS.au), []);
  const rows = msrpPerPack(DR_SET, DR, REGIONS.us);
  assert.deepEqual(
    rows.map((x) => x.type),
    ["booster-box", "booster-bundle", "etb"],
  );
  for (const row of rows) {
    assert.equal(row.cents, usMsrpCents(row.type, "me6"));
    assert.equal(row.perPack, perPackCents(usMsrpCents(row.type, "me6"), packsFor(row.type, "me6")));
  }
  const sentence = msrpValueSentence(rows)!;
  const box = rows.find((x) => x.type === "booster-box")!;
  const etb = rows.find((x) => x.type === "etb")!;
  assert.ok(sentence.startsWith(`At US MSRP a pack costs ${money(box.perPack, "US")} in the booster box`), sentence);
  assert.ok(sentence.includes(`${money(etb.perPack, "US")} in the Elite Trainer Box`), sentence);
  assert.equal(msrpValueSentence([]), null);
});

test("the FAQ: the release date first, the prerelease kit, live cheapest pre-orders in the region's currency, US MSRP in the US only", () => {
  const cheapest = { "booster-box": 33500, etb: 16999 };
  for (const r of REGION_LIST) {
    const faqs = preorderFaqs(DR_SET, DR, r, cheapest, true);
    assert.match(faqs[0].q, /release date\?$/);
    assert.ok(faqs[0].a.startsWith(`Delta Reign releases on ${formatRelease("2026-11-06")} in English`), faqs[0].a);
    assert.match(faqs[0].a, /24 October 2026/);
    assert.match(faqs[0].a, /5 November 2026/);
    const pre = faqs.find((f) => /prerelease/.test(f.q))!;
    assert.match(pre.a, /a 40-card ready-to-play deck/);
    assert.match(pre.a, /Masquerain, Magmortar, Enamorus and Kommo-o \(ICv2, 1 October 2026\)/);
    const box = faqs.find((f) => /booster box cost/.test(f.q))!;
    assert.ok(box.a.includes(money(33500, r.market)), `${r.region}: live box price in ${r.currency}`);
    const etbQ = faqs.find((f) => /How much is the Delta Reign Elite Trainer Box/.test(f.q))!;
    assert.ok(etbQ.a.includes(money(16999, r.market)));
    const text = faqs.map((f) => `${f.q} ${f.a}`).join(" ");
    assert.equal(findBannedCopy(text), null, r.region);
    assert.ok(!text.includes(money(usMsrpCents("build-battle", "me6"), "US")), "the Build & Battle Box's MSRP is never printed");
    assert.doesNotMatch(text, /\$21\.99/);
    if (r.market === "US") {
      assert.ok(etbQ.a.includes(`US MSRP is ${money(usMsrpCents("etb", "me6"), "US")}`));
      assert.ok(box.a.includes(money(usMsrpCents("booster-box", "me6"), "US")));
    } else {
      assert.doesNotMatch(text, /MSRP|US list price/, `${r.region}: no US list price outside the US`);
      assert.match(etbQ.a, /publishes no list price outside the US/);
    }
    assert.equal(new Set(faqs.map((f) => f.q)).size, faqs.length, "unique questions");
  }
  // Nothing open: said plainly, never a made-up price.
  const none = preorderFaqs(DR_SET, DR, REGIONS.nz, {}, true).find((f) => /booster box cost/.test(f.q))!;
  assert.match(none.a, /No New Zealand store we track has the booster box open for pre-order right now/);
  // Released: past tense, and no live pre-order line.
  const after = preorderFaqs(DR_SET, DR, REGIONS.au, cheapest, false);
  assert.ok(after[0].a.startsWith("Delta Reign released on 6 November 2026"));
  assert.ok(!after.some((f) => f.a.includes("right now.")), "no pre-order prices once released");
});

test("the page renders the merged content: the release-date box, the set's make-up and the FAQ from preorder-copy.ts", () => {
  const page = src("src/app/[region]/preorders/[set]/page.tsx");
  assert.match(page, /<ReleaseGlance /);
  assert.match(page, /preorderFaqs\(set, guide, r, cheapest, pre\)/);
  assert.match(page, /preorderTitle\(set, r, pre\)/);
  assert.match(page, /guide\.makeup\.map/);
  assert.match(page, /"@type": "FAQPage"/);
});
