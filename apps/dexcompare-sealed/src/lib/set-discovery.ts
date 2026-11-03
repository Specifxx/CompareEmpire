// NEW SETS FIND THEMSELVES (2026-11-03, ported from MTG Compare's lib/set-discovery.ts). Every sealed import first reads
// TCGplayer's Pokémon set list as TCGCSV publishes it (scripts/discover-sets.ts) and keeps the English sets due in the next
// DISCOVER_AHEAD_DAYS days, which TCGplayer already lists sealed product for, in data/sets/discovered.json. lib/sets.ts adds those
// to SETS, so from that import on the importer files the new set's store pre-orders under it, and the pages that follow SETS (the
// pre-order page, the homepage's Coming soon block, the release calendar, the set page, the sitemap) appear on the next release.
// A set hand-written into lib/sets.ts always wins (same code or same slug).
//
// Facts only, and refuse rather than guess:
// - Name and release date are TCGplayer's group (its `publishedOn`, the English street date). A later read moves the date; the
//   slug is the one first written and never changes, because it is a live URL.
// - A group is a set only when TCGplayer's own catalogue lists an Elite Trainer Box or a booster product in it: promo, gallery,
//   deck and event groups never do.
// - noBoosterBox unless TCGplayer lists a Booster Box (or Display) in the group: until then a store's "booster box" of the set
//   could be a store-made lot (the ".5" sets never had one), so it is refused.
// - Series from the group's code prefix (ME, SV, …), else the newest hand-written set's series.
// - A set whose name is part of an existing set's name is left out and reported: a bare title would flip sets.
//
// Pure: no network, no file access (the script does both), so tests/set-discovery.test.ts checks every rule directly.

/** A TCGCSV group (https://tcgcsv.com/tcgplayer/3/groups), the fields this reads. */
export interface TcgGroup {
  groupId: number;
  name: string;
  abbreviation?: string | null;
  publishedOn?: string | null;
}

export interface DiscoveredSet {
  code: string;
  name: string;
  /** URL slug, fixed when first discovered. */
  slug: string;
  series: string;
  releaseDate: string;
  noBoosterBox?: boolean;
  /** TCGplayer's group id, to read its products again. */
  tcgGroupId: number;
  /** First day an import saw it (YYYY-MM-DD). */
  firstSeen: string;
}

export const DISCOVER_AHEAD_DAYS = 180;
export const DISCOVER_BEHIND_DAYS = 60;

const PREFIX_SERIES: Record<string, string> = {
  me: "Mega Evolution",
  sv: "Scarlet & Violet",
  swsh: "Sword & Shield",
  sm: "Sun & Moon",
  xy: "XY",
};

// Groups that are never a set of their own.
const NOT_A_SET =
  /\bpromos?\b|\bgallery\b|\bvault\b|mcdonald|trick\s*or\s*trade|\bdecks?\b|\benerg(?:y|ies)\b|battle\s*academy|championship|prize\s*pack|professor|miscellaneous|blister|jumbo|code\s*cards?|\bleague\b|\bkits?\b|first\s*partner|\bpop\s*series\b|\bpokemon\s*day\b|\bposters?\b/i;

/** "ME07: Flowing Fists", "SV: Prismatic Evolutions", "SWSH12.5: Crown Zenith" → the set's own name. */
export function cleanGroupName(name: string): string {
  return name.replace(/^(?:SV|SWSH|SM|XY|ME|BW)\d{0,2}(?:\.\d)?\s*[:\-–]\s*/i, "").trim();
}

/** Our code from TCGplayer's abbreviation: "ME07" → "me7", "SV08.5" / "SV8PT5" → "sv8pt5"; else the lowercased abbreviation. */
export function codeOf(abbreviation: string | null | undefined, slug: string): string {
  const a = (abbreviation ?? "").trim();
  const m = /^(ME|SV|SWSH|SM|XY)0*(\d+)(?:\.5|PT5)?$/i.exec(a);
  if (m) return `${m[1].toLowerCase()}${m[2]}${/\.5|pt5/i.test(a) ? "pt5" : ""}`;
  const plain = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  return plain.length >= 2 ? plain : slug.replace(/-/g, "").slice(0, 12);
}

/** The slug lib/sets.ts's hand-written sets follow ("Scarlet & Violet" → scarlet-violet, "Pokémon GO" → pokemon-go). */
export function setSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function words(name: string): string[] {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && w !== "the");
}

/** `inner`'s words appear, in order and together, inside `outer`'s. */
export function nameInside(inner: string, outer: string): boolean {
  const a = words(inner);
  const b = words(outer);
  if (!a.length || a.length > b.length) return false;
  for (let i = 0; i + a.length <= b.length; i++) if (a.every((w, j) => b[i + j] === w)) return true;
  return false;
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Series from the group's code prefix ("ME07: …" → Mega Evolution), else `fallback` (the newest hand-written set's). */
export function seriesOf(group: Pick<TcgGroup, "name" | "abbreviation">, fallback: string): string {
  const src = `${group.abbreviation ?? ""} ${group.name}`;
  const m = /\b(ME|SV|SWSH|SM|XY)\d*(?:\.\d)?\b/i.exec(src);
  return (m && PREFIX_SERIES[m[1].toLowerCase()]) || fallback;
}

export interface Candidate {
  group: TcgGroup;
  name: string;
  slug: string;
  code: string;
  releaseDate: string;
}

export interface Skip {
  name: string;
  why: string;
}

type Known = { code: string; name: string; slug: string };

/**
 * TCGplayer re-stamps old groups' `publishedOn` (2026-11-03: the POP Series and Burger King promos read "2026-11-02"), so a date alone
 * cannot say a group is new. Group ids only grow: the floor is the highest id among groups that are hand-written sets released over a
 * year ago, and only groups above it are read. null (no such group found) reads none.
 */
export function groupIdFloor(groups: readonly TcgGroup[], known: readonly (Known & { releaseDate: string })[], today: string): number | null {
  const yearAgo = addDays(today, -365);
  const old = new Set(known.filter((k) => k.releaseDate < yearAgo).map((k) => k.slug));
  let floor: number | null = null;
  for (const g of groups) if (old.has(setSlug(cleanGroupName(g.name))) && (floor === null || g.groupId > floor)) floor = g.groupId;
  return floor;
}

/** The TCGplayer groups worth a product read: newer than the floor, in the date window, not a promo/gallery/deck group, not known. */
export function candidates(groups: readonly TcgGroup[], known: readonly (Known & { releaseDate: string })[], today: string): { take: Candidate[]; skipped: Skip[] } {
  const floor = groupIdFloor(groups, known, today);
  if (floor === null) return { take: [], skipped: [{ name: "(all)", why: "no hand-written set found in TCGplayer's list to date the groups by" }] };
  const from = addDays(today, -DISCOVER_BEHIND_DAYS);
  const to = addDays(today, DISCOVER_AHEAD_DAYS);
  const codes = new Set(known.map((k) => k.code));
  const slugs = new Set(known.map((k) => k.slug));
  const take: Candidate[] = [];
  const skipped: Skip[] = [];
  for (const g of groups) {
    if (g.groupId <= floor) continue;
    const date = (g.publishedOn ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < from || date > to) continue;
    if (NOT_A_SET.test(g.name)) continue;
    const name = cleanGroupName(g.name);
    const slug = setSlug(name);
    const code = codeOf(g.abbreviation, slug);
    if (slugs.has(slug) || codes.has(code)) continue;
    if (name.length < 4) {
      skipped.push({ name, why: "name too short to match a store title safely" });
      continue;
    }
    const inside = known.find((k) => nameInside(name, k.name));
    if (inside) {
      skipped.push({ name, why: `its name is part of ${inside.name}'s: add it to lib/sets.ts by hand, with an alias` });
      continue;
    }
    take.push({ group: g, name, slug, code, releaseDate: date });
  }
  return { take, skipped };
}

/** What TCGplayer's own catalogue of a group says: is it a sealed set at all, and was a booster box sold? */
export function readProducts(productNames: readonly string[]): { sealed: boolean; boosterBox: boolean } {
  return {
    sealed: productNames.some((n) => /elite\s*trainer\s*box|booster\s*(?:pack|bundle|box|display)/i.test(n)),
    boosterBox: productNames.some((n) => /booster\s*(?:box|display)(?!\s*case)/i.test(n) || /booster\s*display\s*box/i.test(n)),
  };
}

/**
 * The new discovered list: each candidate TCGplayer lists sealed product for, merged over what the file held. A set keeps its
 * first slug, code and first-seen day; its date follows TCGplayer. `products` holds each candidate's product names (by group id);
 * a group whose read failed (absent) keeps its previous entry as it was. A code now hand-written into lib/sets.ts is dropped.
 */
export function mergeDiscovered(
  previous: readonly DiscoveredSet[],
  take: readonly Candidate[],
  products: ReadonlyMap<number, readonly string[]>,
  fallbackSeries: string,
  known: readonly Known[],
  today: string,
): DiscoveredSet[] {
  const prev = new Map(previous.map((d) => [d.tcgGroupId, d]));
  const knownCodes = new Set(known.map((k) => k.code));
  const knownSlugs = new Set(known.map((k) => k.slug));
  const out = new Map<number, DiscoveredSet>();
  for (const c of take) {
    const before = prev.get(c.group.groupId);
    const names = products.get(c.group.groupId);
    if (!names) {
      if (before) out.set(before.tcgGroupId, before);
      continue;
    }
    const { sealed, boosterBox } = readProducts(names);
    if (!sealed) continue;
    out.set(c.group.groupId, {
      code: before?.code ?? c.code,
      name: c.name,
      slug: before?.slug ?? c.slug,
      series: seriesOf(c.group, fallbackSeries),
      releaseDate: c.releaseDate,
      ...(boosterBox ? {} : { noBoosterBox: true }),
      tcgGroupId: c.group.groupId,
      firstSeen: before?.firstSeen ?? today,
    });
  }
  // Out of the window now (released over DISCOVER_BEHIND_DAYS ago): keep it, its set page stays.
  for (const d of previous) if (!out.has(d.tcgGroupId) && !take.some((c) => c.group.groupId === d.tcgGroupId)) out.set(d.tcgGroupId, d);
  return [...out.values()]
    .filter((d) => !knownCodes.has(d.code) && !knownSlugs.has(d.slug))
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.code.localeCompare(b.code));
}
