// Generates prisma/ygo-cards.json — a curated catalogue of real Yu-Gi-Oh! TCG
// cards across real sets, in the shared BuiltCard shape consumed by prisma/seed.ts.
// Images are left null so the self-contained SVG art is used.
//   node prisma/gen-cards.mjs
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const SET_META = {
  LOB: { name: "Legend of Blue Eyes White Dragon", date: "2002/03/08", total: 126 },
  MRD: { name: "Metal Raiders", date: "2002/06/26", total: 144 },
  SRL: { name: "Spell Ruler", date: "2002/09/16", total: 104 },
  PSV: { name: "Pharaoh's Servant", date: "2002/10/20", total: 96 },
  LON: { name: "Labyrinth of Nightmare", date: "2003/03/01", total: 92 },
  IOC: { name: "Invasion of Chaos", date: "2004/03/01", total: 113 },
  SOD: { name: "Soul of the Duelist", date: "2004/10/12", total: 60 },
  GFTP: { name: "Ghosts From the Past", date: "2021/04/16", total: 132 },
  BODE: { name: "Burst of Destiny", date: "2021/11/05", total: 101 },
  POTE: { name: "Power of the Elements", date: "2022/08/04", total: 101 },
  DUNE: { name: "Duelist Nexus", date: "2023/07/27", total: 101 },
  RA01: { name: "25th Anniversary Rarity Collection", date: "2023/09/08", total: 152 },
  AGOV: { name: "Age of Overlord", date: "2023/10/19", total: 101 },
  PHNI: { name: "Phantom Nightmare", date: "2024/02/08", total: 101 },
  LEDE: { name: "Legacy of Destruction", date: "2024/04/19", total: 101 },
  RA02: { name: "25th Anniversary Rarity Collection II", date: "2024/05/24", total: 150 },
  INFO: { name: "Infinite Forbidden", date: "2024/07/25", total: 101 },
  ROTA: { name: "Rage of the Abyss", date: "2024/10/24", total: 100 },
  SUDA: { name: "Supreme Darkness", date: "2025/01/17", total: 100 },
};

// setCode -> [ [name, num, domain(attribute|Spell|Trap), type(frame), rarity, subtype] ]
const CARDS = {
  LOB: [
    ["Blue-Eyes White Dragon", 1, "LIGHT", "Normal", "Ultra Rare", "Dragon"],
    ["Dark Magician", 5, "DARK", "Normal", "Ultra Rare", "Spellcaster"],
    ["Exodia the Forbidden One", 124, "DARK", "Effect", "Ultra Rare", "Spellcaster"],
    ["Gaia the Fierce Knight", 6, "EARTH", "Normal", "Rare", "Warrior"],
    ["Summoned Skull", 72, "DARK", "Normal", "Super Rare", "Fiend"],
    ["Red-Eyes B. Dragon", 70, "DARK", "Normal", "Super Rare", "Dragon"],
    ["Raigeki", 53, "Spell", "Spell", "Super Rare", "Normal Spell"],
    ["Pot of Greed", 119, "Spell", "Spell", "Common", "Normal Spell"],
    ["Swords of Revealing Light", 101, "Spell", "Spell", "Super Rare", "Normal Spell"],
  ],
  MRD: [
    ["Mirror Force", 138, "Trap", "Trap", "Ultra Rare", "Normal Trap"],
    ["Dark Hole", 32, "Spell", "Spell", "Super Rare", "Normal Spell"],
    ["Time Wizard", 65, "FIRE", "Effect", "Ultra Rare", "Spellcaster"],
    ["Harpie Lady Sisters", 78, "WIND", "Effect", "Ultra Rare", "Winged Beast"],
    ["Man-Eater Bug", 20, "EARTH", "Effect", "Rare", "Insect"],
  ],
  SRL: [
    ["Magician of Faith", 64, "LIGHT", "Effect", "Rare", "Spellcaster"],
    ["Heavy Storm", 75, "Spell", "Spell", "Super Rare", "Normal Spell"],
    ["Magic Cylinder", 99, "Trap", "Trap", "Ultra Rare", "Normal Trap"],
  ],
  PSV: [
    ["Jinzo", 0, "DARK", "Effect", "Ultra Rare", "Machine"],
    ["Cyber Jar", 36, "EARTH", "Effect", "Rare", "Rock"],
    ["Mystical Space Typhoon", 85, "Spell", "Spell", "Super Rare", "Quick-Play Spell"],
  ],
  LON: [
    ["Injection Fairy Lily", 84, "EARTH", "Effect", "Ultra Rare", "Spellcaster"],
    ["Gemini Elf", 0, "EARTH", "Normal", "Rare", "Spellcaster"],
  ],
  IOC: [
    ["Black Luster Soldier - Envoy of the Beginning", 25, "LIGHT", "Effect", "Ultra Rare", "Warrior"],
    ["Chaos Emperor Dragon - Envoy of the End", 0, "DARK", "Effect", "Ultra Rare", "Dragon"],
    ["Tribe-Infecting Virus", 73, "WATER", "Effect", "Super Rare", "Aqua"],
  ],
  SOD: [
    ["Cyber Dragon", 1, "LIGHT", "Effect", "Ultra Rare", "Machine"],
    ["Dark Magician of Chaos", 41, "DARK", "Effect", "Ultra Rare", "Spellcaster"],
  ],
  GFTP: [
    ["Accesscode Talker", 60, "DARK", "Link", "Ghost Rare", "Cyberse"],
    ["Crystron Halqifibrax", 39, "WATER", "Synchro", "Ultra Rare", "Machine"],
  ],
  BODE: [
    ["Vanquish Soul Razen", 0, "FIRE", "Effect", "Secret Rare", "Beast-Warrior"],
    ["Mareep", 5, "EARTH", "Normal", "Common", "Thunder"],
  ],
  POTE: [
    ["Tearlaments Scheiren", 23, "DARK", "Effect", "Secret Rare", "Aqua"],
    ["Kashtira Fenrir", 4, "EARTH", "Effect", "Ultra Rare", "Psychic"],
    ["Ash Blossom & Joyous Spring", 84, "FIRE", "Effect", "Super Rare", "Zombie"],
  ],
  DUNE: [
    ["Snake-Eyes Flamberge Dragon", 8, "FIRE", "Synchro", "Secret Rare", "Dragon"],
    ["Triple Tactics Talent", 64, "Spell", "Spell", "Super Rare", "Normal Spell"],
    ["Maxx \"C\"", 81, "EARTH", "Effect", "Super Rare", "Insect"],
  ],
  RA01: [
    ["Ash Blossom & Joyous Spring", 51, "FIRE", "Effect", "Quarter Century Secret Rare", "Zombie"],
    ["Dark Magician", 4, "DARK", "Normal", "Quarter Century Secret Rare", "Spellcaster"],
    ["Blue-Eyes White Dragon", 1, "LIGHT", "Normal", "Quarter Century Secret Rare", "Dragon"],
    ["Infinite Impermanence", 90, "Trap", "Trap", "Secret Rare", "Normal Trap"],
  ],
  AGOV: [
    ["Fiendsmith Engraver", 26, "LIGHT", "Effect", "Secret Rare", "Fiend"],
    ["Mulcharmy Fuwalos", 0, "WIND", "Effect", "Ultra Rare", "Winged Beast"],
  ],
  PHNI: [
    ["Snake-Eye Ash", 7, "FIRE", "Effect", "Ultra Rare", "Pyro"],
    ["Bonfire", 62, "Spell", "Spell", "Super Rare", "Normal Spell"],
    ["Original Sinful Spoils - Snake-Eye", 0, "Spell", "Spell", "Secret Rare", "Continuous Spell"],
  ],
  LEDE: [
    ["Fiendsmith's Requiem", 46, "LIGHT", "Link", "Secret Rare", "Fiend"],
    ["Tenpai Dragon Chundra", 5, "FIRE", "Effect", "Super Rare", "Dragon"],
  ],
  RA02: [
    ["Maxx \"C\"", 80, "EARTH", "Effect", "Quarter Century Secret Rare", "Insect"],
    ["Effect Veiler", 50, "LIGHT", "Effect", "Quarter Century Secret Rare", "Spellcaster"],
    ["Accesscode Talker", 100, "DARK", "Link", "Quarter Century Secret Rare", "Cyberse"],
  ],
  INFO: [
    ["Primite Lordly Lode", 0, "EARTH", "Effect", "Secret Rare", "Rock"],
    ["Ryzeal Cross", 60, "Spell", "Spell", "Super Rare", "Normal Spell"],
  ],
  ROTA: [
    ["Mulcharmy Purulia", 0, "WATER", "Effect", "Ultra Rare", "Aqua"],
    ["Goblin Biker Big Gabonga", 7, "FIRE", "Effect", "Secret Rare", "Fiend"],
  ],
  SUDA: [
    ["Blue-Eyes White Dragon (Quarter Century)", 0, "LIGHT", "Normal", "Quarter Century Secret Rare", "Dragon"],
    ["Maliss in Underground", 60, "Spell", "Spell", "Super Rare", "Field Spell"],
  ],
};

const pad3 = (n) => String(n).padStart(3, "0");
const out = [];
const seen = new Set();
for (const [code, list] of Object.entries(CARDS)) {
  const meta = SET_META[code];
  if (!meta) throw new Error(`missing meta ${code}`);
  let auto = 200;
  for (const [name, num, domain, type, rarity, subtype] of list) {
    let n = num;
    let ext = `${code}-${pad3(n)}`;
    while (seen.has(ext)) { n = auto++; ext = `${code}-${pad3(n)}`; }
    seen.add(ext);
    out.push({
      externalId: ext,
      name,
      setCode: code,
      setName: meta.name,
      releaseDate: meta.date,
      collectorNumber: `${code}-EN${pad3(n)}`,
      number: pad3(n),
      domain,
      type,
      subtype: subtype ?? null,
      rarity,
      hp: null,
      artist: null,
      flavorText: null,
      imageUrl: null,
      imageThumbUrl: null,
    });
  }
}
writeFileSync(join(process.cwd(), "prisma", "ygo-cards.json"), JSON.stringify(out));
console.log(`Wrote ${out.length} Yu-Gi-Oh! cards across ${Object.keys(CARDS).length} sets.`);
