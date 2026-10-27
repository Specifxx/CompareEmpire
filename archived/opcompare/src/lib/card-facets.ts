// Config for the /cards/{facet}/{value} hub pages. Deliberately data-driven —
// a facet value only gets a hub if real cards actually carry it, so we never
// generate a page that can't justify itself (empty/near-duplicate content).
//
// NOTE on scope: the only per-CARD printing signal in this schema is
// Shadowless, Reverse Holo, Holo, Promo, Jumbo, Staff, Prerelease and
// Error/Misprint. Only Promo has a real backing field (Card.isPromo). The
// others have NO signal anywhere in the schema — reverse-holo/holo is a
// per-LISTING (RetailerPrice) attribute inferred from store titles (see
// lib/card-copy's cardFinish), not a per-CARD one, so it can't back a card
// hub; 1st Edition/Shadowless/Staff/Prerelease/Error-Misprint have no data
// source at all. Building those now would mean fabricated or empty pages —
// exactly what the cross-cutting "never generate a page that can't justify
// itself" rule rules out. Flagging this rather than shipping thin hubs;
// they're addressable later if/when the importer captures that data.
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { POKEMON_SETS } from "./pokemon-sets";
import { characterSlugify } from "./op-characters";

export type FacetKind = "type" | "rarity" | "printing" | "era";

export interface FacetValue {
  kind: FacetKind;
  slug: string;
  label: string;
  where: Prisma.CardWhereInput;
}

const TYPE_LABELS: Record<string, string> = { Leader: "Leader", Character: "Character", Event: "Event", Stage: "Stage" };

export async function resolveFacet(kind: string, slug: string): Promise<FacetValue | null> {
  if (kind === "type") {
    const entry = Object.entries(TYPE_LABELS).find(([name]) => characterSlugify(name) === slug);
    if (!entry) return null;
    return { kind: "type", slug, label: entry[1], where: { type: entry[0] } };
  }
  if (kind === "printing") {
    // Only "promo" is real data-backed today — see the file header.
    if (slug !== "promo") return null;
    return { kind: "printing", slug, label: "Promo", where: { isPromo: true } };
  }
  if (kind === "rarity") {
    const rarities = await prisma.card.findMany({ where: { hasLivePrice: true }, select: { rarity: true }, distinct: ["rarity"] });
    const match = rarities.find((r) => characterSlugify(r.rarity) === slug);
    if (!match) return null;
    return { kind: "rarity", slug, label: match.rarity, where: { rarity: match.rarity } };
  }
  if (kind === "era") {
    const series = [...new Set(POKEMON_SETS.map((s) => s.series))];
    const match = series.find((s) => characterSlugify(s) === slug);
    if (!match) return null;
    const setCodes = POKEMON_SETS.filter((s) => s.series === match).map((s) => s.code);
    return { kind: "era", slug, label: match, where: { setCode: { in: setCodes } } };
  }
  return null;
}

// Every hub worth generating for a given facet kind — used by the sitemap and
// the facet index page. Bounded, indexed/grouped queries only.
export async function listFacetValues(kind: FacetKind): Promise<FacetValue[]> {
  if (kind === "type") {
    return Object.entries(TYPE_LABELS).map(([name, label]) => ({ kind, slug: characterSlugify(name), label, where: { type: name } }));
  }
  if (kind === "printing") {
    return [{ kind, slug: "promo", label: "Promo", where: { isPromo: true } }];
  }
  if (kind === "rarity") {
    // Only DB-dependent branch here — callers include a fully static page
    // (cards/page.tsx) and the sitemap's static bucket, neither of which
    // previously touched the DB at build time. Degrade to [] rather than
    // fail the whole page/sitemap bucket if the DB is briefly unreachable.
    try {
      const grouped = await prisma.card.groupBy({
        by: ["rarity"],
        where: { hasLivePrice: true },
        _count: { _all: true },
      });
      return grouped
        .filter((g) => g._count._all >= 2)
        .map((g) => ({ kind, slug: characterSlugify(g.rarity), label: g.rarity, where: { rarity: g.rarity } }));
    } catch {
      return [];
    }
  }
  if (kind === "era") {
    const series = [...new Set(POKEMON_SETS.map((s) => s.series))];
    return series.map((s) => ({
      kind,
      slug: characterSlugify(s),
      label: s,
      where: { setCode: { in: POKEMON_SETS.filter((set) => set.series === s).map((set) => set.code) } },
    }));
  }
  return [];
}

export const FACET_KINDS: FacetKind[] = ["type", "rarity", "printing", "era"];
export const FACET_LABELS: Record<FacetKind, string> = { type: "Card type", rarity: "Rarity", printing: "Printing", era: "Era" };

// Minimum priced cards before a facet hub is indexable — shared by the page's
// own generateMetadata and the sitemap, so they always agree.
export const MIN_PRICED_TO_INDEX_FACET = 5;

export async function pricedCountForFacet(where: Prisma.CardWhereInput): Promise<number> {
  return prisma.card.count({ where: { ...where, hasLivePrice: true } });
}
