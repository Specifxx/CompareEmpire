// Base-character extraction for the /character/{slug} hubs. One canonical hub
// per character: every "Monkey D. Luffy" printing — Leader, Character, alt-art,
// across every set — rolls up into /character/monkey-d-luffy, rather than
// fragmenting search authority across near-duplicate per-printing pages.
//
// One Piece card names carry the character, then an optional subtitle after a
// comma or dash ("Trafalgar Law, Surgeon of Death"). The subtitle varies per
// printing while the character doesn't, so the part before the first separator
// is the grouping key. This is a best-effort heuristic over card names — there
// is no character field in the source data. Spot-check
// scripts/backfill-characters.ts output before trusting it on unusual names.

// Split on the first comma, or a spaced dash/en-dash (never a hyphen inside a
// name like "Portgas D. Ace" or "Kozuki Oden").
const SUBTITLE_SPLIT = /\s*(?:,|\s[-–—]\s)/;

// Leading qualifiers that describe the printing/faction, not the character.
const PREFIX_RE = /^(?:Sakazuki|DON!!)\s+(?=\w)/i;

export function baseCharacterName(cardName: string): string | null {
  let n = (cardName ?? "").trim();
  if (!n) return null;
  n = n.split(SUBTITLE_SPLIT)[0].trim();
  n = n.replace(PREFIX_RE, "").trim();
  // Strip a trailing parenthetical, e.g. "Nami (Parallel)".
  n = n.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return n || null;
}

export function characterSlugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Only character-bearing cards get a hub. Event and Stage cards are effects,
// not characters, so they're excluded — a hub for them would be a page about
// nothing. Leaders and Characters both map to the same character hub, which is
// the point: a Leader Luffy and a Character Luffy belong on one page.
const CHARACTER_TYPES = new Set(["Leader", "Character"]);

export function characterOf(cardName: string, cardType: string): { slug: string; name: string } | null {
  if (!CHARACTER_TYPES.has(cardType)) return null;
  const base = baseCharacterName(cardName);
  if (!base) return null;
  const slug = characterSlugify(base);
  if (!slug) return null;
  return { slug, name: base };
}
