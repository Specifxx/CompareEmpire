// DexCompare's working database lives on GitHub, not Neon (owner, 2026-11-23: "Dc2 is at limit"; DECISIONS.md 2026-11-23).
// Both data jobs run on a throwaway Postgres, load it from the snapshot branch and save it back, in ONE concurrency group.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wf = (name: string) => readFileSync(new URL(`../../../.github/workflows/${name}`, import.meta.url), "utf8");
const script = readFileSync(new URL("../scripts/db-snapshot.sh", import.meta.url), "utf8");
const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

for (const name of ["dexcompare-sealed-import.yml", "dexcompare-ebay-import.yml"]) {
  test(`${name}: its own Postgres, loaded before the import and saved after it`, () => {
    const s = wf(name);
    assert.match(s, /services:\s*\n\s*postgres:\s*\n\s*image: postgres:18/);
    assert.match(s, /LOCAL_URL: postgresql:\/\/postgres:postgres@localhost:5432\/dex/);
    assert.match(s, /echo "DATABASE_URL=\$LOCAL_URL" >> "\$GITHUB_ENV"/, "every step's DATABASE_URL is the job's own database");
    assert.doesNotMatch(s, /echo "DATABASE_URL=\$DIRECT"/, "never Neon again");
    assert.match(s, /concurrency:\s*\n\s*group: dexcompare-data\s*\n\s*cancel-in-progress: false/);
    const load = s.indexOf("db-snapshot.sh restore");
    const sync = s.indexOf("prisma db push --skip-generate");
    const imp = s.indexOf("- name: Import\n");
    const save = s.indexOf("db-snapshot.sh save");
    const publish = s.indexOf("- name: Publish it to main");
    assert.ok(sync > 0 && sync < load && load < imp && imp < save && save < publish, "schema, load, import, save, publish");
    assert.match(s, /- name: Save the database\n\s*if: always\(\) && steps\.load\.outcome == 'success'/, "saved even after a partial import, never after a failed load");
  });
}

test("the snapshot holds exactly the schema's tables, refuses a non-local database and never saves an empty one", () => {
  const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]).sort();
  const tables = /TABLES=\(([^)]*)\)/.exec(script)![1].trim().split(/\s+/).sort();
  assert.deepEqual(tables, models, "a new model must be added to TABLES in scripts/db-snapshot.sh");
  assert.match(script, /refusing/);
  assert.match(script, /no products: not saving/);
  assert.match(script, /Row counts differ/);
  assert.match(script, /-prev/, "the previous snapshot is kept");
  assert.match(script, /refusing to start from an empty database/);
});
