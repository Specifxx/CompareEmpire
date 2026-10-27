// Base-species extraction for the /pokemon/{slug} hubs (P1). One canonical hub
// per species — Charizard, Charizard ex, Charizard VMAX, Mega Charizard and
// Dark Charizard all roll up into /pokemon/charizard — rather than fragmenting
// search authority across many thin per-variant pages. This is a best-effort
// heuristic over card names (there's no species field in the source data);
// spot-check scripts/backfill-species.ts's output before trusting it blindly
// on an unfamiliar name pattern.

// Tag Team / multi-Pokémon cards ("Pikachu & Zekrom-GX") — the hub is keyed on
// the FIRST named Pokémon; the card still appears on that species' hub.
const MULTI_NAME_SPLIT_RE = /\s+(?:&|\+|and)\s+/i;

// Mechanic suffixes, stripped from the end of the (post tag-team-split) name.
// Ordered roughly newest-to-oldest era; run twice to catch stacked cases like
// "Mega Charizard ex" (strip "ex" first, then the "Mega " prefix below).
const SUFFIX_RE = /[\s-]+(V-UNION|VMAX|VSTAR|GX|EX|ex|BREAK|Prime|LV\.?\s?X|Level\s?X|Star|δ|◇)$/;

// Mechanic prefixes. Not real species names in the TCG — always a modifier.
const PREFIX_RE =
  /^(Mega|Dark|Light|Shining|Radiant|Ancient|Future|Crowned|Origin|Galarian|Alolan|Hisuian|Paldean|Team Rocket'?s|Team Plasma'?s|Team Magma'?s|Team Aqua'?s|Rocket'?s)\s+/i;

export function baseSpeciesName(cardName: string): string | null {
  let n = cardName.trim();
  if (!n) return null;
  n = n.split(MULTI_NAME_SPLIT_RE)[0].trim();
  for (let i = 0; i < 2; i++) {
    const stripped = n.replace(SUFFIX_RE, "").trim();
    if (stripped === n) break;
    n = stripped;
  }
  n = n.replace(PREFIX_RE, "").trim();
  return n || null;
}

export function speciesSlugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (Flabébé, Nidoran♀ etc.)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Only Pokémon-supertype cards get a species hub — Trainer/Energy cards have
// no species. Returns null for those, and for anything the heuristic can't
// reduce to a non-empty name.
export function speciesOf(cardName: string, cardType: string): { slug: string; name: string } | null {
  if (cardType !== "Pokémon") return null;
  const base = baseSpeciesName(cardName);
  if (!base) return null;
  const slug = speciesSlugify(base);
  if (!slug) return null;
  return { slug, name: base };
}
