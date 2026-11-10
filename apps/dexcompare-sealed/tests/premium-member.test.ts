// DexCompare Premium (2026-11-10): a RiftCompare Premium account works here; this site stores nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { codeFromHash, PREMIUM_SERVICE, PREMIUM_SIGN_IN, tokenFromHash, untilLine } from "../src/lib/premium-member";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");

test("the token is taken from a fragment, and only a three-part token", () => {
  const t = "aaa.bbb_-1.ccc-_2";
  assert.equal(tokenFromHash(`#t=${t}`), t);
  assert.equal(tokenFromHash(`t=${t}`), t);
  assert.equal(tokenFromHash(`#x=1&t=${t}`), t);
  for (const bad of ["", "#", "#t=", "#t=abc", "#t=a.b", "#t=<script>.a.b", "#token=a.b.c"]) assert.equal(tokenFromHash(bad), null, bad);
});

test("an emailed link's code is taken from a fragment, and only a three-part code", () => {
  const c = "aaa.bbb_-1.ccc-_2";
  assert.equal(codeFromHash(`#c=${c}`), c);
  for (const bad of ["", "#c=", "#c=a.b", "#t=a.b.c", "#c=<x>.a.b"]) assert.equal(codeFromHash(bad), null, bad);
});

test("sign-in happens on DexCompare (owner, 2026-11-10): no link sends the visitor to RiftCompare to sign in or pay", () => {
  assert.equal(PREMIUM_SERVICE, "https://riftcompare.com");
  assert.equal(PREMIUM_SIGN_IN, "/account");
  for (const f of ["src/components/premium/PremiumPanel.tsx", "src/components/premium/SignIn.tsx", "src/components/premium/WatchesView.tsx", "src/components/premium/RestockAlert.tsx", "src/components/premium/PremiumCorner.tsx", "src/components/premium/PremiumSlides.tsx"]) {
    assert.doesNotMatch(read(f), /href=["{`][^"}`]*riftcompare\.com/, f);
  }
  assert.match(read("src/app/(site)/account/page.tsx"), /index: false/);
  assert.match(read("src/app/(site)/account/verify/page.tsx"), /index: false/);
  const lib = read("src/lib/premium-member.ts");
  assert.doesNotMatch(lib, /[?&](?:t|token)=\$\{/);
  assert.match(lib, /credentials: "omit"/);
});

test("the until line is a date or nothing", () => {
  assert.equal(untilLine(null), "");
  assert.equal(untilLine("garbage"), "");
  assert.match(untilLine("2026-12-01T00:00:00Z"), /Dec 2026/);
});

test("the private pages are noindex and no premium page reads a cookie, header or the session", () => {
  assert.match(read("src/app/(site)/watches/page.tsx"), /index: false/);
  assert.match(read("src/app/(site)/premium/return/page.tsx"), /index: false/);
  for (const f of ["src/app/(site)/premium/page.tsx", "src/app/(site)/watches/page.tsx", "src/app/(site)/premium/return/page.tsx", "src/components/premium/RestockAlert.tsx", "src/lib/premium-member.ts"]) {
    assert.doesNotMatch(read(f), /cookies\(|headers\(|getServerSession|searchParams/, f);
  }
});

test("the restock prompt shows only on a product with no in-stock price in the region", () => {
  const p = read("src/app/[region]/p/[slug]/page.tsx");
  assert.match(p, /here\?\.lowestPriceCents == null && <RestockAlert/);
});

test("the premium page keeps free alerts free and says what Premium does not do", () => {
  const s = read("src/app/(site)/premium/page.tsx");
  assert.match(s, /price alerts and the weekly biggest-drops email/);
  assert.match(s, /does not remove ads/);
});
