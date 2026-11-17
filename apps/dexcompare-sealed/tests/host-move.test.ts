// The move to dexcompare.io (2026-11-17, owner; DECISIONS.md "Moving to dexcompare.io"): every page of an old host 301s to the
// same path on dexcompare.io in one hop, /api/* stays put on the old hosts (eBay's deletion endpoint is registered there), and
// the two lists of old hosts (next.config.js, src/lib/site.ts) agree.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { CANONICAL_HOST, OLD_HOSTS, SITE_URL } from "../src/lib/site";

const require = createRequire(import.meta.url);
const config = require("../next.config.js");

type Rule = { source: string; destination: string; permanent: boolean; has?: { type: string; value: string }[] };

/** The destination a host + path gets from the first matching host rule (Next's matcher is path-to-regexp; this mirrors it). */
function hostRedirect(rules: Rule[], host: string, path: string): string | null {
  for (const r of rules) {
    if (!r.has?.some((h) => h.type === "host" && h.value === host)) continue;
    if (r.source === "/") {
      if (path === "/") return r.destination;
      continue;
    }
    const m = /^\/:path\((.+)\)$/.exec(r.source);
    assert.ok(m, `unexpected host rule source ${r.source}`);
    const re = new RegExp(`^/(${m![1]})$`);
    const hit = re.exec(path);
    if (hit) return r.destination.replace(":path", hit[1]);
  }
  return null;
}

test("dexcompare.io is the canonical host", () => {
  assert.equal(CANONICAL_HOST, "dexcompare.io");
  if (!process.env.NEXT_PUBLIC_SITE_URL) assert.equal(SITE_URL, "https://dexcompare.io");
  assert.ok(!(OLD_HOSTS as readonly string[]).includes(CANONICAL_HOST));
});

test("every old host 301s every page to the same path on dexcompare.io, in one hop, /api excepted", async () => {
  const rules: Rule[] = (await config.redirects()).filter((r: Rule) => r.has);
  const hosts = [...new Set(rules.flatMap((r) => r.has!.map((h) => h.value)))].sort();
  assert.deepEqual(hosts, [...OLD_HOSTS].sort(), "next.config.js and src/lib/site.ts list the same old hosts");
  for (const r of rules) {
    assert.equal(r.permanent, true);
    assert.ok(r.destination.startsWith("https://dexcompare.io/"), r.destination);
  }
  for (const host of OLD_HOSTS) {
    assert.equal(hostRedirect(rules, host, "/"), "https://dexcompare.io/");
    assert.equal(hostRedirect(rules, host, "/us/p/delta-reign-booster-box"), "https://dexcompare.io/us/p/delta-reign-booster-box");
    assert.equal(hostRedirect(rules, host, "/sitemap.xml"), "https://dexcompare.io/sitemap.xml");
    assert.equal(hostRedirect(rules, host, "/sealed"), "https://dexcompare.io/sealed", "an old path keeps its own rule on the new host");
    assert.equal(hostRedirect(rules, host, "/api/ebay/marketplace-deletion"), null, "the eBay endpoint is not redirected");
    assert.equal(hostRedirect(rules, host, "/api/browse/us"), null);
  }
  assert.equal(hostRedirect(rules, "dexcompare.io", "/us"), null, "the canonical host never redirects to itself");
});
