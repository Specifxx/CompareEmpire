// Pokémon hubs (competitor scan, owner 2026-11-08: search-by-need hubs): "Charizard sealed", "Pikachu box", "Umbreon
// collection" are what collectors search, not a set name. One page per Pokémon at /<region>/pokemon/<slug>, listing the
// sealed products whose OWN NAME names it (a Charizard ex Premium Collection, a Pikachu tin). Whole words only: Mew is not
// Mewtwo. Indexed only with POKEMON_INDEX_MIN comparable products in the region (owner: 3+), and only in the regions whose
// detail pages Google is asked to index (lib/index-tiers.ts INDEXED_DETAIL_REGIONS). PURE. DECISIONS.md 2026-11-08.

export interface PokemonHub {
  slug: string;
  name: string;
}

export const POKEMON_INDEX_MIN = 3;

// The Pokémon sealed product is named after (Bill's competitor scan list + every name on 3+ products, 2026-11-08). A name is
// added here only when it is a Pokémon (not a trainer, a set or a mechanic: no "Mega", "Paldea", "Team Rocket").
const NAMES = [
  "Charizard", "Pikachu", "Eevee", "Umbreon", "Sylveon", "Espeon", "Vaporeon", "Jolteon", "Flareon", "Leafeon", "Glaceon",
  "Mewtwo", "Mew", "Gengar", "Lucario", "Greninja", "Gardevoir", "Dragonite", "Snorlax", "Charmander", "Squirtle", "Bulbasaur",
  "Blastoise", "Venusaur", "Lapras", "Gyarados", "Ditto", "Mimikyu", "Tyranitar", "Arceus", "Rayquaza", "Lugia", "Giratina",
  "Zacian", "Zamazenta", "Koraidon", "Miraidon", "Ogerpon", "Terapagos", "Meowscarada", "Skeledirge", "Quaquaval",
  "Armarouge", "Ceruledge", "Zapdos", "Moltres", "Articuno", "Darkrai", "Deoxys", "Latias", "Latios", "Kyogre", "Groudon",
  "Dialga", "Palkia", "Zekrom", "Reshiram", "Xerneas", "Yveltal", "Calyrex", "Ampharos", "Zoroark", "Alakazam", "Pidgeot",
];

export const pokemonSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const POKEMON: PokemonHub[] = NAMES.map((name) => ({ name, slug: pokemonSlug(name) }));
export const POKEMON_BY_SLUG = new Map(POKEMON.map((p) => [p.slug, p]));

const RE = new Map(POKEMON.map((p) => [p.slug, new RegExp(`(?:^|[^A-Za-z])${p.name.replace(/[-]/g, "[- ]?")}(?=$|[^A-Za-z])`, "i")]));

/** Does this product name name the Pokémon (whole word)? */
export const namesPokemon = (hub: PokemonHub, productName: string) => RE.get(hub.slug)!.test(productName);

/** Every Pokémon a product name names. */
export const pokemonOfName = (productName: string) => POKEMON.filter((p) => namesPokemon(p, productName));

/** The Postgres regex for the same match (word boundaries \m and \M), for the database read mode. */
export const pokemonSqlPattern = (hub: PokemonHub) => `\\m${hub.name.replace(/[-]/g, "[- ]?")}\\M`;

export const pokemonPath = (region: string, slug: string) => `/${region}/pokemon/${slug}`;
