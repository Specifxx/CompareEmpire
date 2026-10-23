// Vercel Web Analytics drops what is not a visitor (src/lib/analytics-filter.ts, COST.md): Pro bills every event it sends.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isUncountedVisit } from "../src/lib/analytics-filter";

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

test("a real visitor on the live domain is counted", () => {
  assert.equal(isUncountedVisit("www.dexcompare.app", CHROME, false, false), false);
  assert.equal(isUncountedVisit("www.dexcompare.app", IPHONE, false, false), false);
});

test("previews, local runs, automation, bots and the owner's opt-out are not", () => {
  for (const host of ["localhost", "127.0.0.1", "dexcompare-git-x-team.vercel.app", "DEXCOMPARE.VERCEL.APP"]) {
    assert.equal(isUncountedVisit(host, CHROME, false, false), true, host);
  }
  assert.equal(isUncountedVisit("www.dexcompare.app", CHROME, true, false), true, "navigator.webdriver");
  assert.equal(isUncountedVisit("www.dexcompare.app", CHROME, false, true), true, "va-disable opt-out");
  for (const ua of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/129.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 Chrome-Lighthouse",
    "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
  ]) {
    assert.equal(isUncountedVisit("www.dexcompare.app", ua, false, false), true, ua);
  }
});

test("Analytics is mounted once, in the root layout, with the filter; Speed Insights is gone", () => {
  const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  const files = walk(join(root, "src")).filter((f) => /\.tsx?$/.test(f));
  const mounts = files.filter((f) => /<Analytics\b/.test(readFileSync(f, "utf8")));
  assert.deepEqual(mounts.map((f) => f.slice(root.length + 1)), ["src/components/SiteAnalytics.tsx"]);
  assert.match(readFileSync(mounts[0], "utf8"), /<Analytics beforeSend=\{beforeSend\}/);
  const users = files.filter((f) => /<SiteAnalytics\b/.test(readFileSync(f, "utf8")));
  assert.deepEqual(users.map((f) => f.slice(root.length + 1)), ["src/app/layout.tsx"]);
  for (const f of files) assert.doesNotMatch(readFileSync(f, "utf8"), /speed-insights|SpeedInsights/, f);
  assert.doesNotMatch(readFileSync(join(root, "package.json"), "utf8"), /speed-insights/);
});
