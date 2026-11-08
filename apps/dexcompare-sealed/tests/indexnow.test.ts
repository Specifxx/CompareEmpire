import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_INDEXNOW_KEY, indexNowKey, isIndexNowKey, sitemapUrls, submissionPlan } from "../src/lib/indexnow";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("the key: IndexNow's format, INDEXNOW_KEY overrides the default, a malformed one never ships", () => {
  assert.ok(isIndexNowKey(DEFAULT_INDEXNOW_KEY));
  assert.equal(indexNowKey({}), DEFAULT_INDEXNOW_KEY);
  assert.equal(indexNowKey({ INDEXNOW_KEY: " 0123456789abcdef " }), "0123456789abcdef");
  assert.equal(indexNowKey({ INDEXNOW_KEY: "has spaces in it" }), DEFAULT_INDEXNOW_KEY);
  assert.equal(indexNowKey({ INDEXNOW_KEY: "short" }), DEFAULT_INDEXNOW_KEY);
  assert.equal(isIndexNowKey("<!DOCTYPE html>"), false, "a 404 page is not a key");
});

test("the sitemap index is followed to its pages, never submitting the child sitemaps themselves", async () => {
  const fx: Record<string, string> = {
    "https://dexcompare.app/sitemap.xml":
      '<sitemapindex><sitemap><loc>https://dexcompare.app/sitemap/0.xml</loc></sitemap><sitemap><loc>https://dexcompare.app/sitemap/1.xml</loc></sitemap></sitemapindex>',
    "https://dexcompare.app/sitemap/0.xml": "<urlset><url><loc>https://dexcompare.app</loc></url><url><loc>https://dexcompare.app/au</loc></url></urlset>",
    "https://dexcompare.app/sitemap/1.xml":
      "<urlset><url><loc>https://dexcompare.app/au/p/delta-reign-booster-box</loc></url><url><loc>https://dexcompare.app/au?a=1&amp;b=2</loc></url><url><loc>https://dexcompare.app/au</loc></url></urlset>",
  };
  const urls = await sitemapUrls("https://dexcompare.app/sitemap.xml", async (u) => fx[u] ?? "", 0);
  assert.deepEqual(urls, ["https://dexcompare.app", "https://dexcompare.app/au", "https://dexcompare.app/au/p/delta-reign-booster-box", "https://dexcompare.app/au?a=1&b=2"]);
  assert.ok(!urls.some((u) => u.endsWith(".xml")));
  assert.deepEqual(await sitemapUrls("https://x.test/s.xml", async () => "<urlset><url><loc>https://x.test/a</loc></url></urlset>", 0), ["https://x.test/a"], "a plain urlset");
});

test("the request names the host of the sitemap's own URLs (www), never the apex the old workflow named", () => {
  const plan = submissionPlan(["https://dexcompare.app", "https://dexcompare.app/au/sealed", "https://www.dexcompare.app/old"]);
  assert.ok(plan);
  assert.equal(plan.host, "dexcompare.app");
  assert.equal(plan.keyLocation, "https://dexcompare.app/indexnow.txt");
  assert.deepEqual(plan.urls, ["https://dexcompare.app", "https://dexcompare.app/au/sealed"]);
  assert.equal(plan.dropped, 1, "a URL on another host would make IndexNow refuse the batch (422): it is left out");
  assert.equal(submissionPlan([]), null);
});

test("the job fails loudly: a refused batch, no key file, an empty sitemap; daily after the evening import", () => {
  const s = read("scripts/indexnow-submit.ts");
  assert.match(s, /host: plan\.host, key, keyLocation: plan\.keyLocation/);
  assert.match(s, /if \(sent < pick\.length\) \{[\s\S]*?process\.exitCode = 1/);
  assert.match(s, /does not serve a key[\s\S]*?process\.exitCode = 1/);
  assert.match(s, /listed no page URLs[\s\S]*?process\.exitCode = 1/);
  assert.match(s, /SiteVerificationNotCompleted/, "a new host's first answer is retried, not a failure on the spot");
  const wf = readFileSync(new URL("../../../.github/workflows/indexnow-submit.yml", import.meta.url), "utf8");
  assert.match(wf, /cron: "37 22 \* \* \*"/, "after the 20:47 UTC import");
  assert.match(wf, /working-directory: apps\/dexcompare-sealed/);
  assert.doesNotMatch(wf, /HOST = "dexcompare\.app"/, "the apex host is gone");
});

test("the key file route reads no data and is built once per deploy", () => {
  const route = read("src/app/indexnow.txt/route.ts");
  assert.match(route, /export const dynamic = "force-static"/);
  assert.match(route, /indexNowKey\(\)/);
  assert.doesNotMatch(route, /@\/lib\/(db|data)/);
});

test("IndexNow sends small batches: new URLs first, then each about weekly, never the whole sitemap (Bing, 2026-11-08)", async () => {
  const { INDEXNOW_BATCH, INDEXNOW_RUN_MAX, nextState, pickUrls } = await import("../src/lib/indexnow");
  assert.ok(INDEXNOW_BATCH <= 100 && INDEXNOW_RUN_MAX <= 500);
  const urls = ["a", "b", "c", "d"].map((x) => `https://dexcompare.app/${x}`);
  const [a, b, c, d] = urls;
  assert.deepEqual(pickUrls(urls, {}, "2026-11-08", 2), [a, b], "nothing sent yet: sitemap order, capped");
  const sent = { [a!]: "2026-11-08", [b!]: "2026-10-20", [c!]: "2026-10-30", "https://dexcompare.app/gone": "2026-10-01" };
  assert.deepEqual(pickUrls(urls, sent, "2026-11-08"), [d, b, c], "new first, then the longest-unsent; today's never again");
  assert.deepEqual(pickUrls(urls, { [a!]: "2026-11-05", [b!]: "2026-11-05", [c!]: "2026-11-05", [d!]: "2026-11-05" }, "2026-11-08"), [], "all sent this week");
  const next = nextState(urls, sent, [d!], "2026-11-08");
  assert.equal(next[d!], "2026-11-08");
  assert.equal(next["https://dexcompare.app/gone"], undefined, "URLs no longer in the sitemap are forgotten");
  const script = readFileSync(new URL("../scripts/indexnow-submit.ts", import.meta.url), "utf8");
  assert.match(script, /pickUrls\(plan\.urls, state, today\)/);
  assert.doesNotMatch(script, /plan\.urls\.slice\(i/, "never the whole sitemap");
});
