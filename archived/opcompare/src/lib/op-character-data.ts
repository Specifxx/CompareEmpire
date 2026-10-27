import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { cardTileSelect } from "./cards";
import { POKEMON_SETS } from "./pokemon-sets";
import { priceField, pickPrice, type Country } from "./country";
import type { CardTileData } from "@/components/CardTile";

// A hub is indexable once it clears this many PRICED printings — below that
// it's thin content (see card/[id]'s identical robots pattern). There's no
// separate "promotion job": the count is read live on every ISR regenerate,
// so a hub flips to indexable automatically the moment the importer prices
// enough of its printings.
export const MIN_PRICED_PRINTINGS_TO_INDEX = 2;

export interface CharacterStats {
  slug: string;
  name: string;
  printingCount: number;
  pricedCount: number;
  cheapestCents: number | null;
  mostValuableCents: number | null;
  basketCents: number | null; // sum of the cheapest price across every distinct printing
  domains: string[]; // colours this character has appeared in
  setCodes: string[]; // every set this character has a printing in
  rarities: string[]; // every rarity this character has appeared at
}

// Always select all three price columns explicitly (cheap — same row) and
// resolve via pickPrice, rather than a computed [field]: true select — Prisma's
// generated payload types don't narrow well through a computed select key.
const PRICE_COLS = { lowestPriceCents: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true } as const;

export async function characterStats(slug: string, country: Country): Promise<CharacterStats | null> {
  const rows = await prisma.card.findMany({
    where: { characterSlug: slug },
    select: { name: true, domain: true, setCode: true, rarity: true, ...PRICE_COLS },
  });
  if (rows.length === 0) return null;
  const prices = rows.map((r) => pickPrice(r, country)).filter((v): v is number => v != null);
  // Shortest name among printings is almost always the base form ("ex"/"VMAX"
  // variants are always longer than the plain character name).
  const displayName = rows.map((r) => r.name).reduce((shortest, n) => (n.length < shortest.length ? n : shortest));
  return {
    slug,
    name: displayName,
    printingCount: rows.length,
    pricedCount: prices.length,
    cheapestCents: prices.length ? Math.min(...prices) : null,
    mostValuableCents: prices.length ? Math.max(...prices) : null,
    basketCents: prices.length ? prices.reduce((s, v) => s + v, 0) : null,
    domains: [...new Set(rows.map((r) => r.domain))],
    setCodes: [...new Set(rows.map((r) => r.setCode))],
    rarities: [...new Set(rows.map((r) => r.rarity))],
  };
}

export interface NotablePrinting {
  label: string;
  card: CardTileData;
}

// Curated strip so the hub is useful without scrolling a 200-row grid —
// most valuable, cheapest, most recent (by set release date) and, when it
// differs, the earliest/"iconic vintage" printing.
export async function notablePrintings(slug: string, country: Country): Promise<NotablePrinting[]> {
  const select = cardTileSelect(country);
  const field = priceField(country);
  const priceOrder = { [field]: "desc" } as Prisma.CardOrderByWithRelationInput;
  const priceOrderAsc = { [field]: "asc" } as Prisma.CardOrderByWithRelationInput;
  const priceNotNull = { [field]: { not: null } } as Prisma.CardWhereInput;

  const [mostValuable, cheapest, setCodesRows] = await Promise.all([
    prisma.card.findFirst({ where: { characterSlug: slug, ...priceNotNull }, orderBy: [priceOrder], select }),
    prisma.card.findFirst({ where: { characterSlug: slug, ...priceNotNull }, orderBy: [priceOrderAsc], select }),
    prisma.card.findMany({ where: { characterSlug: slug }, select: { setCode: true }, distinct: ["setCode"] }),
  ]);

  const setCodes = new Set(setCodesRows.map((r) => r.setCode));
  const setsForCharacter = POKEMON_SETS.filter((s) => setCodes.has(s.code) && s.releaseDate);
  const byDate = [...setsForCharacter].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  const newestSet = byDate[byDate.length - 1] ?? null;
  const oldestSet = byDate[0] ?? null;

  const out: NotablePrinting[] = [];
  if (mostValuable) out.push({ label: "Most valuable", card: mostValuable as CardTileData });
  if (cheapest && cheapest.id !== mostValuable?.id) out.push({ label: "Cheapest", card: cheapest as CardTileData });

  const priceDescNullsLast = { [field]: { sort: "desc", nulls: "last" } } as Prisma.CardOrderByWithRelationInput;
  if (newestSet) {
    const recent = await prisma.card.findFirst({
      where: { characterSlug: slug, setCode: newestSet.code },
      orderBy: [priceDescNullsLast],
      select,
    });
    if (recent && !out.some((o) => o.card.id === recent.id)) out.push({ label: "Most recent printing", card: recent as CardTileData });
  }
  if (oldestSet && oldestSet.code !== newestSet?.code) {
    const vintage = await prisma.card.findFirst({
      where: { characterSlug: slug, setCode: oldestSet.code },
      orderBy: [priceDescNullsLast],
      select,
    });
    if (vintage && !out.some((o) => o.card.id === vintage.id)) out.push({ label: "Iconic vintage printing", card: vintage as CardTileData });
  }
  return out.slice(0, 4);
}

export interface CharacterSummary {
  slug: string;
  name: string;
  count: number;
}

// Bounded, indexed groupBy — never scans/returns the full 20k-card catalogue,
// and never N+1s (one groupBy for counts + one distinct query for names,
// regardless of `limit`). Powers the hub's sibling-character nav AND, called
// with a large limit, the sitemap's character-hub bucket.
export async function popularCharacters(limit: number): Promise<CharacterSummary[]> {
  const grouped = await prisma.card.groupBy({
    by: ["characterSlug"],
    where: { characterSlug: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { characterSlug: "desc" } },
    take: limit,
  });
  const slugs = grouped.map((g) => g.characterSlug as string);
  const names = await prisma.card.findMany({
    where: { characterSlug: { in: slugs } },
    select: { characterSlug: true, characterName: true },
    distinct: ["characterSlug"],
  });
  const nameBySlug = new Map(names.map((n) => [n.characterSlug as string, n.characterName]));
  return grouped.map((g) => ({
    slug: g.characterSlug as string,
    name: nameBySlug.get(g.characterSlug as string) ?? (g.characterSlug as string),
    count: g._count._all,
  }));
}

// Every character with at least MIN_PRICED_PRINTINGS_TO_INDEX priced printings —
// the sitemap's indexability filter. Two groupBys (not N+1 per character): one
// for total printings per character, one for priced printings per character
// (hasLivePrice — the same denormalised flag the card sitemap bucket uses).
export async function indexableCharacterSlugs(): Promise<string[]> {
  const priced = await prisma.card.groupBy({
    by: ["characterSlug"],
    where: { characterSlug: { not: null }, hasLivePrice: true },
    _count: { _all: true },
  });
  return priced.filter((g) => g._count._all >= MIN_PRICED_PRINTINGS_TO_INDEX).map((g) => g.characterSlug as string);
}
