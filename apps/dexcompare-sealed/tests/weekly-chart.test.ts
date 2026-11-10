import { test } from "node:test";
import assert from "node:assert/strict";
import type { PriceHistory } from "../src/lib/price-history";
import { chartWeeks, publishedWeeks, rankMove, weeklyChart, CHART_MIN_MOVES } from "../src/lib/weekly-chart";

const day = (s: string) => Math.floor(Date.parse(`${s}T00:00:00Z`) / 86_400_000);
// Sundays: 2026-11-01, 2026-11-08. History from Fri 23 Oct to Tue 10 Nov.
const since = day("2026-10-23");
const through = day("2026-11-10");
function hist(series: Record<string, [string, number | null, number][]>): PriceHistory {
  return { v: 1, since, through, series: { US: Object.fromEntries(Object.entries(series).map(([k, pts]) => [k, pts.map(([d, c, s]) => [day(d), c, s] as [number, number | null, number])])) } };
}

test("weeks end on Sundays with a full week of history before them, newest first", () => {
  assert.deepEqual(chartWeeks(hist({})), ["2026-11-08", "2026-11-01"]);
  assert.equal(weeklyChart(hist({}), "US", "2026-11-07"), null); // not a Sunday
  assert.equal(weeklyChart(hist({}), "US", "2026-10-25"), null); // no week before it
});

test("real moves only: 2+ stores both days, 5% or more, under 50%; ranks and last week's rank", () => {
  const s: Record<string, [string, number | null, number][]> = {};
  // five risers this week (week to 8 Nov), from 1 Nov
  for (let i = 0; i < 5; i++) s[`up${i}`] = [["2026-10-23", 1000, 3], ["2026-11-05", 1100 + i * 10, 3]];
  s.small = [["2026-10-23", 1000, 3], ["2026-11-05", 1030, 3]]; // 3%: no
  s.huge = [["2026-10-23", 1000, 3], ["2026-11-05", 2000, 3]]; // 100%: misfiled
  s.onestore = [["2026-10-23", 1000, 1], ["2026-11-05", 1300, 1]];
  s.down = [["2026-10-23", 1000, 3], ["2026-11-05", 800, 2]];
  // up4 was also on last week's chart: it rose in the week to 1 Nov too
  s.up4 = [["2026-10-23", 900, 3], ["2026-10-28", 1000, 3], ["2026-11-05", 1140, 3]];
  const c = weeklyChart(hist(s), "US", "2026-11-08")!;
  assert.deepEqual(c.risers.map((r) => r.slug), ["up4", "up3", "up2", "up1", "up0"]);
  assert.equal(c.risers[0].lastRank, 1);
  assert.equal(rankMove(c.risers[0]), "=");
  assert.equal(rankMove(c.risers[1]), "New");
  assert.deepEqual(c.fallers.map((r) => r.slug), ["down"]);
  assert.ok(c.published && c.risers.length + c.fallers.length >= CHART_MIN_MOVES);
  assert.ok(!c.risers.some((r) => ["small", "huge", "onestore"].includes(r.slug)));
});

test("a week with too few moves publishes nothing", () => {
  const h = hist({ a: [["2026-10-23", 1000, 3], ["2026-11-05", 1200, 3]] });
  assert.equal(weeklyChart(h, "US", "2026-11-08")!.published, false);
  assert.deepEqual(publishedWeeks(h, "US"), []);
});

test("rank moves read up, down and same", () => {
  assert.equal(rankMove({ rank: 2, lastRank: 5 }), "▲3");
  assert.equal(rankMove({ rank: 5, lastRank: 2 }), "▼3");
});
