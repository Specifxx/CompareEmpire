// Query helpers shared by /browse, the game hubs, search and the homepage rails —
// one place for where/orderBy/select so every surface filters identically.
import type { Prisma } from "@prisma/client";
import { searchNorm } from "./catalog";
import { isGameKey, type GameKey } from "./games";

export interface BrowseQuery {
  q?: string;
  game?: string;
  kind?: string; // "single" | "sealed"
  set?: string;
  sort?: string;
  page?: string;
  size?: string;
}

// Tile data — everything a grid card needs, nothing more.
export const cardTileSelect = {
  id: true,
  slug: true,
  game: true,
  kind: true,
  name: true,
  setName: true,
  rarity: true,
  collectorNumber: true,
  imageUrl: true,
  marketPriceCents: true,
  marketPriceSource: true,
} satisfies Prisma.CardSelect;

export type CardTileData = Prisma.CardGetPayload<{ select: typeof cardTileSelect }>;

export function buildCardWhere(query: BrowseQuery, selectedGames: GameKey[]): Prisma.CardWhereInput {
  const where: Prisma.CardWhereInput = {};
  // An explicit ?game= filter wins; otherwise scope to the visitor's selection.
  if (query.game && isGameKey(query.game)) where.game = query.game;
  else where.game = { in: selectedGames };
  if (query.kind === "sealed" || query.kind === "single") where.kind = query.kind;
  if (query.set) where.setName = query.set;
  const q = (query.q ?? "").trim();
  if (q) {
    const norm = searchNorm(q);
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      ...(norm.length >= 2 ? [{ searchText: { contains: norm } }] : []),
    ];
  }
  return where;
}

export function buildCardOrderBy(sort: string | undefined): Prisma.CardOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ marketPriceCents: { sort: "asc", nulls: "last" } }, { name: "asc" }];
    case "name":
      return [{ name: "asc" }];
    case "newest":
      return [{ releaseDate: { sort: "desc", nulls: "last" } }, { marketPriceCents: { sort: "desc", nulls: "last" } }];
    case "price_desc":
    default:
      return [{ marketPriceCents: { sort: "desc", nulls: "last" } }, { name: "asc" }];
  }
}

export function parsePageNum(v: string | undefined): number {
  const n = parseInt(v ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 5000) : 1;
}

const PAGE_SIZES = [24, 48, 96];
export function parsePageSize(v: string | undefined): number {
  const n = parseInt(v ?? "48", 10);
  return PAGE_SIZES.includes(n) ? n : 48;
}
