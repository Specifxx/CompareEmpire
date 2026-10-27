// Builds the FULL Yu-Gi-Oh! catalogue from the open yaml-yugi aggregate
// (https://github.com/DawnbrandBots/yaml-yugi) — reachable via raw.githubusercontent.
// Emits prisma/ygo-cards.json (every card, with real ygoprodeck image URLs by
// passcode) and rewrites src/lib/pokemon-sets.ts with the derived set list.
//   node prisma/fetch-ygo.mjs
import { writeFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const SRC = "https://raw.githubusercontent.com/DawnbrandBots/yaml-yugi/aggregate/cards.json";
const TMP = "/tmp/yaml-yugi-cards.json";

if (!existsSync(TMP) || statSync(TMP).size < 1_000_000) {
  console.log("Downloading yaml-yugi aggregate (~98MB)…");
  execSync(`curl -s -L -m 240 -o ${TMP} "${SRC}"`, { stdio: "inherit" });
}
const raw = JSON.parse(readFileSync(TMP, "utf8"));
console.log(`Parsed ${raw.length} source cards.`);

// Known real release dates for major sets (for ordering + sealed). Others default.
const SET_DATE = {
  LOB: "2002/03/08", MRD: "2002/06/26", MRL: "2002/09/16", SRL: "2002/09/16", PSV: "2002/10/20",
  LON: "2003/03/01", LOD: "2003/06/06", PGD: "2003/08/18", DCR: "2003/12/01", IOC: "2004/03/01",
  AST: "2004/06/01", SOD: "2004/10/12", RDS: "2005/03/01", FET: "2005/06/06", TLM: "2005/09/01",
  CRV: "2005/11/14", EEN: "2006/02/18", SOI: "2006/05/03", EOJ: "2006/08/16", POTD: "2006/11/15",
  GFTP: "2021/04/16", LED7: "2021/06/24", BROL: "2021/06/04", BODE: "2021/11/05", DAMA: "2021/08/06",
  POTE: "2022/08/04", DABL: "2022/10/21", PHHY: "2023/02/10", TAMA: "2022/05/06",
  DUNE: "2023/07/27", AGOV: "2023/10/19", RA01: "2023/09/08", MAZE: "2023/08/04",
  PHNI: "2024/02/08", LEDE: "2024/04/19", RA02: "2024/05/24", INFO: "2024/07/25",
  ROTA: "2024/10/24", SUDA: "2025/01/17", ALIN: "2025/02/07", RA03: "2024/11/15",
};
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

function frameType(card) {
  if (card.card_type === "Spell") return "Spell";
  if (card.card_type === "Trap") return "Trap";
  const line = (card.monster_type_line || "").toString();
  for (const f of ["Link", "Xyz", "Synchro", "Fusion", "Ritual", "Pendulum"]) if (line.includes(f)) return f;
  return /Effect/.test(line) ? "Effect" : "Normal";
}
function domainOf(card) {
  if (card.card_type === "Spell") return "Spell";
  if (card.card_type === "Trap") return "Trap";
  const a = (card.attribute || "").toUpperCase();
  return ["DARK", "LIGHT", "EARTH", "WATER", "FIRE", "WIND", "DIVINE"].includes(a) ? a : "DARK";
}
function pickSet(card) {
  const en = card.sets?.en;
  if (Array.isArray(en) && en.length) return en[0];
  for (const lang of ["na", "eu", "au", "ja"]) {
    const arr = card.sets?.[lang];
    if (Array.isArray(arr) && arr.length) return arr[0];
  }
  return null;
}

const out = [];
const setMap = new Map(); // code -> { name, count }
const seen = new Set();
let noImg = 0;

for (const card of raw) {
  if (!card || !card.name?.en) continue;
  if (!["Monster", "Spell", "Trap"].includes(card.card_type)) continue;
  const set = pickSet(card);
  if (!set || !set.set_number) continue;
  const setCode = String(set.set_number).split("-")[0].toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!setCode) continue;
  const pass = card.password;
  const ext = pass ? `y${pass}` : `k${card.konami_id || card.yugipedia_page_id || out.length}`;
  if (seen.has(ext)) continue;
  seen.add(ext);
  const setName = set.set_name || setCode;
  if (!setMap.has(setCode)) setMap.set(setCode, { name: setName, count: 0 });
  setMap.get(setCode).count++;
  const date = SET_DATE[setCode] || "2016/01/01";
  const rarity = (set.rarities && set.rarities[0]) || "Common";
  const imageUrl = pass ? `https://images.ygoprodeck.com/images/cards/${pass}.jpg` : null;
  if (!imageUrl) noImg++;
  out.push({
    externalId: ext,
    name: card.name.en,
    setCode,
    setName,
    releaseDate: date,
    collectorNumber: String(set.set_number),
    number: String(set.set_number).split("-").pop() || "",
    domain: domainOf(card),
    type: frameType(card),
    subtype: card.monster_type_line || (card.property ? `${card.property} ${card.card_type}` : card.card_type),
    rarity,
    hp: typeof card.atk === "number" ? card.atk : null,
    artist: null,
    flavorText: null,
    imageUrl,
    imageThumbUrl: imageUrl,
  });
}

console.log(`Built ${out.length} cards across ${setMap.size} sets (${noImg} without passcode/image).`);
writeFileSync(join(process.cwd(), "prisma", "ygo-cards.json"), JSON.stringify(out));

// Sets file (newest first by known/synthetic date).
const sets = [...setMap.entries()].map(([code, v]) => ({
  code, name: v.name, slug: slugify(v.name) || code.toLowerCase(),
  series: "Yu-Gi-Oh!", releaseDate: SET_DATE[code] || "2016/01/01", total: v.count, logo: null, symbol: null,
}));
// de-dupe slugs
const slugCount = {};
for (const s of sets) { if (slugCount[s.slug]) { s.slug = `${s.slug}-${s.code.toLowerCase()}`; } slugCount[s.slug] = 1; }
sets.sort((a, b) => (a.releaseDate < b.releaseDate ? 1 : a.releaseDate > b.releaseDate ? -1 : a.name.localeCompare(b.name)));

const ts = `// AUTO-GENERATED by prisma/fetch-ygo.mjs from the yaml-yugi dataset. Do not edit by hand.
export interface PokemonSet {
  code: string; name: string; slug: string; series: string;
  releaseDate: string; total: number; logo: string | null; symbol: string | null;
}
export const POKEMON_SETS: PokemonSet[] = ${JSON.stringify(sets, null, 0)};
`;
writeFileSync(join(process.cwd(), "src", "lib", "pokemon-sets.ts"), ts);
console.log(`Wrote ${sets.length} sets to src/lib/pokemon-sets.ts`);
