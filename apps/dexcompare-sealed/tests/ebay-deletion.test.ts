import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// eBay's Marketplace Account Deletion endpoint for DexCompare's keyset must answer at the URL registered on
// eBay's developer page (DECISIONS.md, 2026-11-07). The sealed port once dropped it and eBay's checks failed.
test("marketplace-deletion answers eBay's challenge and acknowledges notices", async () => {
  process.env.EBAY_VERIFICATION_TOKEN = "t".repeat(40);
  delete process.env.EBAY_DELETION_ENDPOINT;
  const route = await import("../src/app/api/ebay/marketplace-deletion/route");
  const res = route.GET(new Request("https://dexcompare.app/api/ebay/marketplace-deletion?challenge_code=abc"));
  assert.equal(res.status, 200);
  const want = createHash("sha256")
    .update("abc" + "t".repeat(40) + "https://dexcompare.app/api/ebay/marketplace-deletion")
    .digest("hex");
  assert.deepEqual(await res.json(), { challengeResponse: want });
  const post = await route.POST(new Request("https://dexcompare.app/api/ebay/marketplace-deletion", { method: "POST", body: "{}" }));
  assert.equal(post.status, 200);
  const bad = route.GET(new Request("https://dexcompare.app/api/ebay/marketplace-deletion"));
  assert.equal(bad.status, 400);
});
