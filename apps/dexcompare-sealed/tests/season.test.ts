// The Halloween season (lib/season.ts): 16–31 October in the visitor's local time, off on 1 November, and the inline boot script
// agrees with seasonAt() on the same dates.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { SEASON_BOOT_SCRIPT, seasonAt, seasonMarkupLive } from "../src/lib/season";

const at = (m: number, d: number, h = 12) => new Date(2026, m - 1, d, h);

test("seasonAt: Halloween from 16 to 31 October inclusive, Christmas from 1 November", () => {
  assert.equal(seasonAt(at(10, 15, 23)), null);
  assert.equal(seasonAt(at(10, 16, 0)), "halloween");
  assert.equal(seasonAt(at(10, 24)), "halloween");
  assert.equal(seasonAt(at(10, 31, 23)), "halloween");
  assert.equal(seasonAt(at(11, 1, 0)), "christmas");
  assert.equal(seasonAt(at(12, 25)), "christmas");
  assert.equal(seasonAt(at(6, 20)), null);
});

test("seasonMarkupLive keeps a day of slack either side", () => {
  assert.equal(seasonMarkupLive("halloween", at(10, 15)), true);
  assert.equal(seasonMarkupLive("halloween", at(11, 1)), true);
  assert.equal(seasonMarkupLive("halloween", at(11, 2)), false);
  assert.equal(seasonMarkupLive("halloween", at(10, 14)), false);
});

function boot(now: Date, search = ""): string | null {
  const attrs: Record<string, string> = {};
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a: unknown[]) {
      super(...((a.length ? a : [now.getTime()]) as []));
    }
  }
  runInNewContext(SEASON_BOOT_SCRIPT, {
    Date: FakeDate,
    location: { search },
    document: { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v), getAttribute: (k: string) => attrs[k] ?? null } },
  });
  return attrs["data-season"] ?? null;
}

test("the boot script agrees with seasonAt, and ?season= overrides the date", () => {
  for (const [m, d] of [[10, 15], [10, 16], [10, 31], [11, 1], [3, 3]]) assert.equal(boot(at(m, d)), seasonAt(at(m, d)), `${m}/${d}`);
  assert.equal(boot(at(3, 3), "?season=halloween"), "halloween");
  assert.equal(boot(at(10, 20), "?season=off"), null);
});

test("the root layout runs the boot script in <head>", async () => {
  const { readFileSync } = await import("node:fs");
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /__html: SEASON_BOOT_SCRIPT/);
});
