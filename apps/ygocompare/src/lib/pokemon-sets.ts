// The Yu-Gi-Oh! TCG set catalogue used across YGOCompare, newest first.
export interface PokemonSet {
  code: string; name: string; slug: string; series: string;
  releaseDate: string; total: number; logo: string | null; symbol: string | null;
}
const S = (code: string, name: string, slug: string, series: string, releaseDate: string, total: number): PokemonSet =>
  ({ code, name, slug, series, releaseDate, total, logo: null, symbol: null });

export const POKEMON_SETS: PokemonSet[] = [
  S("ALIN", "Alliance Insight", "alliance-insight", "Core Set", "2025/02/07", 100),
  S("SUDA", "Supreme Darkness", "supreme-darkness", "Core Set", "2025/01/17", 100),
  S("ROTA", "Rage of the Abyss", "rage-of-the-abyss", "Core Set", "2024/10/24", 100),
  S("INFO", "Infinite Forbidden", "infinite-forbidden", "Core Set", "2024/07/25", 101),
  S("RA02", "25th Anniversary Rarity Collection II", "rarity-collection-2", "Rarity Collection", "2024/05/24", 150),
  S("LEDE", "Legacy of Destruction", "legacy-of-destruction", "Core Set", "2024/04/19", 101),
  S("PHNI", "Phantom Nightmare", "phantom-nightmare", "Core Set", "2024/02/08", 101),
  S("AGOV", "Age of Overlord", "age-of-overlord", "Core Set", "2023/10/19", 101),
  S("RA01", "25th Anniversary Rarity Collection", "rarity-collection", "Rarity Collection", "2023/09/08", 152),
  S("MAZE", "Maze of Memories", "maze-of-memories", "Special Booster", "2023/08/04", 75),
  S("DUNE", "Duelist Nexus", "duelist-nexus", "Core Set", "2023/07/27", 101),
  S("POTE", "Power of the Elements", "power-of-the-elements", "Core Set", "2022/08/04", 101),
  S("BODE", "Burst of Destiny", "burst-of-destiny", "Core Set", "2021/11/05", 101),
  S("GFTP", "Ghosts From the Past", "ghosts-from-the-past", "Special Set", "2021/04/16", 132),
  S("SOD", "Soul of the Duelist", "soul-of-the-duelist", "Core Set", "2004/10/12", 60),
  S("IOC", "Invasion of Chaos", "invasion-of-chaos", "Core Set", "2004/03/01", 113),
  S("LON", "Labyrinth of Nightmare", "labyrinth-of-nightmare", "Core Set", "2003/03/01", 92),
  S("PSV", "Pharaoh's Servant", "pharaohs-servant", "Core Set", "2002/10/20", 96),
  S("SRL", "Spell Ruler", "spell-ruler", "Core Set", "2002/09/16", 104),
  S("MRD", "Metal Raiders", "metal-raiders", "Core Set", "2002/06/26", 144),
  S("LOB", "Legend of Blue Eyes White Dragon", "legend-of-blue-eyes-white-dragon", "Core Set", "2002/03/08", 126),
];
