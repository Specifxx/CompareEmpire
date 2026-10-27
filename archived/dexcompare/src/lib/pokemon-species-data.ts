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

export interface SpeciesStats {
  slug: string;
  name: string;
  printingCount: number;
  pricedCount: number;
  cheapestCents: number | null;
  mostValuableCents: number | null;
  basketCents: number | null; // sum of the cheapest price across every distinct printing
  domains: string[]; // energy types this species has appeared as
  setCodes: string[]; // every set this species has a printing in
  rarities: string[]; // every rarity this species has appeared at
}

// Always select all three price columns explicitly (cheap — same row) and
// resolve via pickPrice, rather than a computed [field]: true select — Prisma's
// generated payload types don't narrow well through a computed select key.
const PRICE_COLS = { lowestPriceCents: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true } as const;

export async function speciesStats(slug: string, country: Country): Promise<SpeciesStats | null> {
  const rows = await prisma.card.findMany({
    where: { speciesSlug: slug },
    select: { name: true, domain: true, setCode: true, rarity: true, ...PRICE_COLS },
  });
  if (rows.length === 0) return null;
  const prices = rows.map((r) => pickPrice(r, country)).filter((v): v is number => v != null);
  // Shortest name among printings is almost always the base form ("ex"/"VMAX"
  // variants are always longer than the plain species name).
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
    prisma.card.findFirst({ where: { speciesSlug: slug, ...priceNotNull }, orderBy: [priceOrder], select }),
    prisma.card.findFirst({ where: { speciesSlug: slug, ...priceNotNull }, orderBy: [priceOrderAsc], select }),
    prisma.card.findMany({ where: { speciesSlug: slug }, select: { setCode: true }, distinct: ["setCode"] }),
  ]);

  const setCodes = new Set(setCodesRows.map((r) => r.setCode));
  const setsForSpecies = POKEMON_SETS.filter((s) => setCodes.has(s.code) && s.releaseDate);
  const byDate = [...setsForSpecies].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  const newestSet = byDate[byDate.length - 1] ?? null;
  const oldestSet = byDate[0] ?? null;

  const out: NotablePrinting[] = [];
  if (mostValuable) out.push({ label: "Most valuable", card: mostValuable as CardTileData });
  if (cheapest && cheapest.id !== mostValuable?.id) out.push({ label: "Cheapest", card: cheapest as CardTileData });

  const priceDescNullsLast = { [field]: { sort: "desc", nulls: "last" } } as Prisma.CardOrderByWithRelationInput;
  if (newestSet) {
    const recent = await prisma.card.findFirst({
      where: { speciesSlug: slug, setCode: newestSet.code },
      orderBy: [priceDescNullsLast],
      select,
    });
    if (recent && !out.some((o) => o.card.id === recent.id)) out.push({ label: "Most recent printing", card: recent as CardTileData });
  }
  if (oldestSet && oldestSet.code !== newestSet?.code) {
    const vintage = await prisma.card.findFirst({
      where: { speciesSlug: slug, setCode: oldestSet.code },
      orderBy: [priceDescNullsLast],
      select,
    });
    if (vintage && !out.some((o) => o.card.id === vintage.id)) out.push({ label: "Iconic vintage printing", card: vintage as CardTileData });
  }
  return out.slice(0, 4);
}

export interface SpeciesSummary {
  slug: string;
  name: string;
  count: number;
}

// Bounded, indexed groupBy — never scans/returns the full 20k-card catalogue,
// and never N+1s (one groupBy for counts + one distinct query for names,
// regardless of `limit`). Powers the hub's sibling-species nav AND, called
// with a large limit, the sitemap's species-hub bucket.
export async function popularSpecies(limit: number): Promise<SpeciesSummary[]> {
  const grouped = await prisma.card.groupBy({
    by: ["speciesSlug"],
    where: { speciesSlug: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { speciesSlug: "desc" } },
    take: limit,
  });
  const slugs = grouped.map((g) => g.speciesSlug as string);
  const names = await prisma.card.findMany({
    where: { speciesSlug: { in: slugs } },
    select: { speciesSlug: true, speciesName: true },
    distinct: ["speciesSlug"],
  });
  const nameBySlug = new Map(names.map((n) => [n.speciesSlug as string, n.speciesName]));
  return grouped.map((g) => ({
    slug: g.speciesSlug as string,
    name: nameBySlug.get(g.speciesSlug as string) ?? (g.speciesSlug as string),
    count: g._count._all,
  }));
}

// Every species with at least MIN_PRICED_PRINTINGS_TO_INDEX priced printings —
// the sitemap's indexability filter. Two groupBys (not N+1 per species): one
// for total printings per species, one for priced printings per species
// (hasLivePrice — the same denormalised flag the card sitemap bucket uses).
export async function indexableSpeciesSlugs(): Promise<string[]> {
  const priced = await prisma.card.groupBy({
    by: ["speciesSlug"],
    where: { speciesSlug: { not: null }, hasLivePrice: true },
    _count: { _all: true },
  });
  return priced.filter((g) => g._count._all >= MIN_PRICED_PRINTINGS_TO_INDEX).map((g) => g.speciesSlug as string);
}
