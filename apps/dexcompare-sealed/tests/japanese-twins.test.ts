import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JA_TWIN_BY_EN, jaTwinOf } from "../src/lib/japanese-twins";
import { SET_BY_CODE } from "../src/lib/sets";
import { JA_SETS } from "../src/lib/sets-ja";

test("the Japanese edition test runs on exactly 14 English sets, each with a real Japanese twin", () => {
  const pairs = Object.entries(JA_TWIN_BY_EN);
  assert.equal(pairs.length, 14, "14 Pokémon set pages until the 16 Dec read");
  for (const [en, ja] of pairs) {
    assert.ok(SET_BY_CODE.has(en), `${en} is an English set`);
    assert.ok(JA_SETS.some((s) => s.code === ja), `${ja} is a Japanese set`);
    assert.equal(jaTwinOf(en)?.code, ja);
  }
  assert.equal(new Set(pairs.map(([, ja]) => ja)).size, pairs.length, "one English set per Japanese twin");
  assert.equal(jaTwinOf("sv1"), null);
});

test("the row is labelled a different product and never claims to be the cheapest", () => {
  const src = readFileSync(new URL("../src/components/JapaneseEditionRow.tsx", import.meta.url), "utf8");
  assert.match(src, /Japanese edition/);
  assert.match(src, /A different product/);
  assert.doesNotMatch(src, /cheapest/i);
});
