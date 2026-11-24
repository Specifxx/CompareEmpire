// Google AdSense (src/lib/adsense.ts): on with the owner's publisher ID unless NEXT_PUBLIC_ADSENSE_CLIENT says otherwise ("off" switches
// it off), a publisher ID in either form, and ads.txt's line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ADSENSE_CLIENT, ADSENSE_GUIDE_SLOT, DEFAULT_ADSENSE_CLIENT, GUIDE_AD_TEST_START, adsTxt, normaliseClient, parseAdUnit, resolveClient } from "../src/lib/adsense";
import { gadArmOf, guideAdArm } from "../src/components/GuideAd";
import { wrapWords } from "../src/lib/og-card";

test("AdSense is on with the owner's publisher ID by default; the variable overrides it, and \"off\" switches it off", () => {
  assert.equal(DEFAULT_ADSENSE_CLIENT, "ca-pub-6842128782879909");
  assert.equal(ADSENSE_CLIENT, DEFAULT_ADSENSE_CLIENT);
  assert.equal(ADSENSE_GUIDE_SLOT, null, "the guide unit still needs its own slot ID");
  assert.equal(resolveClient(undefined), DEFAULT_ADSENSE_CLIENT);
  assert.equal(resolveClient("pub-1234567890123456"), "ca-pub-1234567890123456");
  assert.equal(resolveClient("off"), null);
  assert.equal(adsTxt(null), null);
  assert.equal(adsTxt(ADSENSE_CLIENT), "google.com, pub-6842128782879909, DIRECT, f08c47fec0942fa0\n");
});

test("the google-adsense-account meta carries the publisher ID in every page's head", () => {
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /<meta name="google-adsense-account" content=\{ADSENSE_CLIENT\} \/>/);
});

test("a publisher ID is accepted as pub-… or ca-pub-…, and anything else is refused", () => {
  assert.equal(normaliseClient("pub-1234567890123456"), "ca-pub-1234567890123456");
  assert.equal(normaliseClient(" ca-pub-1234567890123456 "), "ca-pub-1234567890123456");
  for (const bad of [undefined, "", "ca-pub-", "pub-12ab", "UA-123456-1", "ca-pub-1234567890123456; evil"]) assert.equal(normaliseClient(bad), null, String(bad));
});

test("ads.txt is Google's line for the publisher", () => {
  assert.equal(adsTxt("ca-pub-1234567890123456"), "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
});

test("the AdSense script never loads from the layout, and the guide unit has no slot until its variable is set", () => {
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(layout, /adsenseScriptSrc|googlesyndication/);
  assert.equal(ADSENSE_GUIDE_SLOT, null);
  assert.equal(parseAdUnit("8906204952"), "8906204952");
  for (const bad of [undefined, "", "abc", "12", "ca-pub-1234567890123456"]) assert.equal(parseAdUnit(bad), null, String(bad));
  const kit = readFileSync(new URL("../src/content/guides/kit.tsx", import.meta.url), "utf8");
  assert.match(kit, /ADSENSE_CLIENT && ADSENSE_GUIDE_SLOT \? adsenseIndex/);
  assert.match(kit, /<GuideAd client=/);
});

test("the guides ad test: half of visitors, guides only, never before 2 Dec, never for a member, script loaded by the unit", () => {
  assert.equal(GUIDE_AD_TEST_START, Date.UTC(2026, 11, 2));
  const c = readFileSync(new URL("../src/components/GuideAd.tsx", import.meta.url), "utf8");
  assert.match(c, /now < GUIDE_AD_TEST_START\) return null/);
  assert.match(c, /hasAttribute\("data-adfree"\)\) return null/);
  assert.match(c, /< 128 \? "ad" : "none"/);
  assert.match(c, /track\(name, \{ arm \}\)/);
  assert.match(c, /arm === "ad" \? <AdSenseUnit/);
  assert.equal(gadArmOf("ad"), "ad");
  assert.equal(gadArmOf("x"), null);
  assert.equal(guideAdArm(), null, "no window: never in the test");
});

test("share-card headlines wrap on words", () => {
  assert.deepEqual(wrapWords("The cheapest way to buy Pokémon packs", 20), ["The cheapest way to", "buy Pokémon packs"]);
});
