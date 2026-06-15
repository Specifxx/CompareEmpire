// Multi-game store-price importer — DexCompare's proven engine (sitemap collection
// discovery + country-priced /collections/<handle>/products.json + title→card
// resolver), generalised to Magic / One Piece / Yu-Gi-Oh!. The SAME Shopify card
// shops sell all three games, so each site gets comparable store coverage. Every
// row is a REAL product page with the store's real price + stock; a store only
// appears on a card it genuinely stocks (no dead links). TCGplayer (US/GB/NZ) is
// added in the seed separately; AU is store-only (TCGplayer doesn't serve AU).

// ── Retailers (Shopify card shops; they carry all three games). Only domain +
// market are needed — collections are auto-discovered per game per store. ──
export const RETAILERS = [
  // ---- Australia (AUD) ----
  ["cherry", "Cherry Collectables", "https://www.cherrycollectables.com.au", "AU"],
  ["ozzie", "Ozzie Collectables", "https://www.ozziecollectables.com", "AU"],
  ["finalboss", "The Final Boss Collectables", "https://thefinalbosscollectables.com.au", "AU"],
  ["adventurers", "The Adventurers Guild", "https://www.theadventurersguild.com.au", "AU"],
  ["manamarket", "Mana Market", "https://manamarket.com.au", "AU"],
  ["steelcity", "Steel City Games", "https://www.steelcitygames.com.au", "AU"],
  ["cardbot", "Cardbot", "https://cardbot.com.au", "AU"],
  ["ggadelaide", "Good Games Adelaide", "https://ggadelaide.com.au", "AU"],
  ["goodgames", "Good Games", "https://www.goodgames.com.au", "AU"],
  ["vaultgames", "Vault Games", "https://vaultgames.com.au", "AU"],
  ["mintcollectables", "Mint Collectables", "https://mintcollectables.com.au", "AU"],
  ["cardhub", "The Card Hub Australia", "https://thecardhubaustralia.com.au", "AU"],
  ["collectiblemadness", "Collectible Madness", "https://collectiblemadness.com.au", "AU"],
  ["chimera", "Chimera Gaming", "https://chimeragaming.com.au", "AU"],
  ["gamescapital", "The Games Capital", "https://www.thegamescapital.com.au", "AU"],
  ["gameology", "Gameology", "https://www.gameology.com.au", "AU"],
  ["bantertoys", "Banter Toys & Collectables", "https://bantertoys.com.au", "AU"],
  ["kingofcards", "King of Cards", "https://kingofcards.com.au", "AU"],
  ["skyfoxes", "Sky Foxes Cards", "https://skyfoxescards.com.au", "AU"],
  ["tcgsingles", "TCG Singles Australia", "https://tcgsingles.com.au", "AU"],
  ["kollecter", "Kollecter", "https://www.kollecter.com.au", "AU"],
  ["progamers", "Pro Gamers & Collectables", "https://progamers.com.au", "AU"],
  ["guf", "Guf", "https://guf.com.au", "AU"],
  ["tabletopgaminghub", "Tabletop Gaming Hub", "https://tabletopgaminghub.com.au", "AU"],
  ["trollaustralia", "Troll Australia", "https://www.trollaustralia.com.au", "AU"],
  ["kingdomofgeek", "Kingdom of Geek", "https://kingdomofgeek.com.au", "AU"],
  ["gapgames", "GAP Games", "https://www.gapgames.com.au", "AU"],
  ["hobbymaster", "Hobbymaster", "https://www.hobbymaster.com.au", "AU"],
  ["epictcg", "Epic TCG", "https://epictcg.com.au", "AU"],
  ["goodgrieftcg", "Good Grief TCG", "https://goodgrieftcg.com.au", "AU"],
  ["nextlevelgames", "Next Level Games", "https://nextlevelgames.com.au", "AU"],
  ["gameforce", "GameForce", "https://gameforce.com.au", "AU"],
  ["timelesscollectables", "Timeless Collectables", "https://timelesscollectables.com.au", "AU"],
  // ---- New Zealand (NZD) ----
  ["cardmerchant", "Card Merchant NZ", "https://cardmerchant.co.nz", "NZ"],
  ["tcgcollectornz", "TCG Collector NZ", "https://tcgcollectornz.com", "NZ"],
  ["ironknight", "Iron Knight Gaming", "https://ironknightgaming.co.nz", "NZ"],
  ["calicokeep", "Calico Keep", "https://www.calicokeep.co.nz", "NZ"],
  ["cardbotnz", "Card Bot NZ", "https://cardbot.co.nz", "NZ"],
  ["gamingdna", "Gaming DNA", "https://gamingdna.co.nz", "NZ"],
  ["shuffleandcut", "Shuffle n Cut Games", "https://www.shuffleandcutgames.co.nz", "NZ"],
  ["gameroost", "Game Roost", "https://www.gameroost.co.nz", "NZ"],
  ["vaulttcgnz", "Vault TCG", "https://www.vaulttcg.co.nz", "NZ"],
  ["cerberusgamesnz", "Cerberus Games", "https://cerberusgames.co.nz", "NZ"],
  // ---- United States (USD) — grown ----
  ["mythicstore", "The Mythic Store", "https://themythicstore.com", "US"],
  ["danireon", "Danireon Cards & Games", "https://www.danireon.com", "US"],
  ["punkouter", "PunkOuter Games", "https://punkouter.com", "US"],
  ["gglegends", "GG Legends", "https://store.gglehi.com", "US"],
  ["mistymountain", "Misty Mountain Games", "https://www.mistymountaingames.com", "US"],
  ["theboosterbox", "The Booster Box", "https://theboosterbox.com", "US"],
  ["npcollectibles", "NP Collectibles", "https://npcollectibles.com", "US"],
  ["capefear", "Cape Fear Collectibles", "https://www.capefearcollectibles.com", "US"],
  ["hobbiesville", "Hobbiesville", "https://hobbiesville.com", "US"],
  ["kanzengames", "KanZenGames", "https://kanzengames.com", "US"],
  ["onestoptcg", "OneStopTCG", "https://onestoptcg.com", "US"],
  ["galaxygames", "Galaxy Games LLC", "https://galaxygamesllc.com", "US"],
  ["gamersgrove", "Gamers Grove", "https://gamersgrove.com", "US"],
  ["collectorscache", "Collector's Cache", "https://collectorscache.com", "US"],
  ["eternalcardboard", "Eternal Cardboard", "https://eternalcardboard.com", "US"],
  ["channelfireball", "ChannelFireball", "https://store.channelfireball.com", "US"],
  ["guardiangames", "Guardian Games", "https://guardian-games-llc.myshopify.com", "US"],
  ["ubecard", "UbeCard", "https://ubecard.com", "US"],
  ["headsortails", "Heads or Tails Gaming", "https://heads-or-tails-gaming-inc.myshopify.com", "US"],
  ["mulliganmerchant", "Mulligan Merchant", "https://mulliganmerchant.myshopify.com", "US"],
  ["mostexcellent", "Most Excellent Gaming", "https://most-excellent-gaming-ma.myshopify.com", "US"],
  ["pegasusgames", "Pegasus Games WI", "https://pegasus-games-wi.myshopify.com", "US"],
  ["boardwalkgreenville", "Boardwalk Greenville", "https://boardwalkgreenville.myshopify.com", "US"],
  ["vegassingles", "Vegas Singles", "https://vegas.singles", "US"],
  ["tcgtemple", "TCG Temple", "https://tcgtemple.myshopify.com", "US"],
  ["cardcaverntcg", "Card Cavern Trading Cards", "https://www.cardcaverntradingcards.com", "US"],
  ["jrwhobby", "JRW Hobby Station", "https://jrwhobbystation.myshopify.com", "US"],
  ["gamenestllc", "Game Nest", "https://gamenest.myshopify.com", "US"],
  ["dragonstcg", "Dragon's Lair", "https://dragonslairaustin.myshopify.com", "US"],
  // ---- United Kingdom (GBP) — grown ----
  ["titancards", "Titan Cards", "https://titancards.co.uk", "GB"],
  ["totalcards", "Total Cards", "https://totalcards.net", "GB"],
  ["dicesaloon", "Dice Saloon", "https://dicesaloonsingles.co.uk", "GB"],
  ["lvlupgaming", "Lvl Up Gaming UK", "https://lvlupgaming.co.uk", "GB"],
  ["cardrush", "CardRush UK", "https://cardrush.co.uk", "GB"],
  ["gocardsuk", "Go Cards UK", "https://gocardsuk.co.uk", "GB"],
  ["eternacards", "Eterna Cards", "https://eternacards.co.uk", "GB"],
  ["hillscards", "Hills Cards", "https://www.hillscards.co.uk", "GB"],
  ["chuscards", "Chu's Cards", "https://chuscards.com", "GB"],
  ["manaleak_uk", "Manaleak", "https://www.manaleak.com", "GB"],
  ["magicmadhouse_uk", "Magic Madhouse", "https://www.magicmadhouse.co.uk", "GB"],
  ["axionnow", "Axion Now", "https://www.axionnow.com", "GB"],
  ["goblingaming", "Goblin Gaming", "https://www.goblingaming.co.uk", "GB"],
  ["hairyt", "Hairy T", "https://www.hairyt.com", "GB"],
  ["cardempire", "Card Empire", "https://www.cardempire.co.uk", "GB"],
  ["travellingman", "Travelling Man", "https://travellingman.com", "GB"],
  ["spellboundgames", "Spellbound Games", "https://www.spellboundgames.co.uk", "GB"],
  ["fanboythree", "Fan Boy Three", "https://fanboythree.co.uk", "GB"],
  ["bossminis", "Boss Minis", "https://bossminis.co.uk", "GB"],
  ["cardgoblin", "Card Goblin", "https://www.cardgoblin.shop", "GB"],
  ["doublesleeved", "Double Sleeved", "https://www.doublesleeved.co.uk", "GB"],
  ["collectbydesign", "Collect by Design", "https://www.collectbydesign.co.uk", "GB"],
  ["jarvvos", "Jarvvos", "https://www.jarvvos.co.uk", "GB"],
  ["magicstronghold_gb", "Magic Stronghold", "https://magicstrongholdgames.co.uk", "GB"],
  // ---- Additional candidates (self-filtering: appear only where they stock the card) ----
  // North America (queried with ?country=US → USD via Shopify Markets)
  ["fourohone", "401 Games", "https://store.401games.ca", "US"],
  ["atomicempire", "Atomic Empire", "https://www.atomicempire.com", "US"],
  ["coretcg", "Core TCG", "https://coretcg.com", "US"],
  ["fusiongaming", "Fusion Gaming", "https://www.fusiongamingonline.com", "US"],
  ["nerdzcollectibles", "Nerdz Collectibles", "https://nerdzcollectibles.com", "US"],
  // Australia
  ["sanctuarygaming", "Sanctuary Gaming", "https://sanctuarygamingstore.com.au", "AU"],
  ["eternalgames", "Eternal Games", "https://eternalgames.com.au", "AU"],
  ["houseofcards", "House of Cards", "https://houseofcards.com.au", "AU"],
  ["kapow", "Kapow Comics", "https://kapowcomics.com.au", "AU"],
  ["lonewolfgames", "Lone Wolf Games", "https://lonewolfgames.com.au", "AU"],
  // Australia — additional shops from the RiftCompare/DexCompare network (carry singles).
  ["plenty", "Plenty of Games", "https://plenty-of-games-au.myshopify.com", "AU"],
  ["pokebox", "PokéBox", "https://www.pokebox.com.au", "AU"],
  ["spellroo", "Spellroo Gaming", "https://spellroogaming.com.au", "AU"],
  ["spindown", "Spindown", "https://spindown.com.au", "AU"],
  ["ggtcg", "Good Games TCG", "https://tcg.goodgames.com.au", "AU"],
  ["irresistibleforce", "Irresistible Force TCG", "https://tcg.irresistibleforce.com.au", "AU"],
  ["area52", "Area52 Hobart", "https://singles.area52.com.au", "AU"],
  ["gamesempire", "Games Empire", "https://gamesempire.com.au", "AU"],
  ["alphacardworld", "Alpha Card World", "https://alphacardworld.com.au", "AU"],
  ["thecardvault", "The Card Vault", "https://thecardvault.com.au", "AU"],
  ["gauntletgames", "Gauntlet Games", "https://gauntletgames.com.au", "AU"],
  ["tabletoptactics", "Tabletop Tactics", "https://tabletoptactics.com.au", "AU"],
  ["bird", "Bird Keeper", "https://birdkeeper.com.au", "AU"],
  ["mtgaus", "Good Games Online", "https://goodgamesonline.com.au", "AU"],
  // United Kingdom
  ["pristineygo", "Pristine TCG", "https://pristinepokemon.co.uk", "GB"],
  ["mtgmate", "MTG Mate", "https://www.mtgmate.co.uk", "GB"],
  ["thehiddenhoard", "The Hidden Hoard", "https://www.thehiddenhoard.co.uk", "GB"],
  ["gamescrusade", "Games Crusade", "https://gamescrusade.com", "GB"],
  // New Zealand
  ["mtgnz", "Mortal Games", "https://mortalgames.co.nz", "NZ"],
  ["shieldgames", "Shield Games", "https://shieldgames.co.nz", "NZ"],
];

const CUR = { AU: "AUD", NZ: "NZD", US: "USD", GB: "GBP" };
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36", Accept: "application/json, text/plain, */*" };
const TIMEOUT = 20000;

// Per-game collection-handle signal + match mode.
const GAME = {
  magic: { coll: /(magic|mtg|gathering)/i, mode: "name" },
  "one-piece-card-game": { coll: /(one[\s-]?piece|optcg|onepiece)/i, mode: "code" },
  yugioh: { coll: /(yu[\s-]?gi[\s-]?oh|yugioh|\bygo\b)/i, mode: "code" },
};

async function fetchText(url) {
  try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT) }); return r.ok ? await r.text() : null; } catch { return null; }
}

const NON_SINGLE = /sealed|booster|box|bundle|preorder|pre-order|accessor|playmat|sleeve|merch|deck-?box|gift|case|\btin\b|blister|collection-box|plush|funko/i;

export async function discoverCollections(base, game) {
  const sig = GAME[game].coll;
  const handles = new Set();
  const index = await fetchText(`${base}/sitemap.xml`);
  let sitemaps = index ? Array.from(index.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]).filter((u) => /sitemap_collections/i.test(u)) : [];
  if (!sitemaps.length) sitemaps = [`${base}/sitemap_collections_1.xml`];
  for (const sm of sitemaps.slice(0, 8)) {
    const xml = await fetchText(sm);
    if (!xml) continue;
    for (const m of xml.matchAll(/\/collections\/([^<\/?#"]+)/g)) {
      const h = m[1];
      if (sig.test(h) && /single/i.test(h) && !NON_SINGLE.test(h) && !/\.(jpe?g|png|gif|webp|svg)$/i.test(h)) handles.add(h);
    }
    if (!handles.size) for (const m of xml.matchAll(/\/collections\/([^<\/?#"]+)/g)) {
      const h = m[1];
      if (sig.test(h) && !NON_SINGLE.test(h) && !/\.(jpe?g|png|gif|webp|svg)$/i.test(h)) handles.add(h);
    }
  }
  return Array.from(handles);
}

async function fetchCollection(base, handle, country) {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const url = `${base}/collections/${handle}/products.json?limit=250&page=${page}&country=${country}`;
    let data;
    try {
      const res = await fetch(url, { headers: { ...UA, "Cache-Control": "no-cache" }, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });
      if (!res.ok) break;
      data = await res.json();
    } catch { break; }
    if (!data.products?.length) break;
    all.push(...data.products);
    if (data.products.length < 250) break;
  }
  return all;
}

const TOK_STOP = new Set(["magic","the","gathering","mtg","yugioh","yu","gi","oh","one","piece","optcg","card","cards","single","singles","tcg","a","an","of","and","nm","near","mint","lightly","moderately","heavily","played","lp","mp","hp","dmg","damaged","foil","nonfoil","non","etched","borderless","extended","showcase","retro","promo","parallel","alternate","alt","art","leader","rare","common","uncommon","mythic","super","secret","ultra","full","english","japanese","jpn","eng","graded","psa","bgs","cgc"]);
function tokenize(s) { return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(" ").filter((w)=>w.length>1 && !TOK_STOP.has(w) && !/^\d+$/.test(w)); }
const SET_GENERIC = new Set(["edition","set","series","the","of","and"]);
const BASIC = /^(plains|island|swamp|mountain|forest|wastes)$/;
// Region-agnostic card code: set-code + number, dropping a language infix so a UK
// store's "ROTD-036" / "ROTD-EN036" and our "ROTD-EN036" all key to "rotd036"
// (set-code + number uniquely identifies the card across languages). One Piece
// codes have no infix ("OP01-001" → "op01001"), so they're unaffected.
function codeKey(s) {
  const m = String(s || "").toLowerCase().match(/([a-z0-9]{2,6})-([a-z]{0,3})(\d{1,4})/);
  return m ? m[1] + m[3] : "";
}

const MULTI_CARD = /\b(playset|lot|lots|bundle|joblot|job lot|x\s*\d+|\d+\s*x|set of|complete set|full set|bulk)\b/i;
const NON_CARD = /\b(funko|pop!?\s*(?:vinyl|games)|plush|action\s*figure|portfolio|binder|sleeves?|toploaders?|top\s?loader|playmat|deck\s?box|card\s?case|storage\s*(?:box|case)|booster|elite\s*trainer|premium\s*collection|collection\s*box|gift\s*(?:box|set)|\btin\b|\bbox\b|display|blister|theme\s*deck|starter\s*(?:deck|set)|precon|commander\s*deck|structure\s*deck|dice|\bmat\b|sticker|poster|\bpin\b)\b/i;

function conditionBucket(t) {
  t = (t||"").toLowerCase();
  if (/damaged|\bdmg\b|\bpoor\b/.test(t)) return "DMG";
  if (/heav(ily)?\s*play|\bhp\b/.test(t)) return "HP";
  if (/moderate(ly)?\s*play|\bmp\b|\bgood\b/.test(t)) return "MP";
  if (/light(ly)?\s*play|\blp\b|\bplayed\b|\bexcellent\b/.test(t)) return "LP";
  return "NM";
}

// Build a title→cardId resolver for the game's match mode.
export function buildResolver(cards, mode) {
  if (mode === "code") {
    // OP / YGO: collector code is unique. Match the code in the title, and confirm
    // with the card name so a same-code promo of a different card can't grab it.
    const byCode = new Map();
    // Name inverted index for the fallback path (many AU/NZ shops title YGO/OP
    // singles by "<name> <set>" with no collector code, so the code map misses
    // them entirely). Built alongside byCode so a name+set fallback can recover
    // those listings — but only when the match is unambiguous (see below).
    const byName = new Map();
    const pushName = (k, v) => { const a = byName.get(k); if (a) a.push(v); else byName.set(k, [v]); };
    for (const c of cards) {
      const nameToks = tokenize(c.name);
      const nameSet = new Set(nameToks);
      // Set tokens that also appear in the card name carry no set signal (e.g.
      // "Dark Magician" in set "Magician Force" — "magician" would otherwise let
      // any Dark Magician listing satisfy the set check), so drop them.
      const setToks = tokenize(c.setName || "").filter((s) => !SET_GENERIC.has(s) && !nameSet.has(s));
      const k = codeKey(c.collectorNumber);
      if (k) {
        const list = byCode.get(k) || [];
        list.push({ id: c.id, nameToks });
        byCode.set(k, list);
      }
      if (nameToks.length) {
        const ic = { id: c.id, nameToks, setToks };
        for (const tok of nameToks) pushName(tok, ic);
      }
    }
    return function (title) {
      if (MULTI_CARD.test(title) || NON_CARD.test(title)) return null;
      const k = codeKey(title);
      if (k) {
        const cands = byCode.get(k);
        if (cands) {
          if (cands.length === 1 && !cands[0].nameToks.length) return cands[0].id;
          const set = new Set(tokenize(title));
          const hit = cands.find((c) => !c.nameToks.length || c.nameToks.filter((t) => set.has(t)).length / c.nameToks.length >= 0.5);
          if (hit) return hit.id;
        }
        // Title has a code but it didn't resolve — don't fall through to the
        // name path (a wrong-set code in the title shouldn't grab a same-name card).
        return null;
      }
      // No code in the title: fall back to a strict name+set match. Only return
      // a card when EXACTLY ONE of our cards has its full name present in the
      // title AND a set-name token overlap — ambiguous names (parallels, same
      // name across sets) resolve to null to stay accurate.
      const ptoks = tokenize(title);
      if (!ptoks.length) return null;
      const set = new Set(ptoks);
      const seen = new Set();
      let match = null;
      for (const tok of ptoks) {
        const cands = byName.get(tok);
        if (!cands) continue;
        for (const c of cands) {
          if (seen.has(c.id)) continue;
          seen.add(c.id);
          if (!c.nameToks.every((x) => set.has(x))) continue;
          if (c.setToks.length && !c.setToks.some((s) => set.has(s))) continue;
          if (match) return null; // ambiguous → bail
          match = c.id;
        }
      }
      return match;
    };
  }
  // Magic: full name + set-name overlap, collector number to disambiguate.
  const byName = new Map();
  const push = (k, v) => { const a = byName.get(k); if (a) a.push(v); else byName.set(k, [v]); };
  for (const c of cards) {
    const nameToks = tokenize(c.name);
    if (!nameToks.length) continue;
    const setToks = tokenize(c.setName || "").filter((s) => !SET_GENERIC.has(s));
    const num = (String(c.collectorNumber).match(/\d+/) || [])[0] || "";
    const ic = { id: c.id, nameToks, setToks, num, basic: BASIC.test(nameToks.join("")) };
    for (const tok of nameToks) push(tok, ic);
  }
  return function (title) {
    if (MULTI_CARD.test(title) || NON_CARD.test(title)) return null;
    const ptoks = tokenize(title);
    if (!ptoks.length) return null;
    const set = new Set(ptoks);
    const numInTitle = (n) => !!n && new RegExp(`(^|\\D)${n}(\\D|$)`).test(title);
    const seen = new Set();
    let nameSetHit = null;
    for (const tok of ptoks) {
      const cands = byName.get(tok);
      if (!cands) continue;
      for (const c of cands) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        if (!c.nameToks.every((x) => set.has(x))) continue;
        if (c.setToks.length && !c.setToks.some((s) => set.has(s))) continue;
        if (numInTitle(c.num)) return c.id;
        if (!c.basic && !nameSetHit) nameSetHit = c.id;
      }
    }
    return nameSetHit;
  };
}

const GRADE_ORDER = ["NM", "LP", "MP", "HP", "DMG"];

// Walk all stores, resolve their <game> singles to our cards, write RetailerPrice
// rows. Bounded concurrency + per-store write so one slow store can't stall it.
export async function importStores(prisma, cards, game) {
  const cfg = GAME[game];
  if (!cfg) throw new Error(`unknown game ${game}`);
  const resolve = buildResolver(cards, cfg.mode);
  const CONC = Math.max(1, Number(process.env.STORE_CONCURRENCY) || 6);
  const queue = [...RETAILERS];
  let done = 0, totalRows = 0;
  const summary = [];

  async function processStore([key, name, base, country]) {
    let handles = await discoverCollections(base, game);
    if (!handles.length) return; // no discoverable singles collection for this game
    const products = [];
    const seenH = new Set();
    for (const h of handles.slice(0, 14)) {
      for (const p of await fetchCollection(base, h, country)) {
        if (seenH.has(p.handle)) continue;
        seenH.add(p.handle);
        products.push(p);
      }
    }
    if (!products.length) return;
    const currency = CUR[country];
    const rows = new Map();
    for (const p of products) {
      const cardId = resolve(p.title);
      if (!cardId) continue;
      const isFoil = /\bfoil\b/i.test(p.title) && !/non[\s-]?foil/i.test(p.title);
      const priced = (p.variants || []).filter((v) => parseFloat(v.price) > 0);
      if (!priced.length) continue;
      const inStockG = {}, oosG = {};
      for (const v of priced) {
        const g = conditionBucket(v.title);
        const c = Math.round(parseFloat(v.price) * 100);
        const tgt = v.available ? inStockG : oosG;
        if (tgt[g] == null || c < tgt[g]) tgt[g] = c;
      }
      const inStock = Object.keys(inStockG).length > 0;
      const spectrum = inStock ? inStockG : oosG;
      const grade = GRADE_ORDER.find((g) => spectrum[g] != null) ?? null;
      const priceCents = grade ? spectrum[grade] : Math.min(...Object.values(spectrum));
      const k = `${cardId}|${isFoil ? 1 : 0}`;
      const prev = rows.get(k);
      if (prev) { if (prev.inStock && !inStock) continue; if (prev.inStock === inStock && prev.priceCents <= priceCents) continue; }
      rows.set(k, { cardId, retailer: key, retailerName: name, title: p.title, url: `${base}/products/${p.handle}`, condition: grade, conditionPrices: spectrum, isFoil, priceCents, currency, country, inStock });
    }
    if (rows.size) {
      const data = Array.from(rows.values());
      for (let i = 0; i < data.length; i += 5000) await prisma.retailerPrice.createMany({ data: data.slice(i, i + 5000), skipDuplicates: true });
      totalRows += data.length;
    }
    summary.push(`${name} (${country}): ${rows.size}`);
    console.log(`  [${++done}/${RETAILERS.length}] ${name} (${country}): ${products.length} products → ${rows.size} card deep-links`);
  }

  const workers = Array.from({ length: Math.min(CONC, queue.length) }, async () => {
    for (;;) { const s = queue.shift(); if (!s) return; try { await processStore(s); } catch (e) { console.warn(`  ${s[1]} failed: ${e.message}`); } }
  });
  await Promise.all(workers);
  console.log(`Store walk (${game}): ${totalRows} rows across ${RETAILERS.length} stores.`);
  return { totalRows, summary };
}

// Back-compat wrapper for the Magic seed.
export async function importMagicStores(prisma, cards) { return importStores(prisma, cards, "magic"); }
