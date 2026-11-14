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

// 2026-11-14: the Pokémon hubs were the thinnest pages in the sitemap (a median of 171 characters of prose on 146 listed pages).
// They carry the type and set hubs' data-built summary and questions now (lib/hub-summary.ts), rendered here from data/public.
test("a Pokémon hub carries today's numbers in words, a FAQ with its markup, and no banned copy", async () => {
  const { readFileSync } = await import("node:fs");
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime");
  const { findBannedCopy } = await import("../src/lib/copy-rules");
  const { jsonLdBlocks, nodesOf, validateJsonLd } = await import("./helpers/jsonld");
  (globalThis as unknown as { React: unknown }).React = React;
  process.env.PUBLIC_DATA_MODE = "files";
  const R = require("react") as { cache?: unknown };
  if (typeof R.cache !== "function") R.cache = (fn: unknown) => fn;
  const { default: Page } = await import("../src/app/[region]/pokemon/[name]/page");
  const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
  const prose = (html: string) =>
    [...html.replace(/<script[\s\S]*?<\/script>/g, "").matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'"))
      .filter((t) => t.length >= 80)
      .join(" ");
  const out: string[] = [];
  for (const region of ["us", "au"] as const) {
    const html = renderToStaticMarkup(React.createElement(AppRouterContext.Provider, { value: router as never }, await Page({ params: { region, name: "charizard" } })));
    const text = prose(html);
    assert.ok(text.length >= 1200, `${region}: only ${text.length} characters of prose`);
    assert.equal(findBannedCopy(text), null, findBannedCopy(text) ?? "");
    assert.match(html, /<details class="fold" data-fold="today-h"><summary><h2 id="today-h">Charizard sealed products in /, "the summary is a fold under the products");
    assert.ok(html.indexOf('data-fold="today-h"') > html.indexOf('id="in-stock"'), "products first");
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    const { docs, errors } = jsonLdBlocks(html);
    assert.deepEqual(errors, []);
    for (const d of docs) assert.deepEqual(validateJsonLd(d), []);
    const faq = docs.flatMap(nodesOf).find((n) => n["@type"] === "FAQPage") as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] } | undefined;
    assert.ok(faq && faq.mainEntity.length >= 4, `${region}: a FAQPage with four or more questions`);
    const shown = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
    for (const q of faq!.mainEntity) assert.ok(shown.includes(q.name) && shown.includes(q.acceptedAnswer.text), `${region}: "${q.name}" and its answer are on the page`);
    out.push(text);
  }
  assert.notEqual(out[0], out[1], "each region's words differ, because its numbers do");
  const index = readFileSync("src/app/[region]/pokemon/page.tsx", "utf8");
  assert.match(index, /Pokémon have a sealed product named after them/, "the index says how many Pokémon it lists");
});
