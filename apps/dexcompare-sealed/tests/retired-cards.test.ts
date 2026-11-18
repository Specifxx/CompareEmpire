import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { retiredCardResponse } from "../src/lib/retired-cards";

test("an old single-card URL answers 410 Gone, noindex, with a way on", async () => {
  const r = retiredCardResponse();
  assert.equal(r.status, 410);
  assert.equal(r.headers.get("x-robots-tag"), "noindex");
  assert.match(r.headers.get("vercel-cdn-cache-control") ?? "", /s-maxage=86400/);
  const html = await r.text();
  assert.match(html, /<a href="\/">/);
  assert.doesNotMatch(html, /dexcompare\.app/);
});

test("HEAD answers 410 with no body", async () => {
  const r = retiredCardResponse("HEAD");
  assert.equal(r.status, 410);
  assert.equal(await r.text(), "");
});

test("the route serves only /card, is edge and reads no data", () => {
  const src = readFileSync(new URL("../src/app/card/[[...slug]]/route.ts", import.meta.url), "utf8");
  assert.match(src, /runtime = "edge"/);
  assert.doesNotMatch(src, /revalidate|generateStaticParams|@\/lib\/(data|db)/);
  const cfg = readFileSync(new URL("../next.config.js", import.meta.url), "utf8");
  assert.doesNotMatch(cfg, /source: "\/card\//, "no redirect rule may shadow the 410");
});
