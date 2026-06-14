// Fetches the full Pokémon TCG dataset (every set + card) from the open
// PokemonTCG/pokemon-tcg-data mirror on GitHub into prisma/pokemon-data.
// Then run:  npx tsx scripts/build-pokemon-data.ts  to produce the seed inputs.
//
//   npx tsx scripts/fetch-pokemon-data.ts
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master";
const OUT = join(process.cwd(), "prisma", "pokemon-data");

async function getText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function main() {
  mkdirSync(join(OUT, "cards"), { recursive: true });
  console.log("Fetching set index…");
  const setsJson = await getText(`${BASE}/sets/en.json`);
  writeFileSync(join(OUT, "sets.json"), setsJson);
  const sets = JSON.parse(setsJson) as { id: string }[];
  console.log(`Fetching cards for ${sets.length} sets…`);
  let i = 0;
  for (const s of sets) {
    i++;
    const dest = join(OUT, "cards", `${s.id}.json`);
    if (existsSync(dest)) continue;
    try {
      writeFileSync(dest, await getText(`${BASE}/cards/en/${s.id}.json`));
    } catch (e) {
      console.warn(`  skip ${s.id}: ${(e as Error).message}`);
    }
    if (i % 20 === 0) process.stdout.write(`\r  ${i}/${sets.length}`);
  }
  console.log(`\nDone. Now run: npx tsx scripts/build-pokemon-data.ts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
