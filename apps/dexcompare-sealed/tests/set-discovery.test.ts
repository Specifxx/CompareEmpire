// New sets find themselves (lib/set-discovery.ts, scripts/discover-sets.ts, data/sets/discovered.json): which TCGplayer groups
// become sets, how they are named, coded and labelled, and that a guess is refused.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { candidates, cleanGroupName, codeOf, mergeDiscovered, nameInside, readProducts, seriesOf, setSlug, type DiscoveredSet, type TcgGroup } from "../src/lib/set-discovery";
import { HAND_SETS, SETS } from "../src/lib/sets";

const TODAY = "2026-11-03";
const g = (groupId: number, name: string, publishedOn: string, abbreviation: string | null = null): TcgGroup => ({ groupId, name, abbreviation, publishedOn: `${publishedOn}T00:00:00` });
const KNOWN = HAND_SETS.map((s) => ({ code: s.code, name: s.name, slug: s.slug, releaseDate: s.releaseDate }));
// A real old set in the list (Surging Sparks, 2024) sets the group-id floor at 23000: every test group above it is "new".
const FLOOR = g(23000, "SV08: Surging Sparks", "2024-11-08", "SV08");

test("an upcoming set group is taken; known sets, promos, galleries, decks and far-off or old groups are not", () => {
  const groups = [
    g(30001, "ME06: Delta Reign", "2026-11-06", "ME06"), // known
    g(30002, "ME08: Storm Crown", "2027-03-26", "ME08"),
    g(30003, "ME: Mega Evolution Promos", "2026-12-01", "MEP"),
    g(30004, "ME08: Storm Crown Trainer Gallery", "2027-03-26"),
    g(30005, "League & Championship Cards", "2026-12-01"),
    g(30006, "Battle Academy 2027", "2027-01-10"),
    g(30007, "ME09: Far Away", "2027-09-01", "ME09"),
    FLOOR,
  ];
  const { take, skipped } = candidates(groups, KNOWN, TODAY);
  assert.deepEqual(
    take.map((c) => [c.code, c.name, c.slug, c.releaseDate]),
    [["me8", "Storm Crown", "storm-crown", "2027-03-26"]],
  );
  assert.deepEqual(skipped, []);
});

test("a name inside a known set's name is refused, and a too-short name", () => {
  const { take, skipped } = candidates([FLOOR, g(30009, "ME08: Delta", "2027-01-01", "ME08"), g(30010, "ME: Rev", "2027-01-01", "ZZ")], KNOWN, TODAY);
  assert.deepEqual(take, []);
  assert.equal(skipped.length, 2);
  assert.ok(nameInside("Delta", "Delta Reign"));
  assert.ok(!nameInside("Delta Reign", "Delta"));
});

test("names, codes and series", () => {
  assert.equal(cleanGroupName("ME07: Flowing Fists"), "Flowing Fists");
  assert.equal(cleanGroupName("SV: Prismatic Evolutions"), "Prismatic Evolutions");
  assert.equal(cleanGroupName("SWSH12.5: Crown Zenith"), "Crown Zenith");
  assert.equal(codeOf("ME07", "flowing-fists"), "me7");
  assert.equal(codeOf("SV08.5", "x"), "sv8pt5");
  assert.equal(codeOf("PRE", "prismatic-evolutions"), "pre");
  assert.equal(codeOf(null, "ascended-heroes"), "ascendedhero");
  assert.equal(seriesOf({ name: "ME08: Storm Crown", abbreviation: "ME08" }, "Special"), "Mega Evolution");
  assert.equal(seriesOf({ name: "Ascended Heroes", abbreviation: "ASC" }, "Mega Evolution"), "Mega Evolution");
  // Every hand-written slug but one from the pokemontcg.io export (2020, kept: a live URL).
  for (const s of HAND_SETS) if (s.slug !== "champion-s-path") assert.equal(setSlug(s.name), s.slug, s.name);
});

test("TCGplayer's catalogue decides: a sealed set at all, and whether a booster box was sold", () => {
  assert.deepEqual(readProducts(["Storm Crown Elite Trainer Box", "Storm Crown Booster Bundle"]), { sealed: true, boosterBox: false });
  assert.deepEqual(readProducts(["Storm Crown Booster Box", "Storm Crown Booster Box Case"]), { sealed: true, boosterBox: true });
  assert.deepEqual(readProducts(["Pikachu - 001/100", "Code Card"]), { sealed: false, boosterBox: false });
  assert.deepEqual(readProducts(["Storm Crown Booster Box Case"]).boosterBox, false, "a case alone is not a box");
});

test("merge: sealed groups only, first slug and code kept, a failed read keeps yesterday's entry, hand-written sets win", () => {
  const take = candidates([FLOOR, g(30002, "ME08: Storm Crown", "2027-03-26", "ME08"), g(30011, "ME: Pocket Pals", "2027-02-20", "PKP")], KNOWN, TODAY).take;
  const products = new Map<number, string[]>([
    [30002, ["Storm Crown Booster Box", "Storm Crown Elite Trainer Box"]],
    [30011, ["Pikachu - 001/050"]],
  ]);
  const out = mergeDiscovered([], take, products, "Mega Evolution", KNOWN, TODAY);
  assert.deepEqual(out, [{ code: "me8", name: "Storm Crown", slug: "storm-crown", series: "Mega Evolution", releaseDate: "2027-03-26", tcgGroupId: 30002, firstSeen: TODAY }]);

  const before: DiscoveredSet[] = [{ ...out[0], slug: "storm-crown-old", releaseDate: "2027-03-20", firstSeen: "2026-10-01" }];
  const moved = mergeDiscovered(before, take, new Map([[30002, ["Storm Crown Elite Trainer Box"]]]), "Mega Evolution", KNOWN, TODAY);
  assert.equal(moved[0].slug, "storm-crown-old");
  assert.equal(moved[0].firstSeen, "2026-10-01");
  assert.equal(moved[0].releaseDate, "2027-03-26");
  assert.equal(moved[0].noBoosterBox, true, "no box listed (yet): store boxes refused");

  assert.deepEqual(mergeDiscovered(before, take, new Map(), "Mega Evolution", KNOWN, TODAY), before, "read failed: kept");
  const hand = [...KNOWN, { code: "me8", name: "Storm Crown", slug: "storm-crown" }];
  assert.deepEqual(mergeDiscovered([], take, products, "Mega Evolution", hand, TODAY), [], "hand-written wins");
});

test("data/sets/discovered.json is well formed; SETS stays newest first with unique codes and slugs", () => {
  const file = JSON.parse(fs.readFileSync("data/sets/discovered.json", "utf8")) as DiscoveredSet[];
  for (const d of file) {
    assert.match(d.code, /^[a-z0-9]{2,12}$/);
    assert.match(d.releaseDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(d.slug, /^[a-z0-9-]+$/);
  }
  assert.equal(new Set(SETS.map((s) => s.code)).size, SETS.length);
  assert.equal(new Set(SETS.map((s) => s.slug)).size, SETS.length);
  for (let i = 1; i < SETS.length; i++) assert.ok(SETS[i - 1].releaseDate >= SETS[i].releaseDate, SETS[i].code);
});

test("old groups TCGplayer re-dated are never new: only group ids above the newest year-old known set are read", () => {
  const groups = [FLOOR, g(1422, "POP Series 1", "2026-11-02", "POP"), g(1300, "Black & White", "2026-11-02", "BW1"), g(30002, "ME08: Storm Crown", "2027-03-26", "ME08")];
  assert.deepEqual(
    candidates(groups, KNOWN, TODAY).take.map((c) => c.code),
    ["me8"],
  );
  assert.deepEqual(candidates([g(30002, "ME08: Storm Crown", "2027-03-26", "ME08")], KNOWN, TODAY).take, [], "no floor, nothing read");
});
