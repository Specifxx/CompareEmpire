// The Magic: The Gathering set catalogue used across MTGCompare, newest first.
// (Export names kept generic-compatible with the shared component layer.)
export interface PokemonSet {
  code: string;
  name: string;
  slug: string;
  series: string;
  releaseDate: string;
  total: number;
  logo: string | null;
  symbol: string | null;
}
const S = (
  code: string,
  name: string,
  slug: string,
  series: string,
  releaseDate: string,
  total: number
): PokemonSet => ({ code, name, slug, series, releaseDate, total, logo: null, symbol: null });

export const POKEMON_SETS: PokemonSet[] = [
  S("fin", "Final Fantasy", "final-fantasy", "Universes Beyond", "2025/06/13", 309),
  S("tdm", "Tarkir: Dragonstorm", "tarkir-dragonstorm", "Standard", "2025/04/11", 286),
  S("dft", "Aetherdrift", "aetherdrift", "Standard", "2025/02/14", 271),
  S("fdn", "Foundations", "foundations", "Core", "2024/11/15", 281),
  S("dsk", "Duskmourn: House of Horror", "duskmourn", "Standard", "2024/09/27", 286),
  S("blb", "Bloomburrow", "bloomburrow", "Standard", "2024/08/02", 281),
  S("mh3", "Modern Horizons 3", "modern-horizons-3", "Modern Horizons", "2024/06/14", 303),
  S("otj", "Outlaws of Thunder Junction", "outlaws-of-thunder-junction", "Standard", "2024/04/19", 276),
  S("mkm", "Murders at Karlov Manor", "murders-at-karlov-manor", "Standard", "2024/02/09", 286),
  S("lci", "The Lost Caverns of Ixalan", "lost-caverns-of-ixalan", "Standard", "2023/11/17", 291),
  S("woe", "Wilds of Eldraine", "wilds-of-eldraine", "Standard", "2023/09/08", 276),
  S("ltr", "The Lord of the Rings: Tales of Middle-earth", "lord-of-the-rings", "Universes Beyond", "2023/06/23", 281),
  S("mom", "March of the Machine", "march-of-the-machine", "Phyrexia", "2023/04/21", 291),
  S("one", "Phyrexia: All Will Be One", "phyrexia-all-will-be-one", "Phyrexia", "2023/02/03", 271),
  S("bro", "The Brothers' War", "the-brothers-war", "Standard", "2022/11/18", 287),
  S("dmu", "Dominaria United", "dominaria-united", "Standard", "2022/09/09", 281),
  S("snc", "Streets of New Capenna", "streets-of-new-capenna", "Standard", "2022/04/29", 281),
  S("neo", "Kamigawa: Neon Dynasty", "kamigawa-neon-dynasty", "Standard", "2022/02/18", 302),
  S("vow", "Innistrad: Crimson Vow", "innistrad-crimson-vow", "Innistrad", "2021/11/19", 277),
  S("mid", "Innistrad: Midnight Hunt", "innistrad-midnight-hunt", "Innistrad", "2021/09/24", 277),
  S("afr", "Adventures in the Forgotten Realms", "adventures-in-the-forgotten-realms", "Universes Beyond", "2021/07/23", 281),
  S("stx", "Strixhaven: School of Mages", "strixhaven", "Standard", "2021/04/23", 275),
  S("khm", "Kaldheim", "kaldheim", "Standard", "2021/02/05", 285),
  S("znr", "Zendikar Rising", "zendikar-rising", "Standard", "2020/09/25", 280),
  S("m21", "Core Set 2021", "core-set-2021", "Core", "2020/07/03", 274),
  S("eld", "Throne of Eldraine", "throne-of-eldraine", "Standard", "2019/10/04", 269),
  S("war", "War of the Spark", "war-of-the-spark", "Standard", "2019/05/03", 264),
  S("rna", "Ravnica Allegiance", "ravnica-allegiance", "Ravnica", "2019/01/25", 259),
  S("grn", "Guilds of Ravnica", "guilds-of-ravnica", "Ravnica", "2018/10/05", 259),
  S("dom", "Dominaria", "dominaria", "Standard", "2018/04/27", 269),
  S("kld", "Kaladesh", "kaladesh", "Standard", "2016/09/30", 264),
  S("ktk", "Khans of Tarkir", "khans-of-tarkir", "Tarkir", "2014/09/26", 269),
  S("ths", "Theros", "theros", "Theros", "2013/09/27", 249),
  S("isd", "Innistrad", "innistrad", "Innistrad", "2011/09/30", 264),
  S("zen", "Zendikar", "zendikar", "Zendikar", "2009/10/02", 249),
  S("rav", "Ravnica: City of Guilds", "ravnica-city-of-guilds", "Ravnica", "2005/10/07", 306),
  S("mrd", "Mirrodin", "mirrodin", "Mirrodin", "2003/10/02", 306),
  S("inv", "Invasion", "invasion", "Invasion", "2000/10/02", 350),
  S("usg", "Urza's Saga", "urzas-saga", "Urza", "1998/10/12", 350),
  S("tmp", "Tempest", "tempest", "Tempest", "1997/10/14", 350),
  S("mir", "Mirage", "mirage", "Mirage", "1996/10/08", 350),
  S("leg", "Legends", "legends", "Vintage", "1994/06/01", 310),
  S("arn", "Arabian Nights", "arabian-nights", "Vintage", "1993/12/17", 92),
  S("2ed", "Unlimited Edition", "unlimited-edition", "Vintage", "1993/12/01", 302),
  S("leb", "Limited Edition Beta", "beta", "Vintage", "1993/10/01", 302),
  S("lea", "Limited Edition Alpha", "alpha", "Vintage", "1993/08/05", 295),
];
