// Google AdSense (src/lib/adsense.ts): off until NEXT_PUBLIC_ADSENSE_CLIENT is set, a publisher ID in either form, and ads.txt's line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ADSENSE_CLIENT, ADSENSE_GUIDE_SLOT, adsTxt, normaliseClient } from "../src/lib/adsense";
import { wrapWords } from "../src/lib/og-card";

test("AdSense is off without NEXT_PUBLIC_ADSENSE_CLIENT: no client, no slot, no ads.txt", () => {
  assert.equal(ADSENSE_CLIENT, null);
  assert.equal(ADSENSE_GUIDE_SLOT, null);
  assert.equal(adsTxt(null), null);
});

test("a publisher ID is accepted as pub-… or ca-pub-…, and anything else is refused", () => {
  assert.equal(normaliseClient("pub-1234567890123456"), "ca-pub-1234567890123456");
  assert.equal(normaliseClient(" ca-pub-1234567890123456 "), "ca-pub-1234567890123456");
  for (const bad of [undefined, "", "ca-pub-", "pub-12ab", "UA-123456-1", "ca-pub-1234567890123456; evil"]) assert.equal(normaliseClient(bad), null, String(bad));
});

test("ads.txt is Google's line for the publisher", () => {
  assert.equal(adsTxt("ca-pub-1234567890123456"), "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
});

test("the script and the guide unit load only behind ADSENSE_CLIENT", () => {
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /\{ADSENSE_CLIENT && \(/);
  const kit = readFileSync(new URL("../src/content/guides/kit.tsx", import.meta.url), "utf8");
  assert.match(kit, /ADSENSE_CLIENT && ADSENSE_GUIDE_SLOT \? adsenseIndex/);
});

test("share-card headlines wrap on words", () => {
  assert.deepEqual(wrapWords("The cheapest way to buy Pokémon packs", 20), ["The cheapest way to", "buy Pokémon packs"]);
});
