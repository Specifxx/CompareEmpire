// Generates prisma/op-cards.json — a curated catalogue of real One Piece Card
// Game cards across real sets, in the shared BuiltCard shape consumed by
// prisma/seed.ts. Images are left null so the self-contained SVG art is used.
//   node prisma/gen-cards.mjs
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const SET_META = {
  OP01: { name: "Romance Dawn", date: "2022/12/02", total: 121 },
  OP02: { name: "Paramount War", date: "2023/03/10", total: 121 },
  OP03: { name: "Pillars of Strength", date: "2023/06/30", total: 122 },
  OP04: { name: "Kingdoms of Intrigue", date: "2023/09/22", total: 114 },
  OP05: { name: "Awakening of the New Era", date: "2023/12/08", total: 119 },
  OP06: { name: "Wings of the Captain", date: "2024/03/08", total: 118 },
  OP07: { name: "500 Years in the Future", date: "2024/06/28", total: 118 },
  OP08: { name: "Two Legends", date: "2024/09/13", total: 118 },
  OP09: { name: "Emperors in the New World", date: "2024/11/22", total: 118 },
  OP10: { name: "Royal Blood", date: "2025/02/21", total: 119 },
  OP11: { name: "A Fist of Divine Speed", date: "2025/05/30", total: 120 },
  EB01: { name: "Memorial Collection", date: "2024/01/26", total: 71 },
  PRB01: { name: "Premium Booster -The Best-", date: "2024/09/20", total: 120 },
  ST01: { name: "Straw Hat Crew", date: "2022/12/02", total: 17 },
  ST02: { name: "Worst Generation", date: "2022/12/02", total: 17 },
  ST03: { name: "The Seven Warlords of the Sea", date: "2022/12/02", total: 17 },
  ST04: { name: "Animal Kingdom Pirates", date: "2022/12/02", total: 17 },
};

// setCode -> [ [name, num, domain(color), type, rarity, subtype?] ]
const CARDS = {
  OP01: [
    ["Monkey D. Luffy", 1, "Red", "Leader", "Leader", "Straw Hat Crew"],
    ["Trafalgar Law", 2, "Green", "Leader", "Leader", "Heart Pirates"],
    ["Roronoa Zoro", 25, "Red", "Character", "Super Rare", "Straw Hat Crew"],
    ["Nami", 16, "Red", "Character", "Rare", "Straw Hat Crew"],
    ["Jinbe", 13, "Red", "Character", "Super Rare", "Straw Hat Crew"],
    ["Crocodile", 61, "Purple", "Leader", "Leader", "Baroque Works"],
    ["Donquixote Doflamingo", 60, "Purple", "Leader", "Leader", "Donquixote Pirates"],
    ["Kaido", 91, "Purple", "Character", "Super Rare", "Animal Kingdom Pirates"],
    ["Sanji", 24, "Red", "Character", "Rare", "Straw Hat Crew"],
    ["Shanks", 120, "Blue", "Character", "Secret Rare", "Red Hair Pirates"],
  ],
  OP02: [
    ["Edward Newgate", 1, "Red", "Leader", "Leader", "Whitebeard Pirates"],
    ["Kuzan", 2, "Blue", "Leader", "Leader", "Navy"],
    ["Portgas D. Ace", 13, "Red", "Character", "Super Rare", "Whitebeard Pirates"],
    ["Sakazuki", 35, "Black", "Character", "Super Rare", "Navy"],
    ["Marco", 7, "Red", "Character", "Super Rare", "Whitebeard Pirates"],
    ["Smoker", 90, "Black", "Leader", "Leader", "Navy"],
    ["Marshall D. Teach", 91, "Black", "Character", "Super Rare", "Blackbeard Pirates"],
  ],
  OP03: [
    ["Charlotte Linlin", 1, "Yellow", "Leader", "Leader", "Big Mom Pirates"],
    ["Nico Robin", 21, "Purple", "Character", "Super Rare", "Straw Hat Crew"],
    ["Charlotte Katakuri", 114, "Yellow", "Character", "Secret Rare", "Big Mom Pirates"],
    ["Vinsmoke Reiju", 27, "Purple", "Character", "Rare", "Vinsmoke Family"],
    ["Sabo", 79, "Blue", "Character", "Super Rare", "Revolutionary Army"],
  ],
  OP04: [
    ["Monkey D. Luffy", 1, "Purple", "Leader", "Leader", "Straw Hat Crew"],
    ["Kozuki Oden", 2, "Green", "Leader", "Leader", "Land of Wano"],
    ["Yamato", 56, "Green", "Character", "Super Rare", "Land of Wano"],
    ["Trafalgar Law", 19, "Purple", "Character", "Super Rare", "Heart Pirates"],
    ["Eustass Kid", 92, "Green", "Leader", "Leader", "Kid Pirates"],
  ],
  OP05: [
    ["Monkey D. Luffy", 1, "Purple", "Leader", "Leader", "Straw Hat Crew"],
    ["Boa Hancock", 2, "Purple", "Leader", "Leader", "Kuja Pirates"],
    ["Rob Lucci", 35, "Black", "Character", "Super Rare", "CP0"],
    ["Monkey D. Luffy", 119, "Purple", "Character", "Secret Rare", "Gear 5"],
    ["Jewelry Bonney", 60, "Blue", "Leader", "Leader", "Bonney Pirates"],
  ],
  OP06: [
    ["Monkey D. Dragon", 1, "Black", "Leader", "Leader", "Revolutionary Army"],
    ["Vegapunk", 30, "Blue", "Character", "Super Rare", "Navy"],
    ["Sabo", 41, "Blue", "Character", "Super Rare", "Revolutionary Army"],
    ["Belo Betty", 13, "Red", "Character", "Rare", "Revolutionary Army"],
  ],
  OP07: [
    ["Gol D. Roger", 1, "Red", "Leader", "Leader", "Roger Pirates"],
    ["Monkey D. Garp", 2, "Black", "Leader", "Leader", "Navy"],
    ["Rob Lucci", 22, "Blue", "Character", "Super Rare", "Cipher Pol"],
    ["Koby", 100, "Black", "Character", "Secret Rare", "Navy"],
  ],
  OP08: [
    ["Monkey D. Luffy", 1, "Red", "Leader", "Leader", "Straw Hat Crew"],
    ["Kozuki Oden", 2, "Red", "Leader", "Leader", "Land of Wano"],
    ["Roronoa Zoro", 51, "Green", "Character", "Super Rare", "Straw Hat Crew"],
    ["Yamato", 53, "Green", "Character", "Super Rare", "Land of Wano"],
  ],
  OP09: [
    ["Shanks", 1, "Red", "Leader", "Leader", "Red Hair Pirates"],
    ["Kaido", 2, "Purple", "Leader", "Leader", "Animal Kingdom Pirates"],
    ["Charlotte Linlin", 3, "Yellow", "Leader", "Leader", "Big Mom Pirates"],
    ["Buggy", 4, "Green", "Leader", "Leader", "Buggy's Delivery"],
    ["Shanks", 118, "Red", "Character", "Secret Rare", "Red Hair Pirates"],
  ],
  OP10: [
    ["Vinsmoke Sanji", 1, "Red", "Leader", "Leader", "Vinsmoke Family"],
    ["Donquixote Rosinante", 2, "Blue", "Leader", "Leader", "Navy"],
    ["Doflamingo", 60, "Purple", "Character", "Super Rare", "Donquixote Pirates"],
  ],
  OP11: [
    ["Enel", 1, "Yellow", "Leader", "Leader", "Sky Island"],
    ["Monkey D. Luffy", 4, "Yellow", "Leader", "Leader", "Straw Hat Crew"],
    ["Rob Lucci", 50, "Black", "Character", "Super Rare", "CP0"],
  ],
  EB01: [
    ["Monkey D. Luffy", 1, "Red", "Character", "Super Rare", "Straw Hat Crew"],
    ["Nami", 13, "Blue", "Character", "Rare", "Straw Hat Crew"],
    ["Tony Tony Chopper", 25, "Green", "Character", "Rare", "Straw Hat Crew"],
    ["Nico Robin", 61, "Purple", "Character", "Super Rare", "Straw Hat Crew"],
  ],
  PRB01: [
    ["Monkey D. Luffy", 1, "Red", "Character", "Special", "Straw Hat Crew"],
    ["Roronoa Zoro", 7, "Red", "Character", "Special", "Straw Hat Crew"],
    ["Trafalgar Law", 40, "Green", "Character", "Special", "Heart Pirates"],
    ["Portgas D. Ace", 25, "Red", "Character", "Special", "Whitebeard Pirates"],
  ],
  ST01: [
    ["Monkey D. Luffy", 1, "Red", "Leader", "Leader", "Straw Hat Crew"],
    ["Roronoa Zoro", 13, "Red", "Character", "Common", "Straw Hat Crew"],
    ["Nami", 6, "Red", "Character", "Common", "Straw Hat Crew"],
  ],
  ST02: [
    ["Eustass Kid", 1, "Green", "Leader", "Leader", "Kid Pirates"],
    ["Killer", 4, "Green", "Character", "Common", "Kid Pirates"],
  ],
  ST03: [
    ["Crocodile", 1, "Purple", "Leader", "Leader", "Seven Warlords"],
    ["Dracule Mihawk", 4, "Purple", "Character", "Super Rare", "Seven Warlords"],
    ["Boa Hancock", 7, "Purple", "Character", "Rare", "Seven Warlords"],
  ],
  ST04: [
    ["Kaido", 1, "Purple", "Leader", "Leader", "Animal Kingdom Pirates"],
    ["King", 6, "Purple", "Character", "Rare", "Animal Kingdom Pirates"],
  ],
};

const pad3 = (n) => String(n).padStart(3, "0");
const out = [];
for (const [code, list] of Object.entries(CARDS)) {
  const meta = SET_META[code];
  if (!meta) throw new Error(`missing meta ${code}`);
  for (const [name, num, domain, type, rarity, subtype] of list) {
    out.push({
      externalId: `${code}-${pad3(num)}`,
      imageUrl: `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/${code}/${code}-${pad3(num)}_EN.webp`,
      name,
      setCode: code,
      setName: meta.name,
      releaseDate: meta.date,
      collectorNumber: `${code}-${pad3(num)}`,
      number: pad3(num),
      domain,
      type,
      subtype: subtype ?? null,
      rarity,
      hp: null,
      artist: null,
      flavorText: null,
      imageThumbUrl: `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/${code}/${code}-${pad3(num)}_EN.webp`,
    });
  }
}
writeFileSync(join(process.cwd(), "prisma", "op-cards.json"), JSON.stringify(out));
console.log(`Wrote ${out.length} One Piece cards across ${Object.keys(CARDS).length} sets.`);
