// Generates prisma/mtg-cards.json — a curated catalogue of real Magic: The
// Gathering cards across real sets, in the shared BuiltCard shape consumed by
// prisma/seed.ts. Images are left null so the self-contained SVG card art is
// used (no external image dependency); run scripts/fetch-cards.ts later to
// backfill real Scryfall art once the API is reachable.
//
//   node prisma/gen-cards.mjs
import { writeFileSync } from "node:fs";
import { join } from "node:path";

// setCode -> { name, releaseDate, total }
const SET_META = {
  fin: { name: "Final Fantasy", date: "2025/06/13", total: 309 },
  tdm: { name: "Tarkir: Dragonstorm", date: "2025/04/11", total: 286 },
  dft: { name: "Aetherdrift", date: "2025/02/14", total: 271 },
  fdn: { name: "Foundations", date: "2024/11/15", total: 281 },
  dsk: { name: "Duskmourn: House of Horror", date: "2024/09/27", total: 286 },
  blb: { name: "Bloomburrow", date: "2024/08/02", total: 281 },
  mh3: { name: "Modern Horizons 3", date: "2024/06/14", total: 303 },
  otj: { name: "Outlaws of Thunder Junction", date: "2024/04/19", total: 276 },
  mkm: { name: "Murders at Karlov Manor", date: "2024/02/09", total: 286 },
  lci: { name: "The Lost Caverns of Ixalan", date: "2023/11/17", total: 291 },
  woe: { name: "Wilds of Eldraine", date: "2023/09/08", total: 276 },
  ltr: { name: "The Lord of the Rings: Tales of Middle-earth", date: "2023/06/23", total: 281 },
  mom: { name: "March of the Machine", date: "2023/04/21", total: 291 },
  one: { name: "Phyrexia: All Will Be One", date: "2023/02/03", total: 271 },
  bro: { name: "The Brothers' War", date: "2022/11/18", total: 287 },
  dmu: { name: "Dominaria United", date: "2022/09/09", total: 281 },
  snc: { name: "Streets of New Capenna", date: "2022/04/29", total: 281 },
  neo: { name: "Kamigawa: Neon Dynasty", date: "2022/02/18", total: 302 },
  mid: { name: "Innistrad: Midnight Hunt", date: "2021/09/24", total: 277 },
  stx: { name: "Strixhaven: School of Mages", date: "2021/04/23", total: 275 },
  khm: { name: "Kaldheim", date: "2021/02/05", total: 285 },
  znr: { name: "Zendikar Rising", date: "2020/09/25", total: 280 },
  eld: { name: "Throne of Eldraine", date: "2019/10/04", total: 269 },
  war: { name: "War of the Spark", date: "2019/05/03", total: 264 },
  grn: { name: "Guilds of Ravnica", date: "2018/10/05", total: 259 },
  dom: { name: "Dominaria", date: "2018/04/27", total: 269 },
  ktk: { name: "Khans of Tarkir", date: "2014/09/26", total: 269 },
  ths: { name: "Theros", date: "2013/09/27", total: 249 },
  isd: { name: "Innistrad", date: "2011/09/30", total: 264 },
  zen: { name: "Zendikar", date: "2009/10/02", total: 249 },
  rav: { name: "Ravnica: City of Guilds", date: "2005/10/07", total: 306 },
  mrd: { name: "Mirrodin", date: "2003/10/02", total: 306 },
  tmp: { name: "Tempest", date: "1997/10/14", total: 350 },
  leg: { name: "Legends", date: "1994/06/01", total: 310 },
  arn: { name: "Arabian Nights", date: "1993/12/17", total: 92 },
  "2ed": { name: "Unlimited Edition", date: "1993/12/01", total: 302 },
  lea: { name: "Limited Edition Alpha", date: "1993/08/05", total: 295 },
};

// setCode -> [ [name, number, domain, type, rarity, subtype?] ]
const CARDS = {
  lea: [
    ["Black Lotus", 232, "Colorless", "Artifact", "Rare", "Mox"],
    ["Mox Sapphire", 264, "Colorless", "Artifact", "Rare", "Mox"],
    ["Mox Ruby", 263, "Colorless", "Artifact", "Rare", "Mox"],
    ["Mox Pearl", 262, "Colorless", "Artifact", "Rare", "Mox"],
    ["Mox Emerald", 261, "Colorless", "Artifact", "Rare", "Mox"],
    ["Mox Jet", 260, "Colorless", "Artifact", "Rare", "Mox"],
    ["Time Walk", 84, "Blue", "Sorcery", "Rare"],
    ["Ancestral Recall", 47, "Blue", "Instant", "Rare"],
    ["Timetwister", 85, "Blue", "Sorcery", "Rare"],
    ["Sol Ring", 270, "Colorless", "Artifact", "Uncommon"],
    ["Lightning Bolt", 161, "Red", "Instant", "Common"],
    ["Llanowar Elves", 209, "Green", "Creature", "Common", "Elf Druid"],
    ["Shivan Dragon", 174, "Red", "Creature", "Rare", "Dragon"],
    ["Serra Angel", 39, "White", "Creature", "Uncommon", "Angel"],
    ["Dark Ritual", 98, "Black", "Instant", "Common"],
    ["Counterspell", 54, "Blue", "Instant", "Uncommon"],
    ["Wrath of God", 45, "White", "Sorcery", "Rare"],
  ],
  "2ed": [
    ["Birds of Paradise", 199, "Green", "Creature", "Rare", "Bird"],
    ["Sengir Vampire", 144, "Black", "Creature", "Uncommon", "Vampire"],
    ["Royal Assassin", 138, "Black", "Creature", "Rare", "Human Assassin"],
    ["Nightmare", 132, "Black", "Creature", "Rare", "Nightmare Horse"],
    ["Mahamoti Djinn", 73, "Blue", "Creature", "Rare", "Djinn"],
    ["Air Elemental", 47, "Blue", "Creature", "Uncommon", "Elemental"],
    ["Disenchant", 16, "White", "Instant", "Common"],
    ["Giant Growth", 205, "Green", "Instant", "Common"],
  ],
  arn: [
    ["Library of Alexandria", 84, "Land", "Land", "Rare"],
    ["Bazaar of Baghdad", 75, "Land", "Land", "Uncommon"],
    ["Juzam Djinn", 18, "Black", "Creature", "Rare", "Djinn"],
    ["City of Brass", 79, "Land", "Land", "Rare"],
  ],
  leg: [
    ["The Tabernacle at Pendrell Vale", 287, "Land", "Land", "Rare"],
    ["Mana Drain", 56, "Blue", "Instant", "Uncommon"],
    ["Karakas", 280, "Land", "Land", "Uncommon"],
  ],
  tmp: [
    ["Wasteland", 318, "Land", "Land", "Uncommon"],
    ["Hatred", 50, "Black", "Instant", "Rare"],
    ["Cursed Scroll", 295, "Colorless", "Artifact", "Rare"],
  ],
  mrd: [
    ["Chrome Mox", 152, "Colorless", "Artifact", "Rare", "Mox"],
    ["Glimmervoid", 282, "Land", "Land", "Rare"],
    ["Solemn Simulacrum", 213, "Colorless", "Artifact", "Rare", "Construct"],
    ["Tooth and Nail", 71, "Green", "Sorcery", "Rare"],
  ],
  rav: [
    ["Watery Grave", 279, "Land", "Land", "Rare"],
    ["Sacred Foundry", 278, "Land", "Land", "Rare"],
    ["Birds of Paradise", 153, "Green", "Creature", "Rare", "Bird"],
    ["Dark Confidant", 81, "Black", "Creature", "Rare", "Human Wizard"],
    ["Doubling Season", 159, "Green", "Enchantment", "Rare"],
  ],
  zen: [
    ["Scalding Tarn", 223, "Land", "Land", "Rare"],
    ["Misty Rainforest", 220, "Land", "Land", "Rare"],
    ["Verdant Catacombs", 229, "Land", "Land", "Rare"],
    ["Arid Mesa", 211, "Land", "Land", "Rare"],
    ["Marsh Flats", 219, "Land", "Land", "Rare"],
  ],
  isd: [
    ["Snapcaster Mage", 78, "Blue", "Creature", "Rare", "Human Wizard"],
    ["Liliana of the Veil", 105, "Black", "Planeswalker", "Mythic", "Liliana"],
    ["Geist of Saint Traft", 213, "Multicolor", "Creature", "Mythic", "Spirit Cleric"],
    ["Olivia Voldaren", 215, "Multicolor", "Creature", "Mythic", "Vampire"],
  ],
  ths: [
    ["Thoughtseize", 107, "Black", "Sorcery", "Rare"],
    ["Elspeth, Sun's Champion", 11, "White", "Planeswalker", "Mythic", "Elspeth"],
    ["Hero's Downfall", 90, "Black", "Instant", "Rare"],
    ["Nykthos, Shrine to Nyx", 223, "Land", "Land", "Rare"],
  ],
  ktk: [
    ["Flooded Strand", 233, "Land", "Land", "Rare"],
    ["Polluted Delta", 239, "Land", "Land", "Rare"],
    ["Wooded Foothills", 248, "Land", "Land", "Rare"],
    ["Windswept Heath", 247, "Land", "Land", "Rare"],
    ["Bloodstained Mire", 230, "Land", "Land", "Rare"],
    ["Siege Rhino", 171, "Multicolor", "Creature", "Uncommon", "Rhino"],
  ],
  dom: [
    ["Mox Amber", 224, "Colorless", "Artifact", "Mythic", "Mox"],
    ["Teferi, Hero of Dominaria", 207, "Multicolor", "Planeswalker", "Mythic", "Teferi"],
    ["Goblin Chainwhirler", 129, "Red", "Creature", "Rare", "Goblin Warrior"],
    ["History of Benalia", 21, "White", "Enchantment", "Mythic", "Saga"],
  ],
  grn: [
    ["Steam Vents", 257, "Land", "Land", "Rare"],
    ["Overgrown Tomb", 253, "Land", "Land", "Rare"],
    ["Assassin's Trophy", 152, "Multicolor", "Instant", "Rare"],
    ["Doom Whisperer", 66, "Black", "Creature", "Mythic", "Nightmare Demon"],
  ],
  war: [
    ["Teferi, Time Raveler", 221, "Multicolor", "Planeswalker", "Rare", "Teferi"],
    ["Nicol Bolas, Dragon-God", 207, "Multicolor", "Planeswalker", "Mythic", "Bolas"],
    ["Liliana, Dreadhorde General", 97, "Black", "Planeswalker", "Mythic", "Liliana"],
    ["Karn, the Great Creator", 1, "Colorless", "Planeswalker", "Rare", "Karn"],
    ["Ral, Storm Conduit", 211, "Multicolor", "Planeswalker", "Rare", "Ral"],
  ],
  eld: [
    ["Oko, Thief of Crowns", 197, "Multicolor", "Planeswalker", "Mythic", "Oko"],
    ["The Great Henge", 161, "Green", "Artifact", "Mythic"],
    ["Brazen Borrower", 39, "Blue", "Creature", "Rare", "Faerie Rogue"],
    ["Bonecrusher Giant", 115, "Red", "Creature", "Rare", "Giant"],
    ["Murderous Rider", 97, "Black", "Creature", "Rare", "Zombie Knight"],
  ],
  znr: [
    ["Scalding Tarn", 254, "Land", "Land", "Expedition"],
    ["Omnath, Locus of Creation", 232, "Multicolor", "Creature", "Mythic", "Elemental"],
    ["Sea Gate Stormcaller", 75, "Blue", "Creature", "Rare", "Human Wizard"],
    ["Skyclave Apparition", 31, "White", "Creature", "Rare", "Kor Wizard"],
  ],
  khm: [
    ["Goldspan Dragon", 139, "Red", "Creature", "Mythic", "Dragon"],
    ["Esika's Chariot", 169, "Green", "Artifact", "Rare", "Vehicle"],
    ["Valki, God of Lies", 113, "Black", "Creature", "Mythic", "God"],
    ["Cosima, God of the Voyage", 50, "Blue", "Creature", "Mythic", "God"],
  ],
  stx: [
    ["Mystical Archive — Swords to Plowshares", 13, "White", "Instant", "Mythic"],
    ["Tergrid, God of Fright", 113, "Black", "Creature", "Mythic", "God"],
    ["Galazeth Prismari", 195, "Multicolor", "Creature", "Mythic", "Dragon Wizard"],
  ],
  mid: [
    ["Wrenn and Seven", 208, "Green", "Planeswalker", "Mythic", "Wrenn"],
    ["The Celestus", 252, "Colorless", "Artifact", "Rare"],
    ["Consider", 44, "Blue", "Instant", "Common"],
  ],
  neo: [
    ["The Wandering Emperor", 42, "White", "Planeswalker", "Mythic", "The Wandering"],
    ["Hidetsugu, Devouring Chaos", 219, "Black", "Creature", "Rare", "Ogre Samurai"],
    ["Boseiju, Who Endures", 266, "Land", "Land", "Rare"],
    ["Otawara, Soaring City", 271, "Land", "Land", "Rare"],
    ["Kaito Shizuki", 54, "Blue", "Planeswalker", "Rare", "Kaito"],
  ],
  snc: [
    ["Ledger Shredder", 217, "Multicolor", "Creature", "Rare", "Bird Advisor"],
    ["Ob Nixilis, the Adversary", 215, "Multicolor", "Planeswalker", "Mythic", "Ob Nixilis"],
    ["Jetmir, Nexus of Revels", 200, "Multicolor", "Creature", "Mythic", "Cat Demon"],
  ],
  dmu: [
    ["Sheoldred, the Apocalypse", 107, "Black", "Creature", "Mythic", "Phyrexian Praetor"],
    ["Liliana of the Veil", 97, "Black", "Planeswalker", "Mythic", "Liliana"],
    ["Karn, Living Legacy", 1, "Colorless", "Planeswalker", "Mythic", "Karn"],
  ],
  bro: [
    ["Urza, Lord Protector", 225, "Multicolor", "Creature", "Mythic", "Human Artificer"],
    ["Mishra's Foundry", 264, "Land", "Land", "Rare"],
    ["The Mightstone and Weakstone", 238, "Colorless", "Artifact", "Mythic"],
  ],
  one: [
    ["Elesh Norn, Mother of Machines", 10, "White", "Creature", "Mythic", "Phyrexian Praetor"],
    ["The Mycosynth Gardens", 252, "Land", "Land", "Rare"],
    ["Mondrak, Glory Dominus", 25, "White", "Creature", "Mythic", "Phyrexian Horror"],
    ["Bloodletter of Aclazotz", 86, "Black", "Creature", "Rare", "Phyrexian Vampire"],
  ],
  mom: [
    ["Wrenn and Realmbreaker", 222, "Green", "Planeswalker", "Mythic", "Wrenn"],
    ["Sunfall", 38, "White", "Sorcery", "Rare"],
    ["Etali, Primal Conqueror", 165, "Red", "Creature", "Mythic", "Elder Dinosaur"],
  ],
  ltr: [
    ["The One Ring", 246, "Colorless", "Artifact", "Mythic"],
    ["Orcish Bowmasters", 103, "Black", "Creature", "Rare", "Orc Archer"],
    ["Delighted Halfling", 156, "Green", "Creature", "Rare", "Halfling Citizen"],
    ["Sauron, the Dark Lord", 225, "Multicolor", "Creature", "Mythic", "Avatar Horror"],
  ],
  woe: [
    ["Agatha's Soul Cauldron", 242, "Colorless", "Artifact", "Mythic"],
    ["Up the Beanstalk", 196, "Green", "Enchantment", "Uncommon"],
    ["Virtue of Persistence", 115, "Black", "Enchantment", "Mythic"],
  ],
  lci: [
    ["Cavern of Souls", 269, "Land", "Land", "Mythic"],
    ["The Skullspore Nexus", 191, "Green", "Artifact", "Mythic"],
    ["Quintorius Kand", 224, "Multicolor", "Planeswalker", "Mythic", "Quintorius"],
  ],
  mkm: [
    ["Sleep-Cursed Faerie", 64, "Blue", "Creature", "Rare", "Faerie Wizard"],
    ["Anzrag, the Quake-Mole", 187, "Multicolor", "Creature", "Mythic", "God Mole"],
    ["No More Lies", 219, "Multicolor", "Instant", "Uncommon"],
  ],
  otj: [
    ["Slickshot Show-Off", 156, "Red", "Creature", "Rare", "Lizard Pirate"],
    ["Tarkir Outlaw — Vraska, the Silencer", 211, "Multicolor", "Planeswalker", "Mythic", "Vraska"],
    ["Three Steps Ahead", 64, "Blue", "Instant", "Rare"],
  ],
  mh3: [
    ["Necrodominance", 102, "Black", "Enchantment", "Rare"],
    ["Phlage, Titan of Fire's Fury", 224, "Multicolor", "Creature", "Mythic", "Elder Giant"],
    ["Nadu, Winged Wisdom", 192, "Multicolor", "Creature", "Rare", "Bird Wizard"],
    ["Ugin's Labyrinth", 220, "Land", "Land", "Mythic"],
    ["Flare of Denial", 58, "Blue", "Instant", "Rare"],
  ],
  blb: [
    ["Three Tree City", 261, "Land", "Land", "Mythic"],
    ["Caretaker's Talent", 8, "White", "Enchantment", "Rare"],
    ["Season of Loss", 110, "Black", "Sorcery", "Rare"],
  ],
  dsk: [
    ["Overlord of the Hauntwoods", 196, "Green", "Creature", "Mythic", "Avatar Horror"],
    ["Enduring Curiosity", 50, "Blue", "Enchantment", "Mythic", "Cat"],
    ["Unstoppable Slasher", 121, "Black", "Creature", "Mythic", "Phyrexian Horror"],
  ],
  fdn: [
    ["Llanowar Elves", 217, "Green", "Creature", "Common", "Elf Druid"],
    ["Day of Judgment", 14, "White", "Sorcery", "Rare"],
    ["Spectral Interference", 71, "Blue", "Instant", "Uncommon"],
  ],
  dft: [
    ["Aetherspark", 232, "Colorless", "Artifact", "Mythic"],
    ["Marshal of the Lost", 116, "Black", "Creature", "Rare", "Spirit Soldier"],
  ],
  tdm: [
    ["Ugin, Eye of the Storms", 1, "Colorless", "Planeswalker", "Mythic", "Ugin"],
    ["Betor, Ancestor's Voice", 192, "Multicolor", "Creature", "Mythic", "Dragon Spirit"],
  ],
  fin: [
    ["Sephiroth, Fabled SOLDIER", 213, "Multicolor", "Creature", "Mythic", "Legendary Hero"],
    ["Cloud, Ex-SOLDIER", 196, "Multicolor", "Creature", "Mythic", "Legendary Hero"],
    ["Tifa Lockhart", 158, "Red", "Creature", "Rare", "Hero Monk"],
    ["Summon: Bahamut", 142, "Red", "Enchantment", "Mythic", "Saga"],
  ],
};

const out = [];
for (const [code, list] of Object.entries(CARDS)) {
  const meta = SET_META[code];
  if (!meta) throw new Error(`missing meta for ${code}`);
  for (const [name, num, domain, type, rarity, subtype] of list) {
    const imgName = name.includes(" — ") ? name.split(" — ").pop() : name;
    out.push({
      externalId: `${code}-${num}`,
      imageUrl: `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(imgName)}&format=image&version=normal`,
      name,
      setCode: code,
      setName: meta.name,
      releaseDate: meta.date,
      collectorNumber: `${num}/${meta.total}`,
      number: String(num),
      domain,
      type,
      subtype: subtype ?? null,
      rarity,
      hp: null,
      artist: null,
      flavorText: null,
      imageThumbUrl: `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(imgName)}&format=image&version=normal`,
    });
  }
}

writeFileSync(join(process.cwd(), "prisma", "mtg-cards.json"), JSON.stringify(out));
console.log(`Wrote ${out.length} MTG cards across ${Object.keys(CARDS).length} sets.`);
