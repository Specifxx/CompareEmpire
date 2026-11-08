// Pokémon hubs (lib/pokemon-hubs.ts, DECISIONS.md 2026-11-08): whole names only, indexed at 3+.
import { test } from "node:test";
import assert from "node:assert/strict";
import { POKEMON, POKEMON_BY_SLUG, POKEMON_INDEX_MIN, namesPokemon, pokemonOfName, pokemonPath, pokemonSqlPattern } from "../src/lib/pokemon-hubs";

const of = (n: string) => pokemonOfName(n).map((p) => p.slug);

test("real product names land on their Pokémon", () => {
  assert.deepEqual(of("Charizard ex Premium Collection"), ["charizard"]);
  assert.deepEqual(of("151 - Alakazam ex Collection Box"), ["alakazam"]);
  assert.ok(of("Prismatic Evolutions Super-Premium Collection: Eevee, Sylveon and Umbreon").includes("umbreon"));
  assert.ok(of("Pikachu ex Tin").includes("pikachu"));
});

test("Mew is not Mewtwo, and a name inside a word never matches", () => {
  assert.deepEqual(of("Mewtwo ex Box"), ["mewtwo"]);
  assert.deepEqual(of("Mew ex Collection"), ["mew"]);
  assert.equal(namesPokemon(POKEMON_BY_SLUG.get("mew")!, "Pokémon 151 Mewtwo"), false);
  assert.deepEqual(of("Scarlet & Violet Booster Box"), []);
});

test("slugs unique, paths and SQL pattern shaped right, 3+ to index (owner, 2026-11-08)", () => {
  assert.equal(new Set(POKEMON.map((p) => p.slug)).size, POKEMON.length);
  assert.equal(pokemonPath("au", "charizard"), "/au/pokemon/charizard");
  assert.equal(pokemonSqlPattern(POKEMON_BY_SLUG.get("charizard")!), "\\mCharizard\\M");
  assert.equal(POKEMON_INDEX_MIN, 3);
});
