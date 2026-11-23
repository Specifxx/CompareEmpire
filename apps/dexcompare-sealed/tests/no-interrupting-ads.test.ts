// Owner, 2026-11-23 UX review, P0 1: ads never fire during typing or cover content, and at most once a session.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAX_POPUPS, popupDue } from "../src/lib/ad-heavy";
import { QUIET_MS } from "../src/lib/visitor-busy";

test("the heavy pop-up opens at most once a visit and never on the landing page", () => {
  assert.equal(MAX_POPUPS, 1);
  assert.equal(popupDue(1, 0), false);
  assert.equal(popupDue(2, 0), true);
  assert.equal(popupDue(3, 0), true, "a page skipped because the visitor was typing can try again later");
  assert.equal(popupDue(5, 1), false);
});

test("no floating slide-in ad card exists any more", () => {
  const src = readFileSync("src/components/heavy/HeavyAds.tsx", "utf8");
  assert.doesNotMatch(src, /data-heavy-slide|heavy-slidein/);
});

test("every self-opening ad or prompt asks visitorBusy() before it opens", () => {
  assert.ok(QUIET_MS >= 3000);
  for (const f of ["src/components/heavy/HeavyAds.tsx", "src/components/account/SignInCorner.tsx", "src/components/site-reviews/RateCard.tsx"]) {
    assert.match(readFileSync(f, "utf8"), /visitorBusy\(\)/, f);
  }
  assert.match(readFileSync("src/components/heavy/HeavyAds.tsx", "utf8"), /claimPromptSlot\("heavy-popup"\)/, "the pop-up takes the visit's one prompt slot");
});
